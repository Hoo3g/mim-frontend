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
  apiBaseUrl: 'http://localhost:8081',
  googleClientId: '',
};

function normalizeUrl(value: string | undefined, fallback: string): string {
  const normalized = (value ?? '').trim();
  if (!normalized) return fallback;
  return normalized.replace(/\/+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  const normalized = (hostname ?? '').trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function shouldFallbackToCurrentOrigin(value: string | undefined): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const currentHostname = window.location.hostname;
  if (!currentHostname || isLocalHostname(currentHostname)) {
    return false;
  }

  try {
    return isLocalHostname(new URL((value ?? '').trim()).hostname);
  } catch {
    return false;
  }
}

function resolveRuntimeConfig(): RuntimeConfig {
  const globalWindow = window as RuntimeConfigWindow;
  const injected = globalWindow.__APP_CONFIG__;
  const apiBaseUrl = shouldFallbackToCurrentOrigin(injected?.API_BASE_URL)
    ? normalizeUrl(window.location.origin, DEFAULT_CONFIG.apiBaseUrl)
    : normalizeUrl(injected?.API_BASE_URL, DEFAULT_CONFIG.apiBaseUrl);

  return {
    apiBaseUrl,
    googleClientId: (injected?.GOOGLE_CLIENT_ID ?? DEFAULT_CONFIG.googleClientId).trim(),
  };
}

export const runtimeConfig = resolveRuntimeConfig();
