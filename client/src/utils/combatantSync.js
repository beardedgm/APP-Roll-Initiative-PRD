// Guard combatant numeric fields before syncing an encounter to the cloud
// (finding f16). A non-finite initiative (NaN from a mid-combat add + reorder)
// serializes to JSON `null`, which the server's z.number() rejects — a 400 that
// blocks the whole encounter sync and retries forever. Coerce to a valid value.

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function sanitizeCombatantForSync(combatant) {
  return {
    ...combatant,
    initiative: finiteOr(combatant.initiative, 0),
    initiativeModifier: finiteOr(combatant.initiativeModifier, 0),
  };
}

export function sanitizeCombatantsForSync(combatants) {
  return combatants.map(sanitizeCombatantForSync);
}
