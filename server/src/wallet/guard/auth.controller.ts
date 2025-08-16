import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UnauthorizedException,
  // UseGuards,
  Res,
} from '@nestjs/common';
import * as forge from 'node-forge';
import { sign, Secret, SignOptions } from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { AuthApiDocs } from '../../chat/docs/auth/auth-api.docs';
import { ApiTags } from '@nestjs/swagger';
import { RedisCacheService } from 'src/redis/services/redisCacheService';
import { AuthService } from './service/auth.service';
import { Response } from 'express';
dotenv.config();

const NONCE_STORE: {
  [key: string]: {
    nonceHex: string;
    createdAt: number;
    expiresAt: number;
  };
} = {};

const NONCE_EXPIRATION_TIME = 100 * 24 * 60 * 60 * 1000; // 100 days
const JWT_EXPIRATION_TIME = '24h';
const NONCE_TTL = 3 * 60 * 1000; // 3 minutes for nonce only

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly jwtSecret: Secret;
  constructor(
    private readonly redisCache: RedisCacheService,
    private readonly authService: AuthService,
  ) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    this.jwtSecret = process.env.JWT_SECRET;
  }

  @Get('get-nonce')
  @AuthApiDocs.getNonce.operation
  @AuthApiDocs.getNonce.query
  @AuthApiDocs.getNonce.okResponse
  @AuthApiDocs.getNonce.badRequestResponse
  @AuthApiDocs.getNonce.internalServerErrorResponse
  async getNonce(@Query('address') address: string) {
    try {
      const nonce = forge.random.getBytesSync(16);
      const nonceHex = forge.util.bytesToHex(nonce);

      // Convert minutes to milliseconds for Redis TTL
      const ttlInMs = NONCE_TTL;

      // Store in Redis with TTL in milliseconds
      await this.redisCache.set(address, nonceHex, ttlInMs);

      // Verify the value was stored
      const storedNonce = await this.redisCache.get(address);
      console.log('Stored nonce from Redis:', storedNonce);

      if (!storedNonce) {
        throw new Error('Failed to store nonce in Redis');
      }

      return {
        success: true,
        nonce: nonceHex,
        message: `Welcome to Trego Defai!Please sign this message to authenticate.Nonce: ${nonceHex}`,
      };
    } catch (error) {
      console.error('Error in getNonce:', error);
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  @Post('verify-signature')
  @AuthApiDocs.verifySignature.operation
  @AuthApiDocs.verifySignature.body
  @AuthApiDocs.verifySignature.okResponse
  @AuthApiDocs.verifySignature.unauthorizedResponse
  @AuthApiDocs.verifySignature.badRequestResponse
  async verifySignature(
    @Body()
    body: {
      walletAddress: string;
      publicKey: string;
      signature: string;
      message: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { walletAddress, publicKey, signature, message } = body;
    const nonceStore = this.authService.getNonceFromMessage(message);

    console.log('nonceStore', nonceStore);

    if (!nonceStore) {
      throw new UnauthorizedException('Invalid nonce');
    }

    if (!nonceStore || !message.includes(nonceStore)) {
      throw new UnauthorizedException('Invalid nonce');
    }

    if (Date.now() > NONCE_STORE[walletAddress]?.expiresAt) {
      throw new UnauthorizedException('Nonce expired');
    }

    try {
      const isValidNonce = await this.authService.isValidNonce(
        walletAddress,
        nonceStore,
      );

      if (!isValidNonce) {
        throw new UnauthorizedException('Invalid nonce');
      }

      const isVerified = this.authService.verifyEd25519Signature({
        publicKey,
        message,
        signature,
      });

      if (!isVerified) {
        throw new UnauthorizedException('Invalid signature');
      }

      const signOptions: SignOptions = {
        expiresIn: JWT_EXPIRATION_TIME,
      };
      const token = sign({ walletAddress }, this.jwtSecret, signOptions);
      delete NONCE_STORE[walletAddress];

      // Set token in HTTP-only cookie
      res.cookie('tasmil-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: NONCE_EXPIRATION_TIME,
        path: '/',
      });

      return {
        success: true,
        message: 'Signature verified successfully',
      };
    } catch (error) {
      throw new UnauthorizedException(
        'Signature verification failed: ' + (error as Error).message,
      );
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('tasmil-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { success: true, message: 'Logged out successfully' };
  }
}
