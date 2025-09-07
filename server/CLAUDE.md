# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trego Defai is a DeFi platform offering trading, liquidity provision, staking, lending, and yield farming services with voice-enabled interactions and intelligent intent recognition. The system is built as a hybrid TypeScript (NestJS) and Rust architecture for optimal performance and type safety.

## Architecture

### Hybrid Architecture
- **TypeScript Server (NestJS)**: Main API server handling web endpoints, authentication, chat functionality, and external service integrations
- **Rust Core**: High-performance trading engine and market data processing via gRPC services

### Key Components

#### TypeScript/NestJS Server (`/src`)
- **Main Entry**: `src/main.ts` - Application bootstrap with Swagger documentation at `/api/docs`
- **Modules**: 
  - `ChatModule`: AI-powered chat interface with LangChain integration
  - `AccountsModule`: Aptos wallet management and transactions
  - `AuthModule`: JWT-based authentication
  - `RedisModule`: Caching and session management
- **Tools Integration** (`src/tools/`): Multiple DeFi protocol integrations including:
  - Liquidswap, Thala, MerkleTrade, Stargate, Aries, Amnis, Echelon, Echo, Joule
- **Global Features**: CORS enabled for localhost:3000 and production, global validation, throttling (10 req/60s)

#### Rust Core (`/core-rust`)
- **Trading Engine**: High-frequency trading core with gRPC API (port 50051)
- **Market Data**: Real-time WebSocket connections to market data feeds
- **Candle Store**: Time-series data management with multiple timeframes (M1, M5, M15, M30, H1, H4, D1)
- **Components**:
  - `data` crate: Market data handling, candle aggregation, trading state
  - `types` crate: Shared type definitions
  - `proto` crate: Protobuf definitions for gRPC communication

## Development Commands

### TypeScript/NestJS Server
```bash
# Development
pnpm install                    # Install dependencies
npm run start:dev              # Development with hot reload
npm run start:debug           # Debug mode with watch
npm run build                 # Build for production
npm run start:prod            # Production mode

# Testing
npm run test                  # Unit tests
npm run test:watch           # Tests in watch mode
npm run test:e2e             # End-to-end tests
npm run test:cov             # Test coverage

# Code Quality
npm run lint                 # ESLint with auto-fix
npm run format               # Prettier formatting

# Process Management (PM2)
npm run pm2:start            # Start with PM2
npm run pm2:start:prod      # Start in production mode
npm run pm2:stop            # Stop PM2 process
npm run pm2:restart         # Restart PM2 process
npm run pm2:logs            # View logs
npm run pm2:status          # Check PM2 status
```

### Rust Core
```bash
cd core-rust
cargo build                  # Build all crates
cargo run                   # Run trading core gRPC server (port 50051)
cargo test                  # Run tests
cargo check                 # Type checking without building
```

## Code Conventions

### TypeScript (Following .cursorrules)
- **Naming**: PascalCase for classes, camelCase for variables/functions, kebab-case for files
- **Types**: Always declare types, avoid `any`, use JSDoc for public methods
- **Functions**: Max 20 instructions, single purpose, use RO-RO pattern for multiple parameters
- **Architecture**: Follow SOLID principles, prefer composition over inheritance
- **Testing**: Jest framework, Arrange-Act-Assert pattern, Given-When-Then for acceptance tests

### NestJS Specific
- **Modules**: One module per domain/route with controllers, services, DTOs, and entities
- **DTOs**: Use class-validator for input validation
- **Structure**: Core module for global artifacts, shared module for cross-module services
- **Testing**: Unit tests for controllers/services, E2E tests per API module, admin/test endpoints for smoke tests

### Rust
- **Error Handling**: Use `anyhow::Result` for error propagation
- **Async**: Tokio runtime with `tokio::spawn` for background tasks
- **Logging**: `tracing` crate for structured logging
- **Architecture**: Modular crates with clear separation of concerns

## Key Dependencies

### TypeScript Server
- **Framework**: NestJS 11.x with Express platform
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer
- **APIs**: Swagger/OpenAPI documentation
- **Blockchain**: Aptos SDK, various DeFi protocol SDKs
- **AI**: LangChain with OpenAI integration
- **Caching**: Redis with Keyv abstraction

### Rust Core
- **gRPC**: Tonic for server and client
- **Async Runtime**: Tokio with multi-threading
- **Serialization**: Serde, Prost for protobuf
- **WebSockets**: tokio-tungstenite for market data feeds
- **Data**: rust_decimal for financial precision
- **Observability**: tracing, prometheus metrics

## Development Workflow

1. **TypeScript Changes**: Use hot reload with `npm run start:dev`
2. **Rust Changes**: Rebuild with `cargo build` and restart `cargo run`
3. **gRPC Updates**: Modify `.proto` files, rebuild both Rust and TypeScript bindings
4. **Testing**: Run both `npm run test` and `cargo test` before commits
5. **Linting**: Pre-commit hooks automatically run linting and formatting

