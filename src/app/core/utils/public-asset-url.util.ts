import { API_CONFIG } from '../config/api.config';

const PUBLIC_STORAGE_PREFIXES = [
    '/api/public/storage/avatars/',
    '/api/public/storage/profile-cvs/',
    '/api/public/storage/research-pdfs/',
    '/api/public/storage/research-hero-images/'
] as const;

function buildPublicUrl(pathname: string, search = '', hash = ''): string {
    return `${API_CONFIG.BASE_URL}${pathname}${search}${hash}`;
}

export function resolvePublicAssetUrl(rawUrl?: string | null): string {
    const value = (rawUrl ?? '').trim();
    if (!value) {
        return '';
    }

    for (const prefix of PUBLIC_STORAGE_PREFIXES) {
        if (value.startsWith(prefix)) {
            return buildPublicUrl(value);
        }
    }

    if (value.startsWith('/api/v1/storage/')) {
        return buildPublicUrl(value.replace('/api/v1/storage/', '/api/public/storage/'));
    }

    if (value.startsWith('/')) {
        return buildPublicUrl(value);
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
            const parsed = new URL(value);
            const pathname = parsed.pathname.replace('/api/v1/storage/', '/api/public/storage/');
            if (pathname.startsWith('/api/public/storage/')) {
                return buildPublicUrl(pathname, parsed.search, parsed.hash);
            }
            return value;
        } catch {
            return value;
        }
    }

    return value;
}
