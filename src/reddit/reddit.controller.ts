import { Controller, Get, Query, Param } from '@nestjs/common';
import { RedditService } from './reddit.service';

@Controller('reddit')
export class RedditController {
  constructor(private readonly redditService: RedditService) {}

  /**
   * GET /reddit/subreddit/:subreddit
   * Ottiene i post da un subreddit specifico
   */
  @Get('subreddit/:subreddit')
  async getSubredditPosts(
    @Param('subreddit') subreddit: string,
    @Query('sort') sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    @Query('limit') limit: string = '25',
    @Query('after') after?: string,
  ) {
    const limitNum = parseInt(limit, 10);
    return await this.redditService.getSubredditPosts(
      subreddit,
      sort,
      limitNum,
      after,
    );
  }

  /**
   * GET /reddit/search
   * Cerca post su Reddit
   */
  @Get('search')
  async searchPosts(
    @Query('q') query: string,
    @Query('subreddit') subreddit?: string,
    @Query('sort') sort: 'relevance' | 'hot' | 'top' | 'new' | 'comments' = 'relevance',
    @Query('limit') limit: string = '25',
  ) {
    if (!query) {
      return { error: 'Query parameter "q" è richiesto' };
    }

    const limitNum = parseInt(limit, 10);
    return await this.redditService.searchPosts(query, subreddit, sort, limitNum);
  }

  /**
   * GET /reddit/post/:subreddit/:postId
   * Ottiene i dettagli di un post specifico
   */
  @Get('post/:subreddit/:postId')
  async getPost(
    @Param('subreddit') subreddit: string,
    @Param('postId') postId: string,
  ) {
    return await this.redditService.getPost(subreddit, postId);
  }

  /**
   * GET /reddit/user/:username
   * Ottiene informazioni su un utente
   */
  @Get('user/:username')
  async getUserInfo(@Param('username') username: string) {
    return await this.redditService.getUserInfo(username);
  }

  /**
   * GET /reddit/status
   * Verifica lo stato dell'autenticazione
   */
  @Get('status')
  getStatus() {
    return {
      authenticated: this.redditService.isAuthenticated(),
      message: 'Reddit API client status',
    };
  }
}