/**
 * One-time migration: move data from old localStorage keys into useUserDataStore.
 * Runs once per browser. Safe to remove after a few weeks.
 */
import useUserDataStore from '../store/useUserDataStore';

const MIGRATION_KEY = 'user_data_migrated';

export function migrateLocalStorageToStore() {
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const store = useUserDataStore.getState();

  // Migrate characters
  try {
    const raw = localStorage.getItem('saved_characters');
    if (raw) {
      const chars = JSON.parse(raw);
      if (Array.isArray(chars) && chars.length > 0) {
        for (const char of chars) {
          if (char.name && !store.characters.some(c => c.id === char.id)) {
            // Per-item catch: hitting the item cap skips the rest instead of
            // aborting the whole migration pass.
            try { store.addCharacter(char); } catch { break; }
          }
        }
        localStorage.removeItem('saved_characters');

      }
    }
  } catch { /* ignore */ }

  // Migrate custom monsters
  try {
    const raw = localStorage.getItem('custom_monsters');
    if (raw) {
      const monsters = JSON.parse(raw);
      if (Array.isArray(monsters) && monsters.length > 0) {
        for (const m of monsters) {
          if (m.name && !store.customMonsters.some(cm => cm.slug === m.slug)) {
            try { store.addCustomMonster(m); } catch { break; }
          }
        }
        localStorage.removeItem('custom_monsters');

      }
    }
  } catch { /* ignore */ }

  // Migrate encounter saves
  try {
    const raw = localStorage.getItem('dnd_saved_encounters');
    if (raw) {
      const saves = JSON.parse(raw);
      if (Array.isArray(saves) && saves.length > 0) {
        for (const save of saves) {
          const preset = save.snapshot || save;
          if (preset.combatants && !store.encounterPresets.some(e => e.id === save.id)) {
            try {
              store.addEncounterPreset({
                id: save.id,
                name: save.name || preset.name || 'Unnamed',
                combatants: preset.combatants,
                state: preset.state || 'pre-combat',
                currentRound: preset.currentRound || 1,
                activeCreatureId: preset.activeCreatureId || null,
                diceHistory: preset.diceHistory || [],
              });
            } catch { break; }
          }
        }
        localStorage.removeItem('dnd_saved_encounters');

      }
    }
  } catch { /* ignore */ }

  localStorage.setItem(MIGRATION_KEY, '1');
}
