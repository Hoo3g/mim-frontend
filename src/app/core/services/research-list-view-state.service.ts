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
    private readonly states = new Map<string, ResearchListViewState>();
    private lastViewedPaperId: string | null = null;
    private lastListUrl: string | null = null;

    get(key: string): ResearchListViewState | null {
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
            return null;
        }

        return this.cloneState(state);
    }

    set(key: string, state: Omit<ResearchListViewState, 'savedAt'>): void {
        const normalizedKey = key.trim();
        if (!normalizedKey) {
            return;
        }

        this.states.set(normalizedKey, this.cloneState({
            ...state,
            savedAt: Date.now()
        }));
    }

    clear(key?: string): void {
        const normalizedKey = key?.trim();
        if (!normalizedKey) {
            this.states.clear();
            return;
        }
        this.states.delete(normalizedKey);
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
