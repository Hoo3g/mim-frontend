import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay, tap, timeout } from 'rxjs';

import { Post, PostDisplayInfo } from '../models/post.model';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { PendingApplicantResponse, PendingApplicationResponse } from '../models/profile.model';
import { AuthUser, authSignal } from '../signals/auth.signal';
import { TimedObservableCache } from '../utils/timed-observable-cache.util';
import { emptyPagedResult, parseDate, unwrap, unwrapList, unwrapPaged } from '../utils/api-response.util';
import { ApprovalStatus, PostStatus } from '../enums/post-status.enum';
import { JobType, PostType } from '../enums/post-type.enum';
import { UI_LABELS } from '../constants/ui-labels.const';

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
    status?: PostStatus | string;
    approvalStatus?: ApprovalStatus | string;
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
    applicantPostId?: string;
    applicantEmail?: string;
    status?: string;
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

export interface PostListQuery {
    q?: string;
    type?: 'COMPANY' | 'STUDENT' | null;
    category?: string[] | null;
}

@Injectable({
    providedIn: 'root'
})
export class PostService {
    private readonly http = inject(HttpClient);
    private readonly postsCache = new TimedObservableCache<Post[]>(60_000);
    private readonly postDetailCache = new TimedObservableCache<Post | undefined>(60_000);
    private readonly myPostsCache = new TimedObservableCache<Post[]>(30_000);

