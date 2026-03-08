type RuntimeConfigWindow = Window & {
  __APP_CONFIG__?: {
    API_BASE_URL?: string;
    GOOGLE_CLIENT_ID?: string;
  };
};

export type RuntimeConfig = {
  apiBaseUrl: string;
  googleClientId: string;
};

const DEFAULT_CONFIG: RuntimeConfig = {
  apiBaseUrl: 'http://localhost:8080',
  googleClientId: '983439776863-h1dbo93cbt93bpcnq5q15940cpk4a22o.apps.googleusercontent.com',
};

function normalizeUrl(value: string | undefined, fallback: string): string {
  const normalized = (value ?? '').trim();
  if (!normalized) return fallback;
  return normalized.replace(/\/+$/, '');
}

function resolveRuntimeConfig(): RuntimeConfig {
  const globalWindow = window as RuntimeConfigWindow;
  const injected = globalWindow.__APP_CONFIG__;

  return {
    apiBaseUrl: normalizeUrl(injected?.API_BASE_URL, DEFAULT_CONFIG.apiBaseUrl),
    googleClientId: (injected?.GOOGLE_CLIENT_ID ?? DEFAULT_CONFIG.googleClientId).trim() || DEFAULT_CONFIG.googleClientId,
  };
}

export const runtimeConfig = resolveRuntimeConfig();
