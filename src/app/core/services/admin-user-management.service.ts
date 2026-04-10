import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { AuthApiUser, RegisterRequest } from '../../features/auth/models/auth.model';
import { unwrapOr } from '../utils/api-response.util';

@Injectable({ providedIn: 'root' })
export class AdminUserManagementService {
    private readonly http = inject(HttpClient);

    createUser(request: RegisterRequest): Observable<AuthApiUser | null> {
        return this.http.post<ApiResponse<AuthApiUser>>(API_ENDPOINTS.ADMIN.USERS, request).pipe(
            map((response) => unwrapOr(response, null)),
            catchError(() => of(null))
        );
    }

    lockUser(userId: string): Observable<AuthApiUser | null> {
        return this.http.patch<ApiResponse<AuthApiUser>>(API_ENDPOINTS.ADMIN.USER_LOCK(userId), {}).pipe(
            map((response) => unwrapOr(response, null)),
            catchError(() => of(null))
        );
    }

    unlockUser(userId: string): Observable<AuthApiUser | null> {
        return this.http.patch<ApiResponse<AuthApiUser>>(API_ENDPOINTS.ADMIN.USER_UNLOCK(userId), {}).pipe(
            map((response) => unwrapOr(response, null)),
            catchError(() => of(null))
        );
    }

    deleteUser(userId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<null>>(API_ENDPOINTS.ADMIN.USER_DETAIL(userId)).pipe(
            map((response) => response.success),
            catchError(() => of(false))
        );
    }
}
