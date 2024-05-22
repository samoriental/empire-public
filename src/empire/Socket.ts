// @ts-expect-error : NO TYPES
import io from 'socket.io-client';
import { SocketAuctionUpdate, SocketInit, SocketNewItem, SocketTradeStatus } from './EmpireTypes';
import { EmpireUser } from './User';
import { setTimeout, clearTimeout } from 'timers';
import { env_variables } from '../helper/env';
import { UserEmpireMetadata } from './UserTypes';

type Callback = (data: any) => void;
type AuctionSubscriptionInformation = {
  cb: Callback;
  timer: NodeJS.Timeout;
};

export const NEW_ITEM = Symbol('new_item');

export class EmpireSocket {
  io: any;
  eventSubscribers: Map<symbol | number, Callback[]> = new Map();
  auctionSubscriptions: Map<number, AuctionSubscriptionInformation> = new Map();
  metadata!: UserEmpireMetadata;

  constructor() {
    this.fetchAndConfigure().catch(error => console.error(error));
  }

  private async fetchAndConfigure(): Promise<void> {
    this.metadata = await EmpireUser.fetchEmpireMetaData();
    this.io = io(`wss://trade.${env_variables.EMPIRE_URL}/trade`, {
      transports: ['websocket'],
      path: '/s/',
      secure: true,
      rejectUnauthorized: false,
      extraHeaders: { 'User-agent': `API Bot` },
    });
    this.io.on('connect', async () => {
      this.io.emit('filters', {
        price_max: 99999999,
      });
      console.log('Connected to the server.');
    });
    this.io.on('init', this.init.bind(this));
    this.io.on('new_item', this.newItem.bind(this));
    this.io.on('auction_update', this.auctionUpdate.bind(this));
    this.io.on('reconnect', async () => {
      this.metadata = await EmpireUser.fetchEmpireMetaData();
    });
  }

  subscribeToEvent(event: symbol | number, cb: Callback) {
    if (!this.eventSubscribers.has(event)) {
      this.eventSubscribers.set(event, []);
    }
    this.eventSubscribers.get(event)!.push(cb);
  }

  unsubscribeFromEvent(event: symbol | number, cb: Callback) {
    const subscribers = this.eventSubscribers.get(event);
    if (subscribers) {
      const index = subscribers.indexOf(cb);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  subscribeToAuction(
    auction_id: number,
    cb: Callback,
    end_at: number = 180 * 1000,
  ) {
    const currentSubscription = this.auctionSubscriptions.get(auction_id);
    if (currentSubscription) {
      clearTimeout(currentSubscription.timer);
    }
    const subscriptionInfo: AuctionSubscriptionInformation = {
      cb,
      timer: setTimeout(() => {
        this.unsubscribeFromAuction(auction_id);
      }, end_at),
    };
    this.auctionSubscriptions.set(auction_id, subscriptionInfo);
  }

  unsubscribeFromAuction(auction_id: number) {
    const subscriptionInfo = this.auctionSubscriptions.get(auction_id);
    if (subscriptionInfo) {
      clearTimeout(subscriptionInfo.timer);
      this.auctionSubscriptions.delete(auction_id);
    }
  }

  emitEvent(event: symbol | number, data: any) {
    const subscribers = this.eventSubscribers.get(event);
    if (subscribers) {
      for (const subscriber of subscribers) {
        subscriber(data);
      }
    }
  }

  init(data: SocketInit) {
    if (data && data.authenticated) {
      console.info(`Successfully authenticated as ${data.name}`);
    } else {
      console.error('Not authenticated yet...');
      this.io.emit('identify', {
        uid: this.metadata.user.id,
        model: this.metadata.user,
        authorizationToken: this.metadata.socket_token,
        signature: this.metadata.socket_signature,
      });
    }
  }

  newItem(data: SocketNewItem[]) {
    data.forEach(item => {
      this.emitEvent(NEW_ITEM, item);
    });
  }

  auctionUpdate(data: SocketAuctionUpdate[]) {
    data.forEach(auction => {
      this.auctionSubscriptions.forEach((subscriptionInfo, auction_id) => {
        if (auction.id === auction_id) {
          subscriptionInfo.cb(auction);
        }
      });
    });
  }

  // tradeStatus(data: SocketTradeStatus[]) {
  //   data.forEach(trade => {
  //     this.
  //   })
  // }
}
