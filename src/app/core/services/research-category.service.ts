import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ResearchCategory } from '../models/research-category.model';
import { TimedObservableCache } from '../utils/timed-observable-cache.util';

@Injectable({ providedIn: 'root' })
export class ResearchCategoryService {
    private readonly http = inject(HttpClient);
    private readonly categoriesCache = new TimedObservableCache<ResearchCategory[]>(300_000);

    getActiveCategories(): Observable<ResearchCategory[]> {
        const cacheKey = 'active-categories';
        const cachedCategories$ = this.categoriesCache.get(cacheKey);
        if (cachedCategories$) {
            return cachedCategories$;
        }

        const request$ = this.http.get<ApiResponse<ResearchCategory[]>>(API_ENDPOINTS.RESEARCH.CATEGORIES).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return this.normalize(response.data);
            }),
            catchError(() => {
                this.categoriesCache.delete(cacheKey);
                return of([]);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.categoriesCache.set(cacheKey, request$);
    }

    private normalize(items: ResearchCategory[]): ResearchCategory[] {
        return [...items]
            .map((item) => ({
                id: item.id,
                name: item.name,
                sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : 0,
                active: Boolean(item.active),
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
}
