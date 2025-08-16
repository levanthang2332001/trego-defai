import { Module, DynamicModule, Global, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { RedisCacheService } from './services/redisCacheService';
import { RedisConfigService } from './connection/redisConnect';

@Global()
@Module({})
export class RedisModule {
  private static readonly logger = new Logger('RedisModule');

  static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      imports: [
        ConfigModule,
        CacheModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const redisConfig = new RedisConfigService(configService);
            const config = redisConfig.getCacheConfig();

            const keyvRedis = new KeyvRedis({
              username: config.username,
              password: config.password,
              socket: {
                host: config.host,
                port: config.port,
              },
            });

            const keyv = new Keyv({ store: keyvRedis });

            // Add connection status logging
            keyvRedis.on('connect', () => {
              RedisModule.logger.log(
                `Redis connected successfully to ${config.host}:${config.port}`,
              );
            });

            keyvRedis.on('error', (err: Error) => {
              RedisModule.logger.error(
                `Redis connection error: ${err.message}`,
              );
            });

            // Test connection
            try {
              await keyv.set('test_connection', 'ok', 1000);
              RedisModule.logger.log('Redis connection test successful');
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              RedisModule.logger.error(
                `Redis connection test failed: ${errorMessage}`,
              );
            }

            return {
              stores: [keyv],
              ttl: config.ttl * 1000, // Convert to milliseconds
              isGlobal: true,
            };
          },
        }),
      ],
      providers: [
        RedisCacheService,
        {
          provide: RedisConfigService,
          useFactory: (configService: ConfigService) => {
            return new RedisConfigService(configService);
          },
          inject: [ConfigService],
        },
      ],
      exports: [RedisCacheService, CacheModule],
    };
  }
}
