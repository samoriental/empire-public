import { PricingOracle } from './pricing/Pricing';
import { EmpireSocket } from './empire/Socket';
import { RedisClient } from './redis/RedisClient';
import { WithdrawManager } from './withdraw/WithdrawManager';
import { EmpireUser } from './empire/User';

const pricing_oracle = new PricingOracle();
const redis_client = new RedisClient();
const empire_socket = new EmpireSocket();
const user = new EmpireUser(empire_socket);

const withdraw_manager = new WithdrawManager(empire_socket, redis_client, user);
// empire_socket.subscribeToAuction(42, console.log);
// empire_socket.subscribeToAuction(42, console.log, 15 * 1000);
// empire_socket.subscribeToEvent(Symbol.for("newItems"), (data) => console.log('Received a new item:', data));

// const user = new EmpireUser()
// user.purchaseItem("237745082", 26).then((resp: unknown) => {console.log(resp)})
