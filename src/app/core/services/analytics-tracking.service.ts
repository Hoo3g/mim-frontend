import { inject, Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { authSignal } from '../signals/auth.signal';

interface TrackPageViewPayload {
    visitorId: string;
    routeKey: string;
    path: string;
    referrer?: string;
}

interface TrackHeartbeatPayload {
    visitorId: string;
    routeKey: string;
    path: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsTrackingService implements OnDestroy {
    private static readonly VISITOR_ID_STORAGE_KEY = 'mim_analytics_visitor_id';
    private static readonly PAGE_VIEW_LAST_TRACKED_STORAGE_KEY = 'mim_analytics_page_view_last_tracked';
    private static readonly HEARTBEAT_INTERVAL_MS = 60_000;
    private static readonly PAGE_VIEW_DEDUP_WINDOW_MS = 60 * 60_000;

    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    private started = false;
    private visitorId = '';
    private currentRouteKey = 'OTHER';
    private currentPath = '/';
    private lastTrackedPageViewPath = '';
    private lastTrackedPageViewAt = 0;

    private routerEventsSub?: Subscription;
    private heartbeatSub?: Subscription;
    private visibilityChangeHandler?: () => void;

    start(): void {
        if (this.started || typeof window === 'undefined') {
            return;
        }

        this.started = true;
        this.visitorId = this.resolveVisitorId();

        this.currentPath = this.normalizePath(this.router.url);
        this.currentRouteKey = this.routeKeyFromPath(this.currentPath);

        this.trackPageViewIfEligible(this.currentPath);
        this.trackHeartbeat();

        this.routerEventsSub = this.router.events.subscribe((event) => {
            if (!(event instanceof NavigationEnd)) {
                return;
            }

            const path = this.normalizePath(event.urlAfterRedirects || event.url || '/');
            this.currentPath = path;
            this.currentRouteKey = this.routeKeyFromPath(path);
            this.trackPageViewIfEligible(path);
        });

        this.heartbeatSub = timer(
            AnalyticsTrackingService.HEARTBEAT_INTERVAL_MS,
            AnalyticsTrackingService.HEARTBEAT_INTERVAL_MS
        ).subscribe(() => {
            if (!this.isPageVisible()) {
                return;
            }
            this.trackHeartbeat();
        });

        this.visibilityChangeHandler = () => {
            if (!this.isPageVisible()) {
                return;
            }
            this.trackHeartbeat();
        };

        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    stop(): void {
        this.routerEventsSub?.unsubscribe();
        this.heartbeatSub?.unsubscribe();
        this.routerEventsSub = undefined;
        this.heartbeatSub = undefined;

        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = undefined;
        }

        this.lastTrackedPageViewPath = '';
        this.lastTrackedPageViewAt = 0;
        this.started = false;
    }

    ngOnDestroy(): void {
        this.stop();
    }

    private trackPageView(path: string): void {
        const payload: TrackPageViewPayload = {
            visitorId: this.visitorId,
            routeKey: this.currentRouteKey,
            path,
            referrer: this.normalizeReferrer(document.referrer)
        };

        this.http.post<ApiResponse<null>>(API_ENDPOINTS.ANALYTICS.TRACK_PAGE_VIEW, payload)
            .subscribe({
                error: () => {
                    // Ignore tracking failures to keep UX unaffected.
                }
            });
    }

    private trackPageViewIfEligible(path: string): void {
        if (!this.isTrackablePagePath(path)) {
            return;
        }

        const now = Date.now();
        const dedupKey = this.buildPageViewDedupKey(path);
        const lastTrackedAt = this.resolveLastTrackedPageViewAt(dedupKey);
        if (lastTrackedAt > 0 && now - lastTrackedAt < AnalyticsTrackingService.PAGE_VIEW_DEDUP_WINDOW_MS) {
            return;
        }

        this.lastTrackedPageViewPath = path;
        this.lastTrackedPageViewAt = now;
        this.persistTrackedPageViewAt(dedupKey, now);
        this.trackPageView(path);
    }

    private isTrackablePagePath(path: string): boolean {
        return !path.startsWith('/auth');
    }

    private trackHeartbeat(): void {
        const payload: TrackHeartbeatPayload = {
            visitorId: this.visitorId,
            routeKey: this.currentRouteKey,
            path: this.currentPath
        };

        this.http.post<ApiResponse<null>>(API_ENDPOINTS.ANALYTICS.HEARTBEAT, payload)
            .subscribe({
                error: () => {
                    // Ignore tracking failures to keep UX unaffected.
                }
            });
    }

    private resolveVisitorId(): string {
        const fromStorage = localStorage.getItem(AnalyticsTrackingService.VISITOR_ID_STORAGE_KEY)?.trim();
        if (fromStorage) {
            return fromStorage;
        }

        const generated = this.generateVisitorId();
        localStorage.setItem(AnalyticsTrackingService.VISITOR_ID_STORAGE_KEY, generated);
        return generated;
    }

    private generateVisitorId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }

        const randomPart = Math.random().toString(36).slice(2, 12);
        return `visitor-${Date.now()}-${randomPart}`;
    }

    private normalizePath(url: string): string {
        const raw = (url ?? '').trim() || '/';

        try {
            const resolved = new URL(raw, window.location.origin);
            return this.normalizePathWithoutQuery(resolved.pathname);
        } catch {
            return this.normalizePathWithoutQuery(raw);
        }
    }

    private normalizePathWithoutQuery(path: string): string {
        let normalized = (path ?? '').trim();
        if (!normalized) {
            return '/';
        }

        const queryIndex = normalized.indexOf('?');
        if (queryIndex >= 0) {
            normalized = normalized.substring(0, queryIndex);
        }

        const hashIndex = normalized.indexOf('#');
        if (hashIndex >= 0) {
            normalized = normalized.substring(0, hashIndex);
        }

        if (!normalized.startsWith('/')) {
            normalized = `/${normalized}`;
        }

        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.substring(0, normalized.length - 1);
        }

        return normalized || '/';
    }

    private normalizeReferrer(referrer: string): string | undefined {
        const normalized = (referrer ?? '').trim();
        return normalized || undefined;
    }

    private routeKeyFromPath(path: string): string {
        if (path === '/') {
            return 'HOME';
        }
        if (path.startsWith('/admin')) {
            return 'ADMIN';
        }
        if (path.startsWith('/recruitment') || path.startsWith('/posts')) {
            return 'RECRUITMENT';
        }
        if (path.startsWith('/paper') || path.startsWith('/research')) {
            return 'RESEARCH';
        }
        if (path.startsWith('/news')) {
            return 'NEWS';
        }
        if (path.startsWith('/profile')) {
            return 'PROFILE';
        }
        if (path.startsWith('/auth')) {
            return 'AUTH';
        }
        if (authSignal.canAccessAdmin() && path.startsWith('/api')) {
            return 'API';
        }
        return 'OTHER';
    }

    private isPageVisible(): boolean {
        return typeof document !== 'undefined' && document.visibilityState === 'visible';
    }

    private buildPageViewDedupKey(path: string): string {
        return `${this.visitorId}::${path}`;
    }

    private resolveLastTrackedPageViewAt(dedupKey: string): number {
        if (this.lastTrackedPageViewPath && this.buildPageViewDedupKey(this.lastTrackedPageViewPath) === dedupKey) {
            return this.lastTrackedPageViewAt;
        }

        try {
            const raw = localStorage.getItem(AnalyticsTrackingService.PAGE_VIEW_LAST_TRACKED_STORAGE_KEY)?.trim();
            if (!raw) {
                return 0;
            }

            const parsed = JSON.parse(raw) as Record<string, number>;
            const value = Number(parsed?.[dedupKey] ?? 0);
            return Number.isFinite(value) && value > 0 ? value : 0;
        } catch {
            return 0;
        }
    }

    private persistTrackedPageViewAt(dedupKey: string, timestamp: number): void {
        try {
            const raw = localStorage.getItem(AnalyticsTrackingService.PAGE_VIEW_LAST_TRACKED_STORAGE_KEY)?.trim();
            const parsed = raw ? JSON.parse(raw) as Record<string, number> : {};
            const cutoff = timestamp - (AnalyticsTrackingService.PAGE_VIEW_DEDUP_WINDOW_MS * 2);

            const nextState: Record<string, number> = {};
            Object.entries(parsed).forEach(([key, value]) => {
                const numericValue = Number(value);
                if (Number.isFinite(numericValue) && numericValue >= cutoff) {
                    nextState[key] = numericValue;
                }
            });

            nextState[dedupKey] = timestamp;
            localStorage.setItem(
                AnalyticsTrackingService.PAGE_VIEW_LAST_TRACKED_STORAGE_KEY,
                JSON.stringify(nextState)
            );
        } catch {
            // Ignore storage failures to keep UX unaffected.
        }
    }
}
