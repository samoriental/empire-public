import { EmpireSocket } from './Socket';
import axios from 'axios';
import { env_variables } from '../helper/env';
import { UserEmpireMetadata } from './UserTypes';
import { TTLMap } from '../helper/TTLMap';
import { SocketAuctionUpdate, SocketNewItem } from './EmpireTypes';
import {BidQueue} from '../withdraw/BidQueue';

export class EmpireUser {
  empire_ws: EmpireSocket;
  bidding_limits: TTLMap<number, number> = new TTLMap<number, number>(60 * 60 * 1000);
  user_id: number = 0;
  bidQueue: BidQueue = new BidQueue();
  bidsInProgress: Set<number> = new Set();

  constructor(empire_ws: EmpireSocket) {
    this.empire_ws = empire_ws;
    setInterval(this.processQueue.bind(this), 1100);
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
        }
      );
      return true;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        switch (error.response.status) {
          case 400:
            console.error('You are probably broke.');
            return false;
          case 410:
            console.log('Item does not exist');
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
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
        },
      }
    );
    return response.data;
  }

  async placeBid(item_id: string, coin_price: number) {
    console.log("placing bid")
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.post(
          `https://${env_variables.EMPIRE_URL}/api/v2/trading/deposit/${item_id}/bid`,
          { bid_value: Math.round(coin_price) },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env_variables.EMPIRE_API_KEY}`,
            },
          }
        );
        return true;
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
          switch (error.response.status) {
            case 400:
              if (error.response.data.message === 'This item has already been bid on for a higher amount.') {
                return false;
              }
              if (error.response.data.message === "This auction already finished.") {
                console.info("Missed auction")
                return false;
              }
              else {
                console.error('An error occurred:', error);
                break;
              }
            case 410:
              console.log("Item doesn't exist!");
              return false;
            default:
              console.error('Unhandled error:', error);
              break;
          }
          coin_price += Math.round(coin_price * 1.01)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    return false;
  }


  async bidToLimit(item: SocketNewItem, coin_price: number) {
    this.bidding_limits.set(item.id, coin_price);
    this.empire_ws.subscribeToAuction(item.id, this.auctionUpdateHandler.bind(this));
    this.bidQueue.addOrUpdateBid(item.id, Math.round(item.purchase_price))
  }

  async auctionUpdateHandler(auction_update: SocketAuctionUpdate) {
    const bid_limit = this.bidding_limits.get(auction_update.id);
    if (bid_limit) {
      if (
        auction_update.auction_highest_bid <= bid_limit &&
        (await this.getUserID()) != auction_update.auction_highest_bidder
      ) {
        this.bidQueue.addOrUpdateBid(auction_update.id, Math.round(auction_update.auction_highest_bid * 1.01));
      }
    } else {
      throw new Error(`Bid limit not found for ${auction_update}`);
    }
  }

  processQueue() {
    if (!this.bidQueue.isEmpty()) {
      const nextBid = this.bidQueue.getNextBid();
      if (nextBid) {
        this.placeBid(nextBid.item_id.toString(), nextBid.coin_price).finally(() => {
          this.bidsInProgress.delete(nextBid.item_id);
        });
        this.bidsInProgress.add(nextBid.item_id);
      }
    }
  }
}
