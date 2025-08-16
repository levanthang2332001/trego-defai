interface StargateToken {
  isBridgeable: boolean;
  chainKey: string;
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  price: {
    usd: number;
  };
}

interface StargateChain {
  chainId: number;
  name: string;
  chainKey: string;
  chainType: string;
  shortName: string;
  logoURI?: string;
  rpcUrls?: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface StargateFee {
  token: string;
  chainKey: string;
  amount: string;
  type: string;
}

interface StargateStep {
  type: string;
  sender: string;
  chainKey: string;
  transaction: Record<string, string>;
}

interface StargateQuote {
  srcToken: string;
  dstToken: string;
  srcAddress: string;
  dstAddress: string;
  srcChainKey: string;
  dstChainKey: string;
  srcAmount: string;
  dstAmountMin: string;
  fee?: StargateFee[];
  steps?: StargateStep[];
}

interface StargateTransaction {
  type: string;
  chainKey: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
}

interface StargateTokensResponse {
  tokens: StargateToken[];
}

interface StargateChainResponse {
  chains: StargateChain[];
}

interface StargateQuoteResponse {
  quotes: StargateQuote[];
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

const STARGATE_API_BASE = 'https://stargate.finance/api/v1';
const TOKENS_ENDPOINT = `${STARGATE_API_BASE}/tokens`;
const CHAINS_ENDPOINT = `${STARGATE_API_BASE}/chains`;
const QUOTE_ENDPOINT = `${STARGATE_API_BASE}/quotes`;

const fetchConfig: RequestInit = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

async function fetchApi<T>(
  url: string,
  config: RequestInit = fetchConfig,
): Promise<T> {
  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error: ApiError = {
        message: `HTTP error! status: ${response.status}`,
        status: response.status,
      };
      throw new Error(error.message);
    }

    const data: T = (await response.json()) as T;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`API request failed: ${error.message}`);
    }
    throw new Error('Unknown API error occurred');
  }
}

function validateResponse<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
): T {
  if (!validator(data)) {
    throw new Error('Invalid response structure');
  }
  return data;
}

function isStargateTokensResponse(
  data: unknown,
): data is StargateTokensResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tokens' in data &&
    Array.isArray((data as { tokens: unknown[] }).tokens)
  );
}

function isStargateChainResponse(data: unknown): data is StargateChainResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'chains' in data &&
    Array.isArray((data as { chains: unknown[] }).chains)
  );
}

function isStargateQuoteResponse(data: unknown): data is StargateQuoteResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'quotes' in data &&
    Array.isArray((data as { quotes: unknown[] }).quotes)
  );
}

