import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LiquidityController } from 'src/actions/liquidity/liquidity.controller';
import { HyperionService as HyperionServiceLiquidity } from 'src/actions/liquidity/services/hyperion.service';
import { HyperionService as HyperionServiceSwap } from 'src/actions/swap/services/hyperion.service';
import { PanoraService } from 'src/actions/swap/services/panora.service';
import { SwapController } from 'src/actions/swap/swap.controller';
import { BridgeController } from '../actions/bride/bridge.controller';
import { BridgeService } from '../actions/bride/bridge.service';
import { ChatController } from './chat.controller';
import { IntentService } from './services/intent.service';
import { VoiceService } from './services/voice.service';
import { VoiceController } from './voice.controller';
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
    LiquidityController,
  ],
  providers: [
    IntentService,
    VoiceService,
    HyperionServiceSwap,
    HyperionServiceLiquidity,
    PanoraService,
    BridgeService,
  ],
  exports: [IntentService],
})
export class ChatModule {}
