import { computed, signal } from '@angular/core';

export interface UserNotification {
    id: string;
    contentId: string;
    contentType: 'POST' | 'PAPER';
    status: 'APPROVED' | 'REJECTED';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
}

const _notifications = signal<UserNotification[]>([]);

export const userNotificationSignal = {
    notifications: _notifications.asReadonly(),

    unreadCount: computed(() =>
        _notifications().filter((notification) => !notification.read).length
    ),

    hydrate(notifications: UserNotification[]): void {
        _notifications.set(
            [...notifications]
                .sort((left, right) => right.timestamp - left.timestamp)
                .slice(0, 50)
        );
    },

    upsert(notification: UserNotification): void {
        _notifications.update((previous) => {
            const next = previous.filter((item) => item.id !== notification.id);
            return [notification, ...next]
                .sort((left, right) => right.timestamp - left.timestamp)
                .slice(0, 50);
        });
    },

    markAsRead(notificationId: string): void {
        _notifications.update((previous) =>
            previous.map((notification) =>
                notification.id === notificationId
                    ? { ...notification, read: true }
                    : notification
            )
        );
    },

    markAllAsRead(): void {
        _notifications.update((previous) =>
            previous.map((notification) => ({ ...notification, read: true }))
        );
    },

    remove(notificationId: string): void {
        _notifications.update((previous) =>
            previous.filter((notification) => notification.id !== notificationId)
        );
    },

    clearAll(): void {
        _notifications.set([]);
    }
};
