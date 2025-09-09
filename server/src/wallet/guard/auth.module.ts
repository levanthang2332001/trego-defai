import { Module } from '@nestjs/common';
import { RedisModule } from 'src/database/redis/redis.module';
import { RedisCacheService } from 'src/database/redis/services/redisCacheService';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [RedisModule],
  controllers: [AuthController],
  providers: [AuthService, RedisCacheService],
})
export class AuthModule {}
