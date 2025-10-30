import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  uri: string;
  user: string;
  password: string;
  name: string;
}

export const getDatabaseConfig = (configService: ConfigService): DatabaseConfig => {
  const uri = configService.get<string>('MONGODB_URI');
  const user = configService.get<string>('DB_USER');
  const password = configService.get<string>('DB_PASSWORD');
  const name = configService.get<string>('DB_NAME');

  if (!uri || !user || !password || !name) {
    throw new Error('Missing required database configuration');
  }

  return { uri, user, password, name };
};