# DeFai Agent 

A sophisticated AI-powered DeFi platform built on Aptos blockchain, enabling seamless token swaps, liquidity provision, staking, lending, and intelligent trading through conversational AI interactions.

## 🚀 Features

- **🤖 AI-Powered Trading**: Intelligent conversational agent for DeFi operations with intent recognition
- **🔄 Token Swaps**: Multi-protocol token exchanges (Hyperion, Panora, Liquidswap)
- **💧 Liquidity Management**: Add and remove liquidity across various protocols
- **🏛️ Lending & Borrowing**: Supply, withdraw, borrow, and repay operations
- **🥩 Staking**: Stake tokens and claim rewards with automated management
- **🌉 Cross-Chain Bridge**: Stargate protocol integration for bridging assets
- **💱 Voice Interactions**: Voice-enabled trading and DeFi operations
- **🔐 Secure Authentication**: JWT-based authentication with wallet integration
- **📊 Real-time Analytics**: Market data and portfolio tracking

## 🛠️ Technical Stack

### Backend
- **🏗️ Framework**: NestJS with TypeScript
- **⛓️ Blockchain**: Aptos blockchain integration
- **🤖 AI**: LangChain with OpenAI for intelligent intent processing
- **💾 Database**: Supabase with Redis caching
- **🔌 Protocols**: Hyperion, Panora, Liquidswap, Stargate, Pyth Network
- **📡 API**: RESTful APIs with Swagger documentation
- **🔐 Auth**: JWT authentication with Passport
- **🧪 Testing**: Jest with comprehensive test coverage

## 🔧 Environment Variables

Create a `.env` file in the server folder with required environment variables.

## 🚀 Getting Started

### Server Setup ([📚 API Documentation](http://localhost:5000/api/docs))

```bash
cd server
pnpm install
pnpm start:dev
```

The server will be available at `http://localhost:5000` with API documentation at `/api/docs`.

## 📁 Project Structure

```
defai/
├── server/                 # NestJS backend application
│   ├── src/
│   │   ├── actions/        # Protocol-specific trading actions
│   │   ├── chat/          # AI chat and intent processing
│   │   ├── database/      # Database connections (Supabase, Redis)
│   │   ├── tools/         # Protocol SDKs and utilities
│   │   └── wallet/        # Authentication and wallet management
│   └── package.json
└── README.md
```

## 🔌 Supported Protocols

- **Hyperion**: DEX aggregator for optimal swap routing
- **Panora**: Advanced trading and liquidity protocols
- **Liquidswap**: Aptos-native AMM protocol
- **Stargate**: Cross-chain bridge protocol
- **Pyth Network**: Real-time price feeds
