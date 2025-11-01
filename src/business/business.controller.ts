import { Controller, Get, Post, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { BusinessService } from './business.service.js';
import type { BusinessAnalysisParams, AnalysisSearchFilters } from '../../lib/business/business.interfaces';

/**
 * Controller NestJS per le API del business layer
 */
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  /**
   * POST /business/analyze
   * Avvia il processo di analisi business
   */
  @Post('analyze')
  async startAnalysis(@Body() params: BusinessAnalysisParams) {
    try {
      console.log('🚀 Starting business analysis via API with params:', params);
      
      const result = await this.businessService.runBusinessAnalysis(params);
      
      return {
        success: true,
        message: 'Business analysis completed successfully',
        data: {
          totalSubredditsProcessed: result.totalSubredditsProcessed,
          totalConversationsAnalyzed: result.totalConversationsAnalyzed,
          totalConversationsSkipped: result.totalConversationsSkipped,
          errorsCount: result.errors.length,
          duration: result.duration,
          processedAt: result.processedAt,
          analyses: result.analyses.map(analysis => ({
            conversationId: analysis.conversationId,
            subreddit: analysis.subreddit,
            postTitle: analysis.postTitle,
            ideaLevel: analysis.analysis.idealevel,
            possibleReturn: analysis.analysis.possiblereturn,
            problem: analysis.analysis.problem,
            solution: analysis.analysis.solution,
            processedAt: analysis.processedAt
          }))
        },
        errors: result.errors
      };
    } catch (error) {
      console.error('❌ Error in business analysis:', error);
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to complete business analysis',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /business/status
   * Ottiene lo stato corrente del processo di analisi
   */
  @Get('status')
  async getAnalysisStatus() {
    try {
      const status = this.businessService.getAnalysisStatus();
      
      return {
        success: true,
        data: status
      };
    } catch (error) {
      console.error('❌ Error getting analysis status:', error);
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get analysis status',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /business/analyses
   * Cerca e filtra le analisi salvate
   */
  @Get('analyses')
  async searchAnalyses(
    @Query('subreddit') subreddit?: string,
    @Query('minIdeaLevel') minIdeaLevel?: string,
    @Query('maxIdeaLevel') maxIdeaLevel?: string,
    @Query('keywords') keywords?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('hasReturn') hasReturn?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'idealevel' | 'subreddit',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    try {
      const filters: AnalysisSearchFilters = {
        subreddit,
        minIdeaLevel: minIdeaLevel ? parseInt(minIdeaLevel) : undefined,
        maxIdeaLevel: maxIdeaLevel ? parseInt(maxIdeaLevel) : undefined,
        keywords: keywords ? keywords.split(',') : undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        hasReturn: hasReturn ? hasReturn === 'true' : undefined,
        limit: limit ? parseInt(limit) : 50,
        skip: skip ? parseInt(skip) : 0,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      };
      
      const analyses = await this.businessService.searchAnalyses(filters);
      
      return {
        success: true,
        data: {
          analyses: analyses.map(analysis => ({
            id: analysis._id,
            conversationId: analysis.conversationId,
            subreddit: analysis.subreddit,
            postTitle: analysis.postTitle,
            postAuthor: analysis.postAuthor,
            postScore: analysis.postScore,
            postUrl: analysis.postUrl,
            commentsCount: analysis.commentsCount,
            analysis: analysis.analysis,
            keywords: analysis.keywords,
            processedAt: analysis.processedAt,
            createdAt: analysis.createdAt
          })),
          count: analyses.length,
          filters: filters
        }
      };
    } catch (error) {
      console.error('❌ Error searching analyses:', error);
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to search analyses',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /business/stats
   * Ottiene statistiche delle analisi
   */
  @Get('stats')
  async getAnalysisStats() {
    try {
      const stats = await this.businessService.getAnalysisStats();
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('❌ Error getting analysis stats:', error);
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get analysis stats',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /business/test
   * Endpoint di test per verificare la configurazione
   */
  @Post('test')
  async testConfiguration() {
    try {
      // Test di base per verificare che tutti i servizi siano configurati correttamente
      const status = this.businessService.getAnalysisStatus();
      
      return {
        success: true,
        message: 'Business service is configured correctly',
        data: {
          isRunning: status.isRunning,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Error testing configuration:', error);
      
      throw new HttpException(
        {
          success: false,
          message: 'Business service configuration error',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}