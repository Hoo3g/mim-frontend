export const ROUTES = {
    HOME: '/',
    RESEARCH: '/research',
    RESEARCH_FILTER: '/research/filter',
    RESEARCH_DETAIL: (id: string) => `/paper/${id}`,
    RESEARCH_MY_PAPERS: '/paper/my-papers',
    RESEARCH_EDITOR: '/paper/editor',
    RESEARCH_EDITOR_EDIT: (id: string) => `/paper/editor/${id}`,
    RECRUITMENT: '/recruitment',
    RECRUITMENT_DETAIL: (id: string) => `/recruitment/${id}`,
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
    },
    PROFILE: '/profile',
    ADMIN: '/admin',
} as const;
