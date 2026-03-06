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
    },
    ADMIN: {
        USERS: `${API_CONFIG.PREFIX}/admin/users`,
        MODERATION: `${API_CONFIG.PREFIX}/admin/moderation`,
        NEWS: `${API_CONFIG.PREFIX}/admin/news`,
    },
} as const;
