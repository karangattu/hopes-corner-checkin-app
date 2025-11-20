const DB_NAME = "HopesCornerKV";
const STORE_NAME = "keyval";
const DB_VERSION = 1;

const hasIndexedDB =
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

const openDB = () => {
  if (!hasIndexedDB) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB failed to open:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const closeDB = (db) => {
  if (db) {
    try {
      db.close();
    } catch (error) {
      console.warn("Failed to close IndexedDB connection", error);
    }
  }
};

const fallbackSet = (key, value) => {
  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  } catch (error) {
    console.error("Fallback localStorage set failed:", error);
  }
};

const fallbackGet = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Fallback localStorage get failed:", error);
    return null;
  }
};

export const persistentStore = {
  async setItem(key, value) {
    if (!hasIndexedDB) {
      fallbackSet(key, value);
      return;
    }

    const db = await openDB();
    if (!db) {
      fallbackSet(key, value);
      return;
    }

    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error("Failed to persist data in IndexedDB:", request.error);
        fallbackSet(key, value);
        reject(request.error);
      };

      transaction.oncomplete = () => closeDB(db);
      transaction.onerror = () => {
        console.error("IndexedDB transaction failed:", transaction.error);
        fallbackSet(key, value);
        closeDB(db);
        reject(transaction.error);
      };
    }).catch(() => {
      // Error already logged; nothing else to do.
    });
  },

  async setItems(entries) {
    if (!hasIndexedDB) {
      entries.forEach(([key, value]) => fallbackSet(key, value));
      return;
    }

    const db = await openDB();
    if (!db) {
      entries.forEach(([key, value]) => fallbackSet(key, value));
      return;
    }

    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      entries.forEach(([key, value]) => {
        store.put(value, key);
      });

      transaction.oncomplete = () => {
        closeDB(db);
        resolve();
      };

      transaction.onerror = () => {
        console.error("IndexedDB bulk persist failed:", transaction.error);
        closeDB(db);
        entries.forEach(([key, value]) => fallbackSet(key, value));
        reject(transaction.error);
      };
    }).catch(() => {
      // Errors already logged and fallback attempted
    });
  },

  async getItem(key) {
    if (!hasIndexedDB) {
      return fallbackGet(key);
    }

    const db = await openDB();
    if (!db) {
      return fallbackGet(key);
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => {
        console.error("Failed to read data from IndexedDB:", request.error);
        resolve(fallbackGet(key));
      };

      transaction.oncomplete = () => closeDB(db);
      transaction.onerror = () => {
        console.error("IndexedDB read transaction failed:", transaction.error);
        closeDB(db);
        resolve(fallbackGet(key));
      };
    });
  },

  async getItems(keys) {
    if (!keys.length) return {};

    const result = {};
    await Promise.all(
      keys.map(async (key) => {
        result[key] = await this.getItem(key);
      }),
    );
    return result;
  },
};
