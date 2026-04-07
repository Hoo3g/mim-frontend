import { Injectable } from '@angular/core';

import { ResearchPaper } from '../models/research-paper.model';

export interface ResearchListViewState {
    papers: ResearchPaper[];
    currentPage: number;
    hasMorePapers: boolean;
    scrollY: number;
    totalPaperCount?: number;
    savedAt: number;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchListViewStateService {
    private readonly ttlMs = 10 * 60 * 1000;
    private readonly lastViewedPaperStorageKey = 'research:last-viewed-paper-id';
    private readonly lastListUrlStorageKey = 'research:last-list-url';
    private readonly listStatesStorageKey = 'research:list-view-states';
    private readonly states = new Map<string, ResearchListViewState>();
    private lastViewedPaperId: string | null = null;
    private lastListUrl: string | null = null;
    private didHydrateStates = false;

    get(key: string): ResearchListViewState | null {
        this.hydrateStatesFromSession();
        const normalizedKey = key.trim();
        if (!normalizedKey) {
            return null;
        }

        const state = this.states.get(normalizedKey);
        if (!state) {
            return null;
        }

        if (state.savedAt + this.ttlMs <= Date.now()) {
            this.states.delete(normalizedKey);
            this.persistStatesToSession();
            return null;
        }

        return this.cloneState(state);
    }

    set(key: string, state: Omit<ResearchListViewState, 'savedAt'>): void {
        this.hydrateStatesFromSession();
        const normalizedKey = key.trim();
        if (!normalizedKey) {
            return;
        }

        this.states.set(normalizedKey, this.cloneState({
            ...state,
            savedAt: Date.now()
        }));
        this.persistStatesToSession();
    }

    clear(key?: string): void {
        this.hydrateStatesFromSession();
        const normalizedKey = key?.trim();
        if (!normalizedKey) {
            this.states.clear();
            this.persistStatesToSession();
            return;
        }
        this.states.delete(normalizedKey);
        this.persistStatesToSession();
    }

    markLastViewedPaper(paperId: string, listUrl?: string): void {
        const normalizedPaperId = paperId.trim();
        if (!normalizedPaperId) {
            return;
        }

        this.lastViewedPaperId = normalizedPaperId;
        this.writeSessionValue(this.lastViewedPaperStorageKey, normalizedPaperId);

        const normalizedListUrl = listUrl?.trim();
        if (normalizedListUrl) {
            this.lastListUrl = normalizedListUrl;
            this.writeSessionValue(this.lastListUrlStorageKey, normalizedListUrl);
        }
    }

    getLastViewedPaperId(): string | null {
        if (this.lastViewedPaperId) {
            return this.lastViewedPaperId;
        }

        const storedValue = this.readSessionValue(this.lastViewedPaperStorageKey);
        this.lastViewedPaperId = storedValue;
        return storedValue;
    }

    getLastListUrl(): string | null {
        if (this.lastListUrl) {
            return this.lastListUrl;
        }

        const storedValue = this.readSessionValue(this.lastListUrlStorageKey);
        this.lastListUrl = storedValue;
        return storedValue;
    }

    private readSessionValue(key: string): string | null {
        if (typeof window === 'undefined') {
            return null;
        }

        try {
            const value = window.sessionStorage.getItem(key)?.trim() ?? '';
            return value || null;
        } catch {
            return null;
        }
    }

    private writeSessionValue(key: string, value: string): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.sessionStorage.setItem(key, value);
        } catch {
            // Ignore storage errors in restricted browser modes.
        }
    }

    private hydrateStatesFromSession(): void {
        if (this.didHydrateStates || typeof window === 'undefined') {
            return;
        }

        this.didHydrateStates = true;
        try {
            const rawValue = window.sessionStorage.getItem(this.listStatesStorageKey)?.trim() ?? '';
            if (!rawValue) {
                return;
            }

            const parsed = JSON.parse(rawValue) as Record<string, ResearchListViewState>;
            const now = Date.now();
            let hasExpiredEntries = false;

            for (const [key, state] of Object.entries(parsed)) {
                if (!key.trim() || !state || typeof state !== 'object') {
                    continue;
                }

                if (typeof state.savedAt !== 'number' || state.savedAt + this.ttlMs <= now) {
                    hasExpiredEntries = true;
                    continue;
                }

                this.states.set(key, this.cloneState(state));
            }

            if (hasExpiredEntries) {
                this.persistStatesToSession();
            }
        } catch {
            this.states.clear();
        }
    }

    private persistStatesToSession(): void {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            if (this.states.size === 0) {
                window.sessionStorage.removeItem(this.listStatesStorageKey);
                return;
            }

            const payload = Object.fromEntries(
                [...this.states.entries()].map(([key, state]) => [key, this.cloneState(state)])
            );
            window.sessionStorage.setItem(this.listStatesStorageKey, JSON.stringify(payload));
        } catch {
            // Ignore storage quota errors in constrained mobile browsers.
        }
    }

    private cloneState(state: ResearchListViewState): ResearchListViewState {
        return {
            papers: state.papers.map((paper) => ({
                ...paper,
                authors: paper.authors.map((author) => ({ ...author })),
                createdAt: new Date(paper.createdAt),
                updatedAt: new Date(paper.updatedAt)
            })),
            currentPage: state.currentPage,
            hasMorePapers: state.hasMorePapers,
            scrollY: state.scrollY,
            totalPaperCount: state.totalPaperCount,
            savedAt: state.savedAt
        };
    }
}
