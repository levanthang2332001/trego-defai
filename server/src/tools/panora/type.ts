export interface PreSwapParams {
  chainId?: string;
  fromTokenAddress: `0x${string}`;
  toTokenAddress: `0x${string}`;
  fromTokenAmount?: string;
  toWalletAddress: `0x${string}`;
  slippagePercentage?: string;
  integratorFeePercentage?: string;
  integratorFeeAddress?: `0x${string}`;
}

export interface ExactSwapParams {
  params: PreSwapParams;
  privateKey: string;
}
