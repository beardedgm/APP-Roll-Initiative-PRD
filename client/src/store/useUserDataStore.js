import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserDataStore = create(
  persist(
    (set) => ({
      // ── State ──────────────────────────────────────
      characters: [],
      customMonsters: [],
      encounterPresets: [],
      deletedCharacters: [],
      deletedCustomMonsters: [],
      deletedEncounterPresets: [],
      version: 0,
      syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
      _loaded: false,

      // Manual "sync now" trigger registered by useUserDataSync; null when no
      // syncing page is mounted. SyncIndicator calls it on click.
      triggerSync: null,
      setTriggerSync: (triggerSync) => set({ triggerSync }),

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

      // ── Clear pending deletions (called after successful sync) ─────────────
      clearPendingDeletions: () => set({
        deletedCharacters: [],
        deletedCustomMonsters: [],
        deletedEncounterPresets: [],
      }),

      // ── Characters ─────────────────────────────────
      addCharacter: (char) => {
        const now = new Date().toISOString();
        const id = char.id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        set(s => ({
          characters: [...s.characters, { ...char, id, createdAt: now, updatedAt: now, rev: 1, deleted: false }],
        }));
      },

      updateCharacter: (id, updates) => {
        set(s => ({
          characters: s.characters.map(c =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString(), rev: (c.rev || 0) + 1 } : c
          ),
        }));
      },

      removeCharacter: (id) => {
        set(s => {
          const target = s.characters.find(c => c.id === id);
          if (!target) return {};
          const tombstone = { id, name: target.name, type: target.type, rev: (target.rev || 0) + 1, deleted: true, deletedAt: new Date().toISOString() };
          return {
            characters: s.characters.filter(c => c.id !== id),
            deletedCharacters: [...s.deletedCharacters.filter(t => t.id !== id), tombstone],
          };
        });
      },

      // ── Custom Monsters ────────────────────────────

      /** Check if a custom monster with this name already exists (case-insensitive). */
      findCustomMonsterByName: (name) => {
        const trimmed = name.trim().toLowerCase();
        return useUserDataStore.getState().customMonsters.find(
          m => m.name.trim().toLowerCase() === trimmed
        ) || null;
      },

      /** Add a new custom monster. If overwriteSlug is provided, replaces that monster instead. */
      addCustomMonster: (monster, overwriteSlug) => {
        const now = new Date().toISOString();
        const slug = overwriteSlug || monster.slug || `custom-${monster.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
        set(s => {
          const prev = overwriteSlug ? s.customMonsters.find(m => m.slug === overwriteSlug) : null;
          return {
            customMonsters: [
              ...s.customMonsters.filter(m => m.slug !== (overwriteSlug || '')),
              {
                ...monster,
                slug,
                isCustom: true,
                sourceKey: 'custom',
                source: 'Custom',
                createdAt: overwriteSlug
                  ? (prev?.createdAt || now)
                  : now,
                updatedAt: now,
                rev: (prev?.rev || 0) + 1,
                deleted: false,
              },
            ],
          };
        });
      },

      updateCustomMonster: (slug, updates) => {
        set(s => ({
          customMonsters: s.customMonsters.map(m =>
            m.slug === slug ? { ...m, ...updates, updatedAt: new Date().toISOString(), rev: (m.rev || 0) + 1 } : m
          ),
        }));
      },

      removeCustomMonster: (slug) => {
        set(s => {
          const target = s.customMonsters.find(m => m.slug === slug);
          if (!target) return {};
          const tombstone = { slug, name: target.name, isCustom: true, sourceKey: 'custom', source: 'Custom', rev: (target.rev || 0) + 1, deleted: true, deletedAt: new Date().toISOString() };
          return {
            customMonsters: s.customMonsters.filter(m => m.slug !== slug),
            deletedCustomMonsters: [...s.deletedCustomMonsters.filter(t => t.slug !== slug), tombstone],
          };
        });
      },

      // ── Encounter Presets ──────────────────────────
      addEncounterPreset: (preset) => {
        const now = new Date().toISOString();
        const id = preset.id || `enc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set(s => ({
          encounterPresets: [...s.encounterPresets, { ...preset, id, createdAt: now, updatedAt: now, rev: 1, deleted: false }],
        }));
      },

      updateEncounterPreset: (id, updates) => {
        set(s => ({
          encounterPresets: s.encounterPresets.map(e =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString(), rev: (e.rev || 0) + 1 } : e
          ),
        }));
      },

      removeEncounterPreset: (id) => {
        set(s => {
          const target = s.encounterPresets.find(e => e.id === id);
          if (!target) return {};
          const tombstone = { id, name: target.name, rev: (target.rev || 0) + 1, deleted: true, deletedAt: new Date().toISOString() };
          return {
            encounterPresets: s.encounterPresets.filter(e => e.id !== id),
            deletedEncounterPresets: [...s.deletedEncounterPresets.filter(t => t.id !== id), tombstone],
          };
        });
      },
    }),
    {
      name: 'user_data_cache',
      partialize: (state) => ({
        characters: state.characters,
        customMonsters: state.customMonsters,
        encounterPresets: state.encounterPresets,
        deletedCharacters: state.deletedCharacters,
        deletedCustomMonsters: state.deletedCustomMonsters,
        deletedEncounterPresets: state.deletedEncounterPresets,
        version: state.version,
      }),
    }
  )
);

export default useUserDataStore;
