import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ResearchCategory } from '../models/research-category.model';

@Injectable({ providedIn: 'root' })
export class SpecializationService {
    private readonly http = inject(HttpClient);

    getActiveSpecializations(): Observable<ResearchCategory[]> {
        return this.http.get<ApiResponse<ResearchCategory[]>>(API_ENDPOINTS.RESEARCH.SPECIALIZATIONS).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return this.normalize(response.data);
            }),
            catchError(() => of([]))
        );
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
