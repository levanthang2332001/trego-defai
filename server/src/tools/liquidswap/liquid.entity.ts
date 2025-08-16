import { CurveType } from '@pontem/liquidswap-sdk/dist/tsc/types/aptos';

export interface LiquidSwapRequest {
  fromToken: string;
  toToken: string;
  amount: number;
  curveType: CurveType;
  interactiveToken: 'from' | 'to';
  version: number;
}

export interface LiquidityRequest {
  fromToken: string;
  toToken: string;
  amount: number;
  curveType: CurveType;
  interactiveToken: string;
  version: number;
}

export interface EstimateLiquidityResponse {
  rate: string;
  receiveLp: string;
}
