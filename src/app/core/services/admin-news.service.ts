import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { NewsItem, UpsertNewsRequest } from '../models/news.model';
import { parseDate, unwrap, unwrapList } from '../utils/api-response.util';
import { UI_LABELS } from '../constants/ui-labels.const';

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

    getAll(): Observable<NewsItem[]> {
        return this.http.get<ApiResponse<NewsApiModel[]>>(API_ENDPOINTS.ADMIN.NEWS).pipe(
            map((response) => unwrapList(response).map((item) => this.toNewsItem(item))),
            map((items) => this.sortNews(items))
        );
    }

    create(payload: UpsertNewsRequest): Observable<NewsItem | null> {
        return this.http.post<ApiResponse<NewsApiModel>>(API_ENDPOINTS.ADMIN.NEWS, payload).pipe(
            map((response) => this.toNewsItem(unwrap(response)))
        );
    }

    update(newsId: string, payload: UpsertNewsRequest): Observable<NewsItem | null> {
        return this.http.put<ApiResponse<NewsApiModel>>(API_ENDPOINTS.ADMIN.NEWS_DETAIL(newsId), payload).pipe(
            map((response) => this.toNewsItem(unwrap(response)))
        );
    }

    delete(newsId: string): Observable<boolean> {
        return this.http.delete<ApiResponse<void>>(API_ENDPOINTS.ADMIN.NEWS_DETAIL(newsId)).pipe(
            map((response) => response.success)
        );
    }


    private toNewsItem(item: NewsApiModel): NewsItem {
        return {
            id: item.id ?? this.generateId(),
            title: item.title?.trim() || UI_LABELS.UNTITLED_VN,
            content: item.content?.trim() || '',
            summary: item.summary?.trim() || '',
            imageUrl: item.imageUrl?.trim() || '',
            status: item.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
            pinned: !!item.pinned,
            authorId: item.authorId,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
        };
    }


    private sortNews(items: NewsItem[]): NewsItem[] {
        return [...items].sort((a, b) => {
            if (a.pinned !== b.pinned) {
                return a.pinned ? -1 : 1;
            }
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }

    private generateId(): string {
        return `news-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    }
}
