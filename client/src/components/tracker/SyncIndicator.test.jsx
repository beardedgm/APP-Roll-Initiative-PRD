import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SyncIndicator from './SyncIndicator';
import useUserDataStore from '../../store/useUserDataStore';
import { useSyncStatus } from '../../hooks/useCloudSync';

// Drive the two real stores directly rather than mocking — SyncIndicator just
// reads syncStatus/triggerSync from them.
function setStores({ userStatus = 'idle', encStatus = 'idle', userTrigger = null, encTrigger = null }) {
  useUserDataStore.setState({ syncStatus: userStatus, triggerSync: userTrigger });
  useSyncStatus.setState({ syncStatus: encStatus, triggerSync: encTrigger });
}

afterEach(() => {
  cleanup();
  setStores({});
});

describe('SyncIndicator', () => {
  beforeEach(() => setStores({}));

  it('renders a button reflecting the combined status (error wins)', () => {
    setStores({ userStatus: 'synced', encStatus: 'error' });
    render(<SyncIndicator />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('sync-icon--error');
    expect(btn.getAttribute('title')).toContain('retry');
  });

  it('force-syncs BOTH user data and encounter on click', () => {
    const userTrigger = vi.fn();
    const encTrigger = vi.fn();
    setStores({ userTrigger, encTrigger });
    render(<SyncIndicator />);
    fireEvent.click(screen.getByRole('button'));
    expect(userTrigger).toHaveBeenCalledTimes(1);
    expect(encTrigger).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not trigger while syncing', () => {
    const userTrigger = vi.fn();
    const encTrigger = vi.fn();
    setStores({ userStatus: 'syncing', userTrigger, encTrigger });
    render(<SyncIndicator />);
    const btn = screen.getByRole('button');
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(userTrigger).not.toHaveBeenCalled();
    expect(encTrigger).not.toHaveBeenCalled();
  });

  it('does not throw when no trigger is registered (null triggers)', () => {
    setStores({ userTrigger: null, encTrigger: null });
    render(<SyncIndicator />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });
});
