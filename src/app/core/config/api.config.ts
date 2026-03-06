// API configuration — update when backend URL changes
export const API_CONFIG = {
    BASE_URL: 'http://localhost:8080',
    VERSION: 'v1',
    GOOGLE_CLIENT_ID: '983439776863-h1dbo93cbt93bpcnq5q15940cpk4a22o.apps.googleusercontent.com',
    get PREFIX() { return `${this.BASE_URL}/api/${this.VERSION}`; }
} as const;
