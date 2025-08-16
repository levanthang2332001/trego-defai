import { SDK } from '@pontem/liquidswap-sdk';
import { LiquidSwapRequest } from './liquid.entity';
import { TokenMapping } from './token-mapping';
import { Account, Aptos } from '@aptos-labs/ts-sdk';
import { checkCoinStoreRegistered, registerCoinStore } from './coinstore';

interface TokenInfo {
  name: string;
  symbol: string;
  moveAddress: string;
  decimals: number;
}

const sdk = new SDK({ nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1' });

function convertValueToDecimal(value: number, decimals: number): number {
  return Math.floor(value * Math.pow(10, decimals));
}

function convertDecimalToValue(value: number, decimals: number): number {
  return value / Math.pow(10, decimals);
}

function getTokenInfo(token: string): TokenInfo {
  const tokenInfo = TokenMapping[token.toUpperCase()] as TokenInfo;
  if (!tokenInfo) {
    throw new Error(`Token ${token} not found in TokenMapping`);
  }
  return tokenInfo;
}

const getTokenAddress = (token: string): string => {
  const tokenInfo = getTokenInfo(token);
  return tokenInfo.moveAddress;
};

async function getPoolExists(tokenA: string, tokenB: string): Promise<boolean> {
  try {
    const output = await sdk.Liquidity.checkPoolExistence({
      fromToken: tokenA,
      toToken: tokenB,
      curveType: 'stable',
      version: 0,
    });

    if (output.valueOf() === true) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function calculateLiquidswapRate(
  quote: LiquidSwapRequest,
): Promise<number> {
  const { fromToken, toToken, amount, curveType, interactiveToken, version } =
    quote;

  console.log('calculateLiquidswapRate', quote);
  try {
    const fromTokenAddress = getTokenAddress(fromToken);
    const toTokenAddress = getTokenAddress(toToken);
    const fromAmount = convertValueToDecimal(
      amount,
      getTokenInfo(fromToken).decimals,
    );

    const poolExists = await getPoolExists(fromTokenAddress, toTokenAddress);
    console.log('poolExists', poolExists);
    if (!poolExists) {
      throw new Error(`Pool ${fromToken} to ${toToken} does not exist`);
    }

    const output = await sdk.Swap.calculateRates({
      fromToken: fromTokenAddress,
      toToken: toTokenAddress,
      amount: fromAmount,
      interactiveToken: interactiveToken,
      curveType,
      version: version as 0.5,
    });
    console.log('output', output);
    const toAmount = convertDecimalToValue(
      Number(output),
      getTokenInfo(toToken).decimals,
    );

    return toAmount;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

interface SwapTokensWithLiquidswapResponse {
  hash: string;
  toAmount: string;
}

export async function swapTokensWithLiquidswap(
  quote: LiquidSwapRequest,
  aptos: Aptos,
  account: Account,
): Promise<SwapTokensWithLiquidswapResponse> {
  try {
    const toAmount = await calculateLiquidswapRate(quote);

    // Get token info
    const fromTokenInfo = getTokenInfo(quote.fromToken);
    const toTokenInfo = getTokenInfo(quote.toToken);

    // Register CoinStore for the receiving token if needed
    const isCoinStoreRegistered = await checkCoinStoreRegistered(
      aptos,
      account,
      toTokenInfo.moveAddress,
    );

    if (!isCoinStoreRegistered) {
      await registerCoinStore(aptos, account, toTokenInfo.moveAddress);
    }

    // Convert amounts using proper decimals
    const fromAmount = convertValueToDecimal(
      quote.amount,
      fromTokenInfo.decimals,
    );

    const toAmountDecimal = convertValueToDecimal(
      toAmount,
      toTokenInfo.decimals,
    );

    const txPayload = sdk.Swap.createSwapTransactionPayload({
      fromToken: fromTokenInfo.moveAddress,
      toToken: toTokenInfo.moveAddress,
      fromAmount,
      toAmount: toAmountDecimal,
      interactiveToken: quote.interactiveToken,
      slippage: 0.05,
      stableSwapType: 'high',
      curveType: quote.curveType,
      version: quote.version as 0.5,
    });

    const data = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: txPayload.function as `${string}::${string}::${string}`,
        typeArguments: txPayload.type_arguments,
        functionArguments: txPayload.arguments,
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction: data,
    });

    const tx = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    if (!tx.success || !tx.hash) {
      throw new Error('Failed to swap tokens with Liquidswap');
    }

    return {
      hash: tx.hash,
      toAmount: toAmountDecimal.toString(),
    };
  } catch (error) {
    throw new Error('Failed to swap tokens with Liquidswap: ' + error);
  }
}
