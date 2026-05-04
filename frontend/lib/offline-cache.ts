export type OfflineCacheValue<T> = {
  savedAt: string; // ISO timestamp
  value: T;
};

const DB_NAME = "readitlater";
const DB_VERSION = 1;
const STORE = "bookmark_details";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function withStore<R>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<R>
): Promise<R> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result as R);
      req.onerror = () =>
        reject(req.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  const wrapped: OfflineCacheValue<T> = {
    savedAt: new Date().toISOString(),
    value,
  };
  await withStore("readwrite", (store) => store.put(wrapped as unknown as any, key));
}

export async function cacheGet<T>(key: string): Promise<OfflineCacheValue<T> | null> {
  const res = await withStore<OfflineCacheValue<T> | undefined>("readonly", (store) =>
    store.get(key)
  );
  return res ?? null;
}

