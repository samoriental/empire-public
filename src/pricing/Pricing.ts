import { RedisClient } from '../redis/RedisClient';
import { env_variables } from '../helper/env';
import axios from 'axios';
import { RedisPrices } from '../redis/RedisTypes';

export class PricingOracle {
  redis_client: RedisClient;
  oracle_update_interval: number;
  pricempire_providers: string[];

  constructor(
    oracle_update_interval: number = 5 * 60 * 1000,
    pricempire_providers: string[] = ['buff_avg7', 'csgoempire_avg7'],
  ) {
    this.redis_client = new RedisClient();
    this.oracle_update_interval = oracle_update_interval;
    this.pricempire_providers = pricempire_providers;

    this.initPriceUpdating();
  }
  public async initPriceUpdating() {
    await this.updatePrices();
    setInterval(() => this.updatePrices(), this.oracle_update_interval);
  }

  public async updatePrices() {
    console.info('Updating prices');
    if (env_variables.CUSTOM_ORACLE_STATUS) {
      const response = await axios.get(env_variables.CUSTOM_ORACLE_API);
      const prices: RedisPrices[] = response.data;
      await this.redis_client.setPrices(prices);
    }
    if (env_variables.PRICEMPIRE_STATUS) {
      const pricempirePrices = await this.getPricempirePricesV3();
      await this.redis_client.setPrices(pricempirePrices);
    }
  }

  public async getPricempirePricesV2(): Promise<RedisPrices[]> {
    const redis_prices: RedisPrices[] = [];
    const response = await axios.get(
      'https://api.pricempire.com/v2/items/prices',
      {
        params: {
          api_key: env_variables.PRICEMPIRE_API_KEY,
          appId: 730,
          sources: this.pricempire_providers,
        },
        timeout: 300 * 1000,
      },
    );
    Object.keys(response.data).forEach(itemName => {
      const data = response.data[itemName];
      const liquidity = data.liquidity;
      delete data.liquidity;
      const marketPrices: number[] = Object.values(data);
      const sum = marketPrices.reduce((a: number, b: number) => a + b, 0);
      const averagePrice = sum / marketPrices.length / 0.6142808; // price in coins

      const redisPrice: RedisPrices = {
        item_name: itemName,
        liquidity: liquidity,
        price: Math.round(averagePrice),
      };
      redis_prices.push(redisPrice);
    });
    return redis_prices;
  }

  public async getPricempirePricesV3(): Promise<RedisPrices[]> {
    const redis_prices: RedisPrices[] = [];
    const url = `https://api.pricempire.com/v3/items/prices?api_key=${env_variables.PRICEMPIRE_API_KEY}&appId=730&currency=USD&${this.pricempire_providers.map(provider => `sources=${provider}`).join('&')}`;
    const response = await axios.get(url, {
      timeout: 300 * 1000,
    });
    Object.keys(response.data).forEach(itemName => {
      const data = response.data[itemName];
      const liquidity = data.liquidity;
      delete data.liquidity;
      const marketPrices: number[] = [];
      Object.values(data).forEach(priceInfo => {
        if (
          typeof priceInfo === 'object' &&
          priceInfo !== null &&
          'price' in priceInfo
        ) {
          // @ts-expect-error | Typing thinks it may be undefined
          marketPrices.push(priceInfo.price);
        }
      });
      const sum = marketPrices.reduce((a: number, b: number) => a + b, 0);
      const averagePrice = sum / marketPrices.length / 0.6142808; // price in coins

      const redisPrice: RedisPrices = {
        item_name: itemName,
        liquidity: liquidity,
        price: Math.round(averagePrice),
      };
      redis_prices.push(redisPrice);
    });

    return redis_prices;
  }
}
