import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ResearchHeroContent } from '../models/content.model';
import { unwrap } from '../utils/api-response.util';
import { TimedObservableCache } from '../utils/timed-observable-cache.util';

@Injectable({ providedIn: 'root' })
export class ContentService {
    private readonly http = inject(HttpClient);
    private readonly researchHeroCache = new TimedObservableCache<ResearchHeroContent>(5 * 60 * 1000);
    private readonly researchHeroCacheKey = 'research-hero';

    getResearchHeroContent(): Observable<ResearchHeroContent> {
        const cached = this.researchHeroCache.get(this.researchHeroCacheKey);
        if (cached) {
            return cached;
        }

        const request$ = this.http.get<ApiResponse<ResearchHeroContent>>(API_ENDPOINTS.CONTENT.RESEARCH_HERO).pipe(
            map((response) => unwrap(response)),
            catchError((error) => {
                this.researchHeroCache.delete(this.researchHeroCacheKey);
                return throwError(() => error);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.researchHeroCache.set(this.researchHeroCacheKey, request$);
    }

    invalidateResearchHeroContentCache(): void {
        this.researchHeroCache.delete(this.researchHeroCacheKey);
    }
}
