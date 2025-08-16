import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { Accounts } from './accounts';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AccountsController],
  providers: [Accounts],
  exports: [Accounts],
})
export class AccountsModule {}
