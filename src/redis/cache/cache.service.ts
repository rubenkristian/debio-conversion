import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { map } from 'rxjs';
import { Exchange, SatokinExchange } from '../models/exchange';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache, 
    private readonly http: HttpService) {}
  
  async getCacheExchange() {
    return this.cacheManager.get<Exchange>("exchange");
  }

  async setCacheExchange() {
    let apiKey = "";

    const satokin = await this.getSatokinExchange();
    
    const exchange = new Exchange(satokin, null);

    if (process.env.NODE_ENV === "development") {
      apiKey = process.env.API_KEY_DEVELOPMENT;
    } else {
      const listApiKey = process.env.API_KEY_COINMARKETCAP.split(",");
      
      const indexCurrentApiKey: number = await this.cacheManager.get("index_api_key");

      if (indexCurrentApiKey) {
        let indexApiKey = indexCurrentApiKey + 1;
        if (indexApiKey >= listApiKey.length) {
          indexApiKey = 0;
        }
        await this.cacheManager.set("index_api_key", indexApiKey);
        apiKey = listApiKey[indexCurrentApiKey];
      } else {
        const firstIndex = 0;
        await this.cacheManager.set("index_api_key", firstIndex);
        apiKey = listApiKey[firstIndex];
      }
    }

    const daiToUsd = await this.exchangeDaiToUsd(apiKey, 0);

    exchange.dbioToUsd = daiToUsd;

    this.cacheManager.set<Exchange>("exchange", exchange);

    return exchange;
  }

  // TODO: testing
  exchangeDaiToUsd(apiKey: string, daiAmount: number): Promise<number> {
    // TODO: get exchange from DAI to USD
    return new Promise((resolve, reject) => {
      let result: number = null;

      const coinMarketCap = this.http.get(
        "https://pro-api.coinmarketcap.com", 
        { 
          headers: {
            "X-CMC_PRO_API_KEY" : apiKey,
          },
          params: {
            "amount": daiAmount,
            "symbol": "DAI",
            "convert": "USD",
          }
        }
      )
      .pipe(
        map(response => {
          return response.data
        })
      );

      coinMarketCap.subscribe({
        next(data) {
          // TODO: get exchange from DAI To USD
          console.log(data);
          resolve(data.quote["USD"]["price"]);
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
  
      const satokinReq = this.http.get("https://www.sodaki.com/api/pools").pipe(
        map(response => {
          return response.data
        }) 
      );
  
      satokinReq.subscribe({
        next(list) {
          for (let i = 0; i < list.length; i++) {
            if (satokinExchange.dbioToWNear !== null && satokinExchange.wNearToDai !== null) break;
            
            const item = list[i];
  
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

          resolve(satokinExchange);
        },

        error(err) {
          reject(err);
        }
      });
    });
  }
}
