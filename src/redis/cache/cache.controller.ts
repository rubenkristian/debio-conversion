import { Controller } from '@nestjs/common';
import { MessagePattern, Ctx, RedisContext } from '@nestjs/microservices';
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
}
