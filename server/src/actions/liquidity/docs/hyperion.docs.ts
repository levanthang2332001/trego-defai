import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ChatResponseDto, ErrorResponse } from 'src/chat/dto';
import { FetchPoolHyperionRequestDto } from '../dto/hyperion.dto';

export const HyperionApiDocs = {
  fetchAllPools: {
    operation: ApiOperation({
      tags: ['Hyperion protocol'],
      summary: 'Fetch all pools using Hyperion',
    }),

    okResponse: ApiOkResponse({
      description: 'All pools fetched successfully',
      type: ChatResponseDto,
      examples: {
        success: {
          summary: 'Successful pre-swap calculation',
          value: {
            message: 'Pre-swap calculation successful',
            data: {
              action: 'FETCH_ALL_POOLS',
              result: [
                {
                  id: '0x7cfc133399fe16d287580e91dba9d805845885d9a0ba0c6ec4950331f6aa3bf0',
                  dailyVolumeUSD: '0',
                  feesUSD: '0',
                  tvlUSD: '0.0000001485151789924152',
                  feeAPR: '0',
                  farmAPR: '0',
                  pool: {
                    currentTick: 10960,
                    feeRate: '1000',
                    feeTier: 4,
                    poolId:
                      '0x7cfc133399fe16d287580e91dba9d805845885d9a0ba0c6ec4950331f6aa3bf0',
                    senderAddress:
                      '0x987866b5002d123339c15e6b11b96dc3aabd1a1c61b1188b8383107ff10cbf46',
                    sqrtPrice: '31908119216425592818',
                    token1:
                      '0x000000000000000000000000000000000000000000000000000000000000000a',
                    token2:
                      '0xb614bfdf9edc39b330bbf9c3c5bcd0473eee2f6d4e21748629cc367869ece627',
                    token1Info: {
                      assetType:
                        '0x000000000000000000000000000000000000000000000000000000000000000a',
                      bridge: null,
                      coinMarketcapId: '21794',
                      coinType: '0x1::aptos_coin::AptosCoin',
                      coingeckoId: 'aptos',
                      decimals: 8,
                      faType:
                        '0x000000000000000000000000000000000000000000000000000000000000000a',
                      hyperfluidSymbol: 'APT',
                      logoUrl:
                        'https://assets.hyperion.xyz/aptos-token/main/logos/APT.svg',
                      name: 'Aptos Coin',
                      symbol: 'APT',
                      isBanned: false,
                      websiteUrl: 'https://aptosfoundation.org',
                    },
                    token2Info: {
                      assetType:
                        '0xb614bfdf9edc39b330bbf9c3c5bcd0473eee2f6d4e21748629cc367869ece627',
                      bridge: null,
                      coinMarketcapId: '',
                      coinType:
                        '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::stapt_token::StakedApt',
                      coingeckoId: 'amnis-staked-aptos-coin',
                      decimals: 8,
                      faType:
                        '0xb614bfdf9edc39b330bbf9c3c5bcd0473eee2f6d4e21748629cc367869ece627',
                      hyperfluidSymbol: 'stAPT',
                      logoUrl:
                        'https://assets.hyperion.xyz/aptos-token/main/logos/stAptAmnis.svg',
                      name: 'Staked Aptos Coin',
                      symbol: 'stAPT',
                      isBanned: false,
                      websiteUrl: 'https://stake.amnis.finance',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    }),

    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        invalidTokens: {
          summary: 'Invalid token addresses',
          value: {
            message: 'Invalid token addresses',
            data: null,
          },
        },
      },
    }),
  },

  fetchOnePool: {
    operation: ApiOperation({
      tags: ['Hyperion protocol'],
      summary: 'Fetch one pool using Hyperion',
    }),

    body: ApiBody({
      type: FetchPoolHyperionRequestDto,
      examples: {
        fetchOnePool: {
          summary: 'Fetch one pool',
          description: 'Fetch one pool',
          value: {
            poolId:
              '0x7cfc133399fe16d287580e91dba9d805845885d9a0ba0c6ec4950331f6aa3bf0',
          },
        },
      },
    }),

    okResponse: ApiOkResponse({
      description: 'One pool fetched successfully',
      type: ChatResponseDto,
      examples: {
        success: {
          summary: 'Successful pre-swap calculation',
          value: {
            message: 'Pre-swap calculation successful',
            data: {
              action: 'FETCH_ONE_POOL',
              result: {
                id: '0x7cfc133399fe16d287580e91dba9d805845885d9a0ba0c6ec4950331f6aa3bf0',
              },
            },
          },
        },
      },
    }),

    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        invalidPoolId: {
          summary: 'Invalid pool id',
          value: {
            message: 'Invalid pool id',
            data: null,
          },
        },
      },
    }),
  },
};
