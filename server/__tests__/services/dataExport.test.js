import { describe, it, expect } from 'vitest';
import { buildExportPayload } from '../../services/dataExport.js';

const baseUser = {
  _id: 'user-123',
  email: 'a@b.co',
  displayName: 'Hero',
  role: 'user',
  emailVerified: true,
  emailBounced: false,
  emailSuppressed: false,
  subscriptionStatus: 'active',
  currentPeriodEnd: new Date('2026-12-31T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-04-01T00:00:00Z'),
};

describe('buildExportPayload', () => {
  it('produces a stable shape with account, encounters, userData, exportedAt', () => {
    const payload = buildExportPayload({ user: baseUser, encounters: [], userData: null });
    expect(payload).toMatchObject({
      account: expect.any(Object),
      encounters: [],
      userData: { characters: [], customMonsters: [], encounterPresets: [] },
    });
    expect(payload.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('omits internal/secret fields from the account section', () => {
    const userWithSecrets = {
      ...baseUser,
      hashedPassword: 'hash',
      salt: 'salt',
      stripeCustomerId: 'cus_123',
      subscriptionId: 'sub_456',
    };
    const payload = buildExportPayload({ user: userWithSecrets, encounters: [], userData: null });
    expect(payload.account.hashedPassword).toBeUndefined();
    expect(payload.account.salt).toBeUndefined();
    expect(payload.account.stripeCustomerId).toBeUndefined();
    expect(payload.account.subscriptionId).toBeUndefined();
  });

  it('includes safe account fields', () => {
    const payload = buildExportPayload({ user: baseUser, encounters: [], userData: null });
    expect(payload.account.email).toBe('a@b.co');
    expect(payload.account.displayName).toBe('Hero');
    expect(payload.account.role).toBe('user');
    expect(payload.account.subscriptionStatus).toBe('active');
    expect(payload.account.emailVerified).toBe(true);
  });

  it('serializes encounters keeping combatants and round/state but stripping mongoose internals', () => {
    const encounters = [{
      _id: 'enc-1',
      __v: 7,
      userId: 'user-123',
      name: 'Goblin Ambush',
      state: 'combat',
      currentRound: 3,
      activeCreatureId: 'gob-2',
      shareCode: 'abc123',
      combatants: [{ id: 'gob-1', name: 'Goblin', hp: { current: 5, max: 7 } }],
      diceHistory: [{ total: 12 }],
      createdAt: new Date('2026-03-01T00:00:00Z'),
      updatedAt: new Date('2026-03-02T00:00:00Z'),
    }];
    const payload = buildExportPayload({ user: baseUser, encounters, userData: null });
    expect(payload.encounters).toHaveLength(1);
    const e = payload.encounters[0];
    expect(e.name).toBe('Goblin Ambush');
    expect(e.combatants).toHaveLength(1);
    expect(e.currentRound).toBe(3);
    expect(e.shareCode).toBe('abc123');
    expect(e.__v).toBeUndefined();
    expect(e.userId).toBeUndefined();
  });

  it('flattens userData into characters/customMonsters/encounterPresets, with empty arrays as default', () => {
    const userData = {
      _id: 'ud-1',
      userId: 'user-123',
      version: 4,
      characters: [{ id: 'c1', name: 'Aria' }],
      customMonsters: [{ slug: 'custom--blob', name: 'Blob' }],
      encounterPresets: [{ id: 'p1', name: 'Boss Fight' }],
    };
    const payload = buildExportPayload({ user: baseUser, encounters: [], userData });
    expect(payload.userData.characters).toEqual([{ id: 'c1', name: 'Aria' }]);
    expect(payload.userData.customMonsters).toEqual([{ slug: 'custom--blob', name: 'Blob' }]);
    expect(payload.userData.encounterPresets).toEqual([{ id: 'p1', name: 'Boss Fight' }]);
  });

  it('treats null userData as empty arrays', () => {
    const payload = buildExportPayload({ user: baseUser, encounters: [], userData: null });
    expect(payload.userData).toEqual({ characters: [], customMonsters: [], encounterPresets: [] });
  });
});
