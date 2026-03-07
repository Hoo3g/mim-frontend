import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import {
    ProfileAvatarUploadResponse,
    ProfileCvUploadResponse,
    ProfileDashboardResponse,
    ProfileMeResponse,
    UpdateCompanyProfileRequest,
    UpdateLecturerProfileRequest,
    UpdateStudentProfileRequest
} from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
    private readonly http = inject(HttpClient);

    getMe(): Observable<ProfileMeResponse> {
        return this.http.get<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.ME).pipe(
            map((response) => this.unwrap(response))
        );
    }

    getDashboard(): Observable<ProfileDashboardResponse> {
        return this.http.get<ApiResponse<ProfileDashboardResponse>>(API_ENDPOINTS.PROFILE.DASHBOARD).pipe(
            map((response) => this.unwrap(response))
        );
    }

    updateStudentProfile(payload: UpdateStudentProfileRequest): Observable<ProfileMeResponse> {
        return this.http.put<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.STUDENT, payload).pipe(
            map((response) => this.unwrap(response))
        );
    }

    updateCompanyProfile(payload: UpdateCompanyProfileRequest): Observable<ProfileMeResponse> {
        return this.http.put<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.COMPANY, payload).pipe(
            map((response) => this.unwrap(response))
        );
    }

    updateLecturerProfile(payload: UpdateLecturerProfileRequest): Observable<ProfileMeResponse> {
        return this.http.put<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.LECTURER, payload).pipe(
            map((response) => this.unwrap(response))
        );
    }

    uploadDefaultCv(file: File): Observable<ProfileCvUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<ApiResponse<ProfileCvUploadResponse>>(API_ENDPOINTS.STORAGE.PROFILE_CV_UPLOAD, formData).pipe(
            map((response) => this.unwrap(response))
        );
    }

    uploadAvatar(file: File): Observable<ProfileAvatarUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<ApiResponse<ProfileAvatarUploadResponse>>(API_ENDPOINTS.STORAGE.AVATAR_UPLOAD, formData).pipe(
            map((response) => this.unwrap(response))
        );
    }

    private unwrap<T>(response: ApiResponse<T>): T {
        if (!response.success || response.data === null) {
            throw new Error(response.message || 'Request failed');
        }
        return response.data;
    }
}
