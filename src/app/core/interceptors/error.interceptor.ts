import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authSignal } from '../signals/auth.signal';
import { ROUTES } from '../constants/route.const';

/** Xử lý lỗi HTTP toàn cục: 401 → logout, 403 → redirect */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError(err => {
            if (err.status === 401) {
                authSignal.clearAuth();
                router.navigateByUrl(ROUTES.AUTH.LOGIN);
            }
            return throwError(() => err);
        })
    );
};
