import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { NewsItem, NewsScheduleEntry } from '../models/news.model';
import { TimedObservableCache } from '../utils/timed-observable-cache.util';
import { parseDate, unwrap, unwrapList } from '../utils/api-response.util';
import { UI_LABELS } from '../constants/ui-labels.const';

interface NewsApiModel {
    id?: string;
    title?: string;
    content?: string;
    summary?: string;
    imageUrl?: string;
    status?: string;
    contentType?: string;
    pinned?: boolean;
    authorId?: string;
    importSourceUrl?: string;
    scheduleEntries?: NewsScheduleEntryApiModel[];
    importedAt?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

interface NewsScheduleEntryApiModel {
    reportTime?: string;
    reportRoom?: string;
    reportFormat?: string;
    paperTitle?: string;
    paperId?: string;
    displayOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
    private readonly http = inject(HttpClient);
    private readonly newsListCache = new TimedObservableCache<NewsItem[]>(60_000);
    private readonly newsDetailCache = new TimedObservableCache<NewsItem | null>(60_000);

    getPublicNews(): Observable<NewsItem[]> {
        const cacheKey = 'public-news';
        const cachedNews$ = this.newsListCache.get(cacheKey);
        if (cachedNews$) {
            return cachedNews$;
        }

        const request$ = this.http.get<ApiResponse<NewsApiModel[]>>(API_ENDPOINTS.NEWS.LIST).pipe(
            map((response) => unwrapList(response).map((item) => this.toNewsItem(item))),
            catchError(() => {
                this.newsListCache.delete(cacheKey);
                return of([]);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.newsListCache.set(cacheKey, request$);
    }

    getPublicNewsById(newsId: string): Observable<NewsItem | null> {
        const cacheKey = (newsId ?? '').trim();
        const cachedNews$ = this.newsDetailCache.get(cacheKey);
        if (cachedNews$) {
            return cachedNews$;
        }

        const request$ = this.http.get<ApiResponse<NewsApiModel>>(API_ENDPOINTS.NEWS.DETAIL(newsId)).pipe(
            map((response) => this.toNewsItem(unwrap(response))),
            catchError(() => {
                this.newsDetailCache.delete(cacheKey);
                return of(null);
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this.newsDetailCache.set(cacheKey, request$);
    }


    private toNewsItem(item: NewsApiModel): NewsItem {
        return {
            id: item.id ?? this.generateFallbackId(),
            title: item.title?.trim() || UI_LABELS.UNTITLED_VN,
            content: item.content?.trim() || item.summary?.trim() || '',
            summary: item.summary?.trim() || '',
            imageUrl: item.imageUrl?.trim() || '',
            status: item.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
            contentType: item.contentType === 'RESEARCH_SCHEDULE' ? 'RESEARCH_SCHEDULE' : 'STANDARD',
            pinned: !!item.pinned,
            authorId: item.authorId,
            importSourceUrl: item.importSourceUrl?.trim() || '',
            scheduleEntries: (item.scheduleEntries ?? []).map((entry, index) => this.toScheduleEntry(entry, index)),
            importedAt: item.importedAt ? parseDate(item.importedAt) : undefined,
            createdAt: parseDate(item.createdAt),
            updatedAt: parseDate(item.updatedAt)
        };
    }

    private toScheduleEntry(item: NewsScheduleEntryApiModel | null | undefined, index: number): NewsScheduleEntry {
        return {
            reportTime: item?.reportTime?.trim() || '',
            reportRoom: item?.reportRoom?.trim() || '',
            reportFormat: item?.reportFormat?.trim() || '',
            paperTitle: item?.paperTitle?.trim() || UI_LABELS.UNTITLED_VN,
            paperId: item?.paperId?.trim() || undefined,
            displayOrder: item?.displayOrder ?? index + 1
        };
    }


    private generateFallbackId(): string {
        return `news-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    }
}
