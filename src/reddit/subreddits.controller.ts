import { Controller, Get, Query } from '@nestjs/common';
import { RedditClient } from '../../lib/reddit-client';

@Controller('subreddits')
export class SubredditsController {
  private redditClient: RedditClient;

  constructor() {
    this.redditClient = new RedditClient({
      clientId: process.env.REDDIT_CLIENT_ID || '',
      clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
      userAgent: process.env.REDDIT_USER_AGENT || 'NeuroHunt by u/user',
    });
  }

  @Get('popular')
  async getPopularSubreddits(@Query('limit') limit?: string) {
    try {
      const limitNumber = limit ? parseInt(limit, 10) : 25;
      const result = await this.redditClient.getPopularSubreddits(limitNumber);
      
      return {
        success: true,
        data: result.data.children.map((child: any) => ({
          name: child.data.display_name,
          title: child.data.title,
          description: child.data.public_description,
          subscribers: child.data.subscribers,
          url: `https://reddit.com${child.data.url}`,
          icon: child.data.icon_img,
          banner: child.data.banner_img,
          created_utc: child.data.created_utc,
        })),
        count: result.data.children.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}