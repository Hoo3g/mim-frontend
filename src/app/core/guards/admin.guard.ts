import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { authSignal } from '../signals/auth.signal';
import { ROUTES } from '../constants/route.const';

/** Chỉ cho phép ADMIN access — redirect về home nếu không đủ quyền */
export const adminGuard: CanActivateFn = () => {
    const router = inject(Router);
    if (authSignal.isAdmin()) return true;
    return router.createUrlTree([ROUTES.HOME]);
};
