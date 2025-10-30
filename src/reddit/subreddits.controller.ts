import { Controller, Get, Query, BadRequestException, Param, HttpException, HttpStatus } from '@nestjs/common';
import { RedditService } from './reddit.service';
import { RedditSubreddit, RedditConversation, RedditComment } from '../../lib/reddit/reddit.interfaces';

@Controller('subreddits')
export class SubredditsController {
  constructor(private readonly redditService: RedditService) {}

  @Get('popular')
  async getPopularSubreddits(@Query('limit') limit?: string) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      
      if (limit && parsedLimit !== undefined && (isNaN(parsedLimit) || parsedLimit <= 0)) {
        throw new HttpException('Il parametro limit deve essere un numero positivo', HttpStatus.BAD_REQUEST);
      }

      const result = await this.redditService.getPopularSubreddits(parsedLimit);
      return result;
    } catch (error) {
      console.error('Errore nel recupero dei subreddit popolari:', error);
      throw new HttpException('Errore interno del server', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('important')
  async getImportantSubreddits(@Query('limit') limit?: string) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      
      if (limit && (isNaN(parsedLimit) || parsedLimit <= 0)) {
        throw new HttpException('Il parametro limit deve essere un numero positivo', HttpStatus.BAD_REQUEST);
      }

      const result = await this.redditService.getImportantSubreddits(parsedLimit);
      return result;
    } catch (error) {
      console.error('Errore nel recupero dei subreddit importanti:', error);
      throw new HttpException('Errore interno del server', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('crypto')
  async getCryptoSubreddits(@Query('limit') limit?: string): Promise<RedditSubreddit[]> {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 25;
      
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
        throw new BadRequestException('Il parametro limit deve essere un numero tra 1 e 100');
      }

      return await this.redditService.getCryptoSubreddits(parsedLimit);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Errore nel recupero dei subreddit crypto: ${error.message}`);
    }
  }

  @Get(':subreddit/conversations')
  async getSubredditConversations(
    @Param('subreddit') subreddit: string,
    @Query('sort') sort?: 'hot' | 'new' | 'top' | 'rising',
    @Query('limit') limit?: string,
    @Query('comments_per_post') commentsPerPost?: string
  ): Promise<RedditConversation[]> {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 10;
      const parsedCommentsPerPost = commentsPerPost ? parseInt(commentsPerPost, 10) : 50;
      
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
        throw new BadRequestException('Il parametro limit deve essere un numero tra 1 e 50');
      }

      if (isNaN(parsedCommentsPerPost) || parsedCommentsPerPost <= 0 || parsedCommentsPerPost > 200) {
        throw new BadRequestException('Il parametro comments_per_post deve essere un numero tra 1 e 200');
      }

      const validSorts = ['hot', 'new', 'top', 'rising'];
      const sortParam = sort && validSorts.includes(sort) ? sort : 'new';

      return await this.redditService.getSubredditConversations(
        subreddit,
        sortParam,
        parsedLimit,
        parsedCommentsPerPost
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Errore nel recupero delle conversazioni da r/${subreddit}: ${error.message}`);
    }
  }

  @Get(':subreddit/posts/:postId/conversation')
  async getConversation(
    @Param('subreddit') subreddit: string,
    @Param('postId') postId: string,
    @Query('comments_limit') commentsLimit?: string
  ): Promise<RedditConversation> {
    try {
      const parsedCommentsLimit = commentsLimit ? parseInt(commentsLimit, 10) : 100;
      
      if (isNaN(parsedCommentsLimit) || parsedCommentsLimit <= 0 || parsedCommentsLimit > 500) {
        throw new BadRequestException('Il parametro comments_limit deve essere un numero tra 1 e 500');
      }

      return await this.redditService.getConversation(subreddit, postId, parsedCommentsLimit);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Errore nel recupero della conversazione ${postId}: ${error.message}`);
    }
  }

  @Get(':subreddit/posts/:postId/comments')
  async getPostComments(
    @Param('subreddit') subreddit: string,
    @Param('postId') postId: string,
    @Query('sort') sort?: 'confidence' | 'top' | 'new' | 'controversial' | 'old' | 'random' | 'qa' | 'live',
    @Query('limit') limit?: string,
    @Query('depth') depth?: string
  ): Promise<RedditComment[]> {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 100;
      const parsedDepth = depth ? parseInt(depth, 10) : 10;
      
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 500) {
        throw new BadRequestException('Il parametro limit deve essere un numero tra 1 e 500');
      }

      if (isNaN(parsedDepth) || parsedDepth <= 0 || parsedDepth > 20) {
        throw new BadRequestException('Il parametro depth deve essere un numero tra 1 e 20');
      }

      const validSorts = ['confidence', 'top', 'new', 'controversial', 'old', 'random', 'qa', 'live'];
      const sortParam = sort && validSorts.includes(sort) ? sort : 'confidence';

      return await this.redditService.getPostComments({
        subreddit,
        postId,
        sort: sortParam,
        limit: parsedLimit,
        depth: parsedDepth
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Errore nel recupero dei commenti per il post ${postId}: ${error.message}`);
    }
  }
}
