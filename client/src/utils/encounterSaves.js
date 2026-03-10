const SAVES_KEY = 'dnd_saved_encounters';

export function loadNamedEncounters() {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNamedEncounter(save) {
  try {
    const all = loadNamedEncounters();
    const idx = all.findIndex(s => s.id === save.id);
    if (idx >= 0) {
      all[idx] = save;
    } else {
      all.push(save);
    }
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  } catch {
    alert('Could not save: localStorage quota may be full.');
  }
}

export function deleteNamedEncounter(id) {
  try {
    const all = loadNamedEncounters().filter(s => s.id !== id);
    localStorage.setItem(SAVES_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function exportEncounterJSON(state) {
  const filename = `${(state.name || 'encounter').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importEncounterJSON(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided.'));
    if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
      return reject(new Error('File must be a .json file.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed.combatants)) {
          return reject(new Error('Invalid file: missing combatants array.'));
        }
        resolve(parsed);
      } catch {
        reject(new Error('File is not valid JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
