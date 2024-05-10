import {meta} from "@typescript-eslint/eslint-plugin";

// process.env.DEBUG="*"
// @ts-expect-error : NO TYPES
import io from 'socket.io-client';
import { env_variables } from '../env';
import { SocketAuctionUpdate, SocketInit, SocketNewItem } from './EmpireTypes';
import { fetchEmpireMetaData, IEmpireMetadata } from './EmpireUserData';
let temp_meta_data: any;

type Callback = (data: any) => void;

export class EmpireSocket {
  io: any;
  eventSubscribers: Map<symbol | number, Callback[]> = new Map();
  metadata!: IEmpireMetadata;

  constructor() {
    this.fetchAndConfigure().catch(error => console.error(error));
  }

  private async fetchAndConfigure(): Promise<void> {
    this.metadata = await fetchEmpireMetaData();
    this.io = io('wss://trade.csgoempire.com/trade', {
      transports: ["websocket"],
      path: "/s/",
      secure: true,
      rejectUnauthorized: false,
      extraHeaders: { 'User-agent': `${this.metadata.user.id} API Bot` }
    });
    this.io.on('connect', () => {
      console.log('Connected to the server.')
      this.io.on('new_item', (data: unknown) => console.log(`new_item: ${JSON.stringify(data)}`));
    });
    this.io.on('init', this.init.bind(this));
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

  emitEvent(event: symbol | number, data: any) {
    const subscribers = this.eventSubscribers.get(event);
    if (subscribers) {
      for (const subscriber of subscribers) {
        subscriber(data);
      }
    }
  }

  async init(data: SocketInit) {
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
}
