import axios, { AxiosInstance } from 'axios';
import { REDDIT_CONSTANTS, SubredditSortType, SearchSortType } from './reddit.constants.js';
import {
  RedditCredentials,
  RedditPostResponse,
  RedditSubredditResponse,
  RedditAuthResponse,
  SearchParams,
  SubredditPostsParams,
  RedditComment,
  RedditCommentResponse,
  RedditConversation,
  PostCommentsParams,
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

  /**
   * Ottiene i commenti di un post specifico
   */
  async getPostComments(params: PostCommentsParams): Promise<RedditComment[]> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const {
        subreddit,
        postId,
        sort = 'confidence',
        limit = 100,
        depth = 10
      } = params;

      const queryParams = new URLSearchParams({
        sort,
        limit: limit.toString(),
        depth: depth.toString(),
      });

      const response = await this.httpClient.get(
        `/r/${subreddit}/comments/${postId}?${queryParams.toString()}`
      );

      // La risposta contiene [post_data, comments_data]
      const commentsData = response.data[1];
      
      if (!commentsData || !commentsData.data || !commentsData.data.children) {
        return [];
      }

      return this.flattenComments(commentsData.data.children);
    } catch (error) {
      throw new Error(`Errore nel recupero dei commenti per il post ${params.postId}: ${error.message}`);
    }
  }

  /**
   * Ottiene una conversazione completa (post + commenti)
   */
  async getConversation(subreddit: string, postId: string, commentsLimit: number = 100): Promise<RedditConversation> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      const response = await this.httpClient.get(
        `/r/${subreddit}/comments/${postId}?limit=${commentsLimit}`
      );

      // La risposta contiene [post_data, comments_data]
      const postData = response.data[0];
      const commentsData = response.data[1];

      if (!postData || !postData.data || !postData.data.children || postData.data.children.length === 0) {
        throw new Error('Post non trovato');
      }

      const post = postData.data.children[0].data;
      const comments = commentsData && commentsData.data && commentsData.data.children 
        ? this.flattenComments(commentsData.data.children)
        : [];

      return {
        post: {
          id: post.id,
          title: post.title,
          author: post.author,
          subreddit: post.subreddit,
          url: post.url,
          selftext: post.selftext,
          score: post.score,
          num_comments: post.num_comments,
          created_utc: post.created_utc,
          permalink: post.permalink,
        },
        comments,
        total_comments: post.num_comments || 0,
      };
    } catch (error) {
      throw new Error(`Errore nel recupero della conversazione ${postId}: ${error.message}`);
    }
  }

  /**
   * Ottiene le conversazioni più popolari da un subreddit
   */
  async getSubredditConversations(
    subreddit: string, 
    sort: 'hot' | 'new' | 'top' | 'rising' = 'new',
    limit: number = 10,
    commentsPerPost: number = 50
  ): Promise<RedditConversation[]> {
    try {
      // Prima ottieni i post
      const postsResponse = await this.getSubredditPosts({
        subreddit,
        sort,
        limit
      });

      if (!postsResponse.data || !postsResponse.data.children) {
        return [];
      }

      const conversations: RedditConversation[] = [];

      // Per ogni post, ottieni i commenti
      for (const postChild of postsResponse.data.children) {
        try {
          const post = postChild.data;
          const allComments = await this.getPostComments({
            subreddit,
            postId: post.id,
            limit: commentsPerPost,
            sort: 'top' // Ordina per i più popolari
          });

          // Filtra solo i commenti di primo livello (depth 0) e prendi i 2 più popolari
          const topLevelComments = allComments
            .filter(comment => comment.depth === 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2);

          conversations.push({
            post,
            comments: topLevelComments,
            total_comments: post.num_comments || 0,
          });

          // Delay per rispettare i rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (commentError) {
          console.warn(`Errore nel recupero commenti per post ${postChild.data.id}:`, commentError.message);
          // Aggiungi il post senza commenti
          conversations.push({
            post: postChild.data,
            comments: [],
            total_comments: postChild.data.num_comments || 0,
          });
        }
      }

      return conversations;
    } catch (error) {
      throw new Error(`Errore nel recupero delle conversazioni da r/${subreddit}: ${error.message}`);
    }
  }

  /**
   * Appiattisce la struttura annidata dei commenti Reddit
   */
  private flattenComments(children: any[], depth: number = 0): RedditComment[] {
    const comments: RedditComment[] = [];

    for (const child of children) {
      if (child.kind === 't1' && child.data) { // t1 = comment
        const commentData = child.data;
        
        const comment: RedditComment = {
          id: commentData.id,
          author: commentData.author,
          body: commentData.body,
          body_html: commentData.body_html,
          score: commentData.score,
          created_utc: commentData.created_utc,
          parent_id: commentData.parent_id,
          link_id: commentData.link_id,
          subreddit: commentData.subreddit,
          permalink: commentData.permalink,
          depth,
        };

        comments.push(comment);

        // Processa le risposte ricorsivamente
        if (commentData.replies && commentData.replies.data && commentData.replies.data.children) {
          const replies = this.flattenComments(commentData.replies.data.children, depth + 1);
          comments.push(...replies);
        }
      }
    }

    return comments;
  }
}