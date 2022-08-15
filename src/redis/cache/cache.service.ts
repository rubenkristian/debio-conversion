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
    private readonly http: HttpService,
  ) {}

  async getCacheExchange() {
    return this.cacheManager.get<Exchange>('exchange');
  }

  async getCacheExchangeFromTo(from: string, to: string) {
    return this.cacheManager.get(`exchange${from}To${to}`);
  }

  async setCacheExchangeFromTo(from: string, to: string) {
    const listApiKey: string[] = process.env.API_KEY_COINMARKETCAP.split(',');
    const indexCurrentApiKey: number = await this.cacheManager.get<number>(
      'index_api_key',
    );

    let indexApiKey = 0;

    if (indexCurrentApiKey !== null) {
      indexApiKey = indexCurrentApiKey + 1;

      if (indexApiKey >= listApiKey.length) {
        indexApiKey = 0;
      }
    }

    await this.cacheManager.set<number>('index_api_key', indexApiKey, {
      ttl: 0,
    });

    const apiKey: string = listApiKey[indexApiKey];
    const convertBalanceFromTo = await this.convertBalanceFromTo(
      apiKey,
      1,
      from,
      to,
    );

    await this.cacheManager.set(`exchange${from}To${to}`, convertBalanceFromTo);

    return convertBalanceFromTo;
  }

  async setCacheExchange() {
    const sodaki = await this.getSodakiExchange();

    const listApiKey: string[] = process.env.API_KEY_COINMARKETCAP.split(',');
    const indexCurrentApiKey: number = await this.cacheManager.get<number>(
      'index_api_key',
    );

    let indexApiKey = 0;

    if (indexCurrentApiKey !== null) {
      indexApiKey = indexCurrentApiKey + 1;

      if (indexApiKey >= listApiKey.length) {
        indexApiKey = 0;
      }
    }

    await this.cacheManager.set<number>('index_api_key', indexApiKey, {
      ttl: 0,
    });

    const apiKey: string = listApiKey[indexApiKey];
    const daiToUsd: number = await this.convertDaiToUsd(apiKey, 1);
    const dbioToUsd: number = sodaki.dbioToDai * daiToUsd;

    const exchange: Exchange = new Exchange(sodaki, daiToUsd, dbioToUsd);

    await this.cacheManager.set<Exchange>('exchange', exchange);

    return exchange;
  }

  getSodakiExchange(): Promise<SodakiExchange> {
    return new Promise((resolve, reject) => {
      const sodakiReq = this.http.get(process.env.SODAKI_HOST).pipe(
        map((response) => {
          const sodakiExchange: SodakiExchange = new SodakiExchange(
            null,
            null,
            null,
          );
          for (let i = 0; i < response.data.length; i++) {
            if (
              sodakiExchange.dbioToWNear !== null &&
              sodakiExchange.wNearToDai !== null
            ) {
              break;
            }

            const item = response.data[i];

            // check if dbioToWNear is null
            // current data fiatInfo symbol is wNEAR
            // current data assetInfo symbol is DBIO
            if (
              sodakiExchange.dbioToWNear === null &&
              item.fiatInfo.symbol === 'wNEAR' &&
              item.assetInfo.symbol === 'DBIO'
            ) {
              // pass value from current data price to dbioToWNear
              sodakiExchange.dbioToWNear = parseFloat(item.price);
            }

            // check if wNearToDai is null
            // current data fiatInfo symbol is DAI
            // current data assetInfo symbol is wNEAR
            if (
              sodakiExchange.wNearToDai === null &&
              item.fiatInfo.symbol === 'DAI' &&
              item.assetInfo.symbol === 'wNEAR'
            ) {
              // pass value from current data price to wNearToDai
              sodakiExchange.wNearToDai = parseFloat(item.price);
            }
          }

          // get dbio to Dai
          // 1 DBIO = x WNear
          // 1 WNear = x DAI
          // result DBIO to WNear * result WNear to DAI = DBIO to DAI
          sodakiExchange.dbioToDai =
            sodakiExchange.dbioToWNear * sodakiExchange.wNearToDai;

          return sodakiExchange;
        }),
      );

      sodakiReq.subscribe({
        next(data) {
          resolve(data);
        },

        error(err) {
          reject(err);
        },
      });
    });
  }

  convertDaiToUsd(apiKey: string, daiAmount: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const coinMarketCap = this.http
        .get(`${process.env.COINMARKETCAP_HOST}/tools/price-conversion`, {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
          },
          params: {
            amount: daiAmount,
            symbol: 'DAI',
            convert: 'USD',
          },
        })
        .pipe(
          map((response) => {
            return response.data.data[0].quote['USD']['price'];
          }),
        );

      coinMarketCap.subscribe({
        next(data) {
          resolve(data);
        },

        error(err) {
          reject(err);
        },
      });
    });
  }
  convertBalanceFromTo(
    apiKey: string,
    balanceAmount: number,
    from: string,
    to: string,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const coinMarketCap = this.http
        .get(`${process.env.COINMARKETCAP_HOST}/tools/price-conversion`, {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
          },
          params: {
            amount: balanceAmount,
            symbol: from.toUpperCase(),
            convert: to.toUpperCase(),
          },
        })
        .pipe(
          map((response) => {
            return response.data.data[0].quote[to.toUpperCase()]['price'];
          }),
        );

      coinMarketCap.subscribe({
        next(data) {
          resolve(data);
        },

        error(err) {
          reject(err);
        },
      });
    });
  }
}
