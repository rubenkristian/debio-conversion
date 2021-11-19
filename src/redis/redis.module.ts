import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';
import { CacheController } from './cache/cache.controller';
import { CacheService } from './cache/cache.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: redisStore,
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        ttl: process.env.CACHE_TTL
      })
    }),
    HttpModule
  ],
  providers: [CacheService],
  controllers: [CacheController]
})
export class RedisModule {}
