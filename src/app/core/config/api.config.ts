import { runtimeConfig } from './runtime-config';

// API configuration is resolved at runtime so one image can serve many envs.
export const API_CONFIG = {
    BASE_URL: runtimeConfig.apiBaseUrl,
    VERSION: 'v1',
    GOOGLE_CLIENT_ID: runtimeConfig.googleClientId,
    get PREFIX() { return `${this.BASE_URL}/api/${this.VERSION}`; }
} as const;