## Core-Rust Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MAIN APPLICATION START                        │
│                          (src/main.rs:368)                           │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  INITIALIZE TRADING CORE SERVICE                      │
│  • Create CandleStore with ring buffers for all timeframes           │
│  • Initialize MarketDataService with Orderbook & Trade stores         │
│  • Create TradingState & MarketMaker for strategy execution          │
│  • Start periodic candle closure task (every 60 seconds)             │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WEBSOCKET CONNECTIONS SETUP                        │
│                      (websocket.rs)                                  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ORDERBOOK WEBSOCKET           TRADES WEBSOCKET                  │ │
│  │ • Connect to wss://perpetuals-indexer-ws.kana.trade/ws/        │ │
│  │ • Subscribe to orderbook topic                                  │ │
│  │ • Subscribe to recent_trades topic                              │ │
│  │ • Auto-reconnection with exponential backoff                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      gRPC SERVER STARTUP                             │
│                        (port 50051)                                  │
│  Services:                                                            │
│  • TradingCoreServer with reflection                                  │
│  • Methods: get_candles, test_web_socket, set_params, stream_metrics │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME DATA PROCESSING                         │
└─┬─────────────────────────────────────────────────────────────────┬─┘
  │                                                                 │
  ▼                                                                 ▼
┌───────────────────────────────┐           ┌─────────────────────────────┐
│      ORDERBOOK UPDATES        │           │        TRADE UPDATES        │
│   (market_data/service.rs)    │           │   (market_data/service.rs)  │
│                              │           │                            │
│ 1. Parse WebSocket message   │           │ 1. Parse WebSocket message │
│ 2. Update OrderbookStore     │           │ 2. Update TradeStore       │
│ 3. Extract best bid/ask      │           │ 3. Create Tick from trade  │
│ 4. Create Tick objects       │           │ 4. Process tick → candles  │
│ 5. Send to CandleStore       │           │                            │
└───────────────┬───────────────┘           └─────────────┬───────────────┘
                │                                         │
                └─────────────────┐       ┌───────────────┘
                                  │       │
                                  ▼       ▼
                        ┌─────────────────────────┐
                        │    CANDLE PROCESSING    │
                        │   (candles/store.rs)    │
                        │                         │
                        │ 1. Receive Tick data    │
                        │ 2. Route to M1 builder  │
                        │ 3. Aggregate M1 → OHLC  │
                        │ 4. Store in RingBuffer  │
                        │ 5. Trigger aggregation  │
                        └─────────┬───────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TIMEFRAME AGGREGATION                           │
│                        (candles/store.rs)                           │
│                                                                     │
│  PRIMARY CHAIN:     M1 → M5 → M15 → H1 → H4 → D1 → W1 → MN1       │
│  INDEPENDENT:       M1 → M3, M15 → M30, H1 → H2                    │
│                                                                     │
│  Process:                                                           │
│  • Check if enough source candles are available                     │
│  • Validate time windows and closed status                         │
│  • Calculate OHLC, Volume, VWAP from source candles               │
│  • Store aggregated candles in respective RingBuffers              │
│  • Publish candle closed events                                    │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKGROUND TASKS                              │
└─┬─────────────────────────────────────────────────────────────────┬─┘
  │                                                                 │
  ▼                                                                 ▼
┌─────────────────────────────┐           ┌─────────────────────────────┐
│   PERIODIC CANDLE CLOSURE   │           │      METRICS STREAMING      │
│     (every 60 seconds)      │           │      (every 2 seconds)      │
│                            │           │                            │
│ • Check expired candles    │           │ • Collect market data      │
│ • Force close with grace   │           │ • Calculate spreads        │
│ • Trigger aggregation      │           │ • Stream via gRPC          │
│ • Reset builders           │           │ • Heartbeat logging        │
└─────────────────────────────┘           └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT INTERFACES                            │
│                                                                     │
│  gRPC API Endpoints:                                                │
│  • get_candles(market_id, timeframe, count) → CandleData[]         │
│  • stream_metrics() → Real-time market metrics                     │
│  • test_web_socket(address) → Connection test                       │
│  • set_params(market_id, params) → Trading parameters              │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. **Initialization**: Trading core starts, creates stores, connects to WebSocket feeds
2. **Real-time Ingestion**: WebSocket feeds provide orderbook and trade updates
3. **Tick Generation**: Market data is converted to standardized Tick objects
4. **M1 Candle Building**: Ticks are aggregated into 1-minute candles
5. **Multi-timeframe Aggregation**: M1 candles are aggregated to higher timeframes
6. **Storage**: All candles are stored in memory-efficient ring buffers
7. **API Access**: gRPC clients can query candles and stream real-time metrics
8. **Maintenance**: Background tasks handle expired candles and system health

### Key Features

- **High-frequency Processing**: Sub-second tick processing capability
- **Multi-timeframe Support**: 10 different timeframes (M1 to MN1)
- **Automatic Aggregation**: Real-time OHLC aggregation with validation
- **Memory Efficient**: Ring buffers with configurable size limits
- **Fault Tolerant**: Auto-reconnecting WebSocket with exponential backoff
- **Real-time Streaming**: Live metrics via gRPC streaming
- **Production Ready**: Structured logging, metrics, and error handling

## Important Notes

- **Environment**: Node.js 22+ required, uses pnpm for package management
- **Ports**: NestJS on 5000 (configurable via PORT env), Rust gRPC on 50051
- **Git Hooks**: Husky + lint-staged for pre-commit quality checks
- **PM2**: Production deployment with ecosystem.config.js configuration
- **CORS**: Configured for localhost:3000 and tasmil-finance.vercel.app
- **Rate Limiting**: Global throttling at 10 requests per 60 seconds


