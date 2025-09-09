import { preSwap, swap } from './swap';

const fromToken = {
  tokenAddress: '0x1::aptos_coin::AptosCoin',
  faAddress: '0xa',
  name: 'Aptos Coin',
  symbol: 'APT',
  decimals: 8,
};

const toToken = {
  tokenAddress:
    '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
  faAddress:
    '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
  name: 'USDT',
  symbol: 'USDT',
  decimals: 6,
};

const userAddress =
  '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8';

const tasmilAddress =
  '0x1c6909212b92841e1bbe34ea2018dfd68dc364b09ef912f4dd063f17e2239cdb';

const amount = '0.01';

const main = async () => {
  const resultPreSwap = await preSwap({
    fromToken,
    toToken,
    amount,
  });

  const result = await swap({
    swapMessage: {
      fromToken,
      toToken,
      amountIn: resultPreSwap.amountIn,
      amountOut: resultPreSwap.amountOut,
      path: resultPreSwap.path,
      slippage: 0.5,
      recipient: tasmilAddress,
    },
    userAddress,
  });
  console.log(result);
};

main();
