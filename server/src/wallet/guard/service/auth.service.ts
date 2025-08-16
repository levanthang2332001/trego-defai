import { Injectable } from '@nestjs/common';
import { Ed25519PublicKey, Ed25519Signature } from '@aptos-labs/ts-sdk';
import { RedisCacheService } from 'src/redis/services/redisCacheService';

interface IVerifyEd25519Signature {
  publicKey: string;
  message: string;
  signature: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly redisCache: RedisCacheService) {}

  verifyEd25519Signature(params: IVerifyEd25519Signature): boolean {
    try {
      const { publicKey, message, signature } = params;

      const pubkeyBytes = new Ed25519PublicKey(publicKey);
      const sigBytes = new Ed25519Signature(signature);
      const encodedMsg = new TextEncoder().encode(message);

      const isValid = pubkeyBytes.verifySignature({
        message: encodedMsg,
        signature: sigBytes,
      });

      if (!isValid) {
        return false;
      }

      return true;
    } catch (error) {
      console.log('error', error);
      return false;
    }
  }

  getNonceFromMessage(message: string): string | null {
    const nonceRegex = /Nonce:\s*(\S+)/;
    const match = message.match(nonceRegex);

    // console.log('match', match?.input);

    if (!match) {
      return null;
    }

    return match[1];
  }

  async isValidNonce(address: string, nonce: string): Promise<boolean> {
    const data = await this.redisCache.get(address);

    if (!data || data !== nonce) {
      return false;
    }

    return true;
  }
}
