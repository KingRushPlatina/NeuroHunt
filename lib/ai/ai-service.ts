import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationAnalysis } from './ai.interfaces';
import { GeminiClient } from './gemini-client';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private geminiClient: GeminiClient;

  constructor(private configService: ConfigService) {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.geminiClient = new GeminiClient(geminiApiKey);
    this.logger.log('AI Service initialized with Gemini');
  }

  
  async analyzeConversation(
    postTitle: string,
    comments: string[]
  ): Promise<ConversationAnalysis> {
    try {
      const analysis = await this.geminiClient.analyzeRedditConversation(postTitle, comments);
      this.logger.debug('Conversation analyzed successfully');
      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing conversation:', error.message);
      throw error;
    }
  }
}