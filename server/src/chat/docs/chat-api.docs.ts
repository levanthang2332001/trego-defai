import {
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from '../dto/error-response.dto';
import { ChatExamples } from './examples';
import { ChatRequestDto, ChatResponseDto } from '../dto/chat.dto';

export const ChatApiDocs = {
  sendMessage: {
    operation: ApiOperation({
      summary: 'Send a chat message',
      description:
        'Process a user message and extract DeFi intent for automated actions',
    }),

    body: ApiBody({
      type: ChatRequestDto,
      description: 'Chat message with user ID and content',
      examples: {
        swapExample: {
          summary: 'Swap tokens example',
          description: 'User wants to swap USDT for ETH',
          value: ChatExamples.requests.swap,
        },
        liquidityExample: {
          summary: 'Add liquidity example',
          description: 'User wants to add liquidity to a pool',
          value: ChatExamples.requests.liquidity,
        },
        stakingExample: {
          summary: 'Stake tokens example',
          description: 'User wants to stake tokens',
          value: ChatExamples.requests.staking,
        },
        unclearExample: {
          summary: 'Unclear intent example',
          description: 'User message with unclear intent',
          value: ChatExamples.requests.unclear,
        },
      },
    }),

    okResponse: ApiOkResponse({
      description: 'Message processed successfully with extracted intent',
      type: ChatResponseDto,
      examples: {
        swapSuccess: {
          summary: 'Successful swap intent extraction',
          value: ChatExamples.responses.swapSuccess,
        },
        liquiditySuccess: {
          summary: 'Successful liquidity intent extraction',
          value: ChatExamples.responses.liquiditySuccess,
        },
        stakingSuccess: {
          summary: 'Successful staking intent extraction',
          value: ChatExamples.responses.stakingSuccess,
        },
        unstakingSuccess: {
          summary: 'Successful unstaking intent extraction',
          value: ChatExamples.responses.unstakingSuccess,
        },
        unclearIntent: {
          summary: 'Unclear intent',
          value: ChatExamples.responses.unclearIntent,
        },
      },
    }),

    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        invalidTasmilAddress: {
          summary: 'Invalid tasmil address',
          value: ChatExamples.errors.invalidTasmilAddress,
        },
        invalidContent: {
          summary: 'Invalid message content',
          value: ChatExamples.errors.invalidContent,
        },
      },
    }),

    internalServerErrorResponse: ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      type: ErrorResponse,
      examples: {
        serverError: {
          summary: 'Internal server error',
          value: ChatExamples.errors.serverError,
        },
      },
    }),
  },
};
