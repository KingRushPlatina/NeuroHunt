import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';
import { getDatabaseConfig } from './config';

@Injectable()
export class DatabaseClient implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private database: Db;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const config = getDatabaseConfig(this.configService);
    this.client = new MongoClient(config.uri);
    await this.client.connect();
    this.database = this.client.db(config.name);
    console.log('Connected to MongoDB');
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  getDatabase(): Db {
    return this.database;
  }

  getCollection(name: string) {
    return this.database.collection(name);
  }
}