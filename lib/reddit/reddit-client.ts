import axios, { AxiosInstance } from 'axios';
import { REDDIT_CONSTANTS, SubredditSortType, SearchSortType } from './reddit.constants.js';
import {
  RedditCredentials,
  RedditPostResponse,
  RedditSubredditResponse,
  RedditAuthResponse,
  SearchParams,
  SubredditPostsParams,
} from './reddit.interfaces.js';

/**
 * Client per interagire con l'API Reddit
 */
export class RedditClient {
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private credentials: RedditCredentials;

  constructor(credentials: RedditCredentials) {
    this.credentials = credentials;
    this.httpClient = axios.create({
      baseURL: REDDIT_CONSTANTS.BASE_URL,
      headers: {
        'User-Agent': credentials.userAgent,
      },
    });
  }

  
  async authenticate(): Promise<void> {
    try {
      const auth = Buffer.from(
        `${this.credentials.clientId}:${this.credentials.clientSecret}`
      ).toString('base64');

      const response = await axios.post<RedditAuthResponse>(
        `${REDDIT_CONSTANTS.BASE_URL}${REDDIT_CONSTANTS.ENDPOINTS.ACCESS_TOKEN}`,
        `grant_type=${REDDIT_CONSTANTS.HEADERS.GRANT_TYPE}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': REDDIT_CONSTANTS.HEADERS.CONTENT_TYPE,
            'User-Agent': this.credentials.userAgent,
          },
        }
      );

      this.accessToken = response.data.access_token;
      
      // Aggiorna l'istanza axios con il token
      this.httpClient = axios.create({
        baseURL: REDDIT_CONSTANTS.OAUTH_BASE_URL,
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
  async getSubredditPosts(params: SubredditPostsParams): Promise<RedditPostResponse> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const {
        subreddit,
        sort = 'hot',
        limit = REDDIT_CONSTANTS.DEFAULT_LIMIT,
        after,
        before,
        time
      } = params;

      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        ...(after && { after }),
        ...(before && { before }),
        ...(time && { t: time }),
      });

      const response = await this.httpClient.get<RedditPostResponse>(
        `/r/${subreddit}/${sort}?${queryParams.toString()}`
      );

      return response.data;
    } catch (error) {
      throw new Error(`Errore nel recupero dei post da r/${params.subreddit}: ${error.message}`);
    }
  }

  /**
   * Cerca post su Reddit
   */
  async searchPosts(params: SearchParams): Promise<RedditPostResponse> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const {
        query,
        subreddit,
        sort = 'relevance',
        limit = REDDIT_CONSTANTS.DEFAULT_LIMIT,
        after,
        before
      } = params;

      const queryParams = new URLSearchParams({
        q: query,
        sort,
        limit: limit.toString(),
        type: 'link',
        ...(subreddit && { restrict_sr: 'true' }),
        ...(after && { after }),
        ...(before && { before }),
      });

      const endpoint = subreddit 
        ? `/r/${subreddit}${REDDIT_CONSTANTS.ENDPOINTS.SEARCH}?${queryParams.toString()}`
        : `${REDDIT_CONSTANTS.ENDPOINTS.SEARCH}?${queryParams.toString()}`;

      const response = await this.httpClient.get<RedditPostResponse>(endpoint);
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
   * Cerca subreddit basandosi su una query
   */
  async searchSubreddits(query: string, limit: number = REDDIT_CONSTANTS.DEFAULT_LIMIT): Promise<RedditSubredditResponse> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const params = new URLSearchParams({
        q: query,
        type: 'sr',
        limit: limit.toString(),
      });

      const response = await this.httpClient.get<RedditSubredditResponse>(
        `${REDDIT_CONSTANTS.ENDPOINTS.SUBREDDITS_SEARCH}?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      throw new Error(`Errore nella ricerca di subreddit per "${query}": ${error.message}`);
    }
  }

  /**
   * Ottiene una lista di subreddit popolari
   */
  async getPopularSubreddits(limit: number = REDDIT_CONSTANTS.DEFAULT_LIMIT): Promise<RedditSubredditResponse> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      const response = await this.httpClient.get<RedditSubredditResponse>(
        `${REDDIT_CONSTANTS.ENDPOINTS.SUBREDDITS_POPULAR}?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      throw new Error(`Errore nel recupero dei subreddit popolari: ${error.message}`);
    }
  }

  /**
   * Ottiene subreddit importanti basandosi su keywords specifiche
   */
  async getImportantSubreddits(limit: number = 50): Promise<any> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const allSubreddits: any[] = [];
      const processedNames = new Set<string>();
      let callCount = 0;
      
      // Convertiamo l'array readonly in un array normale per evitare errori TypeScript
      const keywords = [...REDDIT_CONSTANTS.IMPORTANT_KEYWORDS];

      // Raggruppiamo le keyword in batch per ridurre le chiamate
      const batchSize = 3; // Cerchiamo 3 keyword insieme in una singola query
      const keywordBatches: string[][] = [];
      
      for (let i = 0; i < keywords.length; i += batchSize) {
        keywordBatches.push(keywords.slice(i, i + batchSize));
      }

      for (const keywordBatch of keywordBatches) {
        try {
          callCount++;
          
          // Combiniamo le keyword con OR per fare una sola chiamata
          const combinedQuery = keywordBatch.join(' OR ');
          const result = await this.searchSubreddits(combinedQuery, 15); // Più risultati per batch
          
          if (result.data && result.data.children) {
            const filteredSubreddits = result.data.children
              .filter(child => {
                const subredditName = child.data.display_name?.toLowerCase();
                // Evita duplicati e subreddit già processati
                if (!subredditName || processedNames.has(subredditName)) {
                  return false;
                }
                
                // Verifica se il subreddit è rilevante per almeno una delle keyword nel batch
                const title = child.data.title?.toLowerCase() || '';
                const description = child.data.public_description?.toLowerCase() || '';
                const displayName = subredditName;
                
                const isRelevant = keywordBatch.some(keyword => {
                  const keywordLower = keyword.toLowerCase();
                  return displayName.includes(keywordLower) ||
                         title.includes(keywordLower) ||
                         description.includes(keywordLower);
                });
                
                if (isRelevant) {
                  processedNames.add(subredditName);
                  return true;
                }
                return false;
              })
              .map(child => ({
                name: child.data.display_name,
                title: child.data.title,
                description: child.data.public_description,
                subscribers: child.data.subscribers,
                url: `https://reddit.com${child.data.url}`,
                icon: child.data.icon_img,
                banner: child.data.banner_img,
                created_utc: child.data.created_utc,
                keywords: keywordBatch, // Salviamo tutte le keyword del batch
              }));

            allSubreddits.push(...filteredSubreddits);
          }
        } catch (keywordError: any) {
          // Continua con il prossimo batch se uno fallisce
          console.warn(`Errore nella ricerca per batch ${keywordBatch.join(', ')}:`, keywordError.message);
        }

        // Delay più lungo tra le chiamate per rispettare i rate limits
        if (callCount < keywordBatches.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms tra le chiamate
        }

        // Limita il numero totale di risultati
        if (allSubreddits.length >= limit) {
          break;
        }
      }

      // Ordina per numero di subscribers (decrescente)
      const sortedSubreddits = allSubreddits
        .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
        .slice(0, limit);

      return {
        data: {
          children: sortedSubreddits.map(sub => ({ data: sub })),
        },
        count: sortedSubreddits.length,
        keywords_searched: REDDIT_CONSTANTS.IMPORTANT_KEYWORDS.length,
      };
    } catch (error) {
      throw new Error(`Errore nel recupero dei subreddit importanti: ${error.message}`);
    }
  }

  /**
   * Verifica se il client è autenticato
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Ottiene il token di accesso corrente
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Resetta l'autenticazione
   */
  resetAuthentication(): void {
    this.accessToken = null;
    this.httpClient = axios.create({
      baseURL: REDDIT_CONSTANTS.BASE_URL,
      headers: {
        'User-Agent': this.credentials.userAgent,
      },
    });
  }
}