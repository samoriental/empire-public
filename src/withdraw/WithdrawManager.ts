import { EmpireSocket, NEW_ITEM } from '../empire/Socket';
import { withdraw_filters } from './filters';
import { RedisClient } from '../redis/RedisClient';
import { SocketNewItem } from '../empire/EmpireTypes';
import { env_variables } from '../helper/env';
import { EmpireUser } from '../empire/User';

export class WithdrawManager {
  empire_ws: EmpireSocket;
  redis_client: RedisClient;
  empire_user: EmpireUser;
  constructor(
    empire_ws: EmpireSocket,
    redis_client: RedisClient,
    empire_user: EmpireUser,
  ) {
    this.empire_ws = empire_ws;
    this.redis_client = redis_client;
    this.empire_user = empire_user;
    this.empire_ws.subscribeToEvent(NEW_ITEM, this.newItem.bind(this));
  }

  async validateAgainstFilters(
    item: SocketNewItem,
  ): Promise<[boolean, number]> {
    const item_data = await this.redis_client.getPrices(item.market_name);
    const conditionChecks = [
      {
        condition: () =>
          withdraw_filters.filter_stat_track &&
          item.market_name.includes('StatTrak'),
        message: 'Failed stat track filter',
      },
      {
        condition: () =>
          withdraw_filters.custom_blacklist.has(item.market_name),
        message: 'Failed custom blacklist filter',
      },
      {
        condition: () =>
          !(
            item.purchase_price > withdraw_filters.min_price * 100 &&
            item.purchase_price < withdraw_filters.max_price * 100
          ),
        message: 'Failed price range filter',
      },
      {
        condition: () => withdraw_filters.filter_commodity && item.is_commodity,
        message: 'Failed commodity filter',
      },
      {
        condition: () => {
          if (
            env_variables.PRICEMPIRE_STATUS ||
            env_variables.CUSTOM_ORACLE_STATUS
          ) {
            if (item_data) {
              return (
                withdraw_filters.min_pricempire_liquidity_score >
                item_data.liquidity
              );
            }
            console.warn(
              `Pricing data doesnt exist for ${item.market_name} in oracle.`,
            ); // Maybe can use alternative method like empire default pricing if stable.
            return true;
          } else {
            return false;
          }
        },
        message: 'Failed price empire liquidity filter',
      },
      {
        condition: () => {
          if (
            env_variables.PRICEMPIRE_STATUS ||
            env_variables.CUSTOM_ORACLE_STATUS
          ) {
            if (item_data) {
              return (
                item.purchase_price >
                (1 - withdraw_filters.profit_margin) * item_data?.price
              );
            }
          }
          return false;
        },
        message: 'Failed profit margin',
      },
    ];
    for (const check of conditionChecks) {
      if (check.condition()) {
        return [false, 0];
      }
    }
    if (item_data) {
      return [true, (1 - withdraw_filters.profit_margin) * item_data?.price];
    }
    return [false, 0];
  }

  async newItem(new_item: SocketNewItem) {
    const [is_valid, max_price] = await this.validateAgainstFilters(new_item);
    if (is_valid) {
      if (new_item.auction_ends_at) {
        console.info(
          `Bidding ${new_item.market_name} for max ${(max_price / 100)}c`,
        );
        await this.empire_user.bidToLimit(new_item, max_price);
      } else {
        console.info(
          `Purchasing ${new_item.market_name} for $${(new_item.purchase_price / 100) * 0.614}`,
        );
        await this.empire_user.purchaseItem(
          new_item.id,
          Math.round(new_item.purchase_price),
        );
      }
    }
  }
}
