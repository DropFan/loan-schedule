import '@testing-library/jest-dom/vitest';

// Node 22+ 内置的 localStorage 可能与 jsdom 的不兼容
// 确保 globalThis.localStorage 有完整的 Storage 接口
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.setItem !== 'function') {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      get length() { return store.size; },
      key: (index: number) => [...store.keys()][index] ?? null,
    },
    writable: true,
    configurable: true,
  });
}
