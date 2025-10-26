import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { RedditService } from './reddit.service';

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
  async getCryptoSubreddits(@Query('limit') limit?: string) {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      
      if (limit && (isNaN(parsedLimit) || parsedLimit <= 0)) {
        throw new HttpException('Il parametro limit deve essere un numero positivo', HttpStatus.BAD_REQUEST);
      }

      const result = await this.redditService.getCryptoSubreddits(parsedLimit);
      return result;
    } catch (error) {
      console.error('Errore nel recupero dei subreddit crypto:', error);
      throw new HttpException('Errore interno del server', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
