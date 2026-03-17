import { Observable } from 'rxjs';

interface TimedObservableCacheEntry<T> {
    expiresAt: number;
    value: Observable<T>;
}

export class TimedObservableCache<T> {
    private readonly entries = new Map<string, TimedObservableCacheEntry<T>>();

    constructor(private readonly ttlMs: number) {
    }

    get(key: string): Observable<T> | undefined {
        const entry = this.entries.get(key);
        if (!entry) {
            return undefined;
        }

        if (entry.expiresAt <= Date.now()) {
            this.entries.delete(key);
            return undefined;
        }

        return entry.value;
    }

    set(key: string, value: Observable<T>): Observable<T> {
        this.entries.set(key, {
            expiresAt: Date.now() + this.ttlMs,
            value
        });
        return value;
    }

    delete(key: string): void {
        this.entries.delete(key);
    }

    clear(): void {
        this.entries.clear();
    }
}
