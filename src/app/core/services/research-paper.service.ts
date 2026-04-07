import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap, tap, timeout } from 'rxjs';
import { BookmarkedResearchPaper, PaperAuthor, ResearchPaper } from '../models/research-paper.model';
import type { AuthUser } from '../signals/auth.signal';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { authSignal } from '../signals/auth.signal';
import { normalizeRichTextHtml } from '../utils/rich-text.util';
import { TimedObservableCache } from '../utils/timed-observable-cache.util';
import { emptyPagedResult, parseDate, unwrap, unwrapList, unwrapPaged } from '../utils/api-response.util';
import { ApprovalStatus } from '../enums/post-status.enum';
import { Role } from '../enums/role.enum';
import { UI_LABELS } from '../constants/ui-labels.const';
import { resolvePublicAssetUrl } from '../utils/public-asset-url.util';

export interface ResearchEditorPayload {
    id?: string;
    title: string;
    abstract: string;
    researchArea: string;
    paperType: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS';
    publicationYear: number;
    journalConference?: string;
    category: 'LECTURER' | 'STUDENT';
    authorName?: string;
    coAuthorStudentIds?: string[];
    pdfUrl?: string;
}

export interface ResearchStudentAuthorCandidate {
    userId: string;
    studentId: string;
    fullName: string;
}

export interface ResearchPaperListQuery {
    q?: string;
    type?: 'LECTURER' | 'STUDENT' | 'ALL' | null;
    paperType?: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS' | 'ALL' | null;
    specialization?: string[] | null;
    year?: number | null;
    metric?: 'views' | 'downloads' | 'bookmarks' | null;
}

interface ResearchPdfUploadResponse {
    objectKey: string;
    fileUrl: string;
}

interface ResearchPaperApiAuthor {
    studentId?: string;
    name?: string;
    authorType?: 'STUDENT' | 'LECTURER' | string;
    isMainAuthor?: boolean;
    mainAuthor?: boolean;
    authorOrder?: number;
    canViewProfile?: boolean;
}

interface ResearchStudentAuthorCandidateApiModel {
    userId?: string;
    studentId?: string;
    fullName?: string;
}

