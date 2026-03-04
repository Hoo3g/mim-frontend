import { signal, computed } from '@angular/core';
import { Role } from '../enums/role.enum';

export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    avatarUrl?: string;
}

// ─── Auth Signal ────────────────────────────────────────────
const _user = signal<AuthUser | null>(null);
const _token = signal<string | null>(null);

export const authSignal = {
    user: _user.asReadonly(),
    token: _token.asReadonly(),
    isAuth: computed(() => _user() !== null),
    isAdmin: computed(() => _user()?.role === Role.ADMIN),

    setAuth(user: AuthUser, token: string): void {
        _user.set(user);
        _token.set(token);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    clearAuth(): void {
        _user.set(null);
        _token.set(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    restoreFromStorage(): void {
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        if (token && userJson) {
            _token.set(token);
            _user.set(JSON.parse(userJson));
        }
    }
};
