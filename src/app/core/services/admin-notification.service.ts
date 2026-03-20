import { Injectable, OnDestroy } from '@angular/core';
import { adminNotificationSignal } from '../signals/admin-notification.signal';
import { authSignal } from '../signals/auth.signal';
import { API_ENDPOINTS } from '../config/api-endpoints.config';

/**
 * Manages SSE connection for real-time admin notifications.
 * Automatically reconnects on connection loss.
 */
@Injectable({ providedIn: 'root' })
export class AdminNotificationService implements OnDestroy {
    private eventSource: EventSource | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectDelayMs = 3000;
    private maxReconnectDelayMs = 30000;
    private isConnecting = false;

    /**
     * Start listening for SSE notifications.
     * Safe to call multiple times — only one connection is maintained.
     */
    connect(): void {
        if (this.eventSource || this.isConnecting) {
            return;
        }

        const token = authSignal.token();
        if (!token) {
            return;
        }

        this.isConnecting = true;
        const url = `${API_ENDPOINTS.ADMIN.NOTIFICATIONS_STREAM}?token=${encodeURIComponent(token)}`;

        try {
            this.eventSource = new EventSource(url);
        } catch {
            this.isConnecting = false;
            this.scheduleReconnect();
            return;
        }

        this.eventSource.addEventListener('connected', () => {
            this.isConnecting = false;
            this.reconnectDelayMs = 3000; // Reset delay on successful connection
        });

        this.eventSource.addEventListener('pending-content', (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                adminNotificationSignal.addNotification({
                    contentType: data.contentType || 'UNKNOWN',
                    contentTitle: data.contentTitle || '',
                    authorEmail: data.authorEmail || '',
                    timestamp: data.timestamp || Date.now(),
                });
            } catch {
                // Ignore malformed events
            }
        });

        this.eventSource.onerror = () => {
            this.isConnecting = false;
            this.disconnect();
            this.scheduleReconnect();
        };
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
}
