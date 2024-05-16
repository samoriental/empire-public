export interface RedisPrices {
  item_name: string;
  liquidity: number;
  price: number;
}

export interface RedisDeposit {
  item_name: string;
  id: number;
  listed_at: number;
  bot_managed: boolean;
}
