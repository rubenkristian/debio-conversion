import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Exchange, DbioToUsdExchange } from '../models/exchange';
import { CacheService } from './cache.service';

@Controller()
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @MessagePattern({ cmd: 'cache-exchange' })
  async getCache() {
    let cacheExchange = await this.cacheService.getCacheExchange();

    if (cacheExchange) {
      return cacheExchange;
    }

    cacheExchange = await this.cacheService.setCacheExchange();

    return cacheExchange;
  }

  @MessagePattern({ cmd: 'cache-exchange-dai-to-usd' })
  async getExchangeDaiToUsd(data: number) {
    let cacheExchange: Exchange = await this.cacheService.getCacheExchange();

    if (cacheExchange) {
      const exchange = new DbioToUsdExchange(data, cacheExchange.dbioToUsd * data);
      return exchange;
    }

    cacheExchange = await this.cacheService.setCacheExchange();
    const exchange = new DbioToUsdExchange(data, cacheExchange.dbioToUsd * data);

    return exchange;
  }
}
