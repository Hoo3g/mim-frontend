import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, timeout } from 'rxjs';

import { Post, PostDisplayInfo } from '../models/post.model';
import { MOCK_POSTS } from '../../infrastructure/mock/data';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { PendingApplicantResponse, PendingApplicationResponse } from '../models/profile.model';
import { AuthUser, authSignal } from '../signals/auth.signal';

const LOCAL_POSTS_STORAGE_KEY = 'mim.recruitment.local.posts';

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
            catchError(() => of(MOCK_POSTS.map((post) => this.clonePost(post))))
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
            catchError(() => this.getPosts()),
            map((posts) => posts
                .filter((post) => post.authorId === authorId)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
        );
    }

    getPostById(id: string): Observable<Post | undefined> {
        const localPost = this.findLocalPost(id);

        return this.http.get<ApiResponse<ApiPostModel>>(API_ENDPOINTS.RECRUITMENT.DETAIL(id)).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return undefined;
                }
                return this.toPostModel(response.data);
            }),
            map((remotePost) => localPost ? this.clonePost(localPost) : remotePost),
            catchError(() => {
                if (localPost) {
                    return of(this.clonePost(localPost));
                }
                const mock = MOCK_POSTS.find((post) => post.id === id);
                return of(mock ? this.clonePost(mock) : undefined);
            })
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
        const fallback = MOCK_POSTS.find((post) => post.id === item.id);
        const defaultCreatedAt = new Date();
        return {
            id: item.id,
            authorId: item.authorId ?? fallback?.authorId ?? '',
            authorName: item.authorName ?? fallback?.authorName ?? 'Unknown',
            authorAvatarUrl: item.authorAvatarUrl ?? fallback?.authorAvatarUrl,
            title: item.title ?? fallback?.title ?? 'Untitled',
            description: item.description ?? fallback?.description ?? '',
            requirements: item.requirements ?? fallback?.requirements,
            achievements: item.achievements ?? fallback?.achievements,
            benefits: item.benefits ?? fallback?.benefits,
            postType: (item.postType ?? fallback?.postType ?? 'COMPANY_RECRUITING_JOB') as Post['postType'],
            jobType: (item.jobType ?? fallback?.jobType ?? 'FULL_TIME') as Post['jobType'],
            tags: item.tags ?? fallback?.tags ?? [],
            studentCvUrl: item.studentCvUrl ?? fallback?.studentCvUrl,
            contactEmail: item.contactEmail ?? fallback?.contactEmail,
            contactPhone: item.contactPhone ?? fallback?.contactPhone,
            researchPaperLinks: item.researchPaperLinks?.map((paper) => ({
                id: paper.id,
                title: paper.title ?? '',
                url: paper.url ?? ''
            })) ?? fallback?.researchPaperLinks ?? [],
            displayInfo: item.displayInfo ?? fallback?.displayInfo,
            location: item.location ?? fallback?.location,
            salaryRange: item.salaryRange ?? fallback?.salaryRange,
            status: item.status ?? fallback?.status ?? 'OPEN',
            approvalStatus: item.approvalStatus,
            moderationComment: item.moderationComment,
            createdAt: this.toDate(item.createdAt, fallback?.createdAt ?? defaultCreatedAt),
            updatedAt: this.toDate(item.updatedAt, fallback?.updatedAt ?? defaultCreatedAt)
        };
    }

    private hydrateSavedPost(
        post: Post,
        payload: PostEditorPayload,
        user: AuthUser,
        existingId?: string
    ): Post {
        const existing = existingId ? this.findLocalPost(existingId) : undefined;
        const now = new Date();
        const hydrated: Post = {
            ...post,
            id: post.id || existingId || this.generateLocalId(),
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
            status: payload.status ?? post.status ?? existing?.status ?? 'OPEN',
            approvalStatus: post.approvalStatus ?? existing?.approvalStatus ?? 'PENDING',
            createdAt: post.createdAt ?? existing?.createdAt ?? now,
            updatedAt: post.updatedAt ?? now
        };

        this.persistLocalPost(hydrated);
        return hydrated;
    }

    private createLocalPost(payload: PostEditorPayload, user: AuthUser): Post {
        const now = new Date();
        const localPost: Post = {
            id: this.generateLocalId(),
            authorId: user.id,
            authorName: user.fullName || this.emailName(user.email),
            authorAvatarUrl: user.avatarUrl,
            title: payload.title,
            description: payload.description,
            requirements: payload.requirements,
            achievements: payload.achievements,
            benefits: payload.benefits,
            postType: payload.postType,
            jobType: payload.jobType,
            tags: payload.tags ?? [],
            studentCvUrl: payload.studentCvUrl,
            contactEmail: payload.contactEmail ?? user.email,
            contactPhone: payload.contactPhone,
            researchPaperLinks: payload.researchPaperLinks ?? [],
            displayInfo: payload.displayInfo,
            location: payload.location ?? '',
            salaryRange: payload.salaryRange,
            status: payload.status ?? 'OPEN',
            approvalStatus: 'PENDING',
            createdAt: now,
            updatedAt: now
        };

        this.persistLocalPost(localPost);
        return this.clonePost(localPost);
    }

    private upsertLocalPost(postId: string, payload: PostEditorPayload, user: AuthUser): Post {
        const current = this.findLocalPost(postId) ?? MOCK_POSTS.find((post) => post.id === postId);
        const now = new Date();

        const localPost: Post = {
            id: postId,
            authorId: user.id,
            authorName: user.fullName || this.emailName(user.email),
            authorAvatarUrl: user.avatarUrl,
            title: payload.title,
            description: payload.description,
            requirements: payload.requirements,
            achievements: payload.achievements,
            benefits: payload.benefits,
            postType: payload.postType,
            jobType: payload.jobType,
            tags: payload.tags ?? [],
            studentCvUrl: payload.studentCvUrl ?? current?.studentCvUrl,
            contactEmail: payload.contactEmail ?? user.email,
            contactPhone: payload.contactPhone,
            researchPaperLinks: payload.researchPaperLinks ?? current?.researchPaperLinks ?? [],
            displayInfo: payload.displayInfo ?? current?.displayInfo,
            location: payload.location ?? '',
            salaryRange: payload.salaryRange,
            status: payload.status ?? current?.status ?? 'OPEN',
            approvalStatus: current?.approvalStatus ?? 'PENDING',
            moderationComment: current?.moderationComment,
            createdAt: current?.createdAt ? new Date(current.createdAt) : now,
            updatedAt: now
        };

        this.persistLocalPost(localPost);
        return this.clonePost(localPost);
    }

    private mergeWithLocalPosts(remotePosts: Post[]): Post[] {
        const merged = new Map<string, Post>();
        const currentUserId = authSignal.user()?.id;

        remotePosts.forEach((post) => {
            merged.set(post.id, this.clonePost(post));
        });

        this.readLocalPosts().forEach((post) => {
            if (!currentUserId || post.authorId !== currentUserId) {
                return;
            }
            merged.set(post.id, this.clonePost(post));
        });

        return Array.from(merged.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    private persistLocalPost(post: Post): void {
        const localPosts = this.readLocalPosts();
        const index = localPosts.findIndex((item) => item.id === post.id);
        const cloned = this.clonePost(post);

        if (index >= 0) {
            localPosts[index] = cloned;
        } else {
            localPosts.push(cloned);
        }

        this.writeLocalPosts(localPosts);
    }

    private findLocalPost(postId: string): Post | undefined {
        return this.readLocalPosts().find((post) => post.id === postId);
    }

    private readLocalPosts(): Post[] {
        if (!this.canUseStorage()) {
            return [];
        }

        try {
            const raw = localStorage.getItem(LOCAL_POSTS_STORAGE_KEY);
            if (!raw) {
                return [];
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed
                .map((item: unknown) => this.mapStoragePost(item))
                .filter((item): item is Post => !!item);
        } catch {
            return [];
        }
    }

    private writeLocalPosts(posts: Post[]): void {
        if (!this.canUseStorage()) {
            return;
        }

        localStorage.setItem(
            LOCAL_POSTS_STORAGE_KEY,
            JSON.stringify(posts.map((item) => ({
                ...item,
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString()
            })))
        );
    }

    private mapStoragePost(input: unknown): Post | null {
        if (!input || typeof input !== 'object') {
            return null;
        }

        const item = input as Partial<Post>;
        if (!item.id || !item.authorId || !item.title || !item.description || !item.postType || !item.jobType) {
            return null;
        }

        const fallback = MOCK_POSTS[0];
        return {
            id: item.id,
            authorId: item.authorId,
            authorName: item.authorName ?? fallback.authorName,
            authorAvatarUrl: item.authorAvatarUrl,
            title: item.title,
            description: item.description,
            requirements: item.requirements,
            achievements: item.achievements,
            benefits: item.benefits,
            postType: item.postType,
            jobType: item.jobType,
            tags: Array.isArray(item.tags) ? item.tags : [],
            studentCvUrl: item.studentCvUrl,
            contactEmail: item.contactEmail,
            contactPhone: item.contactPhone,
            researchPaperLinks: Array.isArray(item.researchPaperLinks)
                ? item.researchPaperLinks.map((paper) => ({ ...paper }))
                : [],
            displayInfo: item.displayInfo,
            location: item.location,
            salaryRange: item.salaryRange,
            status: item.status ?? 'OPEN',
            approvalStatus: item.approvalStatus,
            moderationComment: item.moderationComment,
            createdAt: this.toDate(item.createdAt, new Date()),
            updatedAt: this.toDate(item.updatedAt, new Date())
        };
    }

    private canUseStorage(): boolean {
        return typeof localStorage !== 'undefined';
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

    private generateLocalId(): string {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID();
        }

        return `local-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
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
