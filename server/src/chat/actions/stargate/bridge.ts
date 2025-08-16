/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ChatResponse } from 'src/chat/entities/chat.entity';
import {
  BridgeParams,
  BridgeStargateParams,
  ActionType,
} from 'src/chat/entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';
import { getBridgeQuote } from 'src/tools/stargate/bridge';
import { getTokenBySymbolAndChain } from 'src/tools/stargate/quote';

export class BridgeStargateAction extends AbstractBaseAction<BridgeParams> {
  readonly name = 'bridge';
  readonly similar = ['bridge', 'transfer', 'send', 'transfer token'];
  readonly prompt = `Extract the following parameters for bridging as JSON:
    {
      "tokenA": "string - the source token (e.g., 'USDT')",
      "tokenB": "string - the destination token (e.g., 'USDT')",
      "amount": "string - the amount to bridge (e.g., '0.1')",
      "dstAddress": "string - the destination address (e.g., '0x1234567890123456789012345678901234567890')",
      "srcChainKey": "string - the source chain key, always 'aptos'",
      "dstChainKey": "string - the destination chain key: 'bsc' for BSC, 'ethereum' for Ethereum, 'polygon' for Polygon, 'base' for Base",
    }`;

  readonly examples = [
    'Bridge 1 USDC from Aptos to BSC',
    'Bridge 100 USDC from Aptos to Polygon',
    'Bridge 100 USDC from Aptos to Base',
  ];

  validateMissingParams(params: Partial<BridgeStargateParams>): string[] {
    const missingParams: string[] = [];
    const srcTokenError = this.validateString(params.srcToken, 'srcToken');
    if (srcTokenError) missingParams.push(srcTokenError);

    const dstTokenError = this.validateString(params.dstToken, 'dstToken');
    if (dstTokenError) missingParams.push(dstTokenError);

    const srcAddressError = this.validateString(
      params.srcAddress,
      'srcAddress',
    );
    if (srcAddressError) missingParams.push(srcAddressError);

    const dstAddressError = this.validateString(
      params.dstAddress,
      'dstAddress',
    );
    if (dstAddressError) missingParams.push(dstAddressError);

    const srcChainKeyError = this.validateString(
      params.srcChainKey,
      'srcChainKey',
    );
    if (srcChainKeyError) missingParams.push(srcChainKeyError);

    const dstChainKeyError = this.validateString(
      params.dstChainKey,
      'dstChainKey',
    );
    if (dstChainKeyError) missingParams.push(dstChainKeyError);

    const srcAmountError = this.validateString(params.srcAmount, 'srcAmount');
    if (srcAmountError) missingParams.push(srcAmountError);

    const dstAmountMinError = this.validateString(
      params.dstAmountMin,
      'dstAmountMin',
    );
    if (dstAmountMinError) missingParams.push(dstAmountMinError);

    return missingParams;
  }

  async handle(
    params: BridgeParams,
    user_address: string,
  ): Promise<ChatResponse> {
    try {
      const { tokenA, tokenB, amount, dstAddress, srcChainKey, dstChainKey } =
        params;

      const dataA = await getTokenBySymbolAndChain(tokenA, srcChainKey);
      const dataB = await getTokenBySymbolAndChain(tokenB, dstChainKey);

      if (!dataA || !dataB) {
        return this.createErrorResult('Token not found');
      }

      const srcToken = dataA.address;
      const dstToken = dataB.address;

      const srcAmount = (
        Number(amount) * Math.pow(10, dataA.decimals)
      ).toString();

      const { quote } = await getBridgeQuote({
        srcToken: srcToken,
        dstToken: dstToken,
        srcAddress: user_address,
        dstAddress: dstAddress,
        srcChainKey: srcChainKey,
        dstChainKey: dstChainKey,
        srcAmount: srcAmount,
        dstAmountMin: srcAmount,
      });

      const result = {
        action: ActionType.BRIDGE,
        // Bridge request parameters for BotBridge component
        tokenA,
        tokenB,
        amount,
        srcChainKey,
        dstChainKey,
        dstAddress,
        user_address,
        // Quote data
        quote,
        decimalsSrcToken: dataA.decimals,
        decimalsDstToken: dataB.decimals,
        symbolSrcToken: dataA.symbol,
        symbolDstToken: dataB.symbol,
      };

      return this.createSuccessResult({
        message: `## 🌉 Bridge Quote Ready!

I'll help you bridge ${amount} ${tokenA} from ${srcChainKey} to ${dstChainKey}.

### Bridge Details:
- **From:** ${amount} ${tokenA} (${srcChainKey})
- **To:** ${tokenB} (${dstChainKey})
- **Destination:** ${dstAddress}
- **Estimated Duration:** ${(quote as any)?.duration?.estimated || 'Unknown'} seconds

### Next Steps:
- Review the bridge quote and fees
- Confirm the transaction when ready
- Monitor the bridge status across chains

> 💡 **Pro tip:** Bridge transactions typically take 2-5 minutes depending on network congestion. Keep your transaction hash handy!`,
        data: result,
      });
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

export const bridgeStargateAction = new BridgeStargateAction();
