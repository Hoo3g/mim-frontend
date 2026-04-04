export type NewsStatus = 'DRAFT' | 'PUBLISHED';
export type NewsContentType = 'STANDARD' | 'RESEARCH_SCHEDULE';

export interface NewsScheduleEntry {
    reportTime: string;
    reportRoom: string;
    reportFormat: string;
    paperTitle: string;
    paperId?: string;
    displayOrder: number;
}

export interface NewsScheduleImportPreview {
    sourceUrl?: string;
    totalEntries: number;
    matchedEntries: number;
    unmatchedEntries: number;
    entries: NewsScheduleEntry[];
}

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    summary?: string;
    imageUrl?: string;
    status: NewsStatus;
    contentType: NewsContentType;
    pinned: boolean;
    authorId?: string;
    importSourceUrl?: string;
    scheduleEntries: NewsScheduleEntry[];
    importedAt?: Date;
    createdAt: Date;
    updatedAt?: Date;
}

export interface UpsertNewsRequest {
    title: string;
    content: string;
    summary?: string;
    imageUrl?: string;
    status?: NewsStatus;
    contentType?: NewsContentType;
    importSourceUrl?: string;
    scheduleEntries?: NewsScheduleEntry[];
    pinned?: boolean;
}
