/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Account,
  Aptos,
  Deserializer,
  RawTransaction,
} from '@aptos-labs/ts-sdk';

// import { ConfigService } from '@nestjs/config';
import {
  checkCoinStoreRegistered,
  registerCoinStore,
} from '../liquidswap/coinstore';

import {
  fetchStargateQuote,
  StargateQuote,
  validateBridgeParams,
} from './quote';

export interface BridgeQuoteRequest {
  srcChainKey: string;
  dstChainKey: string;
  srcToken: string;
  dstToken: string;
  srcAddress: string;
  dstAddress: string;
  srcAmount: string;
  dstAmountMin: string;
}

export interface BridgeQuoteResponse {
  quote: StargateQuote;
  // estimatedGas: string;
  // estimatedTime: string;
  // warnings: string[];
}

export interface BridgeTransaction {
  id: string;
  status: 'pending' | 'confirmed' | 'failed';
  srcChainKey: string;
  dstChainKey: string;
  srcTxHash?: string;
  dstTxHash?: string;
  amount: string;
  timestamp: Date;
  error?: string;
}

type EntryFunction = {
  module_name: {
    name: { identifier: string };
    address: { toString(): string };
  };
  function_name: { identifier: string };
  type_args: string[];
  args: any;
};

export const getBridgeQuote = async (
  params: BridgeQuoteRequest,
): Promise<BridgeQuoteResponse> => {
  try {
    console.log('validating bridge params', params);
    await validateBridgeParams({
      srcChainKey: params.srcChainKey,
      dstChainKey: params.dstChainKey,
      srcToken: params.srcToken,
      dstToken: params.dstToken,
      amount: params.srcAmount,
    });

    const quote = await fetchStargateQuote({
      srcToken: params.srcToken,
      dstToken: params.dstToken,
      srcAddress: params.srcAddress,
      dstAddress: params.dstAddress,
      srcChainKey: params.srcChainKey,
      dstChainKey: params.dstChainKey,
      srcAmount: params.srcAmount,
      dstAmountMin: params.dstAmountMin,
    });

    return {
      quote: quote.quotes[0],
    };
  } catch (error) {
    console.error('Error getting bridge quote:', error);
    throw error;
  }
};

export const isCheckQuoteBridge = async (
  params: BridgeQuoteRequest,
): Promise<boolean> => {
  const quote = await getBridgeQuote(params);
  return quote.quote.steps?.[0].transaction.data?.includes('bridge') ?? false;
};

const serializeArgs = (args: any[], quote: StargateQuote): any[] => {
  return args.map((arg, index) => {
    if (index === 0 || index === 2 || index === 3 || index === 4) {
      if (
        arg?.value?.value instanceof Uint8Array &&
        arg.value.value.length === 8
      ) {
        let result = 0n;
        for (let i = 0; i < 8; i++) {
          result += BigInt(arg.value.value[i]) << BigInt(i * 8);
        }
        return result.toString();
      }
      return arg.value ?? arg;
    }
    // arg[1] dst_receiver: vector<u8> (EVM address 20 bytes)
    if (index === 1) {
      const evmReceiver = quote.dstAddress;
      const addressHex = evmReceiver.replace(/^0x/, '');
      const addressBytes = Uint8Array.from(Buffer.from(addressHex, 'hex'));
      if (addressBytes.length !== 20)
        throw new Error(
          `Invalid EVM receiver address length: ${addressBytes.length}`,
        );
      const padded = new Uint8Array(32);
      padded.set(addressBytes, 12); // pad left 12 bytes 0
      return padded;
    }
    // arg[5] unwrap: bool
    if (index === 5) {
      // bool
      if (
        arg?.value?.value instanceof Uint8Array &&
        arg.value.value.length === 1
      ) {
        return arg.value.value[0] === 1;
      }
      return !!arg.value;
    }
    // arg[6] adapter_params: vector<u8>
    if (index === 6) {
      return Uint8Array.from(Buffer.from('000100000000000249f0', 'hex'));
    }
    // arg[7] msglib_params: vector<u8>
    if (index === 7) {
      return new Uint8Array(0);
    }

    if (arg.value !== undefined) return arg.value;
    if (arg.data !== undefined) return arg.data;
    if (typeof arg.toString === 'function') return arg.toString();
    return arg;
  });
};

export const executeBridgeFromAptos = async (
  aptos: Aptos,
  account: Account,
  quote: StargateQuote,
): Promise<{ hash: string; error?: string }> => {
  try {
    const { srcToken } = quote;
    const hexData = quote.steps?.[0].transaction.data;
    if (!hexData) {
      throw new Error('Transaction data not found in quote');
    }

    const bytes = Buffer.from(hexData.replace(/^0x/, ''), 'hex');
    const deserializer = new Deserializer(bytes);
    const rawTxn = RawTransaction.deserialize(deserializer);

    const payload = rawTxn.payload;

    const entryFunction = (
      payload as unknown as { entryFunction: EntryFunction }
    ).entryFunction;

    const moduleNameStr = entryFunction.module_name.name.identifier;
    const functionNameStr = entryFunction.function_name.identifier;

    const serializedArgs = serializeArgs(entryFunction.args, quote);

    const isCoinStoreRegistered = await checkCoinStoreRegistered(
      aptos,
      account,
      srcToken,
    );

    if (!isCoinStoreRegistered) {
      await registerCoinStore(aptos, account, srcToken);
    }

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${entryFunction.module_name.address.toString()}::${moduleNameStr}::${functionNameStr}`,
        functionArguments: serializedArgs,
        typeArguments: entryFunction.type_args,
      },
      options: {
        maxGasAmount: Number(rawTxn.max_gas_amount),
        gasUnitPrice: Number(rawTxn.gas_unit_price),
        expireTimestamp: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
      },
    });

    // Sign and submit the rebuilt transaction
    const result = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    const tx = await aptos.waitForTransaction({
      transactionHash: result.hash,
    });

    if (!tx.success || !tx.hash) throw new Error('Failed to bridge tokens');
    console.log(
      `https://explorer.aptoslabs.com/txn/${tx.hash}?network=mainnet`,
    );

    serializedArgs.forEach((arg, idx) => {
      if (arg instanceof Uint8Array) {
        console.log(
          `Arg[${idx}] length:`,
          arg.length,
          'hex:',
          Buffer.from(arg).toString('hex'),
        );
      } else {
        console.log(`Arg[${idx}]:`, arg);
      }
    });

    return {
      hash: tx.hash,
      error: tx.vm_status,
    };
  } catch (error) {
    console.error('Error executing bridge from Aptos:', error);
    throw error;
  }
};
