import { Injectable, OnDestroy, NgZone, inject } from '@angular/core';
import { Subscription, forkJoin, timer } from 'rxjs';
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
    private readonly zone = inject(NgZone);
    private readonly adminModerationService = inject(AdminModerationService);
    private eventSource: EventSource | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private syncSubscription?: Subscription;
    private reconnectDelayMs = 3000;
    private maxReconnectDelayMs = 30000;
    private isConnecting = false;
    private streamAuthMode: NotificationStreamAuthMode = 'token-query';
    private static readonly SYNC_INTERVAL_MS = 30_000;

    /**
     * Start listening for SSE notifications.
     * Safe to call multiple times — only one connection is maintained.
     */
    connect(): void {
        if (this.eventSource || this.isConnecting) {
            this.startPendingQueueSync();
            return;
        }

        const token = authSignal.token();
        if (!token) {
            return;
        }

        this.isConnecting = true;
        this.startPendingQueueSync();

        try {
            this.eventSource = this.createEventSource(this.streamAuthMode, token);
            this.bindEventSourceHandlers(this.streamAuthMode, token);
        } catch {
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from SSE stream.
     */
    disconnect(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.isConnecting = false;
        this.cancelReconnect();
        this.syncSubscription?.unsubscribe();
        this.syncSubscription = undefined;
    }

    ngOnDestroy(): void {
        this.disconnect();
    }

    private scheduleReconnect(): void {
        this.cancelReconnect();

        if (!authSignal.token()) {
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

        this.syncSubscription = timer(0, AdminNotificationService.SYNC_INTERVAL_MS)
            .subscribe(() => this.syncPendingQueue());
    }

    private syncPendingQueue(): void {
        if (!authSignal.isAuth() || !authSignal.canAccessAdmin()) {
            return;
        }

        forkJoin({
            posts: this.adminModerationService.getPosts().pipe(take(1)),
            papers: this.adminModerationService.getPapers().pipe(take(1))
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
            this.reconnectDelayMs = 3000; // Reset delay on successful connection
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
            this.disconnect();
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
}
