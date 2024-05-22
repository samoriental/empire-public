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

export interface APIUserInventory {
  id: number;
  invalid?: string;
  market_name: string;
}

interface ItemValidation {
  validItemDetected: boolean,
}

interface Partner {
  id: number;
  steam_id: string;
  steam_name: string;
  avatar: string;
  avatar_full: string;
  profile_url: string;
  timecreated: number;
  steam_level: number;
}

interface Metadata {
  item_validation: ItemValidation;
  expires_at: number;
  partner: Partner;
}

interface Item {
  market_name: string;
  market_value: number;
}

interface TradeStatusData {
  status: number;
  status_message: string;
  metadata: Metadata;
  created_at: string;
  updated_at: string;
  id: number;
  item_id: number;
  tradeoffer_id: number;
  item: Item;
  total_value: number;
}

export interface SocketTradeStatus {
  type: string;
  data: TradeStatusData;
}
