import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { IntentService } from './services/intent.service';
import { VoiceService } from './services/voice.service';
import { SwapService } from './services/swap.service';
import { VoiceController } from './voice.controller';
import { JwtModule } from '@nestjs/jwt';
import { SwapController } from './swap.controller';
import { BridgeController } from './bridge.controller';
import { BridgeService } from './services/bridge.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    ChatController,
    VoiceController,
    SwapController,
    BridgeController,
  ],
  providers: [IntentService, VoiceService, SwapService, BridgeService],
  exports: [IntentService],
})
export class ChatModule {}
