import { DOCUMENT } from '@angular/common';
import { Injectable, OnDestroy, NgZone, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, forkJoin, of, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import { adminNotificationSignal } from '../signals/admin-notification.signal';
import { authSignal } from '../signals/auth.signal';
import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { AdminModerationService } from './admin-moderation.service';

type NotificationStreamAuthMode = 'cookie' | 'token-query';

/**
 * Manages SSE connection for real-time admin notifications.
 * Automatically reconnects on connection loss.
 */
@Injectable({ providedIn: 'root' })
export class AdminNotificationService implements OnDestroy {
    private static readonly FALLBACK_SYNC_INTERVAL_MS = 120_000;
    private static readonly SYNC_THROTTLE_MS = 15_000;

    private readonly zone = inject(NgZone);
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly adminModerationService = inject(AdminModerationService);
    private eventSource: EventSource | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private syncSubscription?: Subscription;
    private routerSubscription?: Subscription;
    private reconnectDelayMs = 3000;
    private maxReconnectDelayMs = 30000;
    private isConnecting = false;
    private isSseConnected = false;
    private isNotificationPanelOpen = false;
    private isAdminRouteActive = false;
    private lastSyncedAt = 0;
    private streamAuthMode: NotificationStreamAuthMode = 'token-query';
    private readonly onVisibilityChange = () => {
        this.refreshPollingMode();
        if (this.isPageVisible()) {
            this.syncPendingQueue();
        }
    };

    constructor() {
        this.isAdminRouteActive = this.router.url.startsWith('/admin');
        this.routerSubscription = this.router.events.subscribe((event) => {
            if (!(event instanceof NavigationEnd)) {
                return;
            }
            this.isAdminRouteActive = event.urlAfterRedirects.startsWith('/admin');
            if (this.isAdminRouteActive) {
                this.syncPendingQueue();
            }
            this.refreshPollingMode();
        });
        this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    setNotificationPanelOpen(isOpen: boolean): void {
        this.isNotificationPanelOpen = isOpen;
        if (isOpen) {
            this.syncPendingQueue();
        }
        this.refreshPollingMode();
    }

    /**
     * Start listening for SSE notifications.
     * Safe to call multiple times — only one connection is maintained.
     */
    connect(): void {
        if (this.eventSource || this.isConnecting) {
            this.refreshPollingMode();
            return;
        }

        const token = authSignal.token();
        if (!token || !authSignal.canUseAdminNotifications()) {
            return;
        }

        this.isConnecting = true;
        this.syncPendingQueue(true);
        this.refreshPollingMode();

        try {
            this.eventSource = this.createEventSource(this.streamAuthMode, token);
            this.bindEventSourceHandlers(this.streamAuthMode, token);
        } catch {
            this.isConnecting = false;
            this.isSseConnected = false;
            this.refreshPollingMode();
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from SSE stream.
     */
    disconnect(): void {
        this.closeCurrentEventSource();
        this.isConnecting = false;
        this.isSseConnected = false;
        this.cancelReconnect();
        this.stopPendingQueueSync();
    }

    ngOnDestroy(): void {
        this.disconnect();
        this.routerSubscription?.unsubscribe();
        this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    private scheduleReconnect(): void {
        this.cancelReconnect();

        if (!authSignal.token() || !authSignal.canUseAdminNotifications()) {
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectDelayMs);

        // Exponential backoff
        this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 1.5, this.maxReconnectDelayMs);
    }

    private cancelReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private startPendingQueueSync(): void {
        if (this.syncSubscription) {
            return;
        }

        this.syncSubscription = timer(AdminNotificationService.FALLBACK_SYNC_INTERVAL_MS, AdminNotificationService.FALLBACK_SYNC_INTERVAL_MS)
            .subscribe(() => this.syncPendingQueue());
    }

    private stopPendingQueueSync(): void {
        this.syncSubscription?.unsubscribe();
        this.syncSubscription = undefined;
    }

    private refreshPollingMode(): void {
        if (this.shouldUseFallbackPolling()) {
            this.startPendingQueueSync();
            return;
        }
        this.stopPendingQueueSync();
    }

    private shouldUseFallbackPolling(): boolean {
        return authSignal.isAuth()
            && authSignal.canUseAdminNotifications()
            && !this.isSseConnected
            && !this.isConnecting
            && this.isPageVisible()
            && (this.isAdminRouteActive || this.isNotificationPanelOpen);
    }

    private syncPendingQueue(force = false): void {
        if (!authSignal.isAuth() || !authSignal.canUseAdminNotifications()) {
            return;
        }

        if (!force && Date.now() - this.lastSyncedAt < AdminNotificationService.SYNC_THROTTLE_MS) {
            return;
        }

        const canViewPosts = authSignal.isAdmin()
            || authSignal.hasPermission('MODERATION_POSTS_VIEW')
            || authSignal.hasPermission('MODERATION_POSTS_ACTION');
        const canViewPapers = authSignal.isAdmin()
            || authSignal.hasPermission('MODERATION_PAPERS_VIEW')
            || authSignal.hasPermission('MODERATION_PAPERS_ACTION');

        if (!canViewPosts && !canViewPapers) {
            return;
        }

        this.lastSyncedAt = Date.now();

        forkJoin({
            posts: canViewPosts
                ? this.adminModerationService.getPosts().pipe(take(1))
                : of([]),
            papers: canViewPapers
                ? this.adminModerationService.getPapers().pipe(take(1))
                : of([])
        }).subscribe(({ posts, papers }) => {
            adminNotificationSignal.syncPendingQueue([
                ...posts.map((item) => ({
                    contentId: item.id,
                    contentType: 'POST',
                    contentTitle: item.title || 'Bài tuyển dụng',
                    authorLabel: item.authorName || 'Người dùng',
                    timestamp: item.createdAt ? Date.parse(item.createdAt) || Date.now() : Date.now()
                })),
                ...papers.map((item) => ({
                    contentId: item.id,
                    contentType: 'PAPER',
                    contentTitle: item.title || 'Bài nghiên cứu',
                    authorLabel: item.authorName || 'Người dùng',
                    timestamp: item.createdAt ? Date.parse(item.createdAt) || Date.now() : Date.now()
                }))
            ]);
        });
    }

    private createEventSource(mode: NotificationStreamAuthMode, token: string): EventSource {
        if (mode === 'cookie') {
            return new EventSource(API_ENDPOINTS.ADMIN.NOTIFICATIONS_STREAM, { withCredentials: true });
        }
        const streamUrl = `${API_ENDPOINTS.ADMIN.NOTIFICATIONS_STREAM}?token=${encodeURIComponent(token)}`;
        return new EventSource(streamUrl);
    }

    private bindEventSourceHandlers(mode: NotificationStreamAuthMode, token: string): void {
        if (!this.eventSource) {
            return;
        }

        this.eventSource.addEventListener('connected', () => {
            this.isConnecting = false;
            this.isSseConnected = true;
            this.reconnectDelayMs = 3000; // Reset delay on successful connection
            this.refreshPollingMode();
        });

        this.eventSource.addEventListener('pending-content', (event: MessageEvent) => {
            this.zone.run(() => {
                try {
                    const data = JSON.parse(event.data);
                    adminNotificationSignal.upsertNotification({
                        contentId: data.contentId || '',
                        contentType: data.contentType || 'UNKNOWN',
                        contentTitle: data.contentTitle || '',
                        authorLabel: data.authorEmail || '',
                        timestamp: data.timestamp || Date.now(),
                    });
                } catch {
                    // Ignore malformed events
                }
            });
        });

        this.eventSource.onerror = () => {
            if (this.tryFallbackToTokenQuery(mode, token)) {
                return;
            }
            this.isConnecting = false;
            this.isSseConnected = false;
            this.closeCurrentEventSource();
            this.refreshPollingMode();
            this.scheduleReconnect();
        };
    }

    private tryFallbackToTokenQuery(mode: NotificationStreamAuthMode, token: string): boolean {
        if (mode !== 'cookie' || !token) {
            return false;
        }

        this.closeCurrentEventSource();
        this.streamAuthMode = 'token-query';

        try {
            this.eventSource = this.createEventSource(this.streamAuthMode, token);
            this.bindEventSourceHandlers(this.streamAuthMode, token);
            return true;
        } catch {
            this.closeCurrentEventSource();
            return false;
        }
    }

    private closeCurrentEventSource(): void {
        if (!this.eventSource) {
            return;
        }
        this.eventSource.close();
        this.eventSource = null;
    }

    private isPageVisible(): boolean {
        return this.document.visibilityState === 'visible';
    }
}
