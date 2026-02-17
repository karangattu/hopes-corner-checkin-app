import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { broadcastChange, onCrossTabChange, closeCrossTabSync } from '../crossTabSync';

describe('crossTabSync', () => {
  // We track the last created channel instance so tests can inspect calls
  let channelInstance;
  
  beforeEach(() => {
    channelInstance = null;
    
    // Use a real class so `new BroadcastChannel(...)` works
    globalThis.BroadcastChannel = class MockBroadcastChannel {
      constructor() {
        this.postMessage = vi.fn();
        this.close = vi.fn();
        this.onmessage = null;
        this.onmessageerror = null;
        channelInstance = this;
      }
    };
    
    closeCrossTabSync();
  });

  afterEach(() => {
    closeCrossTabSync();
    vi.restoreAllMocks();
  });

  /** Helper: simulate receiving a message on the channel */
  const simulateMessage = (data) => {
    if (channelInstance?.onmessage) {
      channelInstance.onmessage({ data });
    }
  };

  describe('broadcastChange', () => {
    it('should broadcast a change message with correct structure', () => {
      const record = { id: '123', guestId: 'g1', status: 'booked' };
      broadcastChange('showers', 'add', record);

      expect(channelInstance.postMessage).toHaveBeenCalledTimes(1);
      const message = channelInstance.postMessage.mock.calls[0][0];
      expect(message.store).toBe('showers');
      expect(message.action).toBe('add');
      expect(message.data).toEqual(record);
      expect(message.timestamp).toBeTypeOf('number');
      expect(message.tabId).toBeTypeOf('string');
    });

    it('should broadcast laundry changes', () => {
      const record = { id: '456', guestId: 'g2', status: 'washing' };
      broadcastChange('laundry', 'update', record);

      const message = channelInstance.postMessage.mock.calls[0][0];
      expect(message.store).toBe('laundry');
      expect(message.action).toBe('update');
      expect(message.data).toEqual(record);
    });

    it('should broadcast meal changes', () => {
      const record = { id: '789', guestId: 'g3' };
      broadcastChange('meals', 'add', record);

      const message = channelInstance.postMessage.mock.calls[0][0];
      expect(message.store).toBe('meals');
      expect(message.action).toBe('add');
    });

    it('should handle postMessage errors gracefully', () => {
      // Trigger channel creation first
      broadcastChange('showers', 'add', { id: 'init' });
      channelInstance.postMessage.mockImplementation(() => {
        throw new Error('DataCloneError');
      });

      // Should not throw
      expect(() => broadcastChange('showers', 'add', { id: '1' })).not.toThrow();
    });

    it('should handle missing BroadcastChannel gracefully', () => {
      closeCrossTabSync();
      delete globalThis.BroadcastChannel;

      // Should not throw  
      expect(() => broadcastChange('showers', 'add', { id: '1' })).not.toThrow();
    });
  });

  describe('onCrossTabChange', () => {
    it('should call listener when a matching message arrives', () => {
      const listener = vi.fn();
      onCrossTabChange('showers', listener);

      // Simulate message from another tab
      const data = { id: '123', guestId: 'g1', status: 'booked' };
      simulateMessage({
        store: 'showers',
        action: 'add',
        data,
        timestamp: Date.now(),
        tabId: 'other-tab',
      });

      expect(listener).toHaveBeenCalledWith('add', data, expect.any(Number));
    });

    it('should not call listener for different store messages', () => {
      const showerListener = vi.fn();
      onCrossTabChange('showers', showerListener);

      simulateMessage({
        store: 'laundry',
        action: 'add',
        data: { id: '123' },
        timestamp: Date.now(),
      });

      expect(showerListener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners on the same store', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      onCrossTabChange('showers', listener1);
      onCrossTabChange('showers', listener2);

      simulateMessage({
        store: 'showers',
        action: 'update',
        data: { id: '1' },
        timestamp: Date.now(),
      });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should return an unsubscribe function that works', () => {
      const listener = vi.fn();
      const unsub = onCrossTabChange('showers', listener);

      unsub();

      simulateMessage({
        store: 'showers',
        action: 'add',
        data: { id: '1' },
        timestamp: Date.now(),
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should ignore messages with missing store or action', () => {
      const listener = vi.fn();
      onCrossTabChange('showers', listener);

      simulateMessage({});
      simulateMessage({ store: 'showers' }); // missing action
      simulateMessage({ action: 'add' }); // missing store
      simulateMessage(null);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors without affecting other listeners', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('listener error');
      });
      const goodListener = vi.fn();

      onCrossTabChange('showers', errorListener);
      onCrossTabChange('showers', goodListener);

      simulateMessage({
        store: 'showers',
        action: 'add',
        data: { id: '1' },
        timestamp: Date.now(),
      });

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('closeCrossTabSync', () => {
    it('should close the channel', () => {
      // Initialize the channel by broadcasting
      broadcastChange('showers', 'add', { id: '1' });
      const instance = channelInstance;
      
      closeCrossTabSync();
      
      expect(instance.close).toHaveBeenCalled();
    });

    it('should clear all listeners', () => {
      const listener = vi.fn();
      onCrossTabChange('showers', listener);

      closeCrossTabSync();

      // After closing, trigger a broadcast which creates a new channel
      broadcastChange('showers', 'add', { id: '1' });
      
      // Simulate a message on the new channel — old listener should not fire
      simulateMessage({
        store: 'showers',
        action: 'add',
        data: { id: '1' },
        timestamp: Date.now(),
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
