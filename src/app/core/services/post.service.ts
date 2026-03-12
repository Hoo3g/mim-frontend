import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, timeout } from 'rxjs';

import { Post, PostDisplayInfo } from '../models/post.model';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { PendingApplicantResponse, PendingApplicationResponse } from '../models/profile.model';
import { AuthUser } from '../signals/auth.signal';

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

export interface PostEditorPayload {
    title: string;
    description: string;
    postType: Post['postType'];
    jobType: Post['jobType'];
    requirements?: string;
    achievements?: string;
    benefits?: string;
    location?: string;
    salaryRange?: string;
    contactEmail?: string;
    contactPhone?: string;
    tags?: string[];
    status?: Post['status'];
    studentCvUrl?: string;
    researchPaperLinks?: { id: string; title: string; url: string }[];
    displayInfo?: PostDisplayInfo;
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
            catchError(() => of([]))
        );
    }

    getMyPosts(authorId: string): Observable<Post[]> {
        return this.http.get<ApiResponse<ApiPostModel[]>>(API_ENDPOINTS.RECRUITMENT.MY_POSTS).pipe(
            timeout(15000),
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data.map((item) => this.toPostModel(item));
            }),
            catchError(() => of([])),
            map((posts) => posts
                .filter((post) => post.authorId === authorId)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
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
            catchError(() => of(undefined))
        );
    }

    saveMyPost(payload: PostEditorPayload, user: AuthUser, postId?: string): Observable<Post> {
        const sanitizedPayload: PostEditorPayload = {
            ...payload,
            tags: this.normalizeTags(payload.tags),
            title: (payload.title ?? '').trim(),
            description: (payload.description ?? '').trim(),
            location: this.normalizeNullableText(payload.location),
            salaryRange: this.normalizeNullableText(payload.salaryRange),
            requirements: this.normalizeNullableText(payload.requirements),
            achievements: this.normalizeNullableText(payload.achievements),
            benefits: this.normalizeNullableText(payload.benefits),
            contactEmail: this.normalizeNullableText(payload.contactEmail),
            contactPhone: this.normalizeNullableText(payload.contactPhone),
            studentCvUrl: this.normalizeNullableText(payload.studentCvUrl),
            researchPaperLinks: this.normalizeResearchPaperLinks(payload.researchPaperLinks),
            displayInfo: this.normalizeDisplayInfo(payload.displayInfo),
            status: payload.status ?? 'OPEN'
        };
        const apiPayload = this.toApiPayload(sanitizedPayload);

        if (postId) {
            return this.http.put<ApiResponse<ApiPostModel>>(API_ENDPOINTS.RECRUITMENT.UPDATE(postId), apiPayload).pipe(
                timeout(20000),
                map((response) => this.toPostModel(this.unwrap(response))),
                map((post) => this.hydrateSavedPost(post, sanitizedPayload, user, postId))
            );
        }

        return this.http.post<ApiResponse<ApiPostModel>>(API_ENDPOINTS.RECRUITMENT.CREATE, apiPayload).pipe(
            timeout(20000),
            map((response) => this.toPostModel(this.unwrap(response))),
            map((post) => this.hydrateSavedPost(post, sanitizedPayload, user))
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
        const defaultCreatedAt = new Date();
        return {
            id: item.id,
            authorId: item.authorId ?? '',
            authorName: item.authorName ?? 'Unknown',
            authorAvatarUrl: item.authorAvatarUrl,
            title: item.title ?? 'Untitled',
            description: item.description ?? '',
            requirements: item.requirements,
            achievements: item.achievements,
            benefits: item.benefits,
            postType: (item.postType ?? 'COMPANY_RECRUITING_JOB') as Post['postType'],
            jobType: (item.jobType ?? 'FULL_TIME') as Post['jobType'],
            tags: item.tags ?? [],
            studentCvUrl: item.studentCvUrl,
            contactEmail: item.contactEmail,
            contactPhone: item.contactPhone,
            researchPaperLinks: item.researchPaperLinks?.map((paper) => ({
                id: paper.id,
                title: paper.title ?? '',
                url: paper.url ?? ''
            })) ?? [],
            displayInfo: item.displayInfo,
            location: item.location,
            salaryRange: item.salaryRange,
            status: item.status ?? 'OPEN',
            approvalStatus: item.approvalStatus,
            moderationComment: item.moderationComment,
            createdAt: this.toDate(item.createdAt, defaultCreatedAt),
            updatedAt: this.toDate(item.updatedAt, defaultCreatedAt)
        };
    }

    private hydrateSavedPost(
        post: Post,
        payload: PostEditorPayload,
        user: AuthUser,
        existingId?: string
    ): Post {
        const now = new Date();
        return {
            ...post,
            id: post.id || existingId || '',
            authorId: post.authorId || user.id,
            authorName: post.authorName || user.fullName || this.emailName(user.email),
            authorAvatarUrl: post.authorAvatarUrl || user.avatarUrl,
            title: payload.title,
            description: payload.description,
            requirements: payload.requirements,
            achievements: payload.achievements,
            benefits: payload.benefits,
            postType: payload.postType,
            jobType: payload.jobType,
            tags: payload.tags ?? [],
            studentCvUrl: payload.studentCvUrl,
            researchPaperLinks: payload.researchPaperLinks ?? [],
            displayInfo: payload.displayInfo,
            location: payload.location ?? '',
            salaryRange: payload.salaryRange,
            contactEmail: payload.contactEmail ?? user.email,
            contactPhone: payload.contactPhone,
            status: payload.status ?? post.status ?? 'OPEN',
            approvalStatus: post.approvalStatus ?? 'PENDING',
            createdAt: post.createdAt ?? now,
            updatedAt: post.updatedAt ?? now
        };
    }

    private normalizeTags(tags?: string[]): string[] {
        if (!tags || tags.length === 0) {
            return [];
        }

        const normalized = tags
            .map((item) => (item ?? '').trim())
            .filter((item) => !!item);

        return normalized.filter((item, index, arr) => arr.indexOf(item) === index);
    }

    private normalizeNullableText(value?: string): string | undefined {
        if (value === undefined) {
            return undefined;
        }

        const normalized = value.trim();
        return normalized ? normalized : undefined;
    }

    private normalizeResearchPaperLinks(
        links?: { id: string; title: string; url: string }[]
    ): { id: string; title: string; url: string }[] {
        if (!Array.isArray(links) || links.length === 0) {
            return [];
        }

        const dedup = new Map<string, { id: string; title: string; url: string }>();
        links.forEach((item) => {
            const id = (item?.id ?? '').trim();
            const title = (item?.title ?? '').trim();
            const url = (item?.url ?? '').trim();
            if (!id || !title || !url) {
                return;
            }
            dedup.set(id, { id, title, url });
        });

        return Array.from(dedup.values());
    }

    private normalizeDisplayInfo(info?: PostDisplayInfo): PostDisplayInfo | undefined {
        if (!info || typeof info !== 'object') {
            return undefined;
        }

        const normalized: PostDisplayInfo = {};
        Object.entries(info).forEach(([key, value]) => {
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed) {
                    normalized[key] = trimmed;
                }
                return;
            }

            if (typeof value === 'number' || typeof value === 'boolean') {
                normalized[key] = value;
            }
        });

        return Object.keys(normalized).length > 0 ? normalized : undefined;
    }

    private toApiPayload(payload: PostEditorPayload): Record<string, unknown> {
        return {
            title: payload.title,
            description: payload.description,
            postType: payload.postType,
            jobType: payload.jobType,
            requirements: payload.requirements,
            achievements: payload.achievements,
            benefits: payload.benefits,
            location: payload.location,
            salaryRange: payload.salaryRange,
            contactEmail: payload.contactEmail,
            contactPhone: payload.contactPhone,
            tags: payload.tags,
            status: payload.status,
            studentCvUrl: payload.studentCvUrl,
            researchPaperLinks: payload.researchPaperLinks,
            displayInfo: payload.displayInfo
        };
    }

    private emailName(email: string): string {
        const value = (email ?? '').trim();
        if (!value.includes('@')) {
            return value || 'Nguoi dung';
        }

        return value.split('@')[0];
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
