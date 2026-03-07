import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { PaperAuthor, ResearchPaper } from '../models/research-paper.model';
import { MOCK_NEWS, MOCK_PAPERS } from '../../infrastructure/mock/data';
import type { AuthUser } from '../signals/auth.signal';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';

export interface ResearchEditorPayload {
    id?: string;
    title: string;
    abstract: string;
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

@Injectable({
    providedIn: 'root'
})
export class ResearchPaperService {
    private readonly http = inject(HttpClient);

    private readonly mockPapers = MOCK_PAPERS.map((paper) => this.clonePaper(paper));
    private readonly defaultPdfUrl = MOCK_PAPERS[0]?.pdfUrl
        ?? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    getPapers(): Observable<ResearchPaper[]> {
        return this.http.get<ApiResponse<ResearchPaperApiModel[]>>(API_ENDPOINTS.RESEARCH.LIST).pipe(
            map((response) => this.unwrapList(response).map((paper) => this.toPaperModel(paper))),
            catchError(() => of(this.mockPapers.map((paper) => this.clonePaper(paper))))
        );
    }

    getPaperById(id: string): Observable<ResearchPaper | undefined> {
        return this.http.get<ApiResponse<ResearchPaperApiModel>>(API_ENDPOINTS.RESEARCH.DETAIL(id)).pipe(
            map((response) => this.toPaperModel(this.unwrap(response))),
            catchError(() => {
                const fallback = this.mockPapers.find((paper) => paper.id === id);
                return of(fallback ? this.clonePaper(fallback) : undefined);
            })
        );
    }

    getMyPaperById(id: string, currentUser: AuthUser): Observable<ResearchPaper | undefined> {
        return this.getMyPapers(currentUser).pipe(
            map((papers) => papers.find((paper) => paper.id === id))
        );
    }

    getMyPapers(currentUser: AuthUser): Observable<ResearchPaper[]> {
        return this.http.get<ApiResponse<ResearchPaperApiModel[]>>(API_ENDPOINTS.RESEARCH.MY_PAPERS).pipe(
            map((response) => this.unwrapList(response).map((paper) => this.toPaperModel(paper))),
            catchError(() => of(this.mockPapers.filter((paper) => this.isOwnedByUser(paper, currentUser))
                .map((paper) => this.clonePaper(paper))))
        );
    }

    isOwnedByUser(paper: ResearchPaper, currentUser: AuthUser): boolean {
        const mainAuthor = this.getMainAuthor(paper);
        if (!mainAuthor) {
            return false;
        }

        const normalizedAuthor = this.normalize(mainAuthor.name);
        const normalizedEmailPrefix = this.normalize(this.emailPrefix(currentUser.email));

        if (!normalizedEmailPrefix) {
            return mainAuthor.studentId === currentUser.id;
        }

        return mainAuthor.studentId === currentUser.id
            || normalizedAuthor === normalizedEmailPrefix
            || normalizedAuthor.includes(normalizedEmailPrefix)
            || normalizedEmailPrefix.includes(normalizedAuthor);
    }

    saveFromEditor(payload: ResearchEditorPayload, _currentUser: AuthUser): Observable<ResearchPaper | null> {
        const title = payload.title.trim();
        const abstract = payload.abstract.trim();
        if (!title || !abstract) {
            return of(null);
        }

        const requestBody = {
            title,
            abstract,
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

    getNews(): Observable<any[]> {
        return of(MOCK_NEWS);
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
            abstract: apiPaper.abstract ?? '',
            pdfUrl: apiPaper.pdfUrl || this.defaultPdfUrl,
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

    private getMainAuthor(paper: ResearchPaper): PaperAuthor | undefined {
        return paper.authors.find((author) => author.isMainAuthor) ?? paper.authors[0];
    }

    private clonePaper(paper: ResearchPaper): ResearchPaper {
        return {
            ...paper,
            authors: paper.authors.map((author) => ({ ...author })),
            createdAt: new Date(paper.createdAt),
            updatedAt: new Date(paper.updatedAt)
        };
    }

    private emailPrefix(email: string): string {
        return email.split('@')[0]?.trim() ?? '';
    }

    private normalize(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }
}
