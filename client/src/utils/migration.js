import { generateEncounterId } from './ids';

/**
 * Migrates an old-format state object (pre-PRD schema) to the new schema.
 * Returns a new object — does not mutate in place.
 */
export function migrateState(raw) {
  const parsed = { ...raw };
  if (typeof parsed.state !== 'undefined') return parsed;

  parsed.state = 'pre-combat';
  parsed.id = parsed.id || generateEncounterId();
  parsed.name = parsed.name || 'Recovered Encounter';
  parsed.currentRound = parsed.round || 1;
  parsed.activeCreatureId = null;

  if (typeof parsed.currentTurnIndex === 'number' && Array.isArray(parsed.combatants)) {
    const active = parsed.combatants[parsed.currentTurnIndex];
    parsed.activeCreatureId = active ? active.id : null;
    if (parsed.activeCreatureId) parsed.state = 'combat';
  }

  if (Array.isArray(parsed.combatants)) {
    parsed.combatants = parsed.combatants.map(c => ({
      ...c,
      ac: c.ac ?? 10,
      initiativeModifier: c.initiativeModifier ?? 0,
      status: c.status ?? 'normal',
    }));
  }

  delete parsed.round;
  delete parsed.currentTurnIndex;
  return parsed;
}
