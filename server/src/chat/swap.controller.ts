import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SwapApiDocs } from './docs/swap-api.docs';
import { ChatResponseDto, PreswapRequestDto } from './dto';
import { SwapService } from './services/swap.service';
import { JwtAuthGuard } from 'src/wallet/guard/jwt-auth.guard';

/**
 * SwapController handles HTTP endpoints for token swap operations.
 *
 * This controller provides REST API endpoints for:
 * - Pre-swap rate calculation (GET preview without execution)
 * - Token swap execution (POST actual blockchain transactions)
 *
 * All endpoints are fully documented with Swagger/OpenAPI specifications
 * and include comprehensive examples for different use cases.
 *
 * @see {@link SwapService} for business logic implementation
 * @see {@link SwapApiDocs} for complete API documentation and examples
 */
@ApiTags('Token Swap')
@Controller('swap')
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  /**
   * Calculate expected swap output without executing transaction.
   *
   * @param swapMessage - Pre-swap request parameters
   * @returns Promise resolving to calculated swap rate and details
   */
  @Post('pre-swap')
  @UseGuards(JwtAuthGuard)
  @SwapApiDocs.preSwap.operation
  @SwapApiDocs.preSwap.body
  @SwapApiDocs.preSwap.okResponse
  @SwapApiDocs.preSwap.badRequestResponse
  @SwapApiDocs.preSwap.internalServerErrorResponse
  async preSwap(
    @Body() swapMessage: PreswapRequestDto,
  ): Promise<ChatResponseDto> {
    return this.swapService.preSwap(swapMessage);
  }

  /**
   * Execute token swap transaction on Aptos blockchain.
   *
   * @param swapMessage - Swap execution parameters
   * @returns Promise resolving to transaction hash and received amount
   */
  @Post('swap')
  @UseGuards(JwtAuthGuard)
  @SwapApiDocs.swap.operation
  @SwapApiDocs.swap.body
  @SwapApiDocs.swap.okResponse
  @SwapApiDocs.swap.badRequestResponse
  @SwapApiDocs.swap.internalServerErrorResponse
  async swap(@Body() swapMessage: PreswapRequestDto): Promise<ChatResponseDto> {
    return this.swapService.executeSwap(swapMessage);
  }
}
