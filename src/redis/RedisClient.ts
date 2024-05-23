import Redis from 'ioredis';
import { env_variables } from '../helper/env';
import { RedisDeposit, RedisPrices } from './RedisTypes';

export class RedisClient {
  redis_client: Redis;

  constructor() {
    this.redis_client = new Redis(env_variables.REDIS_URL, {
      retryStrategy: times => {
        return Math.min(times * 100, 3000);
      },
      reconnectOnError: err => {
        const targetErrors = [/READONLY/, /ETIMEDOUT/];
        return targetErrors.some(pattern => pattern.test(err.message));
      },
      enableReadyCheck: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    });

    this.redis_client.on('connect', () => console.log('Connected to Redis.'));
    this.redis_client.on('reconnecting', () =>
      console.log('Reconnecting to Redis...'),
    );
    this.redis_client.on('error', error =>
      console.error('Redis client error:', error),
    );
  }

  public async setPrices(prices: RedisPrices[]) {
    try {
      const pipeline = this.redis_client.pipeline();
      pipeline.del(`empire:prices`);
      prices.forEach(price => {
        pipeline.hmset(`empire:prices:${price.item_name}`, price);
      });
      await pipeline.exec();
    } catch (err) {
      console.error('Error setting prices in Redis:', err);
    }
  }

  public async getPrice(item_name: string): Promise<RedisPrices | undefined> {
    const item_price = await this.redis_client.hgetall(
      `empire:prices:${item_name}`,
    );
    if (Object.keys(item_price).length > 0) {
      return item_price as unknown as RedisPrices; //type safety who?
    }
    return undefined;
  }

  public async getPrices(
    item_names: Set<string>,
  ): Promise<Map<string, RedisPrices | undefined>> {
    const pricesPromises = Array.from(item_names).map(async name => [
      name,
      await this.getPrice(name),
    ]);
    const pricesArr = await Promise.all(pricesPromises);
    return new Map(pricesArr as [string, RedisPrices | undefined][]);
  }

  public async setDeposits(deposits: RedisDeposit[]) {
    try {
      const pipeline = this.redis_client.pipeline();
      pipeline.del(`empire:deposits`);
      pipeline.del(`empire:deposits:index`);
      deposits.forEach(deposit => {
        if (deposit.id) {
          pipeline.hmset(`empire:deposits:${deposit.id}`, deposit);
          pipeline.sadd(
            'empire:deposits:index',
            `empire:deposits:${deposit.id.toString()}`,
          );
        } else {
          console.error('Deposit with invalid or no ID:', deposit);
        }
      });
      await pipeline.exec();
    } catch (err) {
      console.error('Error setting deposits in Redis:', err);
    }
  }

  public async getDeposits(
    deposit_ids: number[],
  ): Promise<Map<number, RedisDeposit | null>> {
    try {
      const result = new Map<number, RedisDeposit | null>();
      for (const id of deposit_ids) {
        const deposit = (await this.redis_client.hgetall(
          `empire:prices:${id}`,
        )) as unknown as RedisDeposit | null; // looks good to me :pepebusiness:
        result.set(id, deposit);
      }
      return result;
    } catch (err) {
      console.error('Error getting deposits from Redis:', err);
      throw err;
    }
  }

  public async getAllDeposits(): Promise<Map<number, RedisDeposit | null>> {
    try {
      const result = new Map<number, RedisDeposit | null>();
      const keys = await this.redis_client.smembers('empire:deposits:index');
      if (keys.length === 0) {
        console.warn('No keys found in index: empire:deposits:index');
        return result;
      }
      const pipeline = this.redis_client.pipeline();
      keys.forEach(key => {
        pipeline.hgetall(key);
      });
      const responses = await pipeline.exec();
      // @ts-expect-error | yodeling at me blud
      responses.forEach(([err, deposit], index) => {
        if (err) {
          console.error(`Error fetching deposit for key ${keys[index]}:`, err);
          result.set(
            parseInt(keys[index].replace('empire:deposits:', '')),
            null,
          );
        } else {
          result.set(
            parseInt(keys[index].replace('empire:deposits:', '')),
            deposit as unknown as RedisDeposit | null,
          );
        }
      });
      return result;
    } catch (err) {
      console.error('Error getting all deposits from Redis:', err);
      throw err;
    }
  }

  public disconnect() {
    this.redis_client.disconnect();
  }

  public async connect() {
    await this.redis_client.connect();
  }
}
