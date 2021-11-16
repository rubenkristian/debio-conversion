import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { map } from 'rxjs';
import { Exchange, SatokinExchange } from '../models/exchange';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, 
    private readonly http: HttpService) {}
  
  async getCacheExchange() {
    return this.cacheManager.get<Exchange>("exchange");
  }

  async setCacheExchange() {
    const satokin = await this.getSatokinExchange();

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
    const daiToUsd: number  = await this.exchangeDaiToUsd(apiKey, satokin.dbioToDai);

    const exchange: Exchange = new Exchange(satokin, null);
    exchange.dbioToUsd = daiToUsd;

    this.cacheManager.set<Exchange>("exchange", exchange);

    return exchange;
  }

  exchangeDaiToUsd(apiKey: string, daiAmount: number): Promise<number> {
    return new Promise((resolve, reject) => {
      let result: number = null;

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
          result = response.data.data.quote["USD"]["price"];

          return response.data
        })
      );

      coinMarketCap.subscribe({
        next() {
          resolve(result);
        },

        error(err) {
          reject(err);
        }
      })
    }); 
  }

  getSatokinExchange(): Promise<SatokinExchange> {
    return new Promise((resolve, reject) => {
      const satokinExchange: SatokinExchange = new SatokinExchange(null, null, null);
      
      const satokinReq = this.http.get(
        `${process.env.SODAKI_HOST}/api/pools`
      )
      .pipe(
        map(response => {
          for (let i = 0; i < response.data.length; i++) {
            if (satokinExchange.dbioToWNear !== null && satokinExchange.wNearToDai !== null) {
              break;
            }
            
            const item = response.data[i];
  
            // check if dbioToWNear is null
            // current data fiatInfo symbol is wNEAR
            // current data assetInfo symbol is DBIO
            if (satokinExchange.dbioToWNear === null 
              && (item.fiatInfo.symbol === "wNEAR" 
              && item.assetInfo.symbol === "DBIO")) {
              // pass value from current data price to dbioToWNear
              satokinExchange.dbioToWNear = parseFloat(item.price);
            }
  
            // check if wNearToDai is null
            // current data fiatInfo symbol is DAI
            // current data assetInfo symbol is wNEAR
            if (satokinExchange.wNearToDai === null 
              && item.fiatInfo.symbol === "DAI" 
              && item.assetInfo.symbol === "wNEAR") {
              // pass value from current data price to wNearToDai
              satokinExchange.wNearToDai = parseFloat(item.price);
            }
          }

          // get dbio to Dai
          // 1 DBIO = x WNear
          // 1 WNear = y DAI
          // result DBIO to WNear * result WNear to DAI = DBIO to DAI
          satokinExchange.dbioToDai = satokinExchange.dbioToWNear * satokinExchange.wNearToDai;

          return response.data
        }) 
      );
  
      satokinReq.subscribe({
        next() {
          resolve(satokinExchange);
        },

        error(err) {
          reject(err);
        }
      });
    });
  }
}
