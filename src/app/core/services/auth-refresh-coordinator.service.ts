import { inject, Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay } from 'rxjs';

import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthRefreshCoordinatorService {
    private readonly authService = inject(AuthService);
    private refreshInFlight$: Observable<boolean> | null = null;

    requestRefresh(): Observable<boolean> {
        if (!this.refreshInFlight$) {
            this.refreshInFlight$ = this.authService.refreshToken().pipe(
                map(() => true),
                catchError(() => of(false)),
                finalize(() => {
                    this.refreshInFlight$ = null;
                }),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }
        return this.refreshInFlight$;
    }
}
