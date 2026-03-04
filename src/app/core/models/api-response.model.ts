/** Generic API response envelope — matches backend ApiResponse<T> */
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
    errorCode?: string;
    timestamp: string;
}

/** Pagination metadata */
export interface PageInfo {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface PagedResponse<T> {
    content: T[];
    pageInfo: PageInfo;
}
