/**
 * localStorage-based storage for saved characters (PCs/NPCs).
 * Max 50 characters. Follows the same pattern as customMonsterStorage.js.
 */

const STORAGE_KEY = 'saved_characters';
const MAX_CHARACTERS = 50;

function generateId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `char_${ts}_${rand}`;
}

/** Get all saved characters. */
export function getCharacters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save (add or update) a character. Returns the saved character. */
export function saveCharacter(character) {
  const characters = getCharacters();

  if (!character.id) {
    character.id = generateId();
    character.createdAt = new Date().toISOString();
  }
  character.updatedAt = new Date().toISOString();

  const idx = characters.findIndex(c => c.id === character.id);
  if (idx >= 0) {
    characters[idx] = { ...characters[idx], ...character };
  } else {
    if (characters.length >= MAX_CHARACTERS) {
      throw new Error(`Maximum of ${MAX_CHARACTERS} saved characters reached. Delete some to add more.`);
    }
    characters.push(character);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  return character;
}

/** Delete a character by id. */
export function deleteCharacter(id) {
  const characters = getCharacters().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

/** Get a single character by id. */
export function getCharacter(id) {
  return getCharacters().find(c => c.id === id) || null;
}
