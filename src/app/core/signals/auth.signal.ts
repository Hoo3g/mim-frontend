import { signal, computed } from '@angular/core';
import { Role } from '../enums/role.enum';

export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    permissions: string[];
    avatarUrl?: string;
}

// ─── Auth Signal ────────────────────────────────────────────
const _user = signal<AuthUser | null>(null);
const _token = signal<string | null>(null);
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
    isAuth: computed(() => _user() !== null),
    isAdmin: computed(() => _user()?.role === Role.ADMIN),
    canAccessAdmin: computed(() => {
        const user = _user();
        if (!user) {
            return false;
        }
        if (user.role === Role.ADMIN) {
            return true;
        }
        return ADMIN_UI_PERMISSIONS.some((permission) => user.permissions.includes(permission));
    }),

    setAuth(user: AuthUser, token: string): void {
        _user.set(user);
        _token.set(token);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    hasPermission(permission: string): boolean {
        const user = _user();
        if (!user) {
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

    updateUserInfo(payload: { fullName?: string | null; avatarUrl?: string | null }): void {
        const current = _user();
        if (!current) {
            return;
        }

        const updated = {
            ...current,
            fullName: payload.fullName?.trim() ? payload.fullName.trim() : current.fullName,
            avatarUrl: payload.avatarUrl || undefined
        };
        _user.set(updated);
        localStorage.setItem('user', JSON.stringify(updated));
    },

    restoreFromStorage(): void {
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        if (token && userJson) {
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
                role: parsed.role,
                avatarUrl: parsed.avatarUrl,
                permissions: Array.isArray(parsed.permissions)
                    ? parsed.permissions.map((item) => String(item).toUpperCase())
                    : []
            });
        }
    }
};
