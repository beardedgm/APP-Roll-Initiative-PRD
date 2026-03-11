import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserDataStore = create(
  persist(
    (set) => ({
      // ── State ──────────────────────────────────────
      characters: [],
      customMonsters: [],
      encounterPresets: [],
      version: 0,
      syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
      _loaded: false,

      // ── Load from server ───────────────────────────
      loadFromServer: (data) => {
        set({
          characters: data.characters || [],
          customMonsters: data.customMonsters || [],
          encounterPresets: data.encounterPresets || [],
          version: data.version || 0,
          _loaded: true,
          syncStatus: 'idle',
        });
      },

      // ── Characters ─────────────────────────────────
      addCharacter: (char) => {
        const now = new Date().toISOString();
        const id = char.id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        set(s => ({
          characters: [...s.characters, { ...char, id, createdAt: now, updatedAt: now }],
        }));
      },

      updateCharacter: (id, updates) => {
        set(s => ({
          characters: s.characters.map(c =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      removeCharacter: (id) => {
        set(s => ({
          characters: s.characters.filter(c => c.id !== id),
        }));
      },

      // ── Custom Monsters ────────────────────────────
      addCustomMonster: (monster) => {
        const now = new Date().toISOString();
        const slug = monster.slug || `custom-${monster.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
        set(s => ({
          customMonsters: [...s.customMonsters, {
            ...monster,
            slug,
            isCustom: true,
            sourceKey: 'custom',
            source: 'Custom',
            createdAt: now,
            updatedAt: now,
          }],
        }));
      },

      updateCustomMonster: (slug, updates) => {
        set(s => ({
          customMonsters: s.customMonsters.map(m =>
            m.slug === slug ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
          ),
        }));
      },

      removeCustomMonster: (slug) => {
        set(s => ({
          customMonsters: s.customMonsters.filter(m => m.slug !== slug),
        }));
      },

      // ── Encounter Presets ──────────────────────────
      addEncounterPreset: (preset) => {
        const now = new Date().toISOString();
        const id = preset.id || `enc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set(s => ({
          encounterPresets: [...s.encounterPresets, { ...preset, id, createdAt: now, updatedAt: now }],
        }));
      },

      updateEncounterPreset: (id, updates) => {
        set(s => ({
          encounterPresets: s.encounterPresets.map(e =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
        }));
      },

      removeEncounterPreset: (id) => {
        set(s => ({
          encounterPresets: s.encounterPresets.filter(e => e.id !== id),
        }));
      },
    }),
    {
      name: 'user_data_cache',
      partialize: (state) => ({
        characters: state.characters,
        customMonsters: state.customMonsters,
        encounterPresets: state.encounterPresets,
        version: state.version,
      }),
    }
  )
);

export default useUserDataStore;
