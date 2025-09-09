export const AuthExamples = {
  getNonce: {
    address:
      '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
    nonce: '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
    message: 'Nonce generated successfully',
  },

  verifySignature: {
    walletAddress:
      '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
    publicKey:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    signature:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    message:
      'Sign this message to authenticate with nonce: a1b2c3d4e5f6789012345678901234567890123456789012',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3YWxsZXRBZGRyZXNzIjoiMHg3NDJkMzVDYzY2MzRDMDUzMjkyNWEzYjg0NEJjOWU3NTk1Zjc3ZTlFNyIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5MzIyfQ.1234567890abcdef',
    successMessage: 'Signature verified successfully',
  },

  errors: {
    missingAddress: {
      message: 'Wallet address is required',
    },
    serverError: {
      message: 'Failed to generate nonce',
    },
    invalidNonce: {
      message: 'Invalid nonce',
    },
    expiredNonce: {
      message: 'Nonce expired',
    },
    invalidSignature: {
      message: 'Invalid signature',
    },
    verificationFailed: {
      message: 'Signature verification failed: Invalid signature format',
    },
    missingFields: {
      message:
        'Missing required fields: walletAddress, publicKey, signature, message',
    },
  },
};
