import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import {
    AuthApiUser,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
} from '../../features/auth/models/auth.model';
import { authSignal } from '../signals/auth.signal';
import { Role } from '../enums/role.enum';
import { ROUTES } from '../constants/route.const';
import { ProfileMeResponse } from '../models/profile.model';
import { unwrap } from '../utils/api-response.util';
import { resolvePublicAssetUrl } from '../utils/public-asset-url.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    login(request: LoginRequest): Observable<AuthResponse> {
        return this.http.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.LOGIN, request, { withCredentials: true }).pipe(
            map((response) => unwrap(response)),
            map((auth) => this.persistAuth(auth))
        );
    }

    register(request: RegisterRequest): Observable<AuthApiUser> {
        return this.http.post<ApiResponse<AuthApiUser>>(API_ENDPOINTS.AUTH.REGISTER, request, { withCredentials: true }).pipe(
            map((response) => unwrap(response))
        );
    }

    refreshToken(): Observable<AuthResponse> {
        return this.http.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REFRESH, {}, { withCredentials: true }).pipe(
            map((response) => unwrap(response)),
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


    private persistAuth(auth: AuthResponse): AuthResponse {
        const roles = Array.isArray(auth.user.roles) ? auth.user.roles : [];
        const permissions = this.normalizePermissions(auth.user.permissions);
        const primaryRole = this.pickRole(roles);
        const fullName = this.buildDisplayName(auth.user.email, auth.user.fullName ?? undefined);

        authSignal.setAuth(
            {
                id: auth.user.id,
                email: auth.user.email,
                fullName,
                role: primaryRole,
                permissions,
                avatarUrl: resolvePublicAssetUrl(auth.user.avatarUrl) || undefined,
                accountStatus: this.normalizeAccountStatus(auth.user.status)
            },
            auth.accessToken
        );

        this.syncProfileFromBackend().subscribe();
        return auth;
    }

    private pickRole(roles: string[]): Role {
        const normalizedRoles = roles
            .map((role) => role?.toUpperCase?.() ?? '')
            .map((role) => role.startsWith('ROLE_') ? role.substring(5) : role)
            .filter((role) => !!role);
        const dedupedRoles = [...new Set(normalizedRoles)];

        if (dedupedRoles.length > 1) {
            console.warn('Multiple roles detected for one account. Applying single-role mode with first role.', dedupedRoles);
        }

        const firstRole = dedupedRoles[0] ?? '';
        if (firstRole === Role.ADMIN) return Role.ADMIN;
        if (firstRole === Role.LECTURER) return Role.LECTURER;
        if (firstRole === Role.COMPANY) return Role.COMPANY;
        if (firstRole === Role.STUDENT) return Role.STUDENT;
        return Role.STUDENT;
    }

    syncProfileFromBackend(): Observable<ProfileMeResponse | null> {
        if (!authSignal.isAuth() || !authSignal.token()) {
            return of(null);
        }

        return this.http.get<ApiResponse<ProfileMeResponse>>(API_ENDPOINTS.PROFILE.ME).pipe(
            map((response) => unwrap(response)),
            map((profile) => {
                authSignal.updateUserInfo({
                    fullName: this.buildDisplayNameFromProfile(profile),
                    avatarUrl: resolvePublicAssetUrl(profile.avatarUrl) || undefined,
                    role: profile.role ?? undefined,
                    accountStatus: profile.accountStatus ?? undefined,
                    permissions: this.normalizePermissions(profile.permissions)
                });
                return profile;
            }),
            catchError(() => of(null))
        );
    }

    verifyEmail(token: string): Observable<AuthApiUser> {
        return this.http.post<ApiResponse<AuthApiUser>>(
            API_ENDPOINTS.AUTH.VERIFY_EMAIL,
            { token },
            { withCredentials: true }
        ).pipe(
            map((response) => unwrap(response)),
            map((user) => {
                if (authSignal.isAuth()) {
                    authSignal.updateUserInfo({ accountStatus: user.status });
                }
                return user;
            })
        );
    }

    resendVerificationEmail(): Observable<void> {
        return this.http.post<ApiResponse<null>>(
            API_ENDPOINTS.AUTH.RESEND_VERIFY_EMAIL,
            {},
            { withCredentials: true }
        ).pipe(
            map(() => void 0)
        );
    }

    private buildDisplayName(email: string, fullName?: string): string {
        if (fullName && fullName.trim()) {
            return fullName.trim();
        }
        const localPart = email.split('@')[0]?.trim();
        return localPart ? localPart : email;
    }

    private buildDisplayNameFromProfile(profile: ProfileMeResponse): string {
        const genericName = profile.fullName?.trim() || '';
        const emailFallback = profile.email?.split('@')[0] || profile.email || 'User';

        if (profile.role === Role.COMPANY) {
            const companyName = profile.company?.name?.trim();
            return companyName || genericName || emailFallback;
        }

        if (profile.role === Role.STUDENT) {
            const fullName = `${profile.student?.firstName || ''} ${profile.student?.lastName || ''}`.trim();
            return fullName || genericName || emailFallback;
        }

        if (profile.role === Role.LECTURER) {
            const fullName = `${profile.lecturer?.firstName || ''} ${profile.lecturer?.lastName || ''}`.trim();
            return fullName || genericName || emailFallback;
        }

        return genericName || emailFallback;
    }

    private normalizeAccountStatus(status?: string | null): 'PENDING' | 'APPROVED' | 'BLOCKED' | string {
        const normalized = (status ?? '').toString().trim().toUpperCase();
        if (normalized === 'PENDING') return 'PENDING';
        if (normalized === 'BLOCKED') return 'BLOCKED';
        return 'APPROVED';
    }

    private normalizePermissions(permissions?: readonly unknown[] | null): string[] {
        if (!Array.isArray(permissions)) {
            return [];
        }

        return [...new Set(
            permissions
                .map((permission) => String(permission ?? '').trim().toUpperCase())
                .filter((permission) => !!permission)
        )].sort();
    }
}
