interface TokenMapping {
  [key: string]: {
    [key: string]: string;
  };
}
export const TokenMapping = {
  APT: {
    name: 'APT',
    symbol: 'APT',
    moveAddress: '0x1::aptos_coin::AptosCoin',
    decimals: 8,
  },
  USDT: {
    name: 'USDT',
    symbol: 'USDT',
    moveAddress:
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
    decimals: 6,
  },
  USDC: {
    name: 'USDC',
    symbol: 'USDC',
    moveAddress:
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    decimals: 6,
  },
  USDD: {
    name: 'USDD',
    symbol: 'USDD',
    moveAddress:
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDD',
    decimals: 6,
  },
  WETH: {
    name: 'WETH',
    symbol: 'WETH',
    moveAddress:
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WETH',
    decimals: 6,
  },
  WBTC: {
    name: 'WBTC',
    symbol: 'WBTC',
    moveAddress:
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::WBTC',
    decimals: 6,
  },
  ALT: {
    name: 'ALT',
    symbol: 'ALT',
    moveAddress:
      '0xd0b4efb4be7c3508d9a26a9b5405cf9f860d0b9e5fe2f498b90e68b8d2cedd3e::aptos_launch_token::AptosLaunchToken',
    decimals: 8,
  },
  MOJO: {
    name: 'MOJO',
    symbol: 'MOJO',
    moveAddress:
      '0x881ac202b1f1e6ad4efcff7a1d0579411533f2502417a19211cfc49751ddb5f4::coin::MOJO',
    decimals: 8,
  },
};
