import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ResearchCategory, UpsertResearchCategoryRequest } from '../models/research-category.model';

@Injectable({ providedIn: 'root' })
export class AdminResearchCategoryService {
    private readonly http = inject(HttpClient);

    getAll(): Observable<ResearchCategory[]> {
        return this.http.get<ApiResponse<ResearchCategory[]>>(API_ENDPOINTS.ADMIN.RESEARCH_CATEGORIES).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return this.normalize(response.data);
            }),
            catchError(() => of([]))
        );
    }

    create(payload: UpsertResearchCategoryRequest): Observable<ResearchCategory | null> {
        return this.http.post<ApiResponse<ResearchCategory>>(API_ENDPOINTS.ADMIN.RESEARCH_CATEGORIES, payload).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return null;
                }
                return this.toItem(response.data);
            }),
            catchError(() => of(null))
        );
    }

    update(categoryId: string, payload: UpsertResearchCategoryRequest): Observable<ResearchCategory | null> {
        return this.http.put<ApiResponse<ResearchCategory>>(API_ENDPOINTS.ADMIN.RESEARCH_CATEGORY_DETAIL(categoryId), payload).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return null;
                }
                return this.toItem(response.data);
            }),
            catchError(() => of(null))
        );
    }

    deactivate(categoryId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<null>>(API_ENDPOINTS.ADMIN.RESEARCH_CATEGORY_DETAIL(categoryId)).pipe(
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
