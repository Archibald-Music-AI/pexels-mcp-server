import { Logger } from './logger.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private duration: number; // Cache duration in seconds
  private logger: Logger;

  constructor(duration: number) {
    this.cache = new Map();
    this.duration = duration;
    this.logger = new Logger();
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  set<T>(key: string, data: T, customDuration?: number): void {
    const duration = customDuration || this.duration;
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (duration * 1000),
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cache set: ${key} (expires in ${duration}s)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.logger.debug(`Cache miss: ${key}`);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.info(`Cache cleared: ${size} entries removed`);
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.debug(`Cache cleanup: ${expiredCount} expired entries removed`);
    }
  }

  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    // Note: This is a simplified version. In production, you'd want to track hits/misses
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  // Get all cache keys (useful for debugging)
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache entry info
  getEntryInfo(key: string): {
    exists: boolean;
    timestamp?: number;
    expiresAt?: number;
    ttl?: number;
  } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { exists: false };
    }

    const now = Date.now();
    const ttl = Math.max(0, entry.expiresAt - now);

    return {
      exists: true,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      ttl,
    };
  }
}