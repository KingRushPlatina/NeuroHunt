import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from '../../lib/ai/ai-service';
import { AIController } from './ai.controller';

@Module({
  imports: [ConfigModule],
  providers: [AIService],
  controllers: [AIController],
  exports: [AIService], // Export for use in other modules
})
export class AIModule {}