import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { map } from 'rxjs';
import { Exchange, SodakiExchange } from '../models/exchange';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, 
    private readonly http: HttpService) {}
  
  async getCacheExchange(): Promise<Exchange> {
    return this.cacheManager.get<Exchange>("exchange");
  }

  async setCacheExchange(): Promise<Exchange> {
    const sodaki = await this.getSodakiExchange();

    const listApiKey: string[]        = process.env.API_KEY_COINMARKETCAP.split(",");
    const indexCurrentApiKey: number  = await this.cacheManager.get<number>("index_api_key");

    let indexApiKey = 0;

    if (indexCurrentApiKey !== null) {
      indexApiKey = indexCurrentApiKey + 1;

      if (indexApiKey >= listApiKey.length) {
        indexApiKey = 0;
      }
    }
    
    await this.cacheManager.set<number>("index_api_key", indexApiKey, { ttl: 0 });

    const apiKey: string    = listApiKey[indexApiKey];
    const daiToUsd: number  = await this.convertDaiToUsd(apiKey, sodaki.dbioToDai);

    const exchange: Exchange = new Exchange(sodaki, null);
    exchange.dbioToUsd = daiToUsd;

    await this.cacheManager.set<Exchange>("exchange", exchange);

    return exchange;
  }

  getSodakiExchange(): Promise<SodakiExchange> {
    return new Promise((resolve, reject) => {
      const sodakiReq = this.http.get(
        `${process.env.SODAKI_HOST}/api/pools`
      )
      .pipe(
        map(response => {
          const sodakiExchange: SodakiExchange = new SodakiExchange(null, null, null);

          const exchangeList = response.data;

          for (let index = 0; index < exchangeList.length; index++) {
            if (sodakiExchange.dbioToWNear !== null && sodakiExchange.wNearToDai !== null) {
              break;
            }
            
            const exchange = exchangeList[index];
  
            // check if dbioToWNear is null
            // current data fiatInfo symbol is wNEAR
            // current data assetInfo symbol is DBIO
            if (sodakiExchange.dbioToWNear === null 
              && (exchange.fiatInfo.symbol === "wNEAR" 
              && exchange.assetInfo.symbol === "DBIO")) {
              // pass value from current data price to dbioToWNear
              sodakiExchange.dbioToWNear = parseFloat(exchange.price);
            }
  
            // check if wNearToDai is null
            // current data fiatInfo symbol is DAI
            // current data assetInfo symbol is wNEAR
            if (sodakiExchange.wNearToDai === null 
              && exchange.fiatInfo.symbol === "DAI" 
              && exchange.assetInfo.symbol === "wNEAR") {
              // pass value from current data price to wNearToDai
              sodakiExchange.wNearToDai = parseFloat(exchange.price);
            }
          }

          // get dbio to Dai
          // 1 DBIO = x WNear
          // 1 WNear = x DAI
          // result DBIO to WNear * result WNear to DAI = DBIO to DAI
          sodakiExchange.dbioToDai = sodakiExchange.dbioToWNear * sodakiExchange.wNearToDai;

          return sodakiExchange
        }) 
      );
  
      sodakiReq.subscribe({
        next(data) {
          resolve(data);
        },

        error(err) {
          reject(err);
        }
      });
    });
  }

  convertDaiToUsd(apiKey: string, daiAmount: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const coinMarketCap = this.http.get(
        `${process.env.COINMARKETCAP_HOST}/v1/tools/price-conversion`, 
        { 
          headers: {
            'X-CMC_PRO_API_KEY' : apiKey,
          },
          params: {
            amount: daiAmount,
            symbol: "DAI",
            convert: "USD",
          }
        }
      )
      .pipe(
        map(response => {
          return response.data.data.quote["USD"]["price"];
        })
      );

      coinMarketCap.subscribe({
        next(data) {
          resolve(data);
        },

        error(err) {
          reject(err);
        }
      })
    }); 
  }
}
