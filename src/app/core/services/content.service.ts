import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { ResearchHeroContent } from '../models/content.model';
import { unwrap } from '../utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class ContentService {
    private readonly http = inject(HttpClient);

    getResearchHeroContent(): Observable<ResearchHeroContent> {
        return this.http.get<ApiResponse<ResearchHeroContent>>(API_ENDPOINTS.CONTENT.RESEARCH_HERO).pipe(
            map((response) => unwrap(response))
        );
    }
}
