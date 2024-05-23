import { EmpireSocket, NEW_ITEM } from '../empire/Socket';
import { RedisClient } from '../redis/RedisClient';
import { EmpireUser } from '../empire/User';
import { RedisDeposit } from '../redis/RedisTypes';
import { APIUserInventory } from '../empire/EmpireTypes';
import { APITransactionStatus, APIUserDeposit } from '../empire/UserTypes';
import { deposit_env_variables } from '../helper/env';

const { OVERPRICE_MAX_PERCENT, UNDERPRICE_MIN_PERCENT, OVERPRICE_HALF_LIFE } =
  deposit_env_variables;

export class DepositManager {
  private empire_ws: EmpireSocket;
  private redis_client: RedisClient;
  private empire_user: EmpireUser;

  constructor(
    empire_ws: EmpireSocket,
    redis_client: RedisClient,
    empire_user: EmpireUser,
    item_update_interval: number = 10 * 60 * 1000,
  ) {
    this.empire_ws = empire_ws;
    this.redis_client = redis_client;
    this.empire_user = empire_user;

    this.updateRedis().catch(err => {
      console.error('Error updating Redis on startup:', err);
    });
    setInterval(
      () =>
        this.updateRedis().catch(err => {
          console.error('Error updating Redis on interval:', err);
        }),
      item_update_interval,
    );
  }

  async updateRedis(): Promise<void> {
    const items = await this.empire_user.getInventory();
    const available_items = items.filter(item => !item.invalid);
    const deposited_items = items.filter(
      item => item.invalid === 'This item is currently in an active deposit.',
    );

    const redis_deposits: RedisDeposit[] =
      await this.getRedisDeposits(deposited_items);
    this.addAvailableItems(redis_deposits, available_items);

    await this.redis_client.setDeposits(redis_deposits);
    await this.updatePricesFromRedis();
  }

  private async getRedisDeposits(
    deposited_items: APIUserInventory[],
  ): Promise<RedisDeposit[]> {
    const deposited_item_ids = deposited_items.map(({ id }) => id);
    const redis_deposit_info =
      await this.redis_client.getDeposits(deposited_item_ids);

    return deposited_items.map(item => {
      const deposit = redis_deposit_info.get(item.item_id);
      return (
        deposit ?? {
          item_name: item.market_name,
          id: item.id,
          listed_at: Math.floor(Date.now() / 1000),
          bot_managed: false,
        }
      );
    });
  }

  private addAvailableItems(
    redis_deposits: RedisDeposit[],
    available_items: APIUserInventory[],
  ): void {
    available_items.forEach(item => {
      redis_deposits.push({
        item_name: item.market_name,
        id: item.id,
        listed_at: Math.floor(Date.now() / 1000),
        bot_managed: true,
      });
    });
  }

  async updatePricesFromRedis(): Promise<void> {
    const redis_deposits = await this.redis_client.getAllDeposits();
    const validDeposits = Array.from(redis_deposits.entries()).filter(
      ([, value]) => value?.bot_managed,
    );

    const item_ids = validDeposits.map(([key]) => key);
    const deposits = await this.empire_user.getTrades();
    const matched_ids = this.mapDepositIDs(deposits, item_ids);
    const deposit_ids = Object.values(matched_ids).map(deposit => deposit.id);
    if (deposit_ids.length > 0) {
      await this.empire_user.cancelDeposits(deposit_ids);
    }

    const item_names_set = new Set(
      validDeposits.map(([, value]) => value!.item_name),
    );
    const item_prices = await this.redis_client.getPrices(item_names_set);

    const deposit_map = new Map();
    validDeposits.forEach(([key, deposit]) => {
      if (deposit) {
        const item_price = item_prices.get(deposit.item_name);
        if (item_price) {
          deposit_map.set(
            key,
            this.calculateItemPrice(item_price.price, deposit.listed_at),
          );
        }
      }
    });

    if (deposit_map.size > 0) {
      await this.empire_user.depositItems(deposit_map);
    }
  }

  private mapDepositIDs(
    deposits: APIUserDeposit[],
    item_ids: number[],
  ): Record<number, APIUserDeposit> {
    return deposits.reduce((map: Record<number, APIUserDeposit>, deposit) => {
      if (
        item_ids.includes(deposit.item_id) &&
        deposit.status === APITransactionStatus.Processing
      ) {
        map[deposit.item_id] = deposit;
      }
      return map;
    }, {});
  }

  public calculateItemPrice(item_price: number, listed_at: number): number {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeElapsed = currentTime - listed_at;
    const halfLifeInSeconds = OVERPRICE_HALF_LIFE * 60;
    const decayFactor = Math.pow(0.5, timeElapsed / halfLifeInSeconds);
    const priceFactor =
      OVERPRICE_MAX_PERCENT -
      (OVERPRICE_MAX_PERCENT - UNDERPRICE_MIN_PERCENT) * (1 - decayFactor);
    return Math.round(item_price * (1 + priceFactor));
  }
}
