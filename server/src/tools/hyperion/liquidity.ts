import { Network } from '@aptos-labs/ts-sdk';
import { FeeTierIndex, initHyperionSDK, priceToTick } from '@hyperionxyz/sdk';
import { PoolItem, PositionItem, Tick } from './type';
import { InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk';

const sdk = initHyperionSDK({
  network: Network.MAINNET,
  APTOS_API_KEY: 'aptoslabs_cB8VjdnQTiF_An9kQqTWfbhUs8qtCapmUxBD25QRK7e1g',
});

export async function fetchAllPools() {
  const poolItems = (await sdk.Pool.fetchAllPools()) as PoolItem[];
  console.log(poolItems);
  return poolItems;
}

export async function fetchOnePool(poolId: string) {
  const pool = (await sdk.Pool.fetchPoolById({
    poolId,
  })) as PoolItem;
  return pool;
}

export async function fetchOnePoolByTokenPairAndFeeTier() {
  const pool = (await sdk.Pool.getPoolByTokenPairAndFeeTier({
    token1: '0x1::aptos_coin::AptosCoin',
    token2:
      '0x6926bff1eab5554fa72ae167ed736acf623ab17fe81ebf2ea0d2138f8c533f77::type::T',
    feeTier: FeeTierIndex['PER_0.01_SPACING_1'],
  })) as PoolItem;
  console.log(pool);
}

export async function fetchPositionsByAddress() {
  const positions = (await sdk.Position.fetchAllPositionsByAddress({
    address: '0x7fd8...aedc1',
  })) as PositionItem[];
  console.log(positions);
}

export async function fetchTicksByPoolId() {
  const ticks = (await sdk.Pool.fetchTicks({
    poolId:
      '0x432a6b1c16e090e133b4c3c80297604b29631974491298a0383d62c268b97c38',
  })) as Tick[];
  console.log(ticks);
}

export async function addLiquidity() {
  const currencyAAmount = Math.pow(10, 8);
  // currencyA's decimals is 8
  // currencyB's decimals is 6
  const decimalsRatio = Math.pow(10, 8 - 6);
  const feeTierIndex = FeeTierIndex['PER_0.05_SPACING_5'];

  const currentPriceTick = priceToTick({
    price: 995,
    feeTierIndex,
    decimalsRatio,
  });

  const tickLower = priceToTick({
    price: 992,
    feeTierIndex,
    decimalsRatio,
  });

  const tickUpper = priceToTick({
    price: 1336,
    feeTierIndex,
    decimalsRatio,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, currencyBAmount] = await sdk.Pool.estCurrencyBAmountFromA({
    // address here mus be fa type
    currencyA: '0xa',
    currencyB:
      '0xc5bcdea4d8a9f5809c5c945a3ff5698a347afb982c7389a335100e1b0043d115',
    currencyAAmount,
    feeTierIndex,
    tickLower: tickLower as unknown as number,
    tickUpper: tickUpper as unknown as number,
    currentPriceTick: currentPriceTick as unknown as number,
  });

  const params = {
    positionId: '',
    currencyA: '0x1::aptos_coin::AptosCoin',
    currencyB:
      '0x6926bff1eab5554fa72ae167ed736acf623ab17fe81ebf2ea0d2138f8c533f77::type::T',
    currencyAAmount,
    currencyBAmount: currencyBAmount as number,
    slippage: 0.1,
    feeTierIndex,
  };

  const payload = (await sdk.Position.addLiquidityTransactionPayload(
    params,
  )) as InputGenerateTransactionPayloadData;
  console.log(payload);
}

export const HyperionLiquidity = {
  fetchAllPools,
  fetchOnePool,
  fetchOnePoolByTokenPairAndFeeTier,
  fetchPositionsByAddress,
  fetchTicksByPoolId,
  addLiquidity,
};
