import { Controller, Get, Query } from '@nestjs/common';
import { CacheService } from './cache.service';

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  async getCache(@Query('from') from: string, @Query('to') to: string) {

    if(from && to){
      let cacheExchange = await this.cacheService.getCacheExchangeFromTo(
        from,
        to,
      );
  
      if (cacheExchange) {
        return cacheExchange;
      }
  
      cacheExchange = await this.cacheService.setCacheExchangeFromTo(from, to);
  
      return cacheExchange;
    } else {
      let cacheExchange = await this.cacheService.getCacheExchange();

      if (cacheExchange) {
        return cacheExchange;
      }
  
      cacheExchange = await this.cacheService.setCacheExchange();
  
      return cacheExchange;
    }
  }
}
