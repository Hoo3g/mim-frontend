import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, shareReplay, tap } from 'rxjs';
import { BookmarkedResearchPaper, PaperAuthor, ResearchPaper } from '../models/research-paper.model';
import type { AuthUser } from '../signals/auth.signal';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { authSignal } from '../signals/auth.signal';
import { normalizeRichTextHtml } from '../utils/rich-text.util';
import { TimedObservableCache } from '../utils/timed-observable-cache.util';

export interface ResearchEditorPayload {
    id?: string;
    title: string;
    abstract: string;
    researchArea: string;
    pdfUrl?: string;
}

export interface ResearchPaperListQuery {
    q?: string;
    type?: 'LECTURER' | 'STUDENT' | 'ALL' | null;
    specialization?: string[] | null;
}

interface ResearchPdfUploadResponse {
    objectKey: string;
    fileUrl: string;
}

interface ResearchPaperApiAuthor {
    studentId?: string;
    name?: string;
    isMainAuthor?: boolean;
    mainAuthor?: boolean;
    authorOrder?: number;
}

interface ResearchPaperApiModel {
    id: string;
    title: string;
    abstract?: string;
    pdfUrl?: string;
    publicationYear?: number;
    journalConference?: string;
    researchArea?: string;
    category?: 'LECTURER' | 'STUDENT';
    viewCount?: number;
    downloadCount?: number;
    bookmarkCount?: number;
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    moderationComment?: string;
    authors?: ResearchPaperApiAuthor[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

interface ResearchBookmarkApiModel {
    paperId?: string;
    title?: string;
    researchArea?: string;
    category?: 'LECTURER' | 'STUDENT' | string;
    publicationYear?: number | null;
    savedAt?: string | Date | null;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchPaperService {
    private readonly http = inject(HttpClient);
    private readonly papersCache = new TimedObservableCache<ResearchPaper[]>(60_000);
    private readonly paperDetailCache = new TimedObservableCache<ResearchPaper | undefined>(60_000);
    private readonly myPapersCache = new TimedObservableCache<ResearchPaper[]>(30_000);
    private readonly bookmarksCache = new TimedObservableCache<Set<string>>(30_000);
    private readonly bookmarkedPapersCache = new TimedObservableCache<BookmarkedResearchPaper[]>(30_000);

    getPapers(query: ResearchPaperListQuery = {}): Observable<ResearchPaper[]> {
        const cacheKey = this.buildListCacheKey(query);
        const cachedPapers$ = this.papersCache.get(cacheKey);
        const papers$ = cachedPapers$ ?? this.papersCache.set(cacheKey,
            this.http.get<ApiResponse<ResearchPaperApiModel[]>>(API_ENDPOINTS.RESEARCH.LIST, {
                params: this.buildListParams(query)
            }).pipe(
                map((response) => this.unwrapList(response).map((paper) => this.toPaperModel(paper))),
                catchError(() => {
                    this.papersCache.delete(cacheKey);
                    return of([]);
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            )
        );

        return this.attachBookmarkState(papers$);
    }

    getPaperById(id: string): Observable<ResearchPaper | undefined> {
        const cacheKey = (id ?? '').trim();
        if (!cacheKey) {
            return of(undefined);
        }

        const cachedPaper$ = this.paperDetailCache.get(cacheKey);
        const paper$ = cachedPaper$ ?? this.paperDetailCache.set(cacheKey,
            this.http.get<ApiResponse<ResearchPaperApiModel>>(API_ENDPOINTS.RESEARCH.DETAIL(id)).pipe(
                map((response) => this.toPaperModel(this.unwrap(response))),
                catchError(() => {
                    this.paperDetailCache.delete(cacheKey);
                    return this.getPapers().pipe(
                        map((papers) => papers.find((paper) => paper.id === cacheKey))
                    );
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            )
        );

        return forkJoin([paper$, this.getBookmarkedPaperIds()]).pipe(
            map(([paper, bookmarkedIds]) => paper ? {
                ...paper,
                isBookmarked: bookmarkedIds.has(paper.id)
            } : undefined)
        );
    }

    getMyPaperById(id: string, currentUser: AuthUser): Observable<ResearchPaper | undefined> {
        return this.getMyPapers(currentUser).pipe(
            map((papers) => papers.find((paper) => paper.id === id))
        );
    }

    getMyPapers(_currentUser: AuthUser): Observable<ResearchPaper[]> {
        const cacheKey = authSignal.user()?.id ?? 'anonymous';
        const cachedPapers$ = this.myPapersCache.get(cacheKey);
        if (cachedPapers$) {
            return cachedPapers$;
        }

        const request$ = this.http.get<ApiResponse<ResearchPaperApiModel[]>>(API_ENDPOINTS.RESEARCH.MY_PAPERS).pipe(
            map((response) => this.unwrapList(response).map((paper) => this.toPaperModel(paper))),
            catchError(() => {
                this.myPapersCache.delete(cacheKey);
                return of([]);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.myPapersCache.set(cacheKey, request$);
    }

    saveFromEditor(payload: ResearchEditorPayload, _currentUser: AuthUser): Observable<ResearchPaper | null> {
        const title = payload.title.trim();
        const abstract = normalizeRichTextHtml(payload.abstract).trim();
        const researchArea = payload.researchArea?.trim();
        if (!title || !abstract || !researchArea) {
            return of(null);
        }

        const requestBody = {
            title,
            abstract,
            researchArea,
            pdfUrl: payload.pdfUrl
        };

        const request$ = payload.id
            ? this.http.put<ApiResponse<ResearchPaperApiModel>>(API_ENDPOINTS.RESEARCH.DETAIL(payload.id), requestBody)
            : this.http.post<ApiResponse<ResearchPaperApiModel>>(API_ENDPOINTS.RESEARCH.LIST, requestBody);

        return request$.pipe(
            map((response) => this.toPaperModel(this.unwrap(response))),
            tap(() => this.invalidatePaperCaches())
        );
    }

    getBookmarkedPaperIds(): Observable<Set<string>> {
        if (!authSignal.isAuth()) {
            return of(new Set<string>());
        }

        const cacheKey = authSignal.user()?.id ?? 'anonymous';
        const cachedBookmarks$ = this.bookmarksCache.get(cacheKey);
        if (cachedBookmarks$) {
            return cachedBookmarks$;
        }

        const request$ = this.http.get<ApiResponse<ResearchBookmarkApiModel[]>>(API_ENDPOINTS.RESEARCH.BOOKMARKS_MY).pipe(
            map((response) => this.unwrapList(response)),
            map((items) => {
                const ids = new Set<string>();
                items.forEach((item) => {
                    if (item.paperId) {
                        ids.add(item.paperId);
                    }
                });
                return ids;
            }),
            catchError(() => {
                this.bookmarksCache.delete(cacheKey);
                return of(new Set<string>());
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.bookmarksCache.set(cacheKey, request$);
    }

    getBookmarkedPapers(): Observable<BookmarkedResearchPaper[]> {
        if (!authSignal.isAuth()) {
            return of([]);
        }

        const cacheKey = authSignal.user()?.id ?? 'anonymous';
        const cachedBookmarks$ = this.bookmarkedPapersCache.get(cacheKey);
        if (cachedBookmarks$) {
            return cachedBookmarks$;
        }

        const request$ = this.http.get<ApiResponse<ResearchBookmarkApiModel[]>>(API_ENDPOINTS.RESEARCH.BOOKMARKS_MY).pipe(
            map((response) => this.unwrapList(response).map((item) => this.toBookmarkedPaperModel(item))),
            catchError(() => {
                this.bookmarkedPapersCache.delete(cacheKey);
                return of([]);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.bookmarkedPapersCache.set(cacheKey, request$);
    }

    bookmarkPaper(paperId: string): Observable<void> {
        return this.http.post<ApiResponse<null>>(API_ENDPOINTS.RESEARCH.BOOKMARK(paperId), {}).pipe(
            tap(() => {
                this.bookmarksCache.clear();
                this.bookmarkedPapersCache.clear();
                this.invalidatePublicPaperCaches(paperId);
            }),
            map(() => void 0)
        );
    }

    unbookmarkPaper(paperId: string): Observable<void> {
        return this.http.delete<ApiResponse<null>>(API_ENDPOINTS.RESEARCH.BOOKMARK(paperId)).pipe(
            tap(() => {
                this.bookmarksCache.clear();
                this.bookmarkedPapersCache.clear();
                this.invalidatePublicPaperCaches(paperId);
            }),
            map(() => void 0)
        );
    }

    trackView(paperId: string): Observable<void> {
        return this.http.post<ApiResponse<null>>(API_ENDPOINTS.RESEARCH.TRACK_VIEW(paperId), {}).pipe(
            tap(() => this.invalidatePublicPaperCaches(paperId)),
            map(() => void 0)
        );
    }

    trackDownload(paperId: string): Observable<void> {
        return this.http.post<ApiResponse<null>>(API_ENDPOINTS.RESEARCH.TRACK_DOWNLOAD(paperId), {}).pipe(
            tap(() => this.invalidatePublicPaperCaches(paperId)),
            map(() => void 0)
        );
    }

    uploadPdfToMinio(file: File): Observable<string> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http
            .post<ApiResponse<ResearchPdfUploadResponse>>(API_ENDPOINTS.STORAGE.RESEARCH_PDF_UPLOAD, formData, {
                withCredentials: true
            })
            .pipe(
                map((response) => {
                    if (!response.success || !response.data?.fileUrl) {
                        throw new Error(response.message || 'Failed to upload PDF');
                    }
                    return response.data.fileUrl;
                })
            );
    }

    private unwrap<T>(response: ApiResponse<T>): T {
        if (!response.success || response.data === null) {
            throw new Error(response.message || 'Request failed');
        }
        return response.data;
    }

    private unwrapList<T>(response: ApiResponse<T[]>): T[] {
        if (!response.success || response.data === null) {
            return [];
        }
        return response.data;
    }

    private buildListParams(query: ResearchPaperListQuery): HttpParams {
        let params = new HttpParams();
        const keyword = (query.q ?? '').trim();
        const type = query.type && query.type !== 'ALL' ? query.type : '';
        const specializations = (query.specialization ?? [])
            .map((item) => (item ?? '').trim())
            .filter((item) => !!item);

        if (keyword) {
            params = params.set('q', keyword);
        }
        if (type) {
            params = params.set('type', type);
        }
        specializations.forEach((item) => {
            params = params.append('specialization', item);
        });

        return params;
    }

    private buildListCacheKey(query: ResearchPaperListQuery): string {
        const keyword = (query.q ?? '').trim().toLowerCase();
        const type = query.type && query.type !== 'ALL' ? query.type : '';
        const specializations = (query.specialization ?? [])
            .map((item) => (item ?? '').trim().toLowerCase())
            .filter((item) => !!item)
            .sort()
            .join('|');
        return `q=${keyword};type=${type};specialization=${specializations}`;
    }

    private attachBookmarkState(papers$: Observable<ResearchPaper[]>): Observable<ResearchPaper[]> {
        return forkJoin([papers$, this.getBookmarkedPaperIds()]).pipe(
            map(([papers, bookmarkedIds]) => papers.map((paper) => ({
                ...paper,
                isBookmarked: bookmarkedIds.has(paper.id)
            })))
        );
    }

    private toPaperModel(apiPaper: ResearchPaperApiModel): ResearchPaper {
        const authors = Array.isArray(apiPaper.authors) ? apiPaper.authors : [];
        const mappedAuthors: PaperAuthor[] = authors.map((author, index) => ({
            studentId: author.studentId ?? '',
            name: (author.name?.trim() || 'Unknown'),
            isMainAuthor: author.isMainAuthor ?? author.mainAuthor ?? index === 0,
            authorOrder: author.authorOrder ?? (index + 1)
        }));

        return {
            id: apiPaper.id,
            title: apiPaper.title ?? 'Untitled',
            abstract: normalizeRichTextHtml(apiPaper.abstract ?? ''),
            pdfUrl: apiPaper.pdfUrl ?? '',
            publicationYear: apiPaper.publicationYear ?? new Date().getFullYear(),
            journalConference: apiPaper.journalConference ?? 'MIM Draft',
            researchArea: apiPaper.researchArea ?? 'Chưa phân loại',
            category: apiPaper.category === 'LECTURER' ? 'LECTURER' : 'STUDENT',
            viewCount: apiPaper.viewCount ?? 0,
            downloadCount: apiPaper.downloadCount ?? 0,
            bookmarkCount: apiPaper.bookmarkCount ?? 0,
            approvalStatus: apiPaper.approvalStatus,
            moderationComment: apiPaper.moderationComment,
            authors: mappedAuthors,
            createdAt: this.toDate(apiPaper.createdAt),
            updatedAt: this.toDate(apiPaper.updatedAt)
        };
    }

    private toBookmarkedPaperModel(item: ResearchBookmarkApiModel): BookmarkedResearchPaper {
        return {
            paperId: item.paperId ?? '',
            title: item.title?.trim() || 'Untitled',
            researchArea: item.researchArea?.trim() || 'Chưa phân loại',
            category: item.category === 'LECTURER' ? 'LECTURER' : 'STUDENT',
            publicationYear: item.publicationYear ?? null,
            savedAt: item.savedAt ? this.toDate(item.savedAt) : null
        };
    }

    private toDate(value?: string | Date): Date {
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return new Date();
    }

    private invalidatePaperCaches(): void {
        this.papersCache.clear();
        this.paperDetailCache.clear();
        this.myPapersCache.clear();
    }

    private invalidatePublicPaperCaches(paperId?: string): void {
        this.papersCache.clear();
        if (paperId) {
            this.paperDetailCache.delete((paperId ?? '').trim());
        } else {
            this.paperDetailCache.clear();
        }
    }
}
