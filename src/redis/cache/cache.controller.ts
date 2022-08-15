import { Controller, Get, Query } from '@nestjs/common';
import { CacheService } from './cache.service';

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  async getCache() {
    let cacheExchange = await this.cacheService.getCacheExchange();

    if (cacheExchange) {
      return cacheExchange;
    }

    cacheExchange = await this.cacheService.setCacheExchange();

    return cacheExchange;
  }

  @Get('fromTo')
  async getCacheFromTo(@Query('from') from: string, @Query('to') to: string) {
    let cacheExchange = await this.cacheService.getCacheExchangeFromTo(
      from,
      to,
    );

    if (cacheExchange) {
      return cacheExchange;
    }

    cacheExchange = await this.cacheService.setCacheExchangeFromTo(from, to);

    return cacheExchange;
  }
}
