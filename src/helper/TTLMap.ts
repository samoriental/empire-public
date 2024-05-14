export class TTLMap<K, V> {
  private readonly map: Map<K, [V, number]> = new Map();
  private ttl: number;
  private readonly timer: NodeJS.Timeout;

  constructor(ttl = 1000) {
    this.ttl = ttl;
    this.timer = setInterval(() => this.checkExpiration(), this.ttl);
  }

  set(key: K, value: V, ttl = this.ttl) {
    const expiryTime = Date.now() + ttl;
    this.map.set(key, [value, expiryTime]);
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    return entry ? entry[0] : undefined;
  }

  remove(key: K): boolean {
    return this.map.delete(key);
  }

  update(key: K, value?: V, ttl?: number) {
    if (this.map.has(key)) {
      const newValue = value ?? this.get(key);
      const newTtl = ttl ?? this.ttl;
      this.set(key, newValue!, newTtl);
    }
  }

  private checkExpiration() {
    const now = Date.now();
    this.map.forEach((value, key) => {
      const expiryTime = value[1];
      if (now >= expiryTime) {
        this.remove(key);
      }
    });
  }

  stop() {
    clearInterval(this.timer);
  }
}
