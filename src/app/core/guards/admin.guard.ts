import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { authSignal } from '../signals/auth.signal';
import { ROUTES } from '../constants/route.const';
import { AuthRefreshCoordinatorService } from '../services/auth-refresh-coordinator.service';

/** Chỉ cho phép ADMIN access — redirect về home nếu không đủ quyền */
export const adminGuard: CanActivateFn = () => {
    const router = inject(Router);
    const refreshCoordinator = inject(AuthRefreshCoordinatorService);

    if (authSignal.canAccessAdmin()) {
        return true;
    }
    if (!authSignal.token()) {
        return router.createUrlTree([ROUTES.HOME]);
    }

    return refreshCoordinator.requestRefresh().pipe(
        map((refreshed) => {
            if (refreshed && authSignal.canAccessAdmin()) {
                return true;
            }
            return router.createUrlTree([ROUTES.HOME]);
        })
    );
};
