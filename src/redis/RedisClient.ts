import Redis from 'ioredis';
import { env_variables } from '../env';
import { RedisPrices } from './RedisTypes';

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

  public disconnect() {
    this.redis_client.disconnect();
  }

  public async connect() {
    await this.redis_client.connect();
  }
}