import {
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from '../../../chat/dto/error-response.dto';
import { AuthExamples } from './auth-examples';

export const AuthApiDocs = {
  getNonce: {
    operation: ApiOperation({
      summary: 'Get authentication nonce',
      description: 'Generate a unique nonce for wallet signature verification',
    }),

    query: ApiQuery({
      name: 'address',
      type: String,
      description: 'Wallet address requesting nonce',
      required: true,
      example: AuthExamples.getNonce.address,
    }),

    okResponse: ApiOkResponse({
      description: 'Nonce generated successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          nonce: {
            type: 'string',
            example: AuthExamples.getNonce.nonce,
          },
          message: {
            type: 'string',
            example: AuthExamples.getNonce.message,
          },
        },
      },
    }),

    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        missingAddress: {
          summary: 'Missing wallet address',
          value: {
            success: false,
            message: AuthExamples.errors.missingAddress.message,
          },
        },
      },
    }),

    internalServerErrorResponse: ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      type: ErrorResponse,
      examples: {
        serverError: {
          summary: 'Failed to generate nonce',
          value: {
            success: false,
            message: AuthExamples.errors.serverError.message,
          },
        },
      },
    }),
  },

  verifySignature: {
    operation: ApiOperation({
      summary: 'Verify wallet signature',
      description:
        'Verify wallet signature and generate JWT token for authentication',
    }),

    body: ApiBody({
      description: 'Signature verification payload',
      schema: {
        type: 'object',
        required: ['walletAddress', 'publicKey', 'signature', 'message'],
        properties: {
          walletAddress: {
            type: 'string',
            description: 'Wallet address',
            example: AuthExamples.verifySignature.walletAddress,
          },
          publicKey: {
            type: 'string',
            description: 'Ed25519 public key',
            example: AuthExamples.verifySignature.publicKey,
          },
          signature: {
            type: 'string',
            description: 'Ed25519 signature',
            example: AuthExamples.verifySignature.signature,
          },
          message: {
            type: 'string',
            description: 'Signed message containing nonce',
            example: AuthExamples.verifySignature.message,
          },
        },
      },
      examples: {
        validSignature: {
          summary: 'Valid signature example',
          description: 'Example of a valid signature verification request',
          value: {
            walletAddress: AuthExamples.verifySignature.walletAddress,
            publicKey: AuthExamples.verifySignature.publicKey,
            signature: AuthExamples.verifySignature.signature,
            message: AuthExamples.verifySignature.message,
          },
        },
      },
    }),

    okResponse: ApiOkResponse({
      description: 'Signature verified successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          token: {
            type: 'string',
            description: 'JWT authentication token',
            example: AuthExamples.verifySignature.token,
          },
          message: {
            type: 'string',
            example: AuthExamples.verifySignature.successMessage,
          },
        },
      },
    }),

    unauthorizedResponse: ApiUnauthorizedResponse({
      description: 'Signature verification failed',
      type: ErrorResponse,
      examples: {
        invalidNonce: {
          summary: 'Invalid nonce',
          value: {
            message: AuthExamples.errors.invalidNonce.message,
          },
        },
        expiredNonce: {
          summary: 'Nonce expired',
          value: {
            message: AuthExamples.errors.expiredNonce.message,
          },
        },
        invalidSignature: {
          summary: 'Invalid signature',
          value: {
            message: AuthExamples.errors.invalidSignature.message,
          },
        },
        verificationFailed: {
          summary: 'Signature verification failed',
          value: {
            message: AuthExamples.errors.verificationFailed.message,
          },
        },
      },
    }),

    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        missingFields: {
          summary: 'Missing required fields',
          value: {
            message: AuthExamples.errors.missingFields.message,
          },
        },
      },
    }),
  },
};
