import { RedditClient } from './reddit-client';
import { RedditCredentials, RedditSubredditResponse } from './reddit.interfaces';
import { REDDIT_CONSTANTS } from './reddit.constants';

/**
 * Classe specializzata per la ricerca e recupero di subreddit
 */
export class SubredditFinder {
  private redditClient: RedditClient;

  constructor(credentials: RedditCredentials) {
    this.redditClient = new RedditClient(credentials);
  }

  /**
   * Cerca subreddit per query
   */
  async searchSubreddits(query: string, limit: number = REDDIT_CONSTANTS.DEFAULT_LIMIT): Promise<RedditSubredditResponse> {
    return this.redditClient.searchSubreddits(query, limit);
  }

  /**
   * Ottiene i subreddit più popolari
   */
  async getPopularSubreddits(limit: number = REDDIT_CONSTANTS.DEFAULT_LIMIT): Promise<RedditSubredditResponse> {
    return this.redditClient.getPopularSubreddits(limit);
  }

  /**
   * Ottiene subreddit importanti basati su keyword specifiche
   */
  async getImportantSubreddits(limit: number = 50): Promise<any> {
    return this.redditClient.getImportantSubreddits(limit);
  }

  /**
   * Ottiene subreddit relativi alle criptovalute
   */
  async getCryptoRelatedSubreddits(limit: number = 30): Promise<any> {
    if (!this.redditClient.isAuthenticated()) {
      await this.redditClient.authenticate();
    }

    try {
      const cryptoKeywords = REDDIT_CONSTANTS.CRYPTO_KEYWORDS;

      const allSubreddits: any[] = [];
      const processedNames = new Set<string>();

      // Raggruppiamo le keyword crypto in batch
      const batchSize = 3;
      const keywordBatches: string[][] = [];
      
      for (let i = 0; i < cryptoKeywords.length; i += batchSize) {
        keywordBatches.push(cryptoKeywords.slice(i, i + batchSize));
      }

      for (const keywordBatch of keywordBatches) {
        try {
          // Combiniamo le keyword con OR
          const combinedQuery = keywordBatch.join(' OR ');
          const result = await this.searchSubreddits(combinedQuery, 10);
          
          if (result.data && result.data.children) {
            const filteredSubreddits = result.data.children
              .filter(child => {
                const subredditName = child.data.display_name?.toLowerCase();
                
                // Evita duplicati
                if (!subredditName || processedNames.has(subredditName)) {
                  return false;
                }
                
                // Verifica rilevanza crypto
                const title = child.data.title?.toLowerCase() || '';
                const description = child.data.public_description?.toLowerCase() || '';
                const displayName = subredditName;
                
                const isCryptoRelated = keywordBatch.some(keyword => {
                  const keywordLower = keyword.toLowerCase();
                  return displayName.includes(keywordLower) ||
                         title.includes(keywordLower) ||
                         description.includes(keywordLower);
                });
                
                if (isCryptoRelated) {
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
                category: 'crypto',
                keywords: keywordBatch,
              }));

            allSubreddits.push(...filteredSubreddits);
          }
        } catch (error: any) {
          console.warn(`Errore nella ricerca crypto per batch ${keywordBatch.join(', ')}:`, error.message);
        }

        // Delay tra le chiamate
        await new Promise(resolve => setTimeout(resolve, 300));

        // Limita risultati
        if (allSubreddits.length >= limit) {
          break;
        }
      }

      // Ordina per numero di iscritti (decrescente)
      const sortedSubreddits = allSubreddits
        .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
        .slice(0, limit);

      return {
        success: true,
        data: sortedSubreddits,
        total: sortedSubreddits.length,
        category: 'crypto'
      };

    } catch (error: any) {
      console.error('Errore nel recupero subreddit crypto:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        category: 'crypto'
      };
    }
  }

  /**
   * Ottiene subreddit per categoria specifica
   */
  async getSubredditsByCategory(category: string, keywords: string[], limit: number = 25): Promise<any> {
    if (!this.redditClient.isAuthenticated()) {
      await this.redditClient.authenticate();
    }

    try {
      const allSubreddits: any[] = [];
      const processedNames = new Set<string>();

      // Raggruppiamo le keyword in batch
      const batchSize = 3;
      const keywordBatches: string[][] = [];
      
      for (let i = 0; i < keywords.length; i += batchSize) {
        keywordBatches.push(keywords.slice(i, i + batchSize));
      }

      for (const keywordBatch of keywordBatches) {
        try {
          const combinedQuery = keywordBatch.join(' OR ');
          const result = await this.searchSubreddits(combinedQuery, 10);
          
          if (result.data && result.data.children) {
            const filteredSubreddits = result.data.children
              .filter(child => {
                const subredditName = child.data.display_name?.toLowerCase();
                
                if (!subredditName || processedNames.has(subredditName)) {
                  return false;
                }
                
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
                category: category,
                keywords: keywordBatch,
              }));

            allSubreddits.push(...filteredSubreddits);
          }
        } catch (error: any) {
          console.warn(`Errore nella ricerca ${category} per batch ${keywordBatch.join(', ')}:`, error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 300));

        if (allSubreddits.length >= limit) {
          break;
        }
      }

      const sortedSubreddits = allSubreddits
        .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
        .slice(0, limit);

      return {
        success: true,
        data: sortedSubreddits,
        total: sortedSubreddits.length,
        category: category
      };

    } catch (error: any) {
      console.error(`Errore nel recupero subreddit ${category}:`, error);
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        category: category
      };
    }
  }

  /**
   * Verifica se il client è autenticato
   */
  isAuthenticated(): boolean {
    return this.redditClient.isAuthenticated();
  }

  /**
   * Forza l'autenticazione
   */
  async authenticate(): Promise<void> {
    return this.redditClient.authenticate();
  }
}