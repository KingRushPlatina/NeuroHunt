/**
 * Costanti per l'API Reddit
 */
export const REDDIT_CONSTANTS = {
  // URL di base per le API Reddit
  BASE_URL: 'https://www.reddit.com',
  OAUTH_BASE_URL: 'https://oauth.reddit.com',
  
  // Endpoint specifici
  ENDPOINTS: {
    ACCESS_TOKEN: '/api/v1/access_token',
    SUBREDDITS_POPULAR: '/subreddits/popular',
    SEARCH: '/search',
    SUBREDDITS_SEARCH: '/subreddits/search',
  },
  
  // Parametri di default
  DEFAULT_LIMIT: 25,
  
  // Tipi di ordinamento
  SORT_TYPES: {
    SUBREDDIT: ['hot', 'new', 'top', 'rising'] as const,
    SEARCH: ['relevance', 'hot', 'top', 'new', 'comments'] as const,
  },
  
  // Headers di default
  HEADERS: {
    CONTENT_TYPE: 'application/x-www-form-urlencoded',
    GRANT_TYPE: 'client_credentials',
  },
  
  // Keywords per criptovalute e blockchain
  CRYPTO_KEYWORDS: [
    'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain',
    'defi', 'trading', 'nft', 'web3', 'metaverse',
    'investment', 'altcoins', 'mining', 'tokens', 'doge',
    'binance', 'coinbase', 'kraken', 'ftx', 'kucoin',
    'cardano', 'solana', 'polygon', 'avalanche', 'chainlink',
    'polkadot', 'cosmos', 'terra', 'fantom', 'near',
    'uniswap', 'pancakeswap', 'sushiswap', 'compound', 'aave',
    'maker', 'yearn', 'curve', 'synthetix', 'balancer',
    'opensea', 'rarible', 'superrare', 'foundation', 'async',
    'metamask', 'trust wallet', 'ledger', 'trezor', 'exodus',
    'staking', 'yield farming', 'liquidity mining', 'dao', 'governance',
    'smart contracts', 'dapps', 'oracles', 'layer2', 'scaling',
    'consensus', 'proof of stake', 'proof of work', 'validators', 'nodes',
    'hodl', 'diamond hands', 'paper hands', 'moon', 'lambo',
    'bull market', 'bear market', 'pump', 'dump', 'fomo',
    'fud', 'ath', 'atl', 'market cap', 'volume',
    'candlesticks', 'technical analysis', 'fundamental analysis', 'charts', 'indicators',
    'rsi', 'macd', 'bollinger bands', 'fibonacci', 'support',
    'resistance', 'breakout', 'consolidation', 'trend', 'reversal'
  ],

  // Keywords per subreddit importanti
 IMPORTANT_KEYWORDS: [
  'innovation'
],
} as const;

/**
 * Tipi derivati dalle costanti
 */
export type SubredditSortType = typeof REDDIT_CONSTANTS.SORT_TYPES.SUBREDDIT[number];
export type SearchSortType = typeof REDDIT_CONSTANTS.SORT_TYPES.SEARCH[number];