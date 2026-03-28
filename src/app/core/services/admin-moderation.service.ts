import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { ModerationActionRequest, ModerationPaperItem, ModerationPostItem } from '../models/admin-moderation.model';
import { emptyPagedResult, unwrapPaged } from '../utils/api-response.util';
import { ApprovalStatus } from '../enums/post-status.enum';

@Injectable({ providedIn: 'root' })
export class AdminModerationService {
    private readonly http = inject(HttpClient);
    private readonly defaultListSize = 100;

    getPostsPaged(
        status: ApprovalStatus = ApprovalStatus.PENDING,
        keyword = '',
        page = 0,
        size = 20
    ): Observable<PagedResponse<ModerationPostItem>> {
        const params = this.buildModerationQueryParams(status, keyword, page, size);
        return this.http.get<ApiResponse<PagedResponse<ModerationPostItem> | ModerationPostItem[]>>(
            API_ENDPOINTS.ADMIN.MODERATION_POSTS,
            { params }
        ).pipe(
            map((response) => unwrapPaged(response, page, size)),
            catchError(() => of(emptyPagedResult<ModerationPostItem>(page, size)))
        );
    }

    getPapersPaged(
        status: ApprovalStatus = ApprovalStatus.PENDING,
        keyword = '',
        page = 0,
        size = 20
    ): Observable<PagedResponse<ModerationPaperItem>> {
        const params = this.buildModerationQueryParams(status, keyword, page, size);
        return this.http.get<ApiResponse<PagedResponse<ModerationPaperItem> | ModerationPaperItem[]>>(
            API_ENDPOINTS.ADMIN.MODERATION_PAPERS,
            { params }
        ).pipe(
            map((response) => unwrapPaged(response, page, size)),
            catchError(() => of(emptyPagedResult<ModerationPaperItem>(page, size)))
        );
    }

    getPosts(status: ApprovalStatus = ApprovalStatus.PENDING): Observable<ModerationPostItem[]> {
        return this.getPostsPaged(status, '', 0, this.defaultListSize).pipe(
            map((result) => result.content)
        );
    }

    getPapers(status: ApprovalStatus = ApprovalStatus.PENDING): Observable<ModerationPaperItem[]> {
        return this.getPapersPaged(status, '', 0, this.defaultListSize).pipe(
            map((result) => result.content)
        );
    }

    approvePost(id: string): Observable<boolean> {
        return this.moderatePost(id, { action: 'APPROVE' });
    }

    rejectPost(id: string, comment?: string): Observable<boolean> {
        return this.moderatePost(id, { action: 'REJECT', comment });
    }

    approvePaper(id: string): Observable<boolean> {
        return this.moderatePaper(id, { action: 'APPROVE' });
    }

    rejectPaper(id: string, comment?: string): Observable<boolean> {
        return this.moderatePaper(id, { action: 'REJECT', comment });
    }

    deletePost(id: string, comment?: string): Observable<boolean> {
        const params = this.buildOptionalCommentParams(comment);
        return this.http
            .delete<ApiResponse<null>>(API_ENDPOINTS.ADMIN.MODERATION_POST_DETAIL(id), { params })
            .pipe(
                map((response) => response.success),
                catchError(() => of(false))
            );
    }

    deletePaper(id: string, comment?: string): Observable<boolean> {
        const params = this.buildOptionalCommentParams(comment);
        return this.http
            .delete<ApiResponse<null>>(API_ENDPOINTS.ADMIN.MODERATION_PAPER_DETAIL(id), { params })
            .pipe(
                map((response) => response.success),
                catchError(() => of(false))
            );
    }

    private moderatePost(id: string, payload: ModerationActionRequest): Observable<boolean> {
        return this.http
            .patch<ApiResponse<null>>(API_ENDPOINTS.ADMIN.MODERATION_POST_DETAIL(id), payload)
            .pipe(
                map((response) => response.success),
                catchError(() => of(false))
            );
    }

    private moderatePaper(id: string, payload: ModerationActionRequest): Observable<boolean> {
        return this.http
            .patch<ApiResponse<null>>(API_ENDPOINTS.ADMIN.MODERATION_PAPER_DETAIL(id), payload)
            .pipe(
                map((response) => response.success),
                catchError(() => of(false))
            );
    }

    private buildOptionalCommentParams(comment?: string): HttpParams {
        const normalizedComment = (comment ?? '').trim();
        return normalizedComment
            ? new HttpParams().set('comment', normalizedComment)
            : new HttpParams();
    }

    private buildModerationQueryParams(
        status: ApprovalStatus,
        keyword: string,
        page: number,
        size: number
    ): HttpParams {
        let params = new HttpParams()
            .set('status', status)
            .set('page', Math.max(page, 0))
            .set('size', Math.max(size, 1));

        const normalizedKeyword = (keyword ?? '').trim();
        if (normalizedKeyword) {
            params = params.set('q', normalizedKeyword);
        }
        return params;
    }
}
