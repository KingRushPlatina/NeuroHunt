import { Module } from '@nestjs/common';
import { RedditService } from './reddit.service';
import { SubredditsController } from './subreddits.controller';

@Module({
  providers: [RedditService],
  controllers: [SubredditsController],
  exports: [RedditService],
})
export class RedditModule {}