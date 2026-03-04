import { signal } from '@angular/core';

const _loading = signal(false);
const _error = signal<string | null>(null);

export const appSignal = {
    loading: _loading.asReadonly(),
    error: _error.asReadonly(),

    setLoading(v: boolean): void { _loading.set(v); },
    setError(msg: string | null): void { _error.set(msg); },
    clearError(): void { _error.set(null); },
};
