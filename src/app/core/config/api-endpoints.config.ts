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
        BOOKMARKS_MY: `${API_CONFIG.PREFIX}/research-papers/bookmarks/me`,
        BOOKMARK: (id: string) => `${API_CONFIG.PREFIX}/research-papers/${id}/bookmarks`,
        CATEGORIES: `${API_CONFIG.PREFIX}/research-categories`,
        SPECIALIZATIONS: `${API_CONFIG.PREFIX}/specializations`,
    },
    RECRUITMENT: {
        LIST: `${API_CONFIG.PREFIX}/posts`,
        DETAIL: (id: string) => `${API_CONFIG.PREFIX}/posts/${id}`,
        APPLY: (id: string) => `${API_CONFIG.PREFIX}/posts/${id}/apply`,
        APPLICATIONS_MY: `${API_CONFIG.PREFIX}/posts/applications/me`,
        APPLICATIONS_RECEIVED: `${API_CONFIG.PREFIX}/posts/applications/received`,
    },
    CONTENT: {
        RESEARCH_HERO: `${API_CONFIG.PREFIX}/content/research-hero`,
    },
    NEWS: {
        LIST: `${API_CONFIG.PREFIX}/news`,
    },
    PROFILE: {
        ME: `${API_CONFIG.PREFIX}/profile/me`,
        DASHBOARD: `${API_CONFIG.PREFIX}/profile/me/dashboard`,
        STUDENT: `${API_CONFIG.PREFIX}/profile/me/student`,
        COMPANY: `${API_CONFIG.PREFIX}/profile/me/company`,
        LECTURER: `${API_CONFIG.PREFIX}/profile/me/lecturer`,
    },
    STORAGE: {
        RESEARCH_PDF_UPLOAD: `${API_CONFIG.PREFIX}/storage/research-pdfs`,
        RESEARCH_HERO_IMAGE_UPLOAD: `${API_CONFIG.PREFIX}/admin/storage/research-hero-images`,
        PROFILE_CV_UPLOAD: `${API_CONFIG.PREFIX}/storage/profile-cvs`,
        AVATAR_UPLOAD: `${API_CONFIG.PREFIX}/storage/avatars`,
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
        RESEARCH_CATEGORIES: `${API_CONFIG.PREFIX}/admin/research-categories`,
        RESEARCH_CATEGORY_DETAIL: (id: string) => `${API_CONFIG.PREFIX}/admin/research-categories/${id}`,
        SPECIALIZATIONS: `${API_CONFIG.PREFIX}/admin/specializations`,
        SPECIALIZATION_DETAIL: (id: string) => `${API_CONFIG.PREFIX}/admin/specializations/${id}`,
        NEWS: `${API_CONFIG.PREFIX}/admin/news`,
    },
} as const;
