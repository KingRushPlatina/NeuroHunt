/**
 * Interfacce per l'API Reddit
 */

/**
 * Credenziali per l'autenticazione Reddit
 */
export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  userAgent: string;
}

/**
 * Struttura di un post Reddit
 */
export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  url: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
}

/**
 * Struttura di un subreddit
 */
export interface RedditSubreddit {
  id: string;
  display_name: string;
  title: string;
  public_description: string;
  description: string;
  subscribers: number;
  url: string;
  icon_img: string;
  banner_img: string;
  created_utc: number;
  over18: boolean;
}

/**
 * Risposta generica dell'API Reddit
 */
export interface RedditResponse<T = any> {
  data: {
    children: Array<{
      data: T;
    }>;
    after?: string;
    before?: string;
    dist?: number;
  };
}

/**
 * Risposta specifica per i post
 */
export interface RedditPostResponse extends RedditResponse<RedditPost> {}

/**
 * Risposta specifica per i subreddit
 */
export interface RedditSubredditResponse extends RedditResponse<RedditSubreddit> {}

/**
 * Risposta dell'autenticazione
 */
export interface RedditAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Parametri per la ricerca
 */
export interface SearchParams {
  query: string;
  subreddit?: string;
  sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
  limit?: number;
  after?: string;
  before?: string;
}

/**
 * Parametri per ottenere post da subreddit
 */
export interface SubredditPostsParams {
  subreddit: string;
  sort?: 'hot' | 'new' | 'top' | 'rising';
  limit?: number;
  after?: string;
  before?: string;
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}