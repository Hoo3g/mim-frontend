import { signal, computed } from '@angular/core';

export interface AdminNotification {
    id: string;
    contentType: 'POST' | 'PAPER' | string;
    contentTitle: string;
    authorEmail: string;
    timestamp: number;
    read: boolean;
}

const _notifications = signal<AdminNotification[]>([]);
let _idCounter = 0;

export const adminNotificationSignal = {
    notifications: _notifications.asReadonly(),

    unreadCount: computed(() =>
        _notifications().filter((n) => !n.read).length
    ),

    addNotification(event: { contentType: string; contentTitle: string; authorEmail: string; timestamp: number }): void {
        const notification: AdminNotification = {
            id: `notif-${++_idCounter}-${Date.now()}`,
            contentType: event.contentType,
            contentTitle: event.contentTitle,
            authorEmail: event.authorEmail,
            timestamp: event.timestamp || Date.now(),
            read: false,
        };

        _notifications.update((prev) => [notification, ...prev].slice(0, 50));
    },

    markAsRead(notificationId: string): void {
        _notifications.update((prev) =>
            prev.map((n) => n.id === notificationId ? { ...n, read: true } : n)
        );
    },

    markAllAsRead(): void {
        _notifications.update((prev) =>
            prev.map((n) => ({ ...n, read: true }))
        );
    },

    clearAll(): void {
        _notifications.set([]);
    },
};
