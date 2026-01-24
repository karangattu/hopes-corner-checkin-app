import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRemindersStore, mapReminderRow } from '../useRemindersStore';

// Mock Supabase
vi.mock('../../supabaseClient', () => ({
  supabase: null,
  isSupabaseEnabled: () => false,
}));

describe('useRemindersStore', () => {
  beforeEach(() => {
    // Reset store state for tests
    useRemindersStore.getState().clearReminders();
  });

  describe('mapReminderRow', () => {
    it('maps database row to app format', () => {
      const dbRow = {
        id: 'uuid-123',
        guest_id: 'guest-uuid',
        message: 'Test reminder',
        created_by: 'Staff Member',
        created_at: '2025-01-24T12:00:00Z',
        dismissed_by: null,
        dismissed_at: null,
        active: true,
      };

      const mapped = mapReminderRow(dbRow);

      expect(mapped).toEqual({
        id: 'uuid-123',
        guestId: 'guest-uuid',
        message: 'Test reminder',
        createdBy: 'Staff Member',
        createdAt: '2025-01-24T12:00:00Z',
        dismissedBy: null,
        dismissedAt: null,
        active: true,
      });
    });

    it('handles null created_by', () => {
      const dbRow = {
        id: 'uuid-123',
        guest_id: 'guest-uuid',
        message: 'Test',
        created_by: null,
        created_at: '2025-01-24T12:00:00Z',
        dismissed_by: null,
        dismissed_at: null,
        active: true,
      };

      const mapped = mapReminderRow(dbRow);
      expect(mapped.createdBy).toBeNull();
    });
  });

  describe('addReminder', () => {
    it('adds a reminder in local mode', async () => {
      const guestId = 'guest-123';
      
      const reminder = await useRemindersStore.getState().addReminder(guestId, {
        message: 'Return sleeping bag',
        createdBy: 'John',
      });

      expect(reminder.guestId).toBe(guestId);
      expect(reminder.message).toBe('Return sleeping bag');
      expect(reminder.createdBy).toBe('John');
      expect(reminder.active).toBe(true);
      expect(reminder.id).toMatch(/^local-/);

      const reminders = useRemindersStore.getState().reminders;
      expect(reminders).toHaveLength(1);
    });

    it('trims message whitespace', async () => {
      const guestId = 'guest-123';
      
      const reminder = await useRemindersStore.getState().addReminder(guestId, {
        message: '  Return sleeping bag  ',
      });

      expect(reminder.message).toBe('Return sleeping bag');
    });

    it('throws error when guestId is missing', async () => {
      await expect(
        useRemindersStore.getState().addReminder(null, { message: 'Test' })
      ).rejects.toThrow('guestId is required');
    });

    it('throws error when message is empty', async () => {
      await expect(
        useRemindersStore.getState().addReminder('guest-123', { message: '' })
      ).rejects.toThrow('Reminder message is required');
    });

    it('throws error when message is only whitespace', async () => {
      await expect(
        useRemindersStore.getState().addReminder('guest-123', { message: '   ' })
      ).rejects.toThrow('Reminder message is required');
    });
  });

  describe('getActiveReminders', () => {
    it('returns only active reminders for a guest', async () => {
      const guestId = 'guest-123';
      
      await useRemindersStore.getState().addReminder(guestId, { message: 'Active 1' });
      await useRemindersStore.getState().addReminder(guestId, { message: 'Active 2' });
      await useRemindersStore.getState().addReminder('other-guest', { message: 'Other' });

      const active = useRemindersStore.getState().getActiveReminders(guestId);
      expect(active).toHaveLength(2);
      expect(active.every((r) => r.guestId === guestId)).toBe(true);
    });

    it('returns empty array for guest with no reminders', () => {
      const active = useRemindersStore.getState().getActiveReminders('nonexistent');
      expect(active).toEqual([]);
    });

    it('returns empty array when guestId is null', () => {
      const active = useRemindersStore.getState().getActiveReminders(null);
      expect(active).toEqual([]);
    });

    it('excludes dismissed reminders', async () => {
      const guestId = 'guest-123';
      
      const reminder1 = await useRemindersStore.getState().addReminder(guestId, { message: 'Active' });
      const reminder2 = await useRemindersStore.getState().addReminder(guestId, { message: 'To dismiss' });
      
      // Dismiss one reminder
      await useRemindersStore.getState().dismissReminder(reminder2.id, 'Staff');

      const active = useRemindersStore.getState().getActiveReminders(guestId);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(reminder1.id);
    });
  });

  describe('hasActiveReminders', () => {
    it('returns true when guest has active reminders', async () => {
      const guestId = 'guest-123';
      await useRemindersStore.getState().addReminder(guestId, { message: 'Test' });

      expect(useRemindersStore.getState().hasActiveReminders(guestId)).toBe(true);
    });

    it('returns false when guest has no reminders', () => {
      expect(useRemindersStore.getState().hasActiveReminders('nonexistent')).toBe(false);
    });

    it('returns false after all reminders are dismissed', async () => {
      const guestId = 'guest-123';
      const reminder = await useRemindersStore.getState().addReminder(guestId, { message: 'Test' });
      
      await useRemindersStore.getState().dismissReminder(reminder.id, 'Staff');

      expect(useRemindersStore.getState().hasActiveReminders(guestId)).toBe(false);
    });
  });

  describe('dismissReminder', () => {
    it('marks reminder as inactive and records dismissal info', async () => {
      const guestId = 'guest-123';
      const reminder = await useRemindersStore.getState().addReminder(guestId, { message: 'Test' });

      const result = await useRemindersStore.getState().dismissReminder(reminder.id, 'John Doe');

      expect(result).toBe(true);

      const reminders = useRemindersStore.getState().reminders;
      const dismissed = reminders.find((r) => r.id === reminder.id);
      
      expect(dismissed.active).toBe(false);
      expect(dismissed.dismissedBy).toBe('John Doe');
      expect(dismissed.dismissedAt).toBeDefined();
    });

    it('throws error when staff name is missing', async () => {
      const guestId = 'guest-123';
      const reminder = await useRemindersStore.getState().addReminder(guestId, { message: 'Test' });

      await expect(
        useRemindersStore.getState().dismissReminder(reminder.id, '')
      ).rejects.toThrow('Staff name is required');
    });

    it('returns false for nonexistent reminder', async () => {
      const result = await useRemindersStore.getState().dismissReminder('nonexistent-id', 'Staff');
      expect(result).toBe(false);
    });

    it('trims staff name whitespace', async () => {
      const guestId = 'guest-123';
      const reminder = await useRemindersStore.getState().addReminder(guestId, { message: 'Test' });

      await useRemindersStore.getState().dismissReminder(reminder.id, '  John Doe  ');

      const dismissed = useRemindersStore.getState().reminders.find((r) => r.id === reminder.id);
      expect(dismissed.dismissedBy).toBe('John Doe');
    });
  });

  describe('getAllRemindersForGuest', () => {
    it('returns all reminders including dismissed ones', async () => {
      const guestId = 'guest-123';
      
      await useRemindersStore.getState().addReminder(guestId, { message: 'Active' });
      const reminder2 = await useRemindersStore.getState().addReminder(guestId, { message: 'Dismissed' });
      
      await useRemindersStore.getState().dismissReminder(reminder2.id, 'Staff');

      const all = useRemindersStore.getState().getAllRemindersForGuest(guestId);
      expect(all).toHaveLength(2);
    });
  });

  describe('deleteReminder', () => {
    it('permanently removes a reminder', async () => {
      const guestId = 'guest-123';
      const reminder = await useRemindersStore.getState().addReminder(guestId, { message: 'Test' });

      const result = await useRemindersStore.getState().deleteReminder(reminder.id);

      expect(result).toBe(true);
      expect(useRemindersStore.getState().reminders).toHaveLength(0);
    });

    it('returns false for nonexistent reminder', async () => {
      const result = await useRemindersStore.getState().deleteReminder('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('clearReminders', () => {
    it('removes all reminders', async () => {
      await useRemindersStore.getState().addReminder('guest-1', { message: 'Test 1' });
      await useRemindersStore.getState().addReminder('guest-2', { message: 'Test 2' });

      useRemindersStore.getState().clearReminders();

      expect(useRemindersStore.getState().reminders).toHaveLength(0);
    });
  });
});
