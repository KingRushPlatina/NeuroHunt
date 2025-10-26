import { Injectable } from '@nestjs/common';
import { RedditClient } from '../../lib/reddit/reddit-client';
import { SubredditFinder } from '../../lib/reddit/subreddit-finder';
import { RedditCredentials } from '../../lib/reddit/reddit.interfaces';

@Injectable()
export class RedditService {
  private redditClient: RedditClient;
  private subredditFinder: SubredditFinder;

  constructor() {
    const credentials: RedditCredentials = {
      clientId: process.env.REDDIT_CLIENT_ID || '',
      clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
      userAgent: process.env.REDDIT_USER_AGENT || 'NeuroHunt/1.0.0'
    };

    // Validazione delle credenziali
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('Reddit credentials are not properly configured. Please check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.');
    }

    this.redditClient = new RedditClient(credentials);
    this.subredditFinder = new SubredditFinder(credentials);
  }

  async getPopularSubreddits(limit?: number) {
    return this.subredditFinder.getPopularSubreddits(limit);
  }

  async getImportantSubreddits(limit?: number) {
    return this.subredditFinder.getImportantSubreddits(limit);
  }

  async getCryptoSubreddits(limit?: number) {
    return this.subredditFinder.getCryptoRelatedSubreddits(limit);
  }

  async searchSubreddits(query: string, limit?: number) {
    return this.subredditFinder.searchSubreddits(query, limit);
  }

  async getSubredditPosts(params: any) {
    return this.redditClient.getSubredditPosts(params);
  }

  async searchPosts(params: any) {
    return this.redditClient.searchPosts(params);
  }

  async getPost(subreddit: string, postId: string) {
    return this.redditClient.getPost(subreddit, postId);
  }

  async getUserInfo(username: string) {
    return this.redditClient.getUserInfo(username);
  }
}