import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authSignal } from '../signals/auth.signal';
import { ROUTES } from '../constants/route.const';
import { AuthRefreshCoordinatorService } from '../services/auth-refresh-coordinator.service';

const HAS_RETRIED = new HttpContextToken<boolean>(() => false);

/** Xử lý lỗi HTTP toàn cục: 401/403(admin) -> refresh once -> retry -> redirect/logout */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const refreshCoordinator = inject(AuthRefreshCoordinatorService);

    return next(req).pipe(
        catchError(err => {
            const isAdminEndpoint = req.url.includes('/api/v1/admin/');
            const alreadyRetried = req.context.get(HAS_RETRIED);

            if (err.status === 403 && isAdminEndpoint) {
                if (alreadyRetried || !authSignal.token()) {
                    router.navigateByUrl(ROUTES.HOME);
                    return throwError(() => err);
                }

                return refreshCoordinator.requestRefresh().pipe(
                    switchMap((refreshed) => {
                        if (!refreshed || !authSignal.canAccessAdmin()) {
                            router.navigateByUrl(ROUTES.HOME);
                            return throwError(() => err);
                        }
                        const retriedRequest = req.clone({
                            context: req.context.set(HAS_RETRIED, true)
                        });
                        return next(retriedRequest);
                    })
                );
            }

            if (err.status !== 401) {
                return throwError(() => err);
            }

            const isAuthEndpoint = req.url.includes('/api/v1/auth/');
            const isRefreshEndpoint = req.url.includes('/api/v1/auth/refresh-token');

            if (isRefreshEndpoint || alreadyRetried) {
                authSignal.clearAuth();
                router.navigateByUrl(ROUTES.AUTH.LOGIN);
                return throwError(() => err);
            }

            // Do not auto-refresh on login/register/google endpoints.
            if (isAuthEndpoint) {
                return throwError(() => err);
            }

            if (!authSignal.token()) {
                authSignal.clearAuth();
                router.navigateByUrl(ROUTES.AUTH.LOGIN);
                return throwError(() => err);
            }

            return refreshCoordinator.requestRefresh().pipe(
                switchMap((refreshed) => {
                    if (!refreshed) {
                        authSignal.clearAuth();
                        router.navigateByUrl(ROUTES.AUTH.LOGIN);
                        return throwError(() => err);
                    }
                    const retriedRequest = req.clone({
                        context: req.context.set(HAS_RETRIED, true)
                    });
                    return next(retriedRequest);
                })
            );
        })
    );
};
