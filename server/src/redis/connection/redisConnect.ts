import { Logger } from '@nestjs/common';
import type { RedisClientOptions } from 'redis';
import { ConfigService } from '@nestjs/config';

export class RedisConfigService {
  private readonly logger = new Logger(RedisConfigService.name);

  constructor(private configService: ConfigService) {}

  getRedisConfig(): RedisClientOptions {
    const config: RedisClientOptions = {
      username: this.configService.get<string>('REDIS_USERNAME'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      socket: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            this.logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          const delay = Math.min(retries * 100, 3000);
          this.logger.warn(
            `Reconnecting to Redis... Attempt ${retries}, delay: ${delay}ms`,
          );
          return delay;
        },
      },
    };

    // Validate configuration
    this.validateConfig(config);

    return config;
  }

  private validateConfig(config: RedisClientOptions): void {
    if (!config.socket?.connectTimeout) {
      this.logger.warn('Redis host not configured');
    }

    if (!config.username || !config.password) {
      this.logger.warn(
        'Redis authentication not configured. This may cause connection issues in production.',
      );
    }

    this.logger.log(`Redis configured for ${config.username}`);
  }

  getCacheConfig() {
    return {
      store: 'redis',
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      username: this.configService.get<string>('REDIS_USERNAME'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      ttl: this.configService.get<number>('REDIS_DEFAULT_TTL', 300), // 5 minutes default
      max: this.configService.get<number>('REDIS_MAX_ITEMS', 100),
    };
  }
}
