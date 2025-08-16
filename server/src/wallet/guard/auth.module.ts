import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { RedisCacheService } from 'src/redis/services/redisCacheService';
import { AuthController } from './auth.controller';
import { AuthService } from './service/auth.service';

@Module({
  imports: [RedisModule],
  controllers: [AuthController],
  providers: [AuthService, RedisCacheService],
})
export class AuthModule {}
