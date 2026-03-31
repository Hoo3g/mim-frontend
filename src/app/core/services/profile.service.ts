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
import { unwrap } from '../utils/api-response.util';
import { resolvePublicAssetUrl } from '../utils/public-asset-url.util';

@Injectable({ providedIn: 'root' })
export class ProfileService {
    private http = inject(HttpClient);

    getById(userId: string): Observable<ProfileMeResponse> {
        return this.http.get<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.DETAIL(userId)).pipe(
            map((response) => this.normalizeProfileUrls(unwrap(response)))
        );
    }

    getMe(): Observable<ProfileMeResponse> {
        return this.http.get<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.ME).pipe(
            map((response) => this.normalizeProfileUrls(unwrap(response)))
        );
    }

    getDashboard(): Observable<ProfileDashboardResponse> {
        return this.http.get<ApiResponse<ProfileDashboardResponse>>(API_ENDPOINTS.PROFILE.DASHBOARD).pipe(
            map((response) => unwrap(response))
        );
    }

    updateStudentProfile(payload: UpdateStudentProfileRequest): Observable<ProfileMeResponse> {
        return this.http.put<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.STUDENT, payload).pipe(
            map((response) => this.normalizeProfileUrls(unwrap(response)))
        );
    }

    updateCompanyProfile(payload: UpdateCompanyProfileRequest): Observable<ProfileMeResponse> {
        return this.http.put<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.COMPANY, payload).pipe(
            map((response) => this.normalizeProfileUrls(unwrap(response)))
        );
    }

    updateLecturerProfile(payload: UpdateLecturerProfileRequest): Observable<ProfileMeResponse> {
        return this.http.put<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.LECTURER, payload).pipe(
            map((response) => this.normalizeProfileUrls(unwrap(response)))
        );
    }

    uploadDefaultCv(file: File): Observable<ProfileCvUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<ApiResponse<ProfileCvUploadResponse>>(API_ENDPOINTS.STORAGE.PROFILE_CV_UPLOAD, formData).pipe(
            map((response) => {
                const data = unwrap(response);
                return {
                    ...data,
                    fileUrl: resolvePublicAssetUrl(data.fileUrl)
                };
            })
        );
    }

    uploadAvatar(file: File): Observable<ProfileAvatarUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<ApiResponse<ProfileAvatarUploadResponse>>(API_ENDPOINTS.STORAGE.AVATAR_UPLOAD, formData).pipe(
            map((response) => {
                const data = unwrap(response);
                return {
                    ...data,
                    fileUrl: resolvePublicAssetUrl(data.fileUrl)
                };
            })
        );
    }

    private normalizeProfileUrls(profile: ProfileMeResponse): ProfileMeResponse {
        return {
            ...profile,
            avatarUrl: resolvePublicAssetUrl(profile.avatarUrl) || null,
            student: profile.student ? {
                ...profile.student,
                cvUrl: resolvePublicAssetUrl(profile.student.cvUrl) || null
            } : profile.student,
            company: profile.company ? {
                ...profile.company,
                logoUrl: resolvePublicAssetUrl(profile.company.logoUrl) || null
            } : profile.company,
            lecturer: profile.lecturer ? {
                ...profile.lecturer,
                avatarUrl: resolvePublicAssetUrl(profile.lecturer.avatarUrl) || null
            } : profile.lecturer
        };
    }
}
