import { Controller, Get, Query } from '@nestjs/common';
import { CacheService } from './cache.service';

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  async getCache(
    @Query("apiKey") apiKey: string
  ) {
    let cacheExchange = await this.cacheService.getCacheExchange();

    if (cacheExchange) {
      return 
    }

    cacheExchange = await this.cacheService.setCacheExchange(apiKey);

    return cacheExchange;
  }
}
