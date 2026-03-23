import { signal, computed } from '@angular/core';
import { Role } from '../enums/role.enum';
import type { AccountStatus } from '../../features/auth/models/auth.model';

export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    permissions: string[];
    avatarUrl?: string;
    accountStatus: AccountStatus;
}

// ─── Auth Signal ────────────────────────────────────────────
const _user = signal<AuthUser | null>(null);
const _token = signal<string | null>(null);
const AUTH_SESSION_ID_STORAGE_KEY = 'mim_auth_session_id';
const AUTH_SESSION_USER_ID_STORAGE_KEY = 'mim_auth_session_user_id';
const ADMIN_UI_PERMISSIONS = [
    'ADMIN_DASHBOARD_VIEW',
    'MODERATION_POSTS_VIEW',
    'MODERATION_POSTS_ACTION',
    'MODERATION_PAPERS_VIEW',
    'MODERATION_PAPERS_ACTION',
    'RESEARCH_HERO_EDIT',
    'RESEARCH_CATEGORY_MANAGE',
    'RBAC_MANAGE'
] as const;

export const authSignal = {
    user: _user.asReadonly(),
    token: _token.asReadonly(),
    sessionId(): string | null {
        return readAuthSessionId();
    },
    isAuth: computed(() => _user() !== null && !!_token()),
    isAdmin: computed(() => _user()?.role === Role.ADMIN),
    isVerified: computed(() => normalizeAccountStatus(_user()?.accountStatus) === 'APPROVED'),
    canCreateContent: computed(() => {
        const user = _user();
        return !!user && !!_token() && normalizeAccountStatus(user.accountStatus) === 'APPROVED';
    }),
    canAccessAdmin: computed(() => {
        const user = _user();
        if (!user || !_token()) {
            return false;
        }
        if (user.role === Role.ADMIN) {
            return true;
        }
        return ADMIN_UI_PERMISSIONS.some((permission) => user.permissions.includes(permission));
    }),

    setAuth(user: AuthUser, token: string): void {
        const normalizedUser = {
            ...user,
            permissions: normalizePermissions(user.permissions),
            accountStatus: normalizeAccountStatus(user.accountStatus) ?? 'APPROVED'
        };
        _user.set(normalizedUser);
        _token.set(token);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        ensureAuthSession(normalizedUser.id);
    },

    hasPermission(permission: string): boolean {
        const user = _user();
        if (!user || !_token()) {
            return false;
        }
        if (user.role === Role.ADMIN) {
            return true;
        }
        if (user.permissions.includes(permission)) {
            return true;
        }
        // Approve/Reject permission implies viewing the queue.
        if (permission === 'MODERATION_POSTS_VIEW' && user.permissions.includes('MODERATION_POSTS_ACTION')) {
            return true;
        }
        if (permission === 'MODERATION_PAPERS_VIEW' && user.permissions.includes('MODERATION_PAPERS_ACTION')) {
            return true;
        }
        return false;
    },

    clearAuth(): void {
        _user.set(null);
        _token.set(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        clearAuthSession();
    },

    updateAvatar(avatarUrl?: string | null): void {
        const current = _user();
        if (!current) {
            return;
        }
        const updated = {
            ...current,
            avatarUrl: avatarUrl || undefined
        };
        _user.set(updated);
        localStorage.setItem('user', JSON.stringify(updated));
    },

    updateUserInfo(payload: {
        fullName?: string | null;
        avatarUrl?: string | null;
        role?: string | null;
        accountStatus?: string | null;
        permissions?: string[] | null;
    }): void {
        const current = _user();
        if (!current) {
            return;
        }

        const normalizedRole = normalizeRole(payload.role);
        const updated = {
            ...current,
            fullName: payload.fullName?.trim() ? payload.fullName.trim() : current.fullName,
            avatarUrl: payload.avatarUrl || undefined,
            role: normalizedRole ?? current.role,
            accountStatus: normalizeAccountStatus(payload.accountStatus) ?? current.accountStatus,
            permissions: payload.permissions == null ? current.permissions : normalizePermissions(payload.permissions)
        };
        _user.set(updated);
        localStorage.setItem('user', JSON.stringify(updated));
    },

    restoreFromStorage(): void {
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        if (token && userJson) {
            try {
                const parsed = JSON.parse(userJson) as Partial<AuthUser>;
                if (!parsed?.id || !parsed?.email || !parsed?.fullName || !parsed?.role) {
                    this.clearAuth();
                    return;
                }

                _token.set(token);
                _user.set({
                    id: parsed.id,
                    email: parsed.email,
                    fullName: parsed.fullName,
                    role: normalizeRole(parsed.role) ?? parsed.role,
                    avatarUrl: parsed.avatarUrl,
                    accountStatus: normalizeAccountStatus(parsed.accountStatus) ?? 'APPROVED',
                    permissions: normalizePermissions(parsed.permissions)
                });
                ensureAuthSession(parsed.id);
            } catch {
                this.clearAuth();
            }
        }
    }
};

function ensureAuthSession(userId: string): void {
    const normalizedUserId = (userId ?? '').trim();
    if (!normalizedUserId) {
        return;
    }

    const currentSessionId = localStorage.getItem(AUTH_SESSION_ID_STORAGE_KEY)?.trim();
    const currentSessionUserId = localStorage.getItem(AUTH_SESSION_USER_ID_STORAGE_KEY)?.trim();

    if (currentSessionId && currentSessionUserId === normalizedUserId) {
        return;
    }

    localStorage.setItem(AUTH_SESSION_ID_STORAGE_KEY, generateAuthSessionId());
    localStorage.setItem(AUTH_SESSION_USER_ID_STORAGE_KEY, normalizedUserId);
}

function clearAuthSession(): void {
    localStorage.removeItem(AUTH_SESSION_ID_STORAGE_KEY);
    localStorage.removeItem(AUTH_SESSION_USER_ID_STORAGE_KEY);
}

function readAuthSessionId(): string | null {
    const value = localStorage.getItem(AUTH_SESSION_ID_STORAGE_KEY)?.trim();
    return value || null;
}

function generateAuthSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const randomPart = Math.random().toString(36).slice(2, 12);
    return `auth-session-${Date.now()}-${randomPart}`;
}

function normalizeRole(role?: string | null): Role | null {
    const value = (role ?? '').toString().trim().toUpperCase();
    if (!value) {
        return null;
    }
    const normalized = value.startsWith('ROLE_') ? value.substring(5) : value;
    if (normalized === Role.STUDENT) return Role.STUDENT;
    if (normalized === Role.COMPANY) return Role.COMPANY;
    if (normalized === Role.LECTURER) return Role.LECTURER;
    if (normalized === Role.ADMIN) return Role.ADMIN;
    return null;
}

function normalizeAccountStatus(status?: string | null): AccountStatus | null {
    const value = (status ?? '').toString().trim().toUpperCase();
    if (!value) {
        return null;
    }
    if (value === 'PENDING') return 'PENDING';
    if (value === 'APPROVED') return 'APPROVED';
    if (value === 'BLOCKED') return 'BLOCKED';
    return value;
}

function normalizePermissions(permissions?: readonly unknown[] | null): string[] {
    if (!Array.isArray(permissions)) {
        return [];
    }

    return [...new Set(
        permissions
            .map((permission) => String(permission ?? '').trim().toUpperCase())
            .filter((permission) => !!permission)
    )].sort();
}
