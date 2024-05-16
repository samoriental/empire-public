interface IUser {
  id: number;
}

export interface UserEmpireMetadata {
  user: IUser;
  socket_token: string;
  socket_signature: string;
}

export enum APITransactionStatus {
  Error = -1,
  Pending = 0,
  Received = 1,
  Processing = 2,
  Sending = 3,
  Confirming = 4,
  Sent = 5,
  Completed = 6,
  Declined = 7,
  Canceled = 8,
  TimedOut = 9,
  Credited = 10,
}
export interface APIUserDeposit {
  created_at: string;
  id: number;
  item_id: number;
  status: APITransactionStatus;
  item: APIUserItem;
}

export interface APIUserItem {
  market_name: string;
}
