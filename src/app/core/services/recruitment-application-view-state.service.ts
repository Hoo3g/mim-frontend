import { Injectable } from '@angular/core';

import { authSignal } from '../signals/auth.signal';

@Injectable({
    providedIn: 'root'
})
export class RecruitmentApplicationViewStateService {
    private readonly storageKeyPrefix = 'mim.recruitment.viewed-applications';
    private readonly cache = new Map<string, Set<string>>();

    isViewed(applicationId: string): boolean {
        const normalizedId = this.normalizeId(applicationId);
        if (!normalizedId) {
            return false;
        }

        return this.currentViewedSet().has(normalizedId);
    }

    markViewed(applicationId: string): void {
        const normalizedId = this.normalizeId(applicationId);
        if (!normalizedId) {
            return;
        }

        const viewedIds = this.currentViewedSet();
        if (viewedIds.has(normalizedId)) {
            return;
        }

        viewedIds.add(normalizedId);
        this.persistCurrentViewedSet(viewedIds);
    }

    removeViewed(applicationIds: readonly string[]): void {
        if (!applicationIds.length) {
            return;
        }

        const viewedIds = this.currentViewedSet();
        let changed = false;
        for (const applicationId of applicationIds) {
            const normalizedId = this.normalizeId(applicationId);
            if (!normalizedId) {
                continue;
            }

            if (viewedIds.delete(normalizedId)) {
                changed = true;
            }
        }

        if (!changed) {
            return;
        }

        this.persistCurrentViewedSet(viewedIds);
    }

    countUnread(applicationIds: readonly string[]): number {
        if (!applicationIds.length) {
            return 0;
        }

        const viewedIds = this.currentViewedSet();
        let unreadCount = 0;
        for (const applicationId of applicationIds) {
            const normalizedId = this.normalizeId(applicationId);
            if (!normalizedId) {
                continue;
            }

            if (!viewedIds.has(normalizedId)) {
                unreadCount += 1;
            }
        }

        return unreadCount;
    }

    hasUnread(applicationIds: readonly string[]): boolean {
        if (!applicationIds.length) {
            return false;
        }

        const viewedIds = this.currentViewedSet();
        for (const applicationId of applicationIds) {
            const normalizedId = this.normalizeId(applicationId);
            if (!normalizedId) {
                continue;
            }

            if (!viewedIds.has(normalizedId)) {
                return true;
            }
        }

        return false;
    }

    private currentViewedSet(): Set<string> {
        const storageKey = this.currentStorageKey();
        const cached = this.cache.get(storageKey);
        if (cached) {
            return cached;
        }

        const loaded = this.readFromStorage(storageKey);
        this.cache.set(storageKey, loaded);
        return loaded;
    }

    private persistCurrentViewedSet(viewedIds: Set<string>): void {
        const storageKey = this.currentStorageKey();
        this.cache.set(storageKey, viewedIds);
        this.writeToStorage(storageKey, viewedIds);
    }

    private currentStorageKey(): string {
        const userId = authSignal.user()?.id?.trim();
        return userId ? `${this.storageKeyPrefix}:${userId}` : `${this.storageKeyPrefix}:anonymous`;
    }

    private readFromStorage(storageKey: string): Set<string> {
        if (!this.canUseStorage()) {
            return new Set<string>();
        }

        const rawValue = window.localStorage.getItem(storageKey);
        if (!rawValue) {
            return new Set<string>();
        }

        try {
            const parsed = JSON.parse(rawValue) as unknown;
            if (!Array.isArray(parsed)) {
                return new Set<string>();
            }

            const values = parsed
                .filter((item): item is string => typeof item === 'string')
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
            return new Set<string>(values);
        } catch {
            return new Set<string>();
        }
    }

    private writeToStorage(storageKey: string, viewedIds: Set<string>): void {
        if (!this.canUseStorage()) {
            return;
        }

        if (viewedIds.size === 0) {
            window.localStorage.removeItem(storageKey);
            return;
        }

        window.localStorage.setItem(storageKey, JSON.stringify(Array.from(viewedIds)));
    }

    private canUseStorage(): boolean {
        return typeof window !== 'undefined' && !!window.localStorage;
    }

    private normalizeId(applicationId: string): string {
        return applicationId.trim();
    }
}
