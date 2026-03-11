/**
 * One-time migration: move data from old localStorage keys into useUserDataStore.
 * Runs once per browser. Safe to remove after a few weeks.
 */
import useUserDataStore from '../store/useUserDataStore';

const MIGRATION_KEY = 'user_data_migrated';

export function migrateLocalStorageToStore() {
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const store = useUserDataStore.getState();
  let migrated = false;

  // Migrate characters
  try {
    const raw = localStorage.getItem('saved_characters');
    if (raw) {
      const chars = JSON.parse(raw);
      if (Array.isArray(chars) && chars.length > 0) {
        for (const char of chars) {
          if (char.name && !store.characters.some(c => c.id === char.id)) {
            store.addCharacter(char);
          }
        }
        localStorage.removeItem('saved_characters');
        migrated = true;
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
            store.addCustomMonster(m);
          }
        }
        localStorage.removeItem('custom_monsters');
        migrated = true;
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
            store.addEncounterPreset({
              id: save.id,
              name: save.name || preset.name || 'Unnamed',
              combatants: preset.combatants,
              state: preset.state || 'pre-combat',
              currentRound: preset.currentRound || 1,
              activeCreatureId: preset.activeCreatureId || null,
              diceHistory: preset.diceHistory || [],
            });
          }
        }
        localStorage.removeItem('dnd_saved_encounters');
        migrated = true;
      }
    }
  } catch { /* ignore */ }

  if (migrated) {
    console.log('[migration] Migrated localStorage data to UserData store');
  }

  localStorage.setItem(MIGRATION_KEY, '1');
}