interface ResearchPaperApiModel {
    id: string;
    title: string;
    abstract?: string;
    pdfUrl?: string;
    paperType?: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS' | string;
    publicationYear?: number;
    journalConference?: string;
    researchArea?: string;
    category?: Role.LECTURER | Role.STUDENT;
    viewCount?: number;
    downloadCount?: number;
    bookmarkCount?: number;
    approvalStatus?: ApprovalStatus | string;
    moderationComment?: string;
    authors?: ResearchPaperApiAuthor[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

interface ResearchBookmarkApiModel {
    paperId?: string;
    title?: string;
    researchArea?: string;
    category?: Role.LECTURER | Role.STUDENT | string;
    paperType?: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS' | string;
    publicationYear?: number | null;
    savedAt?: string | Date | null;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchPaperService {
    private readonly http = inject(HttpClient);
    private readonly papersCache = new TimedObservableCache<ResearchPaper[]>(10 * 60_000);
    private readonly pagedPapersCache = new TimedObservableCache<PagedResponse<ResearchPaper>>(10 * 60_000);
    private readonly paperDetailCache = new TimedObservableCache<ResearchPaper | undefined>(15 * 60_000);
    private readonly myPapersCache = new TimedObservableCache<ResearchPaper[]>(2 * 60_000);
    private readonly bookmarksCache = new TimedObservableCache<Set<string>>(5 * 60_000);
    private readonly bookmarkedPapersCache = new TimedObservableCache<BookmarkedResearchPaper[]>(5 * 60_000);

    getPapers(query: ResearchPaperListQuery = {}): Observable<ResearchPaper[]> {
        const cacheKey = this.buildListCacheKey(query);
        const cachedPapers$ = this.papersCache.get(cacheKey);
        const papers$ = cachedPapers$ ?? this.papersCache.set(cacheKey,
            this.http.get<ApiResponse<ResearchPaperApiModel[]>>(API_ENDPOINTS.RESEARCH.LIST, {
                params: this.buildListParams(query)
            }).pipe(
                map((response) => unwrapList(response).map((paper) => this.toPaperModel(paper))),
                catchError(() => {
                    this.papersCache.delete(cacheKey);
                    return of([]);
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            )
        );

        return this.attachBookmarkState(papers$);
    }

    getPapersPage(query: ResearchPaperListQuery = {}, page = 0, size = 10): Observable<PagedResponse<ResearchPaper>> {
        const safePage = Math.max(page, 0);
        const safeSize = Math.max(size, 1);
        const cacheKey = this.buildPageCacheKey(query, safePage, safeSize);
        const cachedPaged$ = this.pagedPapersCache.get(cacheKey);
        const paged$ = cachedPaged$ ?? this.pagedPapersCache.set(cacheKey,
            this.http.get<ApiResponse<PagedResponse<ResearchPaperApiModel> | ResearchPaperApiModel[]>>(
                API_ENDPOINTS.RESEARCH.LIST_PAGED,
                {
                    params: this.buildListParams(query)
                        .set('page', String(safePage))
                        .set('size', String(safeSize))
                }
            ).pipe(
                map((response) => unwrapPaged(response, safePage, safeSize)),
                map((paged) => ({
                    ...paged,
                    content: paged.content.map((paper) => this.toPaperModel(paper))
                })),
                catchError(() => {
                    this.pagedPapersCache.delete(cacheKey);
                    return of(emptyPagedResult<ResearchPaper>(safePage, safeSize));
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            )
        );

        return forkJoin([paged$, this.getBookmarkedPaperIds()]).pipe(
            map(([paged, bookmarkedIds]) => ({
                ...paged,
                content: paged.content.map((paper) => ({
                    ...paper,
                    isBookmarked: bookmarkedIds.has(paper.id)
                }))
            }))
        );
    }

    getPaperById(id: string): Observable<ResearchPaper | undefined> {
        const cacheKey = (id ?? '').trim();
        if (!cacheKey) {
            return of(undefined);
        }

        const cachedPaper$ = this.paperDetailCache.get(cacheKey);
        const paper$ = cachedPaper$ ?? this.paperDetailCache.set(cacheKey,
            this.http.get<ApiResponse<ResearchPaperApiModel>>(API_ENDPOINTS.RESEARCH.DETAIL(id)).pipe(
                map((response) => this.toPaperModel(unwrap(response))),
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

    getMyPapers(_currentUser: AuthUser, bypassCache = false): Observable<ResearchPaper[]> {
        const cacheKey = authSignal.user()?.id ?? 'anonymous';

        if (bypassCache) {
            this.myPapersCache.delete(cacheKey);
        }

        const cachedPapers$ = this.myPapersCache.get(cacheKey);
        if (cachedPapers$) {
            return cachedPapers$;
        }

        const request$ = this.http.get<ApiResponse<ResearchPaperApiModel[]>>(API_ENDPOINTS.RESEARCH.MY_PAPERS).pipe(
            map((response) => unwrapList(response).map((paper) => this.toPaperModel(paper))),
            catchError(() => {
                this.myPapersCache.delete(cacheKey);
                return of([]);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.myPapersCache.set(cacheKey, request$);
    }

    searchStudentAuthorsByStudentId(query: string): Observable<ResearchStudentAuthorCandidate[]> {
        const keyword = (query ?? '').trim();
        if (keyword.length < 2) {
            return of([]);
        }

        return this.http.get<ApiResponse<ResearchStudentAuthorCandidateApiModel[]>>(
            API_ENDPOINTS.RESEARCH.STUDENT_AUTHOR_SEARCH,
            { params: new HttpParams().set('q', keyword) }
        ).pipe(
            map((response) => unwrapList(response).map((item) => ({
                userId: item.userId?.trim() ?? '',
                studentId: item.studentId?.trim() ?? '',
                fullName: item.fullName?.trim() || UI_LABELS.UNKNOWN_AUTHOR
            }))),
            map((items) => items.filter((item) => item.userId.length > 0 && item.studentId.length > 0)),
            catchError(() => of([]))
        );
    }

    saveFromEditor(payload: ResearchEditorPayload, _currentUser: AuthUser): Observable<ResearchPaper | null> {
        const title = payload.title.trim();
        const abstract = normalizeRichTextHtml(payload.abstract).trim();
        const researchArea = payload.researchArea?.trim();
        const paperType = payload.paperType;
        if (!title || !abstract || !researchArea || !paperType) {
            return of(null);
        }

        const requestBody = {
            title,
            abstract,
            researchArea,
            paperType,
            publicationYear: payload.publicationYear,
            journalConference: payload.journalConference?.trim() || undefined,
            category: payload.category,
            authorName: payload.authorName?.trim() || undefined,
            coAuthorStudentIds: (payload.coAuthorStudentIds ?? [])
                .map((id) => (id ?? '').trim())
                .filter((id) => id.length > 0),
            pdfUrl: payload.pdfUrl
        };

        const request$ = payload.id
            ? this.http.put<ApiResponse<ResearchPaperApiModel>>(API_ENDPOINTS.RESEARCH.DETAIL(payload.id), requestBody)
            : this.http.post<ApiResponse<ResearchPaperApiModel>>(API_ENDPOINTS.RESEARCH.LIST, requestBody);

        return request$.pipe(
            map((response) => this.toPaperModel(unwrap(response))),
            tap(() => this.invalidatePaperCaches())
        );
    }

    deleteMyPaper(paperId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<null>>(API_ENDPOINTS.RESEARCH.DETAIL(paperId)).pipe(
            timeout(15000),
            map((response) => Boolean(response.success)),
            tap((success) => {
                if (success) {
                    this.invalidatePaperCaches();
                }
            }),
            catchError(() => of(false))
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
            map((response) => unwrapList(response)),
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
            map((response) => unwrapList(response).map((item) => this.toBookmarkedPaperModel(item))),
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
            map(() => void 0)
        );
    }

    trackDownload(paperId: string): Observable<void> {
        return this.http.post<ApiResponse<null>>(API_ENDPOINTS.RESEARCH.TRACK_DOWNLOAD(paperId), {}).pipe(
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
                    return resolvePublicAssetUrl(response.data.fileUrl) || response.data.fileUrl;
                })
            );
    }


    private buildListParams(query: ResearchPaperListQuery): HttpParams {
        let params = new HttpParams();
        const keyword = (query.q ?? '').trim();
        const type = query.type && query.type !== 'ALL' ? query.type : '';
        const paperType = query.paperType && query.paperType !== 'ALL' ? query.paperType : '';
        const year = typeof query.year === 'number' && query.year > 0 ? query.year : null;
        const metric = (query.metric ?? '').trim();
        const specializations = (query.specialization ?? [])
            .map((item) => (item ?? '').trim())
            .filter((item) => !!item);

        if (keyword) {
            params = params.set('q', keyword);
        }
        if (type) {
            params = params.set('type', type);
        }
        if (paperType) {
            params = params.set('paperType', paperType);
        }
        if (year != null) {
            params = params.set('year', String(year));
        }
        if (metric) {
            params = params.set('metric', metric);
        }
        specializations.forEach((item) => {
            params = params.append('specialization', item);
        });

        return params;
    }

    private buildListCacheKey(query: ResearchPaperListQuery): string {
        const keyword = (query.q ?? '').trim().toLowerCase();
        const type = query.type && query.type !== 'ALL' ? query.type : '';
        const paperType = query.paperType && query.paperType !== 'ALL' ? query.paperType : '';
        const year = typeof query.year === 'number' && query.year > 0 ? String(query.year) : '';
        const metric = (query.metric ?? '').trim().toLowerCase();
        const specializations = (query.specialization ?? [])
            .map((item) => (item ?? '').trim().toLowerCase())
            .filter((item) => !!item)
            .sort()
            .join('|');
        return `q=${keyword};type=${type};paperType=${paperType};year=${year};metric=${metric};specialization=${specializations}`;
    }

    private buildPageCacheKey(query: ResearchPaperListQuery, page: number, size: number): string {
        return `${this.buildListCacheKey(query)};page=${page};size=${size}`;
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
            name: (author.name?.trim() || UI_LABELS.UNKNOWN_AUTHOR),
            authorType: author.authorType === 'LECTURER' ? 'LECTURER' : 'STUDENT',
            isMainAuthor: author.isMainAuthor ?? author.mainAuthor ?? index === 0,
            authorOrder: author.authorOrder ?? (index + 1),
            canViewProfile: author.canViewProfile ?? true
        }));

        return {
            id: apiPaper.id,
            title: apiPaper.title ?? UI_LABELS.UNTITLED,
            abstract: normalizeRichTextHtml(apiPaper.abstract ?? ''),
            pdfUrl: resolvePublicAssetUrl(apiPaper.pdfUrl) || '',
            paperType: apiPaper.paperType === 'GRADUATION_THESIS' ? 'GRADUATION_THESIS' : 'SCIENTIFIC_RESEARCH',
            publicationYear: apiPaper.publicationYear ?? new Date().getFullYear(),
            journalConference: apiPaper.journalConference ?? UI_LABELS.DEFAULT_JOURNAL,
            researchArea: apiPaper.researchArea ?? UI_LABELS.UNCLASSIFIED,
            category: apiPaper.category === Role.LECTURER ? Role.LECTURER : Role.STUDENT,
            viewCount: apiPaper.viewCount ?? 0,
            downloadCount: apiPaper.downloadCount ?? 0,
            bookmarkCount: apiPaper.bookmarkCount ?? 0,
            approvalStatus: apiPaper.approvalStatus as ApprovalStatus | undefined,
            moderationComment: apiPaper.moderationComment,
            authors: mappedAuthors,
            createdAt: parseDate(apiPaper.createdAt),
            updatedAt: parseDate(apiPaper.updatedAt)
        };
    }

    private toBookmarkedPaperModel(item: ResearchBookmarkApiModel): BookmarkedResearchPaper {
        return {
            paperId: item.paperId ?? '',
            title: item.title?.trim() || UI_LABELS.UNTITLED,
            researchArea: item.researchArea?.trim() || UI_LABELS.UNCLASSIFIED,
            category: item.category === Role.LECTURER ? Role.LECTURER : Role.STUDENT,
            paperType: item.paperType === 'GRADUATION_THESIS' ? 'GRADUATION_THESIS' : 'SCIENTIFIC_RESEARCH',
            publicationYear: item.publicationYear ?? null,
            savedAt: item.savedAt ? parseDate(item.savedAt) : null
        };
    }


    private invalidatePaperCaches(): void {
        this.papersCache.clear();
        this.pagedPapersCache.clear();
        this.paperDetailCache.clear();
        this.myPapersCache.clear();
    }

    private invalidatePublicPaperCaches(paperId?: string): void {
        this.papersCache.clear();
        this.pagedPapersCache.clear();
        if (paperId) {
            this.paperDetailCache.delete((paperId ?? '').trim());
        } else {
            this.paperDetailCache.clear();
        }
    }
}
