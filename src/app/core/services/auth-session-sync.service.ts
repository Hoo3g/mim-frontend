import { DOCUMENT } from '@angular/common';
import { inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, Subscription } from 'rxjs';

import { ROUTES } from '../constants/route.const';
import { authSignal } from '../signals/auth.signal';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionSyncService implements OnDestroy {
    private static readonly THROTTLE_MS = 15_000;

    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly zone = inject(NgZone);
    private readonly document = inject(DOCUMENT);

    private started = false;
    private syncInFlight$: Observable<boolean> | null = null;
    private subscriptions = new Subscription();
    private lastSyncedAt = 0;
    private lastSyncedToken: string | null = null;

    private readonly onWindowFocus = () => {
        this.zone.run(() => this.triggerSync());
    };

    private readonly onVisibilityChange = () => {
        if (this.document.visibilityState !== 'visible') {
            return;
        }
        this.zone.run(() => this.triggerSync());
    };

    start(): void {
        if (this.started) {
            return;
        }

        this.started = true;
        this.subscriptions.add(
            this.router.events.subscribe((event) => {
                if (event instanceof NavigationEnd) {
                    this.triggerSync();
                }
            })
        );

        this.document.defaultView?.addEventListener('focus', this.onWindowFocus);
        this.document.addEventListener('visibilitychange', this.onVisibilityChange);

        this.triggerSync(true);
    }

    stop(): void {
        this.started = false;
        this.subscriptions.unsubscribe();
        this.subscriptions = new Subscription();
        this.document.defaultView?.removeEventListener('focus', this.onWindowFocus);
        this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    requestSync(force = false): Observable<boolean> {
        const token = authSignal.token();
        if (!authSignal.isAuth() || !token) {
            return of(false);
        }

        if (this.syncInFlight$) {
            return this.syncInFlight$;
        }

        if (!force && this.lastSyncedToken === token && Date.now() - this.lastSyncedAt < AuthSessionSyncService.THROTTLE_MS) {
            return of(true);
        }

        this.syncInFlight$ = this.authService.syncProfileFromBackend().pipe(
            map((profile) => {
                const success = profile !== null;
                if (success) {
                    this.lastSyncedAt = Date.now();
                    this.lastSyncedToken = token;
                    this.redirectIfAdminAccessRevoked();
                }
                return success;
            }),
            catchError(() => of(false)),
            finalize(() => {
                this.syncInFlight$ = null;
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.syncInFlight$;
    }

    ngOnDestroy(): void {
        this.stop();
    }

    private triggerSync(force = false): void {
        this.requestSync(force).subscribe();
    }

    private redirectIfAdminAccessRevoked(): void {
        if (!this.router.url.startsWith(ROUTES.ADMIN)) {
            return;
        }
        if (authSignal.canAccessAdmin()) {
            return;
        }
        this.router.navigateByUrl(ROUTES.HOME);
    }
}
