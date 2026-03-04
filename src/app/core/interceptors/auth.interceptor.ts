import { HttpInterceptorFn } from '@angular/common/http';
import { authSignal } from '../signals/auth.signal';

/** Đính kèm JWT token vào mọi request nếu đã đăng nhập */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = authSignal.token();
    if (token) {
        const cloned = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next(cloned);
    }
    return next(req);
};
