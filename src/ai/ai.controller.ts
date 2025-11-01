import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AIService } from '../../lib/ai/ai-service';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  /**
   * Analizza una conversazione Reddit usando il prompt system personalizzato
   */
  @Post('analyze')
  async analyzeConversation(
    @Body() body: {
      mainPost: string;
      comments: string[];
    }
  ) {
    try {
      if (!body.mainPost || !Array.isArray(body.comments)) {
        throw new HttpException(
          'mainPost and comments array are required',
          HttpStatus.BAD_REQUEST
        );
      }

      const analysis = await this.aiService.analyzeConversation(
        body.mainPost,
        body.comments
      );

      return {
        success: true,
        analysis
      };
    } catch (error) {
      throw new HttpException(
        `Analysis failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}