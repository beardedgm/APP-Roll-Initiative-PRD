import { liveItems } from '../validators/userData.js';

function serializeAccount(user) {
  return {
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: user.emailVerified,
    emailBounced: user.emailBounced,
    emailSuppressed: user.emailSuppressed,
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function serializeEncounter(encounter) {
  return {
    name: encounter.name,
    state: encounter.state,
    currentRound: encounter.currentRound,
    activeCreatureId: encounter.activeCreatureId,
    shareCode: encounter.shareCode,
    combatants: encounter.combatants,
    diceHistory: encounter.diceHistory,
    createdAt: encounter.createdAt,
    updatedAt: encounter.updatedAt,
  };
}

function serializeUserData(userData) {
  if (!userData) {
    return { characters: [], customMonsters: [], encounterPresets: [] };
  }
  // Export live items only — soft-delete tombstones are internal sync state,
  // not user-facing data.
  return {
    characters: liveItems(userData.characters || []),
    customMonsters: liveItems(userData.customMonsters || []),
    encounterPresets: liveItems(userData.encounterPresets || []),
  };
}

export function buildExportPayload({ user, encounters, userData }) {
  return {
    exportedAt: new Date().toISOString(),
    account: serializeAccount(user),
    encounters: (encounters || []).map(serializeEncounter),
    userData: serializeUserData(userData),
  };
}