    getPosts(query: PostListQuery = {}): Observable<Post[]> {
        const cacheKey = this.buildListCacheKey(query);
        const cachedPosts$ = this.postsCache.get(cacheKey);
        if (cachedPosts$) {
            return cachedPosts$;
        }

        const request$ = this.http.get<ApiResponse<ApiPostModel[]>>(API_ENDPOINTS.RECRUITMENT.LIST, {
            params: this.buildListParams(query)
        }).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data.map((item) => this.toPostModel(item));
            }),
            catchError(() => {
                this.postsCache.delete(cacheKey);
                return of([]);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.postsCache.set(cacheKey, request$);
    }

    getPostsPage(query: PostListQuery = {}, page = 0, size = 10): Observable<PagedResponse<Post>> {
        const safePage = Math.max(page, 0);
        const safeSize = Math.max(size, 1);
        const params = this.buildListParams(query)
            .set('page', String(safePage))
            .set('size', String(safeSize));

        return this.http.get<ApiResponse<PagedResponse<ApiPostModel> | ApiPostModel[]>>(
            API_ENDPOINTS.RECRUITMENT.LIST_PAGED,
            { params }
        ).pipe(
            map((response) => unwrapPaged(response, safePage, safeSize)),
            map((paged) => ({
                ...paged,
                content: paged.content.map((item) => this.toPostModel(item))
            })),
            catchError(() => of(emptyPagedResult<Post>(safePage, safeSize)))
        );
    }

    getMyPosts(authorId: string, bypassCache = false): Observable<Post[]> {
        const cacheKey = authorId.trim() || authSignal.user()?.id || 'anonymous';
        
        if (bypassCache) {
            this.myPostsCache.delete(cacheKey);
        }

        const cachedPosts$ = this.myPostsCache.get(cacheKey);
        if (cachedPosts$) {
            return cachedPosts$;
        }

        const request$ = this.http.get<ApiResponse<ApiPostModel[]>>(API_ENDPOINTS.RECRUITMENT.MY_POSTS).pipe(
            timeout(15000),
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data.map((item) => this.toPostModel(item));
            }),
            catchError(() => {
                this.myPostsCache.delete(cacheKey);
                return of([]);
            }),
            map((posts) => posts
                .filter((post) => post.authorId === authorId)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.myPostsCache.set(cacheKey, request$);
    }

    getPostById(id: string): Observable<Post | undefined> {
        const viewerKey = authSignal.user()?.id ?? 'anonymous';
        const cacheKey = `${viewerKey}:${(id ?? '').trim()}`;
        const cachedPost$ = this.postDetailCache.get(cacheKey);
        if (cachedPost$) {
            return cachedPost$;
        }

        const request$ = this.http.get<ApiResponse<ApiPostModel>>(API_ENDPOINTS.RECRUITMENT.DETAIL(id)).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return undefined;
                }
                return this.toPostModel(response.data);
            }),
            catchError(() => {
                this.postDetailCache.delete(cacheKey);
                return of(undefined);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.postDetailCache.set(cacheKey, request$);
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
            status: payload.status ?? PostStatus.OPEN
        };
        const apiPayload = this.toApiPayload(sanitizedPayload);

        if (postId) {
            return this.http.put<ApiResponse<ApiPostModel>>(API_ENDPOINTS.RECRUITMENT.UPDATE(postId), apiPayload).pipe(
                timeout(20000),
                map((response) => this.toPostModel(unwrap(response))),
                tap(() => this.invalidatePostCaches()),
                map((post) => this.hydrateSavedPost(post, sanitizedPayload, user, postId))
            );
        }

        return this.http.post<ApiResponse<ApiPostModel>>(API_ENDPOINTS.RECRUITMENT.CREATE, apiPayload).pipe(
            timeout(20000),
            map((response) => this.toPostModel(unwrap(response))),
            tap(() => this.invalidatePostCaches()),
            map((post) => this.hydrateSavedPost(post, sanitizedPayload, user))
        );
    }

    deleteMyPost(postId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<null>>(API_ENDPOINTS.RECRUITMENT.DETAIL(postId)).pipe(
            timeout(15000),
            map((response) => Boolean(response.success)),
            tap((success) => {
                if (success) {
                    this.invalidatePostCaches();
                }
            }),
            catchError(() => of(false))
        );
    }

    applyToPost(postId: string, payload: ApplyPayload): Observable<ApiApplyResponse> {
        return this.http.post<ApiResponse<ApiApplyResponse>>(API_ENDPOINTS.RECRUITMENT.APPLY(postId), payload).pipe(
            map((response) => unwrap(response)),
            tap(() => this.postDetailCache.clear())
        );
    }

    cancelApplication(postId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<boolean>>(API_ENDPOINTS.RECRUITMENT.APPLY(postId)).pipe(
            map((response) => Boolean(response.success && response.data)),
            tap((success) => {
                if (success) {
                    this.postDetailCache.clear();
                }
            }),
            catchError(() => of(false))
        );
    }

    getMyPendingApplications(): Observable<PendingApplicationResponse[]> {
        const params = new HttpParams().set('status', ApprovalStatus.PENDING);
        return this.http.get<ApiResponse<ApiPendingApplication[]>>(
            API_ENDPOINTS.RECRUITMENT.APPLICATIONS_MY,
            { params }
        ).pipe(
            map((response) => unwrapList(response).map((item) => this.toPendingApplication(item))),
            catchError(() => of([]))
        );
    }

    getReceivedApplications(status: 'PENDING' | 'REVIEWED' | 'REJECTED' = 'PENDING'): Observable<PendingApplicantResponse[]> {
        const params = new HttpParams().set('status', status);
        return this.http.get<ApiResponse<ApiPendingApplicant[]>>(
            API_ENDPOINTS.RECRUITMENT.APPLICATIONS_RECEIVED,
            { params }
        ).pipe(
            map((response) => unwrapList(response).map((item) => this.toPendingApplicant(item))),
            catchError(() => of([]))
        );
    }

    getReceivedPendingApplications(): Observable<PendingApplicantResponse[]> {
        return this.getReceivedApplications('PENDING');
    }

    deleteReceivedApplication(applicationId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<boolean>>(
            API_ENDPOINTS.RECRUITMENT.APPLICATION_DETAIL(applicationId)
        ).pipe(
            map((response) => Boolean(response.success && response.data)),
            catchError(() => of(false))
        );
    }

    updateReceivedApplicationStatus(applicationId: string, status: 'REVIEWED' | 'REJECTED'): Observable<boolean> {
        const params = new HttpParams().set('status', status);
        return this.http.patch<ApiResponse<boolean>>(
            API_ENDPOINTS.RECRUITMENT.APPLICATION_STATUS(applicationId),
            {},
            { params }
        ).pipe(
            map((response) => Boolean(response.success && response.data)),
            catchError(() => of(false))
        );
    }

    private buildListParams(query: PostListQuery): HttpParams {
        let params = new HttpParams();
        const keyword = (query.q ?? '').trim();
        const type = (query.type ?? '').trim();
        const categories = (query.category ?? [])
            .map((item) => (item ?? '').trim())
            .filter((item) => !!item);

        if (keyword) {
            params = params.set('q', keyword);
        }
        if (type) {
            params = params.set('type', type);
        }
        categories.forEach((item) => {
            params = params.append('category', item);
        });

        return params;
    }

    private buildListCacheKey(query: PostListQuery): string {
        const keyword = (query.q ?? '').trim().toLowerCase();
        const type = (query.type ?? '').trim().toLowerCase();
        const categories = (query.category ?? [])
            .map((item) => (item ?? '').trim().toLowerCase())
            .filter((item) => !!item)
            .sort()
            .join('|');
        return `q=${keyword};type=${type};category=${categories}`;
    }

    private unwrapPaged<T>(
        response: ApiResponse<PagedResponse<T> | T[]>,
        fallbackPage: number,
        fallbackSize: number
    ): PagedResponse<T> {
        if (!response.success || response.data === null) {
            return this.emptyPagedResult<T>(fallbackPage, fallbackSize);
        }

        if (Array.isArray(response.data)) {
            const content = response.data;
            return {
                content,
                pageInfo: {
                    page: 0,
                    size: content.length,
                    totalElements: content.length,
                    totalPages: content.length > 0 ? 1 : 0
                }
            };
        }

        const content = Array.isArray(response.data.content) ? response.data.content : [];
        const rawPageInfo = response.data.pageInfo;
        return {
            content,
            pageInfo: {
                page: rawPageInfo?.page ?? fallbackPage,
                size: rawPageInfo?.size ?? fallbackSize,
                totalElements: rawPageInfo?.totalElements ?? content.length,
                totalPages: rawPageInfo?.totalPages ?? (content.length > 0 ? 1 : 0)
            }
        };
    }

    private emptyPagedResult<T>(page: number, size: number): PagedResponse<T> {
        return {
            content: [],
            pageInfo: {
                page,
                size,
                totalElements: 0,
                totalPages: 0
            }
        };
    }

    private toPostModel(item: ApiPostModel): Post {
        const defaultCreatedAt = new Date();
        return {
            id: item.id,
            authorId: item.authorId ?? '',
            authorName: item.authorName ?? UI_LABELS.UNKNOWN_AUTHOR,
            authorAvatarUrl: item.authorAvatarUrl,
            title: item.title ?? UI_LABELS.UNTITLED,
            description: item.description ?? '',
            requirements: item.requirements,
            achievements: item.achievements,
            benefits: item.benefits,
            postType: (item.postType ?? PostType.COMPANY_RECRUITING_JOB) as Post['postType'],
            jobType: (item.jobType ?? JobType.FULL_TIME) as Post['jobType'],
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
            status: (item.status ?? PostStatus.OPEN) as PostStatus,
            approvalStatus: item.approvalStatus as ApprovalStatus | undefined,
            moderationComment: item.moderationComment,
            createdAt: parseDate(item.createdAt, defaultCreatedAt),
            updatedAt: parseDate(item.updatedAt, defaultCreatedAt)
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
            status: payload.status ?? post.status ?? PostStatus.OPEN,
            approvalStatus: post.approvalStatus ?? ApprovalStatus.PENDING,
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
            if (!id) {
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
            status: item.status ?? ApprovalStatus.PENDING,
            appliedAt: this.toIsoDate(item.appliedAt)
        };
    }

    private toPendingApplicant(item: ApiPendingApplicant): PendingApplicantResponse {
        return {
            applicationId: item.applicationId ?? '',
            postId: item.postId ?? '',
            postTitle: item.postTitle ?? '',
            applicantId: item.applicantId ?? '',
            applicantPostId: item.applicantPostId ?? '',
            applicantEmail: item.applicantEmail ?? '',
            status: item.status ?? 'PENDING',
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

    private invalidatePostCaches(): void {
        this.postsCache.clear();
        this.postDetailCache.clear();
        this.myPostsCache.clear();
    }
}
