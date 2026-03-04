// Di chuyển từ core/models/research-paper.model.ts
export type { PaperAuthor, ResearchPaper } from '../../../core/models/research-paper.model';

// TODO: thêm ResearchFilter, ResearchSortOptions khi implement API
export interface ResearchFilter {
    category?: 'ALL' | 'LECTURER' | 'STUDENT';
    area?: string;
    year?: number;
}
