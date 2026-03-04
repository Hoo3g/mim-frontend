import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { authSignal } from '../signals/auth.signal';
import { ROUTES } from '../constants/route.const';

/** Chặn route nếu chưa đăng nhập — redirect đến login */
export const authGuard: CanActivateFn = () => {
    const router = inject(Router);
    if (authSignal.isAuth()) return true;
    return router.createUrlTree([ROUTES.AUTH.LOGIN]);
};
