import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ResearchCategory } from '../models/research-category.model';
import { TimedObservableCache } from '../utils/timed-observable-cache.util';
import { unwrapList } from '../utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class SpecializationService {
    private readonly http = inject(HttpClient);
    private readonly specializationsCache = new TimedObservableCache<ResearchCategory[]>(300_000);

    getActiveSpecializations(): Observable<ResearchCategory[]> {
        const cacheKey = 'active-specializations';
        const cachedSpecializations$ = this.specializationsCache.get(cacheKey);
        if (cachedSpecializations$) {
            return cachedSpecializations$;
        }

        const request$ = this.http.get<ApiResponse<ResearchCategory[]>>(API_ENDPOINTS.RESEARCH.SPECIALIZATIONS).pipe(
            map((response) => this.normalize(unwrapList(response))),
            catchError(() => {
                this.specializationsCache.delete(cacheKey);
                return of([]);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.specializationsCache.set(cacheKey, request$);
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
