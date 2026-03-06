import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface ApiKey {
    id: string;
    key: string;
    name: string;
    walletAddress?: string;
    createdAt: Date;
    requestCount: number;
    lastUsedAt: Date | null;
}

export interface RateLimitEntry {
    count: number;
    windowStart: number;
}

@Injectable()
export class ApiKeyService {
    private readonly keys = new Map<string, ApiKey>();
    private readonly rateLimits = new Map<string, RateLimitEntry>();
    private readonly walletIndex = new Map<string, string>();

    private readonly RATE_LIMIT = 100;
    private readonly WINDOW_MS = 60 * 1000;

    generateKey(name: string, walletAddress?: string): ApiKey {
        const id = randomBytes(8).toString('hex');
        const key = `cg_${randomBytes(24).toString('hex')}`;

        const apiKey: ApiKey = {
            id,
            key,
            name,
            walletAddress,
            createdAt: new Date(),
            requestCount: 0,
            lastUsedAt: null,
        };

        this.keys.set(key, apiKey);

        if (walletAddress) {
            this.walletIndex.set(walletAddress, key);
        }

        return apiKey;
    }

    getByWallet(walletAddress: string): ApiKey | null {
        const key = this.walletIndex.get(walletAddress.toLowerCase());
        if (!key) return null;
        return this.keys.get(key) ?? null;
    }

    validate(key: string): ApiKey | null {
        return this.keys.get(key) ?? null;
    }

    isRateLimited(key: string): boolean {
        const now = Date.now();
        const entry = this.rateLimits.get(key);

        if (!entry || now - entry.windowStart > this.WINDOW_MS) {
            this.rateLimits.set(key, { count: 1, windowStart: now });
            return false;
        }

        if (entry.count >= this.RATE_LIMIT) return true;

        entry.count += 1;
        return false;
    }

    recordUsage(key: string): void {
        const apiKey = this.keys.get(key);
        if (apiKey) {
            apiKey.requestCount += 1;
            apiKey.lastUsedAt = new Date();
        }
    }

    revoke(id: string): boolean {
        const entry = [...this.keys.entries()].find(([, v]) => v.id === id);
        if (!entry) return false;
        const [key, apiKey] = entry;
        if (apiKey.walletAddress) {
            this.walletIndex.delete(apiKey.walletAddress);
        }
        this.keys.delete(key);
        return true;
    }

    list(): Omit<ApiKey, 'key'>[] {
        return [...this.keys.values()].map(({ key: _key, ...rest }) => rest);
    }

    getRateLimitStatus(key: string): { remaining: number; resetIn: number } {
        const now = Date.now();
        const entry = this.rateLimits.get(key);

        if (!entry || now - entry.windowStart > this.WINDOW_MS) {
            return { remaining: this.RATE_LIMIT, resetIn: this.WINDOW_MS };
        }

        return {
            remaining: Math.max(0, this.RATE_LIMIT - entry.count),
            resetIn: Math.max(0, this.WINDOW_MS - (now - entry.windowStart)),
        };
    }
}