export class BidQueue {
  private queue: Map<number, { coin_price: number; timestamp: number }>;

  constructor() {
    this.queue = new Map();
  }

  addOrUpdateBid(item_id: number, coin_price: number) {
    const now = Date.now();
    if (
      !this.queue.has(item_id) ||
      this.queue.get(item_id)!.coin_price < coin_price
    ) {
      this.queue.set(item_id, { coin_price, timestamp: now });
    }
  }

  getNextBid(min_age: number): { item_id: number; coin_price: number } | null {
    const now = Date.now();
    for (const [item_id, bid] of this.queue.entries()) {
      if (now - bid.timestamp >= min_age) {
        this.queue.delete(item_id);
        return { item_id, coin_price: bid.coin_price };
      }
    }
    return null;
  }

  isEmpty() {
    return this.queue.size === 0;
  }
}
