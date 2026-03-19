import { Injectable } from '@angular/core';

import { ResearchPaper } from '../models/research-paper.model';

export interface ResearchListViewState {
    papers: ResearchPaper[];
    currentPage: number;
    hasMorePapers: boolean;
    scrollY: number;
    savedAt: number;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchListViewStateService {
    private readonly ttlMs = 10 * 60 * 1000;
    private readonly states = new Map<string, ResearchListViewState>();

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
            savedAt: state.savedAt
        };
    }
}
