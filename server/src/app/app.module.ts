import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from '../chat/chat.module';
import { RedisModule } from '../database/redis/redis.module';
import { AccountsModule } from '../wallet/accounts.module';
import { AuthModule } from '../wallet/guard/auth.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
    RedisModule.forRoot(),
    ChatModule,
    AccountsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
