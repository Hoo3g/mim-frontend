export interface ResearchCategory {
    id: string;
    name: string;
    sortOrder: number;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UpsertResearchCategoryRequest {
    name: string;
    sortOrder?: number;
    active?: boolean;
}
