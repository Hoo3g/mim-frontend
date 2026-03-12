import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ResearchHeroContent } from '../models/content.model';

@Injectable({ providedIn: 'root' })
export class ContentService {
    private readonly http = inject(HttpClient);

    getResearchHeroContent(): Observable<ResearchHeroContent> {
        return this.http.get<ApiResponse<ResearchHeroContent>>(API_ENDPOINTS.CONTENT.RESEARCH_HERO).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    throw new Error(response.message || 'Failed to load research hero content');
                }
                return response.data;
            })
        );
    }
}
