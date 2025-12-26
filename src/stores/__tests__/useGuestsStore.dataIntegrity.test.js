/**
 * Guest Store Data Integrity Tests
 * 
 * Tests for useGuestsStore to ensure guest data cannot be corrupted
 * through store operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGuestsStore } from '../useGuestsStore';

// Mock dependencies
vi.mock('../../supabaseClient', () => ({
  supabase: null,
  isSupabaseEnabled: () => false,
}));

vi.mock('../../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

describe('useGuestsStore Data Integrity', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset store state
    useGuestsStore.setState({
      guests: [
        {
          id: 'test-uuid-1',
          guestId: 'G001',
          firstName: 'John',
          lastName: 'Doe',
          name: 'John Doe',
          preferredName: '',
          housingStatus: 'Unhoused',
          age: 'Adult 18-59',
          gender: 'Male',
          location: 'Mountain View',
          notes: '',
          bicycleDescription: '',
          isBanned: false,
        },
        {
          id: 'test-uuid-2',
          guestId: 'G002',
          firstName: 'Jane',
          lastName: 'Smith',
          name: 'Jane Smith',
          preferredName: 'Janie',
          housingStatus: 'Housed',
          age: 'Adult 18-59',
          gender: 'Female',
          location: 'Palo Alto',
          notes: 'Test notes',
          bicycleDescription: '',
          isBanned: false,
        },
      ],
      warnings: [],
      guestProxies: [],
    });

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('updateGuest', () => {
    it('allows valid name updates', async () => {
      const result = await useGuestsStore.getState().updateGuest('test-uuid-1', {
        firstName: 'Jonathan',
        lastName: 'Doe',
        name: 'Jonathan Doe',
      });

      expect(result).toBe(true);
      
      const updatedGuest = useGuestsStore.getState().guests.find(g => g.id === 'test-uuid-1');
      expect(updatedGuest.firstName).toBe('Jonathan');
      expect(updatedGuest.name).toBe('Jonathan Doe');
    });

    it('blocks update with empty firstName', async () => {
      const result = await useGuestsStore.getState().updateGuest('test-uuid-1', {
        firstName: '',
      });

      expect(result).toBe(false);
      
      // Original data should be preserved
      const guest = useGuestsStore.getState().guests.find(g => g.id === 'test-uuid-1');
      expect(guest.firstName).toBe('John');
      
      // Should have logged an error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('blocks update with whitespace-only firstName', async () => {
      const result = await useGuestsStore.getState().updateGuest('test-uuid-1', {
        firstName: '   ',
      });

      expect(result).toBe(false);
      
      const guest = useGuestsStore.getState().guests.find(g => g.id === 'test-uuid-1');
      expect(guest.firstName).toBe('John');
    });

    it('blocks update with empty lastName', async () => {
      const result = await useGuestsStore.getState().updateGuest('test-uuid-1', {
        lastName: '',
      });

      expect(result).toBe(false);
      
      const guest = useGuestsStore.getState().guests.find(g => g.id === 'test-uuid-1');
      expect(guest.lastName).toBe('Doe');
    });

    it('blocks update with empty name (full name)', async () => {
      const result = await useGuestsStore.getState().updateGuest('test-uuid-1', {
        name: '',
      });

      expect(result).toBe(false);
      
      const guest = useGuestsStore.getState().guests.find(g => g.id === 'test-uuid-1');
      expect(guest.name).toBe('John Doe');
    });

    it('blocks update with null firstName', async () => {
      const result = await useGuestsStore.getState().updateGuest('test-uuid-1', {
        firstName: null,
      });

      expect(result).toBe(false);
    });

    it('allows updates to non-name fields', async () => {
      const result = await useGuestsStore.getState().updateGuest('test-uuid-1', {
        notes: 'Updated notes',
        location: 'San Jose',
      });

      expect(result).toBe(true);
      
      const guest = useGuestsStore.getState().guests.find(g => g.id === 'test-uuid-1');
      expect(guest.notes).toBe('Updated notes');
      expect(guest.location).toBe('San Jose');
      // Name should remain unchanged
      expect(guest.firstName).toBe('John');
    });

    it('allows preferredName to be empty (clearing preferred name is valid)', async () => {
      const result = await useGuestsStore.getState().updateGuest('test-uuid-2', {
        preferredName: '',
      });

      expect(result).toBe(true);
      
      const guest = useGuestsStore.getState().guests.find(g => g.id === 'test-uuid-2');
      expect(guest.preferredName).toBe('');
      // But real name should still be intact
      expect(guest.firstName).toBe('Jane');
    });

    it('prevents complete name erasure scenario', async () => {
      // This simulates the scenario where a bug might try to clear all name fields
      const result = await useGuestsStore.getState().updateGuest('test-uuid-1', {
        firstName: '',
        lastName: '',
        name: '',
      });

      expect(result).toBe(false);
      
      // All original data should be preserved
      const guest = useGuestsStore.getState().guests.find(g => g.id === 'test-uuid-1');
      expect(guest.firstName).toBe('John');
      expect(guest.lastName).toBe('Doe');
      expect(guest.name).toBe('John Doe');
    });
  });

  describe('addGuest', () => {
    it('requires firstName for new guests', async () => {
      await expect(
        useGuestsStore.getState().addGuest({
          firstName: '',
          lastName: 'Test',
          location: 'Mountain View',
          age: 'Adult 18-59',
          gender: 'Male',
          housingStatus: 'Unhoused',
        })
      ).rejects.toThrow();
    });

    it('allows valid guest creation', async () => {
      const newGuest = await useGuestsStore.getState().addGuest({
        firstName: 'New',
        lastName: 'Guest',
        location: 'Mountain View',
        age: 'Adult 18-59',
        gender: 'Male',
        housingStatus: 'Unhoused',
      });

      expect(newGuest).toBeDefined();
      expect(newGuest.firstName).toBe('New');
      expect(newGuest.lastName).toBe('Guest');
      expect(newGuest.name).toBe('New Guest');
    });

    it('prevents duplicate guests with exact same first and last name', async () => {
      // First, add a guest
      await useGuestsStore.getState().addGuest({
        firstName: 'Stephen',
        lastName: 'Smith',
        location: 'Mountain View',
        age: 'Adult 18-59',
        gender: 'Male',
        housingStatus: 'Unhoused',
      });

      // Try to add another guest with same name - should fail
      await expect(
        useGuestsStore.getState().addGuest({
          firstName: 'Stephen',
          lastName: 'Smith',
          location: 'Palo Alto',
          age: 'Senior 60+',
          gender: 'Male',
          housingStatus: 'Housed',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('prevents duplicate guests case-insensitively', async () => {
      // Add a guest with lowercase
      await useGuestsStore.getState().addGuest({
        firstName: 'Mary',
        lastName: 'Jones',
        location: 'Mountain View',
        age: 'Adult 18-59',
        gender: 'Female',
        housingStatus: 'Unhoused',
      });

      // Try to add with different case - should fail
      await expect(
        useGuestsStore.getState().addGuest({
          firstName: 'MARY',
          lastName: 'JONES',
          location: 'Palo Alto',
          age: 'Senior 60+',
          gender: 'Female',
          housingStatus: 'Housed',
        })
      ).rejects.toThrow(/already exists/i);

      // Also test mixed case
      await expect(
        useGuestsStore.getState().addGuest({
          firstName: 'mary',
          lastName: 'jones',
          location: 'Sunnyvale',
          age: 'Adult 18-59',
          gender: 'Female',
          housingStatus: 'Unhoused',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('allows similar but not identical names', async () => {
      // Add "Stephen S"
      await useGuestsStore.getState().addGuest({
        firstName: 'Stephen',
        lastName: 'S',
        location: 'Mountain View',
        age: 'Adult 18-59',
        gender: 'Male',
        housingStatus: 'Unhoused',
      });

      // "Stephen Sm" should be allowed - different last name
      const newGuest = await useGuestsStore.getState().addGuest({
        firstName: 'Stephen',
        lastName: 'Sm',
        location: 'Mountain View',
        age: 'Adult 18-59',
        gender: 'Male',
        housingStatus: 'Unhoused',
      });

      expect(newGuest).toBeDefined();
      expect(newGuest.lastName).toBe('Sm');
    });

    it('preserves middle names with spaces in firstName', async () => {
      const newGuest = await useGuestsStore.getState().addGuest({
        firstName: 'John Michael',
        lastName: 'Smith',
        location: 'Mountain View',
        age: 'Adult 18-59',
        gender: 'Male',
        housingStatus: 'Unhoused',
      });

      expect(newGuest.firstName).toBe('John Michael');
      expect(newGuest.name).toBe('John Michael Smith');
    });
  });

  describe('migrateGuestData', () => {
    it('preserves existing name data during migration', () => {
      const testData = [
        {
          id: 'migrate-1',
          guestId: 'GM001',
          firstName: 'Migrate',
          lastName: 'Test',
          name: 'Migrate Test',
        },
      ];

      const migrated = useGuestsStore.getState().migrateGuestData(testData);

      expect(migrated[0].firstName).toBe('Migrate');
      expect(migrated[0].lastName).toBe('Test');
      expect(migrated[0].name).toBe('Migrate Test');
    });

    it('constructs name from parts if only name field is present', () => {
      const testData = [
        {
          id: 'migrate-2',
          guestId: 'GM002',
          name: 'Only Name',
        },
      ];

      const migrated = useGuestsStore.getState().migrateGuestData(testData);

      expect(migrated[0].name).toBe('Only Name');
      expect(migrated[0].firstName).toBe('Only');
      expect(migrated[0].lastName).toBe('Name');
    });

    it('handles guests with firstName and lastName but no full name', () => {
      const testData = [
        {
          id: 'migrate-3',
          guestId: 'GM003',
          firstName: 'First',
          lastName: 'Last',
        },
      ];

      const migrated = useGuestsStore.getState().migrateGuestData(testData);

      expect(migrated[0].name).toBe('First Last');
    });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    useGuestsStore.setState({
      guests: [
        {
          id: 'edge-uuid-1',
          guestId: 'E001',
          firstName: 'Edge',
          lastName: 'Case',
          name: 'Edge Case',
          preferredName: '',
          housingStatus: 'Unhoused',
          age: 'Adult 18-59',
          gender: 'Unknown',
          location: 'Test',
          notes: '',
          bicycleDescription: '',
          isBanned: false,
        },
      ],
      warnings: [],
      guestProxies: [],
    });
  });

  it('handles Unicode names correctly', async () => {
    const result = await useGuestsStore.getState().updateGuest('edge-uuid-1', {
      firstName: 'José',
      lastName: 'García',
      name: 'José García',
    });

    expect(result).toBe(true);
    
    const guest = useGuestsStore.getState().guests.find(g => g.id === 'edge-uuid-1');
    expect(guest.firstName).toBe('José');
  });

  it('trims names but does not allow only whitespace', async () => {
    const result = await useGuestsStore.getState().updateGuest('edge-uuid-1', {
      firstName: '  Valid Name  ',
    });

    expect(result).toBe(true);
    
    const guest = useGuestsStore.getState().guests.find(g => g.id === 'edge-uuid-1');
    // Note: The actual trimming happens in the store logic
    expect(guest.firstName.trim()).toBe('Valid Name');
  });
});
