import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseClient } from '../../lib/database/client';

@Module({
  imports: [ConfigModule],
  providers: [DatabaseClient],
  exports: [DatabaseClient],
})
export class DatabaseModule {}