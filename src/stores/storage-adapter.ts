export interface StorageAdapter {
  save(key: string, data: unknown): void;
  load<T>(key: string): T | null;
  remove(key: string): void;
  clear(): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  save(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      console.warn('localStorage save failed for key:', key);
    }
  }

  load<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
