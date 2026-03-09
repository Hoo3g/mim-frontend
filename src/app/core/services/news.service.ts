import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { NewsItem, NewsStatus } from '../models/news.model';
import { MOCK_NEWS } from '../../infrastructure/mock/data';

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
export class NewsService {
    private readonly http = inject(HttpClient);

    getPublicNews(): Observable<NewsItem[]> {
        return this.http.get<ApiResponse<NewsApiModel[]>>(API_ENDPOINTS.NEWS.LIST).pipe(
            map((response) => this.unwrapList(response).map((item) => this.toNewsItem(item))),
            catchError(() => of(this.fallbackNews()))
        );
    }

    getPublicNewsById(newsId: string): Observable<NewsItem | null> {
        return this.http.get<ApiResponse<NewsApiModel>>(API_ENDPOINTS.NEWS.DETAIL(newsId)).pipe(
            map((response) => this.toNewsItem(this.unwrap(response))),
            catchError(() => of(this.fallbackNews().find((item) => item.id === newsId) ?? null))
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
            id: item.id ?? this.generateFallbackId(),
            title: item.title?.trim() || 'Không có tiêu đề',
            content: item.content?.trim() || item.summary?.trim() || '',
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

    private fallbackNews(): NewsItem[] {
        return MOCK_NEWS.map((item) => ({
            id: item.id,
            title: item.title,
            content: item.summary,
            summary: item.summary,
            status: 'PUBLISHED' as NewsStatus,
            pinned: false,
            createdAt: this.toDate(item.date)
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    private generateFallbackId(): string {
        return `news-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    }
}
