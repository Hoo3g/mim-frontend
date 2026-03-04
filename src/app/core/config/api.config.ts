// API configuration — update when backend URL changes
export const API_CONFIG = {
    BASE_URL: 'http://localhost:8080',
    VERSION: 'v1',
    get PREFIX() { return `${this.BASE_URL}/api/${this.VERSION}`; }
} as const;
