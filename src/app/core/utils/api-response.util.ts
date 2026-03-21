import { ApiResponse, PagedResponse } from '../models/api-response.model';

/**
 * Shared API response helper utilities.
 * Use these in all services instead of duplicating the same private methods.
 */

/**
 * Unwraps a successful API response or throws an error.
 * @throws Error if response.success is false or data is null.
 */
export function unwrap<T>(response: ApiResponse<T>): T {
    if (!response.success || response.data === null || response.data === undefined) {
        throw new Error(response.message || 'Request failed');
    }
    return response.data;
}

/**
 * Unwraps a list response safely, returning an empty array on failure.
 */
export function unwrapList<T>(response: ApiResponse<T[]>): T[] {
    if (!response.success || !response.data) {
        return [];
    }
    return response.data;
}

/**
 * Unwraps a nullable response, returning a fallback value on failure.
 */
export function unwrapOr<T>(response: ApiResponse<T>, fallback: T): T {
    if (!response.success || response.data === null || response.data === undefined) {
        return fallback;
    }
    return response.data;
}

/**
 * Normalizes a paged API response into a standard PagedResponse<T>.
 * Handles both array payloads (full result) and paged payloads.
 */
export function unwrapPaged<T>(
    response: ApiResponse<PagedResponse<T> | T[]>,
    fallbackPage: number,
    fallbackSize: number
): PagedResponse<T> {
    if (!response.success || response.data === null || response.data === undefined) {
        return emptyPagedResult<T>(fallbackPage, fallbackSize);
    }

    if (Array.isArray(response.data)) {
        const content = response.data as T[];
        return {
            content,
            pageInfo: {
                page: 0,
                size: content.length,
                totalElements: content.length,
                totalPages: content.length > 0 ? 1 : 0
            }
        };
    }

    const paged = response.data as PagedResponse<T>;
    const content = Array.isArray(paged.content) ? paged.content : [];
    const rawPageInfo = paged.pageInfo;
    return {
        content,
        pageInfo: {
            page: rawPageInfo?.page ?? fallbackPage,
            size: rawPageInfo?.size ?? fallbackSize,
            totalElements: rawPageInfo?.totalElements ?? content.length,
            totalPages: rawPageInfo?.totalPages ?? (content.length > 0 ? 1 : 0)
        }
    };
}

/**
 * Returns an empty PagedResponse<T> with the given page/size metadata.
 */
export function emptyPagedResult<T>(page: number, size: number): PagedResponse<T> {
    return {
        content: [],
        pageInfo: {
            page,
            size,
            totalElements: 0,
            totalPages: 0
        }
    };
}

/**
 * Parses a string or Date value into a Date.
 * Returns `fallback` (default: now) if parsing fails.
 */
export function parseDate(value?: string | Date | null, fallback?: Date): Date {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return fallback ?? new Date();
}
