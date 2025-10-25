import { Injectable } from '@nestjs/common';
import { RedditClient, RedditCredentials, RedditResponse } from '../../lib/reddit-client';

@Injectable()
export class RedditService {
  private redditClient: RedditClient;

  constructor() {
    const credentials: RedditCredentials = {
      clientId: process.env.REDDIT_CLIENT_ID || 'bGcHCfYbwpst97TmgMNpvg',
      clientSecret: process.env.REDDIT_CLIENT_SECRET || 'dM2flqptvZ27u_rIEmSn-XEemOVGrg',
      userAgent: process.env.REDDIT_USER_AGENT || 'IdeaFinderBot by u/Bulky_Wash_8244',
    };

    this.redditClient = new RedditClient(credentials);
  }

  /**
   * Ottiene i post da un subreddit
   */
  async getSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    limit: number = 25,
    after?: string,
  ): Promise<RedditResponse> {
    return await this.redditClient.getSubredditPosts(subreddit, sort, limit, after);
  }

  /**
   * Cerca post su Reddit
   */
  async searchPosts(
    query: string,
    subreddit?: string,
    sort: 'relevance' | 'hot' | 'top' | 'new' | 'comments' = 'relevance',
    limit: number = 25,
  ): Promise<RedditResponse> {
    return await this.redditClient.searchPosts(query, subreddit, sort, limit);
  }

  /**
   * Ottiene i dettagli di un post specifico
   */
  async getPost(subreddit: string, postId: string): Promise<any> {
    return await this.redditClient.getPost(subreddit, postId);
  }

  /**
   * Ottiene informazioni su un utente
   */
  async getUserInfo(username: string): Promise<any> {
    return await this.redditClient.getUserInfo(username);
  }

  /**
   * Verifica se il client è autenticato
   */
  isAuthenticated(): boolean {
    return this.redditClient.isAuthenticated();
  }
}