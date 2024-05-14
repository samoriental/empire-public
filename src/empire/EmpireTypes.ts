export interface SocketInit {
  admin: boolean;
  authenticated: boolean;
  badge_color: null | string;
  badge_text: null | string;
  badge_text_localized: null | string;
  helper_mod: boolean;
  mod: boolean;
  qa: boolean;
  roles: string[];
  server: string;
  serverHost: string;
  serverTime: string;
  super_mod: boolean;
  name?: string;
}

export interface SocketNewItem {
  auction_ends_at: number | null;
  id: number;
  market_name: string;
  purchase_price: number;
  is_commodity: boolean;
}

export interface SocketAuctionUpdate {
  auction_ends_at: number;
  auction_highest_bid: number;
  auction_highest_bidder: number;
  id: number;
}
