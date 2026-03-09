import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { NewsItem, UpsertNewsRequest } from '../models/news.model';

interface NewsApiModel {
    id?: string;
    title?: string;
    content?: string;
    summary?: string;
    imageUrl?: string;
    status?: string;
    pinned?: boolean;
    authorId?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

@Injectable({ providedIn: 'root' })
export class AdminNewsService {
    private readonly http = inject(HttpClient);
    private readonly localStorageKey = 'mim-admin-news-fallback';

    getAll(): Observable<NewsItem[]> {
        return this.http.get<ApiResponse<NewsApiModel[]>>(API_ENDPOINTS.ADMIN.NEWS).pipe(
            map((response) => this.unwrapList(response).map((item) => this.toNewsItem(item))),
            map((items) => this.sortNews(items)),
            catchError(() => of(this.readLocal()))
        );
    }

    create(payload: UpsertNewsRequest): Observable<NewsItem | null> {
        return this.http.post<ApiResponse<NewsApiModel>>(API_ENDPOINTS.ADMIN.NEWS, payload).pipe(
            map((response) => this.toNewsItem(this.unwrap(response))),
            catchError(() => of(this.createLocal(payload)))
        );
    }

    update(newsId: string, payload: UpsertNewsRequest): Observable<NewsItem | null> {
        return this.http.put<ApiResponse<NewsApiModel>>(API_ENDPOINTS.ADMIN.NEWS_DETAIL(newsId), payload).pipe(
            map((response) => this.toNewsItem(this.unwrap(response))),
            catchError(() => of(this.updateLocal(newsId, payload)))
        );
    }

    delete(newsId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<void>>(API_ENDPOINTS.ADMIN.NEWS_DETAIL(newsId)).pipe(
            map((response) => response.success),
            catchError(() => of(this.deleteLocal(newsId)))
        );
    }

    private unwrap<T>(response: ApiResponse<T>): T {
        if (!response.success || response.data === null) {
            throw new Error(response.message || 'Request failed');
        }
        return response.data;
    }

    private unwrapList<T>(response: ApiResponse<T[]>): T[] {
        if (!response.success || response.data === null) {
            return [];
        }
        return response.data;
    }

    private toNewsItem(item: NewsApiModel): NewsItem {
        return {
            id: item.id ?? this.generateId(),
            title: item.title?.trim() || 'Không có tiêu đề',
            content: item.content?.trim() || '',
            summary: item.summary?.trim() || '',
            imageUrl: item.imageUrl?.trim() || '',
            status: item.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
            pinned: !!item.pinned,
            authorId: item.authorId,
            createdAt: this.toDate(item.createdAt),
            updatedAt: this.toDate(item.updatedAt)
        };
    }

    private toDate(value?: string | Date): Date {
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return new Date();
    }

    private sortNews(items: NewsItem[]): NewsItem[] {
        return [...items].sort((a, b) => {
            if (a.pinned !== b.pinned) {
                return a.pinned ? -1 : 1;
            }
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }

    private readLocal(): NewsItem[] {
        const raw = localStorage.getItem(this.localStorageKey);
        if (!raw) {
            return [];
        }
        try {
            const data = JSON.parse(raw) as NewsApiModel[];
            return this.sortNews(data.map((item) => this.toNewsItem(item)));
        } catch {
            return [];
        }
    }

    private writeLocal(items: NewsItem[]): void {
        localStorage.setItem(this.localStorageKey, JSON.stringify(items));
    }

    private createLocal(payload: UpsertNewsRequest): NewsItem {
        const now = new Date();
        const list = this.readLocal();
        const created: NewsItem = {
            id: this.generateId(),
            title: payload.title.trim(),
            content: payload.content.trim(),
            summary: (payload.summary ?? '').trim(),
            imageUrl: (payload.imageUrl ?? '').trim(),
            status: payload.status ?? 'PUBLISHED',
            pinned: !!payload.pinned,
            createdAt: now,
            updatedAt: now
        };
        this.writeLocal(this.sortNews([created, ...list]));
        return created;
    }

    private updateLocal(newsId: string, payload: UpsertNewsRequest): NewsItem | null {
        const list = this.readLocal();
        const index = list.findIndex((item) => item.id === newsId);
        if (index < 0) {
            return null;
        }
        const current = list[index];
        const updated: NewsItem = {
            ...current,
            title: payload.title.trim(),
            content: payload.content.trim(),
            summary: (payload.summary ?? '').trim(),
            imageUrl: (payload.imageUrl ?? '').trim(),
            status: payload.status ?? current.status,
            pinned: payload.pinned ?? current.pinned,
            updatedAt: new Date()
        };
        list[index] = updated;
        this.writeLocal(this.sortNews(list));
        return updated;
    }

    private deleteLocal(newsId: string): boolean {
        const list = this.readLocal();
        const next = list.filter((item) => item.id !== newsId);
        if (next.length === list.length) {
            return false;
        }
        this.writeLocal(next);
        return true;
    }

    private generateId(): string {
        return `news-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    }
}
