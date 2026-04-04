import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_ENDPOINTS } from '../config/api-endpoints.config';
import { ApiResponse } from '../models/api-response.model';
import { NewsItem, NewsScheduleEntry, NewsScheduleImportPreview, UpsertNewsRequest } from '../models/news.model';
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

interface NewsScheduleImportPreviewApiModel {
    sourceUrl?: string;
    totalEntries?: number;
    matchedEntries?: number;
    unmatchedEntries?: number;
    entries?: NewsScheduleEntryApiModel[];
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

    importResearchSchedule(file?: File | null, sourceUrl?: string | null): Observable<NewsScheduleImportPreview | null> {
        const formData = new FormData();
        if (file) {
            formData.append('file', file, file.name);
        }
        const normalizedSourceUrl = (sourceUrl ?? '').trim();
        if (normalizedSourceUrl) {
            formData.append('sourceUrl', normalizedSourceUrl);
        }

        return this.http.post<ApiResponse<NewsScheduleImportPreviewApiModel>>(
            API_ENDPOINTS.ADMIN.NEWS_IMPORT_SCHEDULE,
            formData
        ).pipe(
            map((response) => this.toScheduleImportPreview(unwrap(response)))
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

    private toScheduleImportPreview(item: NewsScheduleImportPreviewApiModel | null | undefined): NewsScheduleImportPreview | null {
        if (!item) {
            return null;
        }
        return {
            sourceUrl: item.sourceUrl?.trim() || '',
            totalEntries: Math.max(item.totalEntries ?? 0, 0),
            matchedEntries: Math.max(item.matchedEntries ?? 0, 0),
            unmatchedEntries: Math.max(item.unmatchedEntries ?? 0, 0),
            entries: (item.entries ?? []).map((entry, index) => this.toScheduleEntry(entry, index))
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
