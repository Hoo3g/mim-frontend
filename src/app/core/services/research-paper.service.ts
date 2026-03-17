import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { PaperAuthor, ResearchPaper } from '../models/research-paper.model';
import type { AuthUser } from '../signals/auth.signal';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { authSignal } from '../signals/auth.signal';
import { normalizeRichTextHtml } from '../utils/rich-text.util';

export interface ResearchEditorPayload {
    id?: string;
    title: string;
    abstract: string;
    researchArea: string;
    pdfUrl?: string;
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
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    moderationComment?: string;
    authors?: ResearchPaperApiAuthor[];
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

interface ResearchBookmarkApiModel {
    paperId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchPaperService {
    private readonly http = inject(HttpClient);

    getPapers(): Observable<ResearchPaper[]> {
        const papers$ = this.http.get<ApiResponse<ResearchPaperApiModel[]>>(API_ENDPOINTS.RESEARCH.LIST).pipe(
            map((response) => this.unwrapList(response).map((paper) => this.toPaperModel(paper))),
            catchError(() => of([]))
        );

        return forkJoin([papers$, this.getBookmarkedPaperIds()]).pipe(
            map(([papers, bookmarkedIds]) => papers.map((paper) => ({
                ...paper,
                isBookmarked: bookmarkedIds.has(paper.id)
            })))
        );
    }

    getPaperById(id: string): Observable<ResearchPaper | undefined> {
        const paper$ = this.http.get<ApiResponse<ResearchPaperApiModel>>(API_ENDPOINTS.RESEARCH.DETAIL(id)).pipe(
            map((response) => this.toPaperModel(this.unwrap(response))),
            catchError(() => of(undefined))
        );

        return forkJoin([paper$, this.getBookmarkedPaperIds()]).pipe(
            map(([paper, bookmarkedIds]) => {
                if (!paper) {
                    return undefined;
                }
                return {
                    ...paper,
                    isBookmarked: bookmarkedIds.has(paper.id)
                };
            })
        );
    }

    getMyPaperById(id: string, currentUser: AuthUser): Observable<ResearchPaper | undefined> {
        return this.getMyPapers(currentUser).pipe(
            map((papers) => papers.find((paper) => paper.id === id))
        );
    }

    getMyPapers(_currentUser: AuthUser): Observable<ResearchPaper[]> {
        return this.http.get<ApiResponse<ResearchPaperApiModel[]>>(API_ENDPOINTS.RESEARCH.MY_PAPERS).pipe(
            map((response) => this.unwrapList(response).map((paper) => this.toPaperModel(paper))),
            catchError(() => of([]))
        );
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
            catchError(() => of(null))
        );
    }

    getBookmarkedPaperIds(): Observable<Set<string>> {
        if (!authSignal.isAuth()) {
            return of(new Set<string>());
        }

        return this.http.get<ApiResponse<ResearchBookmarkApiModel[]>>(API_ENDPOINTS.RESEARCH.BOOKMARKS_MY).pipe(
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
            catchError(() => of(new Set<string>()))
        );
    }

    bookmarkPaper(paperId: string): Observable<void> {
        return this.http.post<ApiResponse<null>>(API_ENDPOINTS.RESEARCH.BOOKMARK(paperId), {}).pipe(
            map(() => void 0)
        );
    }

    unbookmarkPaper(paperId: string): Observable<void> {
        return this.http.delete<ApiResponse<null>>(API_ENDPOINTS.RESEARCH.BOOKMARK(paperId)).pipe(
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
            approvalStatus: apiPaper.approvalStatus,
            moderationComment: apiPaper.moderationComment,
            authors: mappedAuthors,
            createdAt: this.toDate(apiPaper.createdAt),
            updatedAt: this.toDate(apiPaper.updatedAt)
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
}
