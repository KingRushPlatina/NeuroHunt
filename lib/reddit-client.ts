import axios, { AxiosInstance } from 'axios';

export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  userAgent: string;
}

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

export interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
    after?: string;
    before?: string;
  };
}

export class RedditClient {
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private credentials: RedditCredentials;

  constructor(credentials: RedditCredentials) {
    this.credentials = credentials;
    this.httpClient = axios.create({
      baseURL: 'https://www.reddit.com',
      headers: {
        'User-Agent': credentials.userAgent,
      },
    });
  }

  /**
   * Ottiene un access token per l'autenticazione con Reddit API
   */
  async authenticate(): Promise<void> {
    try {
      const auth = Buffer.from(
        `${this.credentials.clientId}:${this.credentials.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.credentials.userAgent,
          },
        }
      );

      this.accessToken = response.data.access_token;
      
      // Aggiorna l'istanza axios con il token
      this.httpClient = axios.create({
        baseURL: 'https://oauth.reddit.com',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.credentials.userAgent,
        },
      });
    } catch (error) {
      throw new Error(`Errore durante l'autenticazione Reddit: ${error.message}`);
    }
  }

  /**
   * Ottiene i post da un subreddit specifico
   */
  async getSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    limit: number = 25,
    after?: string
  ): Promise<RedditResponse> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(after && { after }),
      });

      const response = await this.httpClient.get(
        `/r/${subreddit}/${sort}?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      throw new Error(`Errore nel recupero dei post da r/${subreddit}: ${error.message}`);
    }
  }

  /**
   * Cerca post su Reddit
   */
  async searchPosts(
    query: string,
    subreddit?: string,
    sort: 'relevance' | 'hot' | 'top' | 'new' | 'comments' = 'relevance',
    limit: number = 25
  ): Promise<RedditResponse> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const params = new URLSearchParams({
        q: query,
        sort,
        limit: limit.toString(),
        type: 'link',
        ...(subreddit && { restrict_sr: 'true' }),
      });

      const endpoint = subreddit 
        ? `/r/${subreddit}/search?${params.toString()}`
        : `/search?${params.toString()}`;

      const response = await this.httpClient.get(endpoint);
      return response.data;
    } catch (error) {
      throw new Error(`Errore nella ricerca: ${error.message}`);
    }
  }

  /**
   * Ottiene i dettagli di un post specifico
   */
  async getPost(subreddit: string, postId: string): Promise<any> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const response = await this.httpClient.get(
        `/r/${subreddit}/comments/${postId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Errore nel recupero del post ${postId}: ${error.message}`);
    }
  }

  /**
   * Ottiene informazioni su un utente
   */
  async getUserInfo(username: string): Promise<any> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const response = await this.httpClient.get(`/user/${username}/about`);
      return response.data;
    } catch (error) {
      throw new Error(`Errore nel recupero delle informazioni utente ${username}: ${error.message}`);
    }
  }

  /**
   * Verifica se il client è autenticato
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }
}