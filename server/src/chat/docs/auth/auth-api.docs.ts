import {
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from '../../dto/error-response.dto';

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
      example:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
    }),

    okResponse: ApiOkResponse({
      description: 'Nonce generated successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          nonce: {
            type: 'string',
            example:
              '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
          },
          message: {
            type: 'string',
            example: 'Nonce generated successfully',
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
            message: 'Wallet address is required',
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
            message: 'Failed to generate nonce',
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
            example:
              '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
          },
          publicKey: {
            type: 'string',
            description: 'Ed25519 public key',
            example:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          },
          signature: {
            type: 'string',
            description: 'Ed25519 signature',
            example:
              '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          },
          message: {
            type: 'string',
            description: 'Signed message containing nonce',
            example:
              'Sign this message to authenticate with nonce: a1b2c3d4e5f6789012345678901234567890123456789012',
          },
        },
      },
      examples: {
        validSignature: {
          summary: 'Valid signature example',
          description: 'Example of a valid signature verification request',
          value: {
            walletAddress:
              '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
            publicKey:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            signature:
              '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            message:
              'Sign this message to authenticate with nonce: a1b2c3d4e5f6789012345678901234567890123456789012',
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
            example:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3YWxsZXRBZGRyZXNzIjoiMHg3NDJkMzVDYzY2MzRDMDUzMjkyNWEzYjg0NEJjOWU3NTk1Zjc3ZTlFNyIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5MzIyfQ.1234567890abcdef',
          },
          message: {
            type: 'string',
            example: 'Signature verified successfully',
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
            message: 'Invalid nonce',
          },
        },
        expiredNonce: {
          summary: 'Nonce expired',
          value: {
            message: 'Nonce expired',
          },
        },
        invalidSignature: {
          summary: 'Invalid signature',
          value: {
            message: 'Invalid signature',
          },
        },
        verificationFailed: {
          summary: 'Signature verification failed',
          value: {
            message: 'Signature verification failed: Invalid signature format',
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
            message:
              'Missing required fields: walletAddress, publicKey, signature, message',
          },
        },
      },
    }),
  },
};
