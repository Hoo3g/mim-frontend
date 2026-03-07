import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ModerationActionRequest, ModerationPaperItem, ModerationPostItem } from '../models/admin-moderation.model';

@Injectable({ providedIn: 'root' })
export class AdminModerationService {
    private readonly http = inject(HttpClient);

    getPosts(status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING'): Observable<ModerationPostItem[]> {
        const params = new HttpParams().set('status', status);
        return this.http.get<ApiResponse<ModerationPostItem[]>>(API_ENDPOINTS.ADMIN.MODERATION_POSTS, { params }).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data;
            }),
            catchError(() => of([]))
        );
    }

    getPapers(status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING'): Observable<ModerationPaperItem[]> {
        const params = new HttpParams().set('status', status);
        return this.http.get<ApiResponse<ModerationPaperItem[]>>(API_ENDPOINTS.ADMIN.MODERATION_PAPERS, { params }).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data;
            }),
            catchError(() => of([]))
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

    private moderatePost(id: string, payload: ModerationActionRequest): Observable<boolean> {
        return this.http
            .patch<ApiResponse<null>>(API_ENDPOINTS.ADMIN.MODERATION_POSTS + `/${id}`, payload)
            .pipe(
                map((response) => response.success),
                catchError(() => of(false))
            );
    }

    private moderatePaper(id: string, payload: ModerationActionRequest): Observable<boolean> {
        return this.http
            .patch<ApiResponse<null>>(API_ENDPOINTS.ADMIN.MODERATION_PAPERS + `/${id}`, payload)
            .pipe(
                map((response) => response.success),
                catchError(() => of(false))
            );
    }
}
