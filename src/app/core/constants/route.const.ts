export const ROUTES = {
    HOME: '/',
    RESEARCH: '/research',
    RESEARCH_DETAIL: (id: string) => `/paper/${id}`,
    RECRUITMENT: '/recruitment',
    RECRUITMENT_DETAIL: (id: string) => `/recruitment/${id}`,
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
    },
    PROFILE: '/profile',
    ADMIN: '/admin',
} as const;
