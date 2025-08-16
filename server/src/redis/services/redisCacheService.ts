import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, Logger } from '@nestjs/common';

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async set<T>(key: string, value: T, ttl?: number): Promise<T | void> {
    try {
      const result = await this.cacheManager.set(key, value, ttl);

      const storedValue = await this.get(key);

      if (storedValue === undefined) {
        throw new Error(`Failed to verify stored value for key: ${key}`);
      }

      this.logger.log(`Cache set successful for key: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`Cache set failed for key: ${key}`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      this.logger.log(`Getting cache key: ${key}`);
      const result = await this.cacheManager.get<T>(key);

      if (result !== undefined) {
        this.logger.log(
          `Cache hit for key: ${key}, value: ${JSON.stringify(result)}`,
        );
      } else {
        this.logger.log(`Cache miss for key: ${key}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache get failed for key: ${key}`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.logger.log(`Deleting cache key: ${key}`);
      await this.cacheManager.del(key);
      this.logger.log(`Cache delete successful for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete failed for key: ${key}`, error);
      throw error;
    }
  }
}
