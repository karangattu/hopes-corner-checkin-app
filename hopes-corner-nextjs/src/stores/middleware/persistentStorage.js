import { persistentStore } from '../../utils/persistentStore';
import { bulkOperationManager } from '../../utils/bulkOperationContext';

// Check if persistence should be disabled (useful for local development)
const DISABLE_PERSISTENCE = import.meta.env.VITE_DISABLE_PERSISTENCE === 'true';

/**
 * Debounced write queue for batching IndexedDB operations
 */
class WriteQueue {
  constructor() {
    this.queue = new Map();
    this.timeout = null;
    this.flushDelay = 100; // ms
  }

  schedule(name, value) {
    if (DISABLE_PERSISTENCE) {
      return; // Skip persistence entirely
    }

    this.queue.set(name, value);

    // Clear existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // During bulk operations, batch more aggressively
    const delay = bulkOperationManager.isInBulkOperation() ? 500 : this.flushDelay;

    // Schedule flush
    this.timeout = setTimeout(() => this.flush(), delay);
  }

  async flush() {
    if (this.queue.size === 0) return;

    const entries = Array.from(this.queue.entries());
    this.queue.clear();

    try {
      if (entries.length === 1) {
        const [name, value] = entries[0];
        await persistentStore.setItem(name, value);
      } else {
        // Use bulk write for multiple items
        await persistentStore.setItems(entries);
      }
    } catch (error) {
      console.error('Failed to flush write queue:', error);
    }
  }

  async flushNow() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    await this.flush();
  }
}

const writeQueue = new WriteQueue();

/**
 * Custom Zustand storage adapter that uses our existing persistentStore
 * with optimizations for bulk operations and optional disabling
 */
export const customPersistentStorage = {
  getItem: async (name) => {
    if (DISABLE_PERSISTENCE) {
      return null; // No persistence, start fresh
    }

    try {
      const value = await persistentStore.getItem(name);
      return value;
    } catch (error) {
      console.error(`Error getting item ${name} from persistent storage:`, error);
      return null;
    }
  },

  setItem: async (name, value) => {
    if (DISABLE_PERSISTENCE) {
      return; // Skip persistence entirely
    }

    try {
      // During bulk operations, batch writes
      if (bulkOperationManager.isInBulkOperation()) {
        writeQueue.schedule(name, value);
      } else {
        // For normal operations, still debounce
        writeQueue.schedule(name, value);
      }
    } catch (error) {
      console.error(`Error setting item ${name} to persistent storage:`, error);
    }
  },

  removeItem: async (name) => {
    if (DISABLE_PERSISTENCE) {
      return; // Nothing to remove
    }

    try {
      await persistentStore.removeItem(name);
    } catch (error) {
      console.error(`Error removing item ${name} from persistent storage:`, error);
    }
  },
};

/**
 * Create persist options with our custom storage
 */
export const createPersistConfig = (name, options = {}) => ({
  name,
  storage: customPersistentStorage,
  ...options,
});

/**
 * Flush all pending writes (call when app is closing or bulk operation ends)
 */
export const flushPersistence = async () => {
  await writeQueue.flushNow();
};

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    writeQueue.flushNow();
  });
}
