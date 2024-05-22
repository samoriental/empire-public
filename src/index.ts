import { PricingOracle } from './pricing/Pricing';
import { EmpireSocket } from './empire/Socket';
import { RedisClient } from './redis/RedisClient';
import { WithdrawManager } from './withdraw/WithdrawManager';
import { EmpireUser } from './empire/User';
import { DepositManager } from './deposit/DepositManager';
// import {TradeHandler} from './steam/TradeHandler';

const redis_client = new RedisClient();
const empire_socket = new EmpireSocket();
const user = new EmpireUser(empire_socket);
const pricing = new PricingOracle(5 * 60 * 1000, [
  'buff_avg7',
  'csgoempire_avg7',
  'csgoempire_lastsale',
  'buff',
]);
const deposit_client = new DepositManager(empire_socket, redis_client, user);
