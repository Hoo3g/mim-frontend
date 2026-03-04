import { API_CONFIG } from './api.config';

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_CONFIG.PREFIX}/auth/login`,
        REGISTER: `${API_CONFIG.PREFIX}/auth/register`,
        REFRESH: `${API_CONFIG.PREFIX}/auth/refresh`,
        LOGOUT: `${API_CONFIG.PREFIX}/auth/logout`,
    },
    RESEARCH: {
        LIST: `${API_CONFIG.PREFIX}/research`,
        DETAIL: (id: string) => `${API_CONFIG.PREFIX}/research/${id}`,
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
    ADMIN: {
        USERS: `${API_CONFIG.PREFIX}/admin/users`,
        MODERATION: `${API_CONFIG.PREFIX}/admin/moderation`,
        NEWS: `${API_CONFIG.PREFIX}/admin/news`,
    },
} as const;
