// Di chuyển từ core/models/research-paper.model.ts
export type { PaperAuthor, ResearchPaper } from '../../../core/models/research-paper.model';

export interface ResearchFilter {
    category?: 'ALL' | 'LECTURER' | 'STUDENT';
    area?: string;
    year?: number;
}

export type ResearchSortOption = 'NEWEST' | 'OLDEST' | 'TITLE_ASC' | 'TITLE_DESC';
