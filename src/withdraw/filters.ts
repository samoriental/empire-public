import * as fs from 'fs';
import { filter_env_variables } from '../env';

interface WithdrawFilters {
  min_price: number;
  max_price: number;
  filter_commodity: boolean;
  min_pricempire_liquidity_score: number;
  filter_stat_track: boolean;
  custom_blacklist: Set<string>;
  profit_margin: number;
}

const checkWithdrawFilters = (): WithdrawFilters => {
  let blacklist = new Set<string>();
  try {
    const data = fs.readFileSync('item_blacklists.txt', 'utf-8');
    blacklist = new Set(data.split('\n'));
  } catch (error) {}
  console.info(`Withdraw blacklist has ${blacklist.size} items.`);
  return {
    min_price: filter_env_variables.FILTER_MIN_PRICE,
    max_price: filter_env_variables.FILTER_MAX_PRICE,
    filter_commodity: filter_env_variables.FILTER_COMMODITY,
    min_pricempire_liquidity_score:
      filter_env_variables.FILTER_MIN_PRICEMPIRE_LIQUIDITY_SCORE,
    filter_stat_track: filter_env_variables.FILTER_STAT_TRACK,
    custom_blacklist: blacklist,
    profit_margin: filter_env_variables.PROFIT_MARGIN,
  };
};

export const withdraw_filters = checkWithdrawFilters();
