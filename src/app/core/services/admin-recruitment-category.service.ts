import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ResearchCategory, UpsertResearchCategoryRequest } from '../models/research-category.model';
import { unwrapList, unwrapOr } from '../utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class AdminRecruitmentCategoryService {
    private readonly http = inject(HttpClient);

    getAll(): Observable<ResearchCategory[]> {
        return this.http.get<ApiResponse<ResearchCategory[]>>(API_ENDPOINTS.ADMIN.RECRUITMENT_CATEGORIES).pipe(
            map((response) => this.normalize(unwrapList(response))),
            catchError(() => of([]))
        );
    }

    create(payload: UpsertResearchCategoryRequest): Observable<ResearchCategory | null> {
        return this.http.post<ApiResponse<ResearchCategory>>(API_ENDPOINTS.ADMIN.RECRUITMENT_CATEGORIES, payload).pipe(
            map((response) => {
                const data = unwrapOr(response, null);
                return data ? this.toItem(data) : null;
            }),
            catchError(() => of(null))
        );
    }

    update(categoryId: string, payload: UpsertResearchCategoryRequest): Observable<ResearchCategory | null> {
        return this.http.put<ApiResponse<ResearchCategory>>(API_ENDPOINTS.ADMIN.RECRUITMENT_CATEGORY_DETAIL(categoryId), payload).pipe(
            map((response) => {
                const data = unwrapOr(response, null);
                return data ? this.toItem(data) : null;
            }),
            catchError(() => of(null))
        );
    }

    delete(categoryId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<null>>(API_ENDPOINTS.ADMIN.RECRUITMENT_CATEGORY_DETAIL(categoryId)).pipe(
            map((response) => !!response.success),
            catchError(() => of(false))
        );
    }

    private normalize(items: ResearchCategory[]): ResearchCategory[] {
        return [...items]
            .map((item) => this.toItem(item))
            .sort((a, b) => {
                if (a.active !== b.active) {
                    return a.active ? -1 : 1;
                }
                return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
            });
    }

    private toItem(item: ResearchCategory): ResearchCategory {
        return {
            id: item.id,
            name: item.name,
            sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : 0,
            active: Boolean(item.active),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        };
    }
}
