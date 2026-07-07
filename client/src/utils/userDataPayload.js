// Build the PUT /api/user-data payload from the store: live items plus pending
// tombstones per collection (a tombstone is an item with deleted:true). Shared
// by the sync hook and the load-time reconcile so both push the same shape.
export function buildUserDataPayload(state) {
  return {
    version: state.version,
    characters: [...state.characters, ...state.deletedCharacters],
    customMonsters: [...state.customMonsters, ...state.deletedCustomMonsters],
    encounterPresets: [...state.encounterPresets, ...state.deletedEncounterPresets],
  };
}

/** The change-detection snapshot for a payload (excludes version, which bumps every write). */
export function payloadSnapshot(payload) {
  return JSON.stringify({
    characters: payload.characters,
    customMonsters: payload.customMonsters,
    encounterPresets: payload.encounterPresets,
  });
}
