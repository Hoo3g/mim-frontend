// Di chuyển từ core/models/post.model.ts
export type { Post, PostType } from '../../../core/models/post.model';

export interface PostFilter {
    type?: string;
    searchTerm?: string;
    tags?: string[];
}
