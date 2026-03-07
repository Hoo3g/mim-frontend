import { API_CONFIG } from './api.config';

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_CONFIG.PREFIX}/auth/login`,
        GOOGLE_LOGIN: `${API_CONFIG.PREFIX}/auth/google`,
        REGISTER: `${API_CONFIG.PREFIX}/auth/register`,
        REFRESH: `${API_CONFIG.PREFIX}/auth/refresh-token`,
        LOGOUT: `${API_CONFIG.PREFIX}/auth/logout`,
    },
    RESEARCH: {
        LIST: `${API_CONFIG.PREFIX}/research-papers`,
        MY_PAPERS: `${API_CONFIG.PREFIX}/research-papers/my`,
        DETAIL: (id: string) => `${API_CONFIG.PREFIX}/research-papers/${id}`,
    },
    RECRUITMENT: {
        LIST: `${API_CONFIG.PREFIX}/posts`,
        DETAIL: (id: string) => `${API_CONFIG.PREFIX}/posts/${id}`,
        APPLY: (id: string) => `${API_CONFIG.PREFIX}/posts/${id}/apply`,
    },
    CONTENT: {
        RESEARCH_HERO: `${API_CONFIG.PREFIX}/content/research-hero`,
    },
    NEWS: {
        LIST: `${API_CONFIG.PREFIX}/news`,
    },
    PROFILE: {
        STUDENT: (id: string) => `${API_CONFIG.PREFIX}/profile/student/${id}`,
        COMPANY: (id: string) => `${API_CONFIG.PREFIX}/profile/company/${id}`,
        LECTURER: (id: string) => `${API_CONFIG.PREFIX}/profile/lecturer/${id}`,
    },
    STORAGE: {
        RESEARCH_PDF_UPLOAD: `${API_CONFIG.PREFIX}/storage/research-pdfs`,
        RESEARCH_HERO_IMAGE_UPLOAD: `${API_CONFIG.PREFIX}/admin/storage/research-hero-images`,
    },
    ADMIN: {
        USERS: `${API_CONFIG.PREFIX}/admin/users`,
        MODERATION: `${API_CONFIG.PREFIX}/admin/moderation`,
        MODERATION_POSTS: `${API_CONFIG.PREFIX}/admin/moderation/posts`,
        MODERATION_PAPERS: `${API_CONFIG.PREFIX}/admin/moderation/papers`,
        CONTENT_RESEARCH_HERO: `${API_CONFIG.PREFIX}/admin/content/research-hero`,
        RBAC_PERMISSIONS: `${API_CONFIG.PREFIX}/admin/rbac/permissions`,
        RBAC_ROLES: `${API_CONFIG.PREFIX}/admin/rbac/roles`,
        RBAC_USERS: `${API_CONFIG.PREFIX}/admin/rbac/users`,
        RBAC_USER_OVERRIDES: (id: string) => `${API_CONFIG.PREFIX}/admin/rbac/users/${id}/overrides`,
        NEWS: `${API_CONFIG.PREFIX}/admin/news`,
    },
} as const;
