import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { Post } from '../models/post.model';
import { MOCK_POSTS } from '../../infrastructure/mock/data';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { PendingApplicantResponse, PendingApplicationResponse } from '../models/profile.model';

interface ApiResearchPaperLink {
    id?: string;
    title?: string;
    url?: string;
}

interface ApiPostModel {
    id: string;
    authorId?: string;
    authorName?: string;
    authorAvatarUrl?: string;
    title?: string;
    description?: string;
    requirements?: string;
    achievements?: string;
    benefits?: string;
    postType?: string;
    jobType?: string;
    tags?: string[];
    studentCvUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    researchPaperLinks?: ApiResearchPaperLink[];
    displayInfo?: Record<string, unknown>;
    location?: string;
    salaryRange?: string;
    status?: 'OPEN' | 'CLOSED' | 'DRAFT';
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    moderationComment?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

interface ApiApplyResponse {
    id?: string;
    postId?: string;
    status?: string;
    message?: string;
    cvUrl?: string;
    createdAt?: string | Date;
}

interface ApplyPayload {
    message?: string;
    cvUrl?: string;
}

interface ApiPendingApplication {
    applicationId?: string;
    postId?: string;
    postTitle?: string;
    companyName?: string;
    postType?: string;
    location?: string;
    status?: string;
    appliedAt?: string | Date;
}

interface ApiPendingApplicant {
    applicationId?: string;
    postId?: string;
    postTitle?: string;
    applicantId?: string;
    applicantName?: string;
    message?: string;
    cvUrl?: string;
    appliedAt?: string | Date;
}

@Injectable({
    providedIn: 'root'
})
export class PostService {
    private readonly http = inject(HttpClient);

    getPosts(): Observable<Post[]> {
        return this.http.get<ApiResponse<ApiPostModel[]>>(API_ENDPOINTS.RECRUITMENT.LIST).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data.map((item) => this.toPostModel(item));
            }),
            catchError(() => of(MOCK_POSTS.map((post) => this.clonePost(post))))
        );
    }

    getPostById(id: string): Observable<Post | undefined> {
        return this.http.get<ApiResponse<ApiPostModel>>(API_ENDPOINTS.RECRUITMENT.DETAIL(id)).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return undefined;
                }
                return this.toPostModel(response.data);
            }),
            catchError(() => of(MOCK_POSTS.find((post) => post.id === id)))
        );
    }

    applyToPost(postId: string, payload: ApplyPayload): Observable<ApiApplyResponse> {
        return this.http.post<ApiResponse<ApiApplyResponse>>(API_ENDPOINTS.RECRUITMENT.APPLY(postId), payload).pipe(
            map((response) => this.unwrap(response))
        );
    }

    getMyPendingApplications(): Observable<PendingApplicationResponse[]> {
        return this.http.get<ApiResponse<ApiPendingApplication[]>>(
            `${API_ENDPOINTS.RECRUITMENT.APPLICATIONS_MY}?status=PENDING`
        ).pipe(
            map((response) => this.unwrapList(response).map((item) => this.toPendingApplication(item))),
            catchError(() => of([]))
        );
    }

    getReceivedPendingApplications(): Observable<PendingApplicantResponse[]> {
        return this.http.get<ApiResponse<ApiPendingApplicant[]>>(
            `${API_ENDPOINTS.RECRUITMENT.APPLICATIONS_RECEIVED}?status=PENDING`
        ).pipe(
            map((response) => this.unwrapList(response).map((item) => this.toPendingApplicant(item))),
            catchError(() => of([]))
        );
    }

    private toPostModel(item: ApiPostModel): Post {
        const fallback = MOCK_POSTS.find((post) => post.id === item.id) ?? MOCK_POSTS[0];
        return {
            id: item.id,
            authorId: item.authorId ?? fallback.authorId,
            authorName: item.authorName ?? fallback.authorName,
            authorAvatarUrl: item.authorAvatarUrl ?? fallback.authorAvatarUrl,
            title: item.title ?? fallback.title,
            description: item.description ?? fallback.description,
            requirements: item.requirements ?? fallback.requirements,
            achievements: item.achievements ?? fallback.achievements,
            benefits: item.benefits ?? fallback.benefits,
            postType: (item.postType ?? fallback.postType) as Post['postType'],
            jobType: (item.jobType ?? fallback.jobType) as Post['jobType'],
            tags: item.tags ?? fallback.tags,
            studentCvUrl: item.studentCvUrl ?? fallback.studentCvUrl,
            contactEmail: item.contactEmail ?? fallback.contactEmail,
            contactPhone: item.contactPhone ?? fallback.contactPhone,
            researchPaperLinks: item.researchPaperLinks?.map((paper) => ({
                id: paper.id,
                title: paper.title ?? '',
                url: paper.url ?? ''
            })) ?? fallback.researchPaperLinks,
            displayInfo: item.displayInfo ?? fallback.displayInfo,
            location: item.location ?? fallback.location,
            salaryRange: item.salaryRange ?? fallback.salaryRange,
            status: item.status ?? fallback.status,
            approvalStatus: item.approvalStatus,
            moderationComment: item.moderationComment,
            createdAt: this.toDate(item.createdAt, fallback.createdAt),
            updatedAt: this.toDate(item.updatedAt, fallback.updatedAt)
        };
    }

    private toDate(value: string | Date | undefined, fallback: Date): Date {
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return new Date(fallback);
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

    private toPendingApplication(item: ApiPendingApplication): PendingApplicationResponse {
        return {
            applicationId: item.applicationId ?? '',
            postId: item.postId ?? '',
            postTitle: item.postTitle ?? '',
            companyName: item.companyName ?? '',
            postType: item.postType ?? '',
            location: item.location ?? '',
            status: item.status ?? 'PENDING',
            appliedAt: this.toIsoDate(item.appliedAt)
        };
    }

    private toPendingApplicant(item: ApiPendingApplicant): PendingApplicantResponse {
        return {
            applicationId: item.applicationId ?? '',
            postId: item.postId ?? '',
            postTitle: item.postTitle ?? '',
            applicantId: item.applicantId ?? '',
            applicantName: item.applicantName ?? '',
            message: item.message ?? '',
            cvUrl: item.cvUrl ?? '',
            appliedAt: this.toIsoDate(item.appliedAt)
        };
    }

    private toIsoDate(value?: string | Date): string | null {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString();
            }
        }
        return null;
    }

    private clonePost(post: Post): Post {
        return {
            ...post,
            tags: post.tags ? [...post.tags] : [],
            researchPaperLinks: post.researchPaperLinks?.map((paper) => ({ ...paper })),
            createdAt: new Date(post.createdAt),
            updatedAt: new Date(post.updatedAt)
        };
    }
}
