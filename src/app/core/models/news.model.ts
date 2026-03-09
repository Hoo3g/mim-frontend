export type NewsStatus = 'DRAFT' | 'PUBLISHED';

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    summary?: string;
    imageUrl?: string;
    status: NewsStatus;
    pinned: boolean;
    authorId?: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface UpsertNewsRequest {
    title: string;
    content: string;
    summary?: string;
    imageUrl?: string;
    status?: NewsStatus;
    pinned?: boolean;
}
