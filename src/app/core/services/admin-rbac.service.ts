import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, timeout } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import {
    RbacPermissionDefinition,
    RbacRolePermission,
    RbacUserAssignment,
    UpdateUserPermissionOverridesRequest
} from '../models/rbac.model';

@Injectable({ providedIn: 'root' })
export class AdminRbacService {
    private readonly http = inject(HttpClient);

    getDelegablePermissions(): Observable<RbacPermissionDefinition[]> {
        return this.http.get<ApiResponse<RbacPermissionDefinition[]>>(API_ENDPOINTS.ADMIN.RBAC_PERMISSIONS).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data;
            }),
            catchError(() => of([]))
        );
    }

    getRolePermissionMatrix(): Observable<RbacRolePermission[]> {
        return this.http.get<ApiResponse<RbacRolePermission[]>>(API_ENDPOINTS.ADMIN.RBAC_ROLES).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data;
            }),
            catchError(() => of([]))
        );
    }

    getUsers(): Observable<RbacUserAssignment[]> {
        return this.http.get<ApiResponse<RbacUserAssignment[]>>(API_ENDPOINTS.ADMIN.RBAC_USERS).pipe(
            map((response) => {
                if (!response.success || !response.data) {
                    return [];
                }
                return response.data;
            }),
            catchError(() => of([]))
        );
    }

    updateUserOverrides(
        userId: string,
        payload: UpdateUserPermissionOverridesRequest
    ): Observable<RbacUserAssignment | null> {
        return this.http
            .put<ApiResponse<RbacUserAssignment>>(API_ENDPOINTS.ADMIN.RBAC_USER_OVERRIDES(userId), payload)
            .pipe(
                timeout(8000),
                map((response) => {
                    if (!response.success || !response.data) {
                        return null;
                    }
                    return response.data;
                }),
                catchError(() => of(null))
            );
    }
}
