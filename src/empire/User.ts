import { EmpireSocket } from './Socket';
import axios from 'axios';
import { env_variables } from '../helper/env';
import { APIUserDeposit, UserEmpireMetadata } from './UserTypes';
import { TTLMap } from '../helper/TTLMap';
import {
  APIUserInventory,
  SocketAuctionUpdate,
  SocketNewItem,
} from './EmpireTypes';
import { BidQueue } from '../withdraw/BidQueue';

interface ItemToList {
  id: number;
  coin_value: number;
}
export class EmpireUser {
  empire_ws: EmpireSocket;
  bidding_limits: TTLMap<number, number> = new TTLMap<number, number>(
    60 * 60 * 1000,
  );
  user_id: number = 0;
  bidQueue: BidQueue = new BidQueue();
  bidsInProgress: Set<number> = new Set();

  constructor(empire_ws: EmpireSocket) {
    this.empire_ws = empire_ws;
    setInterval(this.processQueue.bind(this), 2000);
  }

  async purchaseItem(item_id: number, coin_price: number): Promise<boolean> {
    try {
      const response = await axios.post(
        `https://${env_variables.EMPIRE_URL}/api/v2/trading/deposit/${item_id.toString()}/withdraw`,
        { coin_value: coin_price },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
          },
        },
      );
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        switch (error.response.status) {
          case 400:
            if (
              error.response.data.message ===
              "You don't have enough coins to do that!"
            ) {
              console.error('Out of funds.');
              return false;
            }
            return false;
          case 410:
            console.log('Item does not exist');
            return false;
          case 420:
            console.log('Weird 429 error');
            return false;
          default:
            console.error('Unhandled Error:', error);
        }
      }
      return false;
    }
  }

  async getUserID(): Promise<number> {
    if (!this.user_id) {
      const metadata = await EmpireUser.fetchEmpireMetaData();
      this.user_id = metadata.user.id;
    }
    return this.user_id;
  }

  static async fetchEmpireMetaData(): Promise<UserEmpireMetadata> {
    const response = await axios.get(
      `https://${env_variables.EMPIRE_URL}/api/v2/metadata/socket/`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
        },
      },
    );
    return response.data;
  }

  async placeBid(item_id: string, coin_price: number) {
    console.log('placing bid');
    try {
      const response = await axios.post(
        `https://${env_variables.EMPIRE_URL}/api/v2/trading/deposit/${item_id}/bid`,
        { bid_value: Math.round(coin_price) },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
          },
        },
      );
      return true;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        switch (error.response.status) {
          case 400:
            if (
              error.response.data.message ===
              'This item has already been bid on for a higher amount.'
            ) {
              return false;
            }
            if (
              error.response.data.message === 'This auction already finished.'
            ) {
              console.info('Missed auction');
              return false;
            }
            if (
              error.response.data.message ===
              "You've reached the limit of active trades with this seller. Please complete one of the active trades or try a different item."
            ) {
              console.info('too many trades with seller');
              return false;
            }
            if (
              error.response.data.message ===
              "You don't have enough coins to do that!"
            ) {
              throw new Error('Out of funds. ');
            }
            console.error('An error occurred:', error);
            break;
          case 410:
            console.log("Item doesn't exist!");
            return false;
          default:
            console.error('Unhandled error:', error);
            break;
        }
      }
    }
    return false;
  }

  async bidToLimit(item: SocketNewItem, coin_price: number) {
    this.bidding_limits.set(item.id, coin_price);
    this.empire_ws.subscribeToAuction(
      item.id,
      this.auctionUpdateHandler.bind(this),
    );
    this.bidQueue.addOrUpdateBid(item.id, Math.round(item.purchase_price));
  }

  async auctionUpdateHandler(auction_update: SocketAuctionUpdate) {
    const bid_limit = this.bidding_limits.get(auction_update.id);
    if (bid_limit) {
      if (
        auction_update.auction_highest_bid <= bid_limit &&
        (await this.getUserID()) != auction_update.auction_highest_bidder
      ) {
        this.bidQueue.addOrUpdateBid(
          auction_update.id,
          Math.round(auction_update.auction_highest_bid * 1.01),
        );
      }
    } else {
      throw new Error(`Bid limit not found for ${auction_update}`);
    }
  }

  processQueue() {
    if (!this.bidQueue.isEmpty()) {
      const min_age = 10 * 1000;
      const nextBid = this.bidQueue.getNextBid(min_age);
      if (nextBid) {
        this.placeBid(nextBid.item_id.toString(), nextBid.coin_price).finally(
          () => {
            this.bidsInProgress.delete(nextBid.item_id);
          },
        );
        this.bidsInProgress.add(nextBid.item_id);
      }
    }
  }

  async getInventory(): Promise<APIUserInventory[]> {
    const response = await axios.get(
      `https://${env_variables.EMPIRE_URL}/api/v2/trading/user/inventory`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
        },
      },
    );
    return response.data.data;
  }

  async depositItems(itemsMap: Map<number, number>) {
    const itemsArray: { id: number; coin_value: number }[] = Array.from(
      itemsMap,
      ([id, coin_value]) => ({ id, coin_value }),
    );
    const chunkSize = 20;
    const itemsChunks = Array.from(
      { length: Math.ceil(itemsArray.length / chunkSize) },
      (v, i) => itemsArray.slice(i * chunkSize, i * chunkSize + chunkSize),
    );
    for (const items of itemsChunks) {
      console.log(items);
      const response = await axios.post(
        `https://${env_variables.EMPIRE_URL}/api/v2/trading/deposit`,
        { items },
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
          },
        },
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async cancelDeposits(item_ids: number[]) {
    const response = await axios.post(
      `https://${env_variables.EMPIRE_URL}/api/v2/trading/deposit/cancel`,
      { ids: item_ids },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
        },
      },
    );
    console.log(response.data);
  }

  async getTrades(): Promise<APIUserDeposit[]> {
    const response = await axios.get(
      `https://${env_variables.EMPIRE_URL}/api/v2/trading/user/trades`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
        },
      },
    );
    return response.data.data.deposits;
  }
}
