import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { HeroImageUploadResponse, ResearchHeroContent, UpdateResearchHeroContentRequest } from '../models/content.model';
import { unwrap, unwrapOr } from '../utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class AdminContentService {
    private readonly http = inject(HttpClient);

    updateResearchHeroContent(payload: UpdateResearchHeroContentRequest): Observable<ResearchHeroContent | null> {
        return this.http.put<ApiResponse<ResearchHeroContent>>(API_ENDPOINTS.ADMIN.CONTENT_RESEARCH_HERO, payload).pipe(
            map((response) => unwrap(response)),
            catchError(() => of(null))
        );
    }

    uploadResearchHeroImage(file: File): Observable<string> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http
            .post<ApiResponse<HeroImageUploadResponse>>(API_ENDPOINTS.STORAGE.RESEARCH_HERO_IMAGE_UPLOAD, formData, {
                withCredentials: true
            })
            .pipe(
                map((response) => {
                    const data = unwrap(response);
                    if (!data.fileUrl) {
                        throw new Error('Upload response missing file URL');
                    }
                    return data.fileUrl;
                })
            );
    }
}
