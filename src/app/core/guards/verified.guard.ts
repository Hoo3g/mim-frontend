import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { authSignal } from '../signals/auth.signal';
import { ROUTES } from '../constants/route.const';

export const verifiedGuard: CanActivateFn = () => {
    const router = inject(Router);
    if (!authSignal.isAuth() || !authSignal.token()) {
        return router.createUrlTree([ROUTES.AUTH.LOGIN]);
    }
    if (authSignal.canCreateContent()) {
        return true;
    }
    return router.createUrlTree([ROUTES.PROFILE]);
};
