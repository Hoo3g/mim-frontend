import { signal, computed } from '@angular/core';

export interface AdminNotification {
    id: string;
    contentId: string;
    contentType: 'POST' | 'PAPER' | string;
    contentTitle: string;
    authorLabel: string;
    timestamp: number;
    read: boolean;
}

const _notifications = signal<AdminNotification[]>([]);
let _dismissedNotificationIds = new Set<string>();

export const adminNotificationSignal = {
    notifications: _notifications.asReadonly(),

    unreadCount: computed(() =>
        _notifications().filter((n) => !n.read).length
    ),

    upsertNotification(event: {
        contentId?: string | null;
        contentType: string;
        contentTitle: string;
        authorLabel: string;
        timestamp: number;
    }): void {
        const notificationId = buildNotificationId(event.contentType, event.contentId, event.contentTitle, event.authorLabel);
        const notification: AdminNotification = {
            id: notificationId,
            contentId: normalizeText(event.contentId) || notificationId,
            contentType: event.contentType,
            contentTitle: event.contentTitle,
            authorLabel: event.authorLabel,
            timestamp: event.timestamp || Date.now(),
            read: false,
        };

        _notifications.update((previous) => {
            if (_dismissedNotificationIds.has(notificationId)) {
                return previous;
            }
            const existing = previous.find((item) => item.id === notificationId);
            const next = previous.filter((item) => item.id !== notificationId);
            return [{
                ...notification,
                read: existing?.read ?? false
            }, ...next]
                .sort((left, right) => right.timestamp - left.timestamp)
                .slice(0, 50);
        });
    },

    syncPendingQueue(notifications: Array<{
        contentId: string;
        contentType: string;
        contentTitle: string;
        authorLabel: string;
        timestamp: number;
    }>): void {
        _notifications.update((previous) => {
            const previousById = new Map(previous.map((item) => [item.id, item]));
            const synced = notifications
                .map((item) => {
                    const id = buildNotificationId(item.contentType, item.contentId, item.contentTitle, item.authorLabel);
                    const existing = previousById.get(id);
                    return {
                        id,
                        contentId: normalizeText(item.contentId) || id,
                        contentType: item.contentType,
                        contentTitle: item.contentTitle,
                        authorLabel: item.authorLabel,
                        timestamp: item.timestamp || Date.now(),
                        read: existing?.read ?? false
                    } satisfies AdminNotification;
                })
                .sort((left, right) => right.timestamp - left.timestamp);

            const queueIds = new Set(synced.map((item) => item.id));
            _dismissedNotificationIds = new Set(
                [..._dismissedNotificationIds].filter((id) => queueIds.has(id))
            );

            return synced
                .filter((item) => !_dismissedNotificationIds.has(item.id))
                .slice(0, 50);
        });
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

    dismissAll(): void {
        _dismissedNotificationIds = new Set(_notifications().map((item) => item.id));
        _notifications.set([]);
    },

    clearAll(): void {
        _dismissedNotificationIds = new Set();
        _notifications.set([]);
    },
};

function buildNotificationId(
    contentType: string,
    contentId?: string | null,
    contentTitle?: string | null,
    authorLabel?: string | null
): string {
    const normalizedType = normalizeText(contentType) || 'UNKNOWN';
    const normalizedContentId = normalizeText(contentId);
    if (normalizedContentId) {
        return `${normalizedType}:${normalizedContentId}`;
    }

    return [
        normalizedType,
        normalizeText(contentTitle) || 'UNTITLED',
        normalizeText(authorLabel) || 'UNKNOWN'
    ].join(':');
}

function normalizeText(value?: string | null): string {
    return String(value ?? '').trim();
}