async function fetchStargateTokens(): Promise<StargateTokensResponse> {
  try {
    const data = await fetchApi<StargateTokensResponse>(TOKENS_ENDPOINT);
    return validateResponse(data, isStargateTokensResponse);
  } catch (error) {
    console.error('Error fetching Stargate tokens:', error);
    throw new Error(
      `Failed to fetch Stargate tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function fetchStargateChains(): Promise<StargateChainResponse> {
  try {
    const data = await fetchApi<StargateChainResponse>(CHAINS_ENDPOINT);
    return validateResponse(data, isStargateChainResponse);
  } catch (error) {
    console.error('Error fetching Stargate chains:', error);
    throw new Error(
      `Failed to fetch Stargate chains: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function fetchStargateQuote(
  quote: StargateQuote,
): Promise<StargateQuoteResponse> {
  try {
    const params = new URLSearchParams({
      srcToken: quote.srcToken,
      dstToken: quote.dstToken,
      srcAddress: quote.srcAddress,
      dstAddress: quote.dstAddress,
      srcChainKey: quote.srcChainKey,
      dstChainKey: quote.dstChainKey,
      srcAmount: quote.srcAmount,
      dstAmountMin: quote.dstAmountMin,
    });

    const url = `${QUOTE_ENDPOINT}?${params.toString()}`;
    console.log('fetching quote', url);
    const data = await fetchApi<StargateQuoteResponse>(url);
    return validateResponse(data, isStargateQuoteResponse);
  } catch (error) {
    console.error('Error fetching Stargate quote:', error);
    throw new Error(
      `Failed to fetch Stargate quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

function filterItems<T>(items: T[], predicate: (item: T) => boolean): T[] {
  return items.filter(predicate);
}

function findItem<T>(items: T[], predicate: (item: T) => boolean): T | null {
  return items.find(predicate) || null;
}

async function getTokensByChain<T extends StargateToken = StargateToken>(
  chainKey: string,
): Promise<T[]> {
  try {
    const { tokens } = await fetchStargateTokens();
    return filterItems(
      tokens as unknown as T[],
      (token) => token.chainKey === chainKey,
    );
  } catch (error) {
    console.error(`Error fetching tokens for chain ${chainKey}:`, error);
    throw error;
  }
}

async function getChainById<T extends StargateChain = StargateChain>(
  chainId: number,
): Promise<T | null> {
  try {
    const { chains } = await fetchStargateChains();
    return findItem(
      chains as unknown as T[],
      (chain) => chain.chainId === chainId,
    );
  } catch (error) {
    console.error(`Error fetching chain ${chainId}:`, error);
    throw error;
  }
}

async function getTokenBySymbolAndChain<
  T extends StargateToken = StargateToken,
>(symbol: string, chainKey: string): Promise<T | null> {
  try {
    const tokens = await getTokensByChain<T>(chainKey);
    return findItem(
      tokens,
      (token) => token.symbol.toLowerCase() === symbol.toLowerCase(),
    );
  } catch (error) {
    console.error(
      `Error fetching token ${symbol} on chain ${chainKey}:`,
      error,
    );
    throw error;
  }
}

async function searchTokens<T extends StargateToken = StargateToken>(
  searchTerm: string,
  searchField: keyof T = 'symbol',
): Promise<T[]> {
  try {
    const { tokens } = await fetchStargateTokens();
    return filterItems(tokens as unknown as T[], (token) => {
      const fieldValue = token[searchField];
      return (
        typeof fieldValue === 'string' &&
        fieldValue.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  } catch (error) {
    console.error(`Error searching tokens:`, error);
    throw error;
  }
}

async function validateBridgeParams(params: {
  srcChainKey: string;
  dstChainKey: string;
  srcToken: string;
  dstToken: string;
  amount: string;
}): Promise<boolean> {
  try {
    const [chains, tokens] = await Promise.all([
      fetchStargateChains(),
      fetchStargateTokens(),
    ]);

    const srcChain = chains.chains.find(
      (chain) => chain.chainKey === params.srcChainKey,
    );
    const dstChain = chains.chains.find(
      (chain) => chain.chainKey === params.dstChainKey,
    );

    if (!srcChain || !dstChain) {
      throw new Error('Unsupported chain');
    }

    const srcToken = tokens.tokens.find(
      (token) => token.address.toLowerCase() === params.srcToken.toLowerCase(),
    );
    const dstToken = tokens.tokens.find(
      (token) => token.address.toLowerCase() === params.dstToken.toLowerCase(),
    );

    if (!srcToken || !dstToken) {
      throw new Error('Unsupported token');
    }

    const amount = parseFloat(params.amount);
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    return true;
  } catch (error) {
    console.error('Error validating bridge params:', error);
    throw error;
  }
}

export {
  type StargateToken,
  type StargateChain,
  type StargateQuote,
  type StargateTransaction,
  type StargateTokensResponse,
  type StargateChainResponse,
  type ApiResponse,
  type ApiError,
  fetchApi,
  validateResponse,
  filterItems,
  findItem,
  isStargateTokensResponse,
  isStargateChainResponse,
  fetchStargateTokens,
  fetchStargateChains,
  fetchStargateQuote,
  getTokensByChain,
  getChainById,
  getTokenBySymbolAndChain,
  searchTokens,
  validateBridgeParams,
  STARGATE_API_BASE,
  TOKENS_ENDPOINT,
  CHAINS_ENDPOINT,
};
