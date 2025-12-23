import { beforeEach, describe, expect, it } from 'vitest';
import { useGuestsStore } from '../useGuestsStore';

describe('useGuestsStore warnings', () => {
  beforeEach(() => {
    // Reset store state for tests
    useGuestsStore.getState().clearGuests();
    useGuestsStore.getState().clearGuestWarnings();
  });

  it('adds a guest warning in local mode and returns it via getWarningsForGuest', async () => {
    const guest = { id: 'g1', name: 'Test Guest' };
    useGuestsStore.setState({ guests: [guest] });

    await useGuestsStore.getState().addGuestWarning(guest.id, { message: 'Test warning', severity: 2 });

    const warnings = useGuestsStore.getState().getWarningsForGuest(guest.id);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toBe('Test warning');
    expect(warnings[0].severity).toBe(2);
    expect(warnings[0].id).toBeDefined();
  });

  it('removes a warning by id', async () => {
    const guest = { id: 'g2', name: 'Another Guest' };
    useGuestsStore.setState({ guests: [guest] });

    const _warning = await useGuestsStore.getState().addGuestWarning(guest.id, { message: 'Remove me' });

    let warnings = useGuestsStore.getState().getWarningsForGuest(guest.id);
    expect(warnings).toHaveLength(1);

    const removed = await useGuestsStore.getState().removeGuestWarning(_warning.id);
    expect(removed).toBe(true);

    warnings = useGuestsStore.getState().getWarningsForGuest(guest.id);
    expect(warnings).toHaveLength(0);
  });
});
