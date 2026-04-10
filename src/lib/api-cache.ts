export interface CacheOptions {
  ttl?: number; // Time to live in ms
  forceRefresh?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export class APICache {
  static get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const item = localStorage.getItem(`cache:${key}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expiry) {
        localStorage.removeItem(`cache:${key}`);
        return null;
      }
      return parsed.data as T;
    } catch (e) {
      console.warn("Failed to parse cache", e);
      return null;
    }
  }

  static set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        `cache:${key}`,
        JSON.stringify({
          data,
          expiry: Date.now() + ttl,
        })
      );
    } catch (e) {
      console.warn("Failed to set cache", e);
    }
  }

  static remove(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`cache:${key}`);
  }

  static updateItemInList<T extends { id: string }>(key: string, updatedItem: T): void {
    const list = this.get<T[]>(key);
    if (list) {
      const newList = list.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      this.set(key, newList);
    }
  }
}
