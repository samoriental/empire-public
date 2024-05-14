export class BidQueue {
  private queue: Map<number, number>;

  constructor() {
    this.queue = new Map();
  }

  addOrUpdateBid(item_id: number, coin_price: number) {
    if (!this.queue.has(item_id) || this.queue.get(item_id)! < coin_price) {
      this.queue.set(item_id, coin_price);
    }
  }

  getNextBid(): { item_id: number; coin_price: number } | null {
    const nextBid = this.queue.entries().next().value;
    if (nextBid) {
      this.queue.delete(nextBid[0]);
      return { item_id: nextBid[0], coin_price: nextBid[1] };
    }
    return null;
  }

  isEmpty() {
    return this.queue.size === 0;
  }
}
