import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import {
    AuthResponse,
    GoogleLoginRequest,
    LoginRequest,
    UserType
} from '../../features/auth/models/auth.model';
import { authSignal } from '../signals/auth.signal';
import { Role } from '../enums/role.enum';
import { ROUTES } from '../constants/route.const';
import { ProfileMeResponse } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    login(request: LoginRequest): Observable<AuthResponse> {
        return this.http.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.LOGIN, request, { withCredentials: true }).pipe(
            map((response) => this.unwrap(response)),
            map((auth) => this.persistAuth(auth))
        );
    }

    loginWithGoogle(idToken: string, userType: UserType = 'STUDENT'): Observable<AuthResponse> {
        const payload: GoogleLoginRequest = { idToken, userType };

        return this.http.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.GOOGLE_LOGIN, payload, { withCredentials: true }).pipe(
            map((response) => this.unwrap(response)),
            map((auth) => this.persistAuth(auth))
        );
    }

    refreshToken(): Observable<AuthResponse> {
        return this.http.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REFRESH, {}, { withCredentials: true }).pipe(
            map((response) => this.unwrap(response)),
            map((auth) => this.persistAuth(auth))
        );
    }

    logout(): Observable<void> {
        return this.http.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT, {}, { withCredentials: true }).pipe(
            map(() => void 0),
            catchError((error: HttpErrorResponse) => {
                // Force local logout even if backend token already expired/revoked.
                console.warn('Logout API returned an error, clearing local auth anyway.', error);
                return of(void 0);
            }),
            map(() => {
                authSignal.clearAuth();
                this.router.navigateByUrl(ROUTES.HOME);
            })
        );
    }

    private unwrap<T>(response: ApiResponse<T>): T {
        if (!response.success || response.data === null) {
            throw new Error(response.message || 'Request failed');
        }
        return response.data;
    }

    private persistAuth(auth: AuthResponse): AuthResponse {
        const roles = Array.isArray(auth.user.roles) ? auth.user.roles : [];
        const permissions = Array.isArray(auth.user.permissions)
            ? [...new Set(auth.user.permissions
                .map((permission) => (permission ?? '').toString().trim().toUpperCase())
                .filter((permission) => !!permission))]
            : [];
        const primaryRole = this.pickRole(roles);
        const fullName = this.buildDisplayName(auth.user.email, auth.user.fullName ?? undefined);

        authSignal.setAuth(
            {
                id: auth.user.id,
                email: auth.user.email,
                fullName,
                role: primaryRole,
                permissions,
                avatarUrl: auth.user.avatarUrl ?? undefined
            },
            auth.accessToken
        );

        this.syncProfileFromBackend();
        return auth;
    }

    private pickRole(roles: string[]): Role {
        const normalizedRoles = roles
            .map((role) => role?.toUpperCase?.() ?? '')
            .filter((role) => !!role);

        if (normalizedRoles.includes(Role.ADMIN)) return Role.ADMIN;
        if (normalizedRoles.includes(Role.LECTURER)) return Role.LECTURER;
        if (normalizedRoles.includes(Role.COMPANY)) return Role.COMPANY;
        return Role.STUDENT;
    }

    syncProfileFromBackend(): void {
        if (!authSignal.isAuth() || !authSignal.token()) {
            return;
        }

        this.http.get<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.ME).pipe(
            map((response) => this.unwrap(response)),
            catchError(() => of(null))
        ).subscribe((profile) => {
            if (!profile) {
                return;
            }

            authSignal.updateUserInfo({
                fullName: this.buildDisplayNameFromProfile(profile),
                avatarUrl: profile.avatarUrl ?? undefined
            });
        });
    }

    private buildDisplayName(email: string, fullName?: string): string {
        if (fullName && fullName.trim()) {
            return fullName.trim();
        }
        const localPart = email.split('@')[0]?.trim();
        return localPart ? localPart : email;
    }

    private buildDisplayNameFromProfile(profile: ProfileMeResponse): string {
        const emailFallback = profile.email?.split('@')[0] || profile.email || 'User';

        if (profile.role === 'COMPANY') {
            const companyName = profile.company?.name?.trim();
            return companyName || emailFallback;
        }

        if (profile.role === 'STUDENT') {
            const fullName = `${profile.student?.firstName || ''} ${profile.student?.lastName || ''}`.trim();
            return fullName || emailFallback;
        }

        if (profile.role === 'LECTURER') {
            const fullName = `${profile.lecturer?.firstName || ''} ${profile.lecturer?.lastName || ''}`.trim();
            return fullName || emailFallback;
        }

        return emailFallback;
    }
}
