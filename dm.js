/* ============================================================
   dm.js — DM control panel logic
   Depends on state.js being loaded first.
   ============================================================ */

'use strict';

/* ── Undo / Redo Stacks (in-memory only) ───────────────────── */
const MAX_UNDO_HISTORY = 50;
const undoStack = [];
const redoStack = [];

/* ── Drag State ─────────────────────────────────────────────── */
let dragSourceId  = null;
let touchDragCard = null;
let touchClone    = null;

/* ── Dice Roller State ───────────────────────────────────────── */
let currentAdvMode = 'normal'; // 'normal' | 'advantage' | 'disadvantage'

/* ── DOM References ─────────────────────────────────────────── */
const lsWarning       = document.getElementById('ls-warning');
const formAdd         = document.getElementById('form-add-combatant');
const inputName       = document.getElementById('input-name');
const inputInitiative = document.getElementById('input-initiative');
const inputHP         = document.getElementById('input-hp');
const inputAC         = document.getElementById('input-ac');
const inputInitMod    = document.getElementById('input-init-mod');
const inputQuantity   = document.getElementById('input-quantity');
const inputType       = document.getElementById('input-type');
const initiativeField = document.getElementById('initiative-field');
const combatantList   = document.getElementById('combatant-list');
const panelTurns      = document.getElementById('panel-turns');
const btnUndo         = document.getElementById('btn-undo');
const btnRedo         = document.getElementById('btn-redo');
const encounterName   = document.getElementById('encounter-name-display');
const diceCountInput  = document.getElementById('dice-count');
const diceModifier    = document.getElementById('dice-modifier');
const diceResult      = document.getElementById('dice-result');
const diceHistoryList = document.getElementById('dice-history-list');

const MAX_HISTORY = 12;

/* ── State ──────────────────────────────────────────────────── */
let state = null;

/* ── Init ───────────────────────────────────────────────────── */
function init() {
  if (!isLocalStorageAvailable()) lsWarning.classList.remove('hidden');
  state = loadState();
  renderAll();
  attachListeners();
}

/* ══════════════════════════════════════════════════════════════
   RENDERING
   ══════════════════════════════════════════════════════════════ */

function renderAll() {
  renderHeader();
  renderAddForm();
  renderTurnControls();
  renderCombatantList();
  renderDiceHistory();
}

function renderHeader() {
  encounterName.textContent = state.name || 'New Encounter';
  updateUndoRedoButtons();
}

function renderAddForm() {
  /* Show initiative field only during combat (mid-combat additions need it) */
  if (state.state === 'combat') {
    initiativeField.classList.remove('hidden');
    inputInitiative.required = true;
  } else {
    initiativeField.classList.add('hidden');
    inputInitiative.required = false;
  }
}

function renderTurnControls() {
  const isPreCombat = state.state === 'pre-combat';

  if (isPreCombat) {
    panelTurns.innerHTML = `
      <button id="btn-start-combat" class="btn btn--combat-start btn--full"
        ${state.combatants.length === 0 ? 'disabled' : ''}>
        &#9876; Start Combat
      </button>
    `;
    document.getElementById('btn-start-combat')
      .addEventListener('click', openStartCombatModal);
  } else {
    const active = state.combatants.find(c => c.id === state.activeCreatureId);
    const hasCombatants = state.combatants.length > 0;

    panelTurns.innerHTML = `
      <div class="turn-controls">
        <button id="btn-prev-turn" class="btn btn--nav"
          ${canGoPrev() ? '' : 'disabled'}>&#9664; Prev</button>
        <div class="turn-info">
          <div class="turn-info__round">Round <span id="round-counter">${state.currentRound}</span></div>
          <div class="turn-info__name">${active ? escHtml(active.name) : '—'}</div>
        </div>
        <button id="btn-next-turn" class="btn btn--nav"
          ${hasCombatants ? '' : 'disabled'}>Next &#9654;</button>
      </div>
      <button id="btn-end-combat" class="btn btn--danger btn--full" style="margin-top:8px;">
        End Combat
      </button>
    `;
    document.getElementById('btn-next-turn').addEventListener('click', handleNextTurn);
    document.getElementById('btn-prev-turn').addEventListener('click', handlePreviousTurn);
    document.getElementById('btn-end-combat').addEventListener('click', handleEndCombat);
  }
}

function renderCombatantList() {
  combatantList.innerHTML = '';

  if (state.combatants.length === 0) {
    const msg = state.state === 'pre-combat'
      ? 'No combatants yet. Add one above.'
      : 'No combatants remaining.';
    combatantList.innerHTML = `<p class="empty-message">${msg}</p>`;
    return;
  }

  state.combatants.forEach(combatant => {
    const isActive = combatant.id === state.activeCreatureId;
    combatantList.appendChild(buildCombatantCard(combatant, isActive));
  });

  attachDragListeners();
}

function buildCombatantCard(combatant, isActive) {
  const { id, name, initiative, type, hp, ac, status } = combatant;
  const hpPct  = hp.max > 0 ? (hp.current / hp.max) * 100 : 0;
  const isDead = hp.current <= 0 || status === 'unconscious';

  let hpClass = 'hp-high';
  if (isDead)          hpClass = 'hp-dead';
  else if (hpPct <= 25) hpClass = 'hp-low';
  else if (hpPct <= 50) hpClass = 'hp-mid';

  const initDisplay = Number.isInteger(initiative) ? initiative : initiative.toFixed(1);

  const card = document.createElement('div');
  card.className = `combatant-card type-border-${type}${isActive ? ' combatant-card--active' : ''}`;
  card.dataset.id = id;
  card.draggable  = true;

  card.innerHTML = `
    <div class="combatant-card__header">
      <span class="drag-handle" title="Drag to reorder">&#9776;</span>
      <div class="combatant-card__left">
        <span class="combatant-card__initiative">${initDisplay}</span>
        <div class="combatant-card__info">
          <span class="combatant-card__name${isDead ? ' combatant-card__name--dead' : ''}">${escHtml(name)}</span>
          <div class="combatant-card__badges">
            <span class="type-badge ${type}">${type === 'npc' ? 'NPC' : type.charAt(0).toUpperCase() + type.slice(1)}</span>
            <span class="ac-badge" title="Armor Class">AC ${ac}</span>
          </div>
        </div>
      </div>
      <button class="btn btn--remove" data-action="remove" data-id="${id}" title="Remove ${escHtml(name)}">&times;</button>
    </div>
    <div class="combatant-card__hp">
      <div class="hp-track">
        <div class="hp-bar ${hpClass}" style="width:${Math.max(0, Math.min(100, hpPct))}%"></div>
      </div>
      <div class="hp-controls">
        <span class="hp-text">${isDead ? '&#9760; KO &mdash;' : ''} ${hp.current} / ${hp.max} HP</span>
        <div class="hp-inputs">
          <input type="number" class="hp-input" data-id="${id}"
            placeholder="Amt" min="1" max="9999"
            title="Enter amount then click Dmg or Heal" />
          <button class="btn btn--dmg" data-action="damage" data-id="${id}">Dmg</button>
          <button class="btn btn--heal" data-action="heal" data-id="${id}">Heal</button>
        </div>
      </div>
    </div>
  `;

  return card;
}

/* ══════════════════════════════════════════════════════════════
   UNDO / REDO
   ══════════════════════════════════════════════════════════════ */

function pushUndo() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > MAX_UNDO_HISTORY) undoStack.shift();
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(state));
  state = JSON.parse(undoStack.pop());
  saveState(state);
  renderAll();
  updateUndoRedoButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(state));
  state = JSON.parse(redoStack.pop());
  saveState(state);
  renderAll();
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  btnUndo.disabled = undoStack.length === 0;
  btnRedo.disabled = redoStack.length === 0;
}

/* ══════════════════════════════════════════════════════════════
   COMBATANT MUTATIONS
   ══════════════════════════════════════════════════════════════ */

function handleAddCombatant(e) {
  e.preventDefault();

  const name     = inputName.value.trim();
  const maxHP    = parseInt(inputHP.value, 10);
  const ac       = parseInt(inputAC.value, 10) || 10;
  const initMod  = parseInt(inputInitMod.value, 10) || 0;
  const quantity = Math.min(10, Math.max(1, parseInt(inputQuantity.value, 10) || 1));
  const type     = inputType.value;

  /* In-combat additions require an initiative value */
  const initiative = state.state === 'combat'
    ? parseInt(inputInitiative.value, 10)
    : 0;

  if (!name) { inputName.focus(); return; }
  if (isNaN(maxHP) || maxHP < 1) { inputHP.focus(); return; }
  if (state.state === 'combat' && isNaN(initiative)) { inputInitiative.focus(); return; }

  pushUndo();

  for (let i = 0; i < quantity; i++) {
    const creatureName = quantity > 1 ? `${name} ${i + 1}` : name;
    state.combatants.push({
      id:               generateId(),
      name:             creatureName,
      type,
      initiative:       state.state === 'combat' ? initiative : 0,
      initiativeModifier: initMod,
      ac,
      hp:     { current: maxHP, max: maxHP },
      status: 'normal'
    });
  }

  if (state.state === 'combat') sortCombatants();

  saveState(state);
  renderAll();

  inputName.value     = '';
  inputInitiative.value = '';
  inputHP.value       = '';
  inputQuantity.value = '1';
  inputName.focus();
}

function sortCombatants() {
  state.combatants.sort((a, b) => b.initiative - a.initiative);
}

function handleRemoveCombatant(id) {
  const idx = state.combatants.findIndex(c => c.id === id);
  if (idx === -1) return;

  pushUndo();

  const wasActive = state.activeCreatureId === id;
  state.combatants.splice(idx, 1);

  if (wasActive) {
    if (state.combatants.length === 0) {
      state.activeCreatureId = null;
    } else {
      const newIdx = Math.min(idx, state.combatants.length - 1);
      state.activeCreatureId = state.combatants[newIdx].id;
    }
  }

  if (state.state === 'pre-combat') state.activeCreatureId = null;

  saveState(state);
  renderAll();
}

function applyDamageHeal(id, action, inputEl) {
  const amount = parseInt(inputEl.value, 10);
  if (isNaN(amount) || amount <= 0) {
    inputEl.focus();
    inputEl.classList.add('input-error');
    setTimeout(() => inputEl.classList.remove('input-error'), 600);
    return;
  }

  const combatant = state.combatants.find(c => c.id === id);
  if (!combatant) return;

  pushUndo();

  const delta = action === 'damage' ? -amount : amount;
  combatant.hp.current = Math.max(0, Math.min(combatant.hp.max, combatant.hp.current + delta));
  combatant.status = combatant.hp.current <= 0 ? 'unconscious' : 'normal';

  inputEl.value = '';
  saveState(state);
  renderCombatantList();
}

/* ══════════════════════════════════════════════════════════════
   TURN NAVIGATION
   ══════════════════════════════════════════════════════════════ */

function canGoPrev() {
  if (state.combatants.length === 0) return false;
  if (state.currentRound === 1) {
    return state.activeCreatureId !== state.combatants[0].id;
  }
  return true;
}

function handleNextTurn() {
  if (state.combatants.length === 0 || state.state !== 'combat') return;
  pushUndo();

  const currentIdx = state.combatants.findIndex(c => c.id === state.activeCreatureId);
  const nextIdx    = currentIdx + 1;

  if (nextIdx >= state.combatants.length) {
    state.currentRound++;
    state.activeCreatureId = state.combatants[0].id;
  } else {
    state.activeCreatureId = state.combatants[nextIdx].id;
  }

  saveState(state);
  renderAll();
}

function handlePreviousTurn() {
  if (!canGoPrev()) return;
  pushUndo();

  const currentIdx = state.combatants.findIndex(c => c.id === state.activeCreatureId);
  const prevIdx    = currentIdx - 1;

  if (prevIdx < 0) {
    state.currentRound = Math.max(1, state.currentRound - 1);
    state.activeCreatureId = state.combatants[state.combatants.length - 1].id;
  } else {
    state.activeCreatureId = state.combatants[prevIdx].id;
  }

  saveState(state);
  renderAll();
}

/* ══════════════════════════════════════════════════════════════
   STATE MACHINE: START / END COMBAT
   ══════════════════════════════════════════════════════════════ */

function openStartCombatModal() {
  const container = document.getElementById('start-combat-rows');
  container.innerHTML = '';

  state.combatants.forEach(c => {
    const row = document.createElement('div');
    row.className = 'start-combat-row';
    row.dataset.id = c.id;

    if (c.type === 'player') {
      row.innerHTML = `
        <span class="start-combat-row__name">${escHtml(c.name)}</span>
        <span class="type-badge player">PC</span>
        <input type="number" class="start-combat-initiative-input"
          placeholder="Initiative" min="-5" max="30" data-id="${c.id}" required />
      `;
    } else {
      const rolled = rollDie(20);
      const total  = rolled + (c.initiativeModifier || 0);
      row.innerHTML = `
        <span class="start-combat-row__name">${escHtml(c.name)}</span>
        <span class="type-badge ${c.type}">${c.type === 'npc' ? 'NPC' : 'Monster'}</span>
        <span class="start-combat-row__roll" data-id="${c.id}" data-rolled="${total}">
          ${total}
          <span class="start-combat-roll-breakdown">(${rolled}${c.initiativeModifier >= 0 ? '+' : ''}${c.initiativeModifier || 0})</span>
        </span>
        <button class="btn btn--reroll" data-action="reroll" data-id="${c.id}"
          data-modifier="${c.initiativeModifier || 0}">&#8635;</button>
      `;
    }
    container.appendChild(row);
  });

  openModal('modal-start-combat');
  const first = container.querySelector('.start-combat-initiative-input');
  if (first) first.focus();
}

function handleStartCombatSubmit() {
  const container = document.getElementById('start-combat-rows');

  /* Validate all PC fields are filled */
  const pcInputs = container.querySelectorAll('.start-combat-initiative-input');
  for (const input of pcInputs) {
    if (input.value === '' || isNaN(parseInt(input.value, 10))) {
      input.focus();
      input.classList.add('input-error');
      setTimeout(() => input.classList.remove('input-error'), 600);
      return;
    }
  }

  pushUndo();

  state.combatants.forEach(c => {
    if (c.type === 'player') {
      const input = container.querySelector(`.start-combat-initiative-input[data-id="${c.id}"]`);
      c.initiative = parseInt(input.value, 10);
    } else {
      const rollEl = container.querySelector(`.start-combat-row__roll[data-id="${c.id}"]`);
      c.initiative = parseInt(rollEl.dataset.rolled, 10);
    }
  });

  sortCombatants();

  state.state           = 'combat';
  state.currentRound    = 1;
  state.activeCreatureId = state.combatants[0].id;

  closeModal('modal-start-combat');
  saveState(state);
  renderAll();
}

function handleRerollInModal(btn) {
  const modifier = parseInt(btn.dataset.modifier, 10) || 0;
  const id       = btn.dataset.id;
  const rolled   = rollDie(20);
  const total    = rolled + modifier;

  const rollEl = btn.closest('.start-combat-row').querySelector('.start-combat-row__roll');
  rollEl.dataset.rolled = total;
  rollEl.innerHTML = `
    ${total}
    <span class="start-combat-roll-breakdown">(${rolled}${modifier >= 0 ? '+' : ''}${modifier})</span>
  `;
}

function handleEndCombat() {
  if (!window.confirm('End combat? Turn order will stop. Combatants and HP are kept.')) return;
  pushUndo();
  state.state           = 'pre-combat';
  state.activeCreatureId = null;
  saveState(state);
  renderAll();
}

/* ══════════════════════════════════════════════════════════════
   DRAG AND DROP
   ══════════════════════════════════════════════════════════════ */

function attachDragListeners() {
  combatantList.querySelectorAll('.combatant-card').forEach(card => {
    card.addEventListener('dragstart',  onDragStart);
    card.addEventListener('dragend',    onDragEnd);
    card.addEventListener('dragover',   onDragOver);
    card.addEventListener('dragleave',  onDragLeave);
    card.addEventListener('drop',       onDrop);
    card.addEventListener('touchstart', onTouchStart, { passive: true });
    card.addEventListener('touchmove',  onTouchMove,  { passive: false });
    card.addEventListener('touchend',   onTouchEnd);
  });
}

function onDragStart(e) {
  dragSourceId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSourceId);
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  combatantList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  dragSourceId = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if (target.dataset.id !== dragSourceId) {
    combatantList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    target.classList.add('drag-over');
  }
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  const targetId = e.currentTarget.dataset.id;
  if (!dragSourceId || dragSourceId === targetId) return;

  pushUndo();
  reorderAndRecalcInitiative(dragSourceId, targetId);
  saveState(state);
  renderAll();
}

/* ── Touch drag ─────────────────────────────────────────────── */

function onTouchStart(e) {
  touchDragCard = e.currentTarget;
  dragSourceId  = touchDragCard.dataset.id;

  touchClone = touchDragCard.cloneNode(true);
  touchClone.classList.add('touch-drag-ghost');
  document.body.appendChild(touchClone);
  touchDragCard.classList.add('dragging');
}

function onTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];

  touchClone.style.left = `${touch.clientX - touchClone.offsetWidth / 2}px`;
  touchClone.style.top  = `${touch.clientY - touchClone.offsetHeight / 2}px`;

  /* Identify drop target under finger */
  touchClone.style.display = 'none';
  const below = document.elementFromPoint(touch.clientX, touch.clientY);
  touchClone.style.display = '';

  const targetCard = below ? below.closest('.combatant-card') : null;
  combatantList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  if (targetCard && targetCard.dataset.id !== dragSourceId) {
    targetCard.classList.add('drag-over');
  }
}

function onTouchEnd(e) {
  if (touchClone) { document.body.removeChild(touchClone); touchClone = null; }
  if (touchDragCard) { touchDragCard.classList.remove('dragging'); }

  const touch    = e.changedTouches[0];
  const below    = document.elementFromPoint(touch.clientX, touch.clientY);
  const targetCard = below ? below.closest('.combatant-card') : null;
  combatantList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

  if (targetCard && targetCard.dataset.id !== dragSourceId) {
    pushUndo();
    reorderAndRecalcInitiative(dragSourceId, targetCard.dataset.id);
    saveState(state);
    renderAll();
  }

  dragSourceId  = null;
  touchDragCard = null;
}

/**
 * Moves the creature with sourceId to just before the creature with targetId,
 * then recalculates its initiative as the midpoint of its new neighbors.
 */
function reorderAndRecalcInitiative(sourceId, targetId) {
  const sourceIdx = state.combatants.findIndex(c => c.id === sourceId);
  const targetIdx = state.combatants.findIndex(c => c.id === targetId);
  if (sourceIdx === -1 || targetIdx === -1) return;

  const [source] = state.combatants.splice(sourceIdx, 1);
  const newTargetIdx = state.combatants.findIndex(c => c.id === targetId);
  state.combatants.splice(newTargetIdx, 0, source);

  const insertedIdx = state.combatants.findIndex(c => c.id === sourceId);
  const prev = state.combatants[insertedIdx - 1];
  const next = state.combatants[insertedIdx + 1];

  if (!prev && !next) {
    /* Only creature — leave initiative as-is */
  } else if (!prev) {
    source.initiative = next.initiative + 1;
  } else if (!next) {
    source.initiative = prev.initiative - 1;
  } else {
    source.initiative = (prev.initiative + next.initiative) / 2;
  }
}

/* ══════════════════════════════════════════════════════════════
   SAVE / LOAD / EXPORT / IMPORT
   ══════════════════════════════════════════════════════════════ */

function handleSaveCurrentEncounter() {
  const name = window.prompt('Save encounter as:', state.name || 'New Encounter');
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  state.name = trimmed;
  const save = {
    id:      state.id,
    name:    trimmed,
    savedAt: new Date().toISOString(),
    snapshot: JSON.parse(JSON.stringify(state))
  };
  saveNamedEncounter(save);
  saveState(state);
  renderHeader();
}

function openSavedEncountersModal() {
  renderSavedEncountersList();
  openModal('modal-saved-encounters');
}

function renderSavedEncountersList() {
  const list  = document.getElementById('saved-encounters-list');
  const saves = loadNamedEncounters();
  list.innerHTML = '';

  if (saves.length === 0) {
    list.innerHTML = '<p class="empty-message">No saved encounters yet.</p>';
    return;
  }

  saves.forEach(save => {
    const row = document.createElement('div');
    row.className = 'saved-encounter-row';
    const date = new Date(save.savedAt).toLocaleDateString();
    const count = save.snapshot.combatants ? save.snapshot.combatants.length : 0;
    row.innerHTML = `
      <div class="saved-encounter-row__info">
        <span class="saved-encounter-row__name">${escHtml(save.name)}</span>
        <span class="saved-encounter-row__meta">${count} creature${count !== 1 ? 's' : ''} &mdash; ${date}</span>
      </div>
      <div class="saved-encounter-row__actions">
        <button class="btn btn--secondary btn--sm" data-action="load-save" data-id="${save.id}">Load</button>
        <button class="btn btn--danger btn--sm" data-action="delete-save" data-id="${save.id}">Delete</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function handleLoadSave(id) {
  if (!window.confirm('Load this encounter? Unsaved changes will be lost.')) return;
  const saves = loadNamedEncounters();
  const save  = saves.find(s => s.id === id);
  if (!save) return;

  undoStack.length = 0;
  redoStack.length = 0;
  state = JSON.parse(JSON.stringify(save.snapshot));
  saveState(state);
  closeModal('modal-saved-encounters');
  renderAll();
  updateUndoRedoButtons();
}

function handleExport() {
  exportEncounterJSON(state);
}

function handleImport(file) {
  importEncounterJSON(file)
    .then(imported => {
      if (!window.confirm(`Import "${imported.name || 'encounter'}"? This replaces the current encounter.`)) return;
      undoStack.length = 0;
      redoStack.length = 0;
      state = imported;
      saveState(state);
      renderAll();
      updateUndoRedoButtons();
    })
    .catch(err => {
      window.alert(`Import failed: ${err.message}`);
    });
}

/* ══════════════════════════════════════════════════════════════
   UTILITY ACTIONS
   ══════════════════════════════════════════════════════════════ */

function handleOpenPlayerView() {
  window.open('player.html', 'playerView', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
}

function handleReset() {
  if (!window.confirm('Reset encounter? Monsters and NPCs will be removed. Players are kept.')) return;

  /* Preserve players (reset their initiative/status for the next fight) */
  const pcs = state.combatants
    .filter(c => c.type === 'player')
    .map(pc => ({ ...pc, initiative: 0, status: 'normal' }));

  /* Dice history is session-wide — it survives resets */
  const preservedHistory = state.diceHistory || [];
  const preservedName    = state.name;

  undoStack.length = 0;
  redoStack.length = 0;
  clearState();
  state             = loadState();
  state.name        = preservedName;
  state.combatants  = pcs;
  state.diceHistory = preservedHistory;
  saveState(state);

  renderAll();
  updateUndoRedoButtons();
}

function handleClearDiceHistory() {
  state.diceHistory = [];
  saveState(state);
  renderDiceHistory();
}

function handleRenameEncounter() {
  const name = window.prompt('Rename encounter:', state.name || 'New Encounter');
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  pushUndo();
  state.name = trimmed;
  saveState(state);
  renderHeader();
}

/* ── Modal helpers ──────────────────────────────────────────── */
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

/* ══════════════════════════════════════════════════════════════
   DICE ROLLER
   ══════════════════════════════════════════════════════════════ */

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Builds the short expression label for a dice entry, e.g. "2d6+3", "d20 Adv", "d8-1".
 */
function buildEntryLabel(entry) {
  const { sides, count, modifier, advantage } = entry;
  const countStr = (advantage !== 'normal' || count === 1) ? '' : `${count}`;
  const advStr   = advantage === 'advantage' ? ' Adv' : advantage === 'disadvantage' ? ' Dis' : '';
  const modStr   = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
  return `${countStr}d${sides}${advStr}${modStr}`;
}

/**
 * Updates the active Adv/Dis toggle button and disables Count when Adv/Dis is on.
 */
function setAdvMode(mode) {
  currentAdvMode = mode;
  document.querySelectorAll('.btn--adv-toggle').forEach(btn => {
    btn.classList.toggle('btn--adv-toggle--active', btn.dataset.adv === mode);
  });
  if (diceCountInput) diceCountInput.disabled = (mode !== 'normal');
}

/**
 * Renders the large result display from a history entry object.
 */
function renderDiceResult(entry) {
  const { rolls, total, modifier, advantage } = entry;
  const label = buildEntryLabel(entry);

  let breakdownHtml = '';
  if (advantage !== 'normal') {
    const usedVal = advantage === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
    const html = rolls.map(r => r === usedVal ? `<b>${r}</b>` : `<s>${r}</s>`).join(', ');
    breakdownHtml = `<span class="dice-result__breakdown">(${html})</span>`;
  } else if (rolls.length > 1) {
    breakdownHtml = `<span class="dice-result__breakdown">(${rolls.join(', ')})</span>`;
  } else if (modifier !== 0) {
    breakdownHtml = `<span class="dice-result__breakdown">(rolled ${rolls[0]})</span>`;
  }

  diceResult.innerHTML = `
    <span class="dice-result__label">${label}</span>
    <span class="dice-result__total">${total}</span>
    ${breakdownHtml}
  `;
}

/**
 * Rebuilds the history list from state.diceHistory.
 */
function renderDiceHistory() {
  diceHistoryList.innerHTML = '';

  if (!state.diceHistory || state.diceHistory.length === 0) {
    diceHistoryList.innerHTML = '<li class="text-muted">No rolls yet.</li>';
    return;
  }

  state.diceHistory.forEach(entry => {
    const { id, rolls, total, advantage } = entry;
    const label = buildEntryLabel(entry);

    let rollsHtml = '';
    if (advantage !== 'normal') {
      const usedVal = advantage === 'advantage' ? Math.max(...rolls) : Math.min(...rolls);
      rollsHtml = rolls.map(r => r === usedVal ? `<b>${r}</b>` : `<s>${r}</s>`).join(', ');
    } else if (rolls.length > 1) {
      rollsHtml = rolls.join(', ');
    }

    const li = document.createElement('li');
    li.className = 'dice-history__entry';
    li.innerHTML = `
      <span class="dice-history__content">
        <span class="dice-history__die">${label}</span>
        = <strong>${total}</strong>${rollsHtml ? ` <span class="text-muted">(${rollsHtml})</span>` : ''}
      </span>
      <button class="btn btn--reroll-history" data-action="reroll-history"
        data-id="${id}" title="Re-roll ${label}">&#8635;</button>
    `;
    diceHistoryList.appendChild(li);
  });
}

function handleDiceRoll(sides) {
  const count = Math.max(1, Math.min(20, parseInt(diceCountInput.value, 10) || 1));
  const mod   = parseInt(diceModifier.value, 10) || 0;
  const adv   = currentAdvMode;

  const rolls = adv !== 'normal'
    ? [rollDie(sides), rollDie(sides)]
    : Array.from({ length: count }, () => rollDie(sides));

  let rawSum;
  if      (adv === 'advantage')    rawSum = Math.max(...rolls);
  else if (adv === 'disadvantage') rawSum = Math.min(...rolls);
  else                             rawSum = rolls.reduce((a, b) => a + b, 0);

  const total = rawSum + mod;

  const entry = {
    id:        generateId(),
    sides,
    count:     adv !== 'normal' ? 1 : count,
    modifier:  mod,
    advantage: adv,
    rolls,
    total
  };

  if (!state.diceHistory) state.diceHistory = [];
  state.diceHistory.unshift(entry);
  if (state.diceHistory.length > MAX_HISTORY) state.diceHistory.length = MAX_HISTORY;
  saveState(state);

  renderDiceResult(entry);
  renderDiceHistory();
}

/**
 * Re-rolls a previous entry by its id, then restores the UI controls to their prior state.
 */
function handleRerollFromHistory(entryId) {
  const entry = state.diceHistory.find(e => e.id === entryId);
  if (!entry) return;

  const prevCount = diceCountInput.value;
  const prevMod   = diceModifier.value;
  const prevAdv   = currentAdvMode;

  diceCountInput.value = entry.count;
  diceModifier.value   = entry.modifier;
  setAdvMode(entry.advantage);

  handleDiceRoll(entry.sides);

  /* Restore UI controls to whatever they were before the re-roll */
  diceCountInput.value = prevCount;
  diceModifier.value   = prevMod;
  setAdvMode(prevAdv);
}

/* ══════════════════════════════════════════════════════════════
   EVENT LISTENERS
   ══════════════════════════════════════════════════════════════ */

function attachListeners() {
  /* Add combatant form */
  formAdd.addEventListener('submit', handleAddCombatant);

  /* Combatant list — delegated */
  combatantList.addEventListener('click', handleCombatantListClick);
  combatantList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('hp-input')) {
      applyDamageHeal(e.target.dataset.id, 'damage', e.target);
    }
  });

  /* Header buttons */
  document.getElementById('btn-open-player').addEventListener('click', handleOpenPlayerView);
  document.getElementById('btn-reset').addEventListener('click', handleReset);
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-save').addEventListener('click', handleSaveCurrentEncounter);
  document.getElementById('btn-load').addEventListener('click', openSavedEncountersModal);
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('input-import').addEventListener('change', (e) => {
    if (e.target.files[0]) handleImport(e.target.files[0]);
    e.target.value = '';
  });

  /* Encounter name click-to-rename */
  encounterName.addEventListener('click', handleRenameEncounter);

  /* Dice history clear button */
  document.getElementById('btn-clear-dice-history')
    .addEventListener('click', handleClearDiceHistory);

  /* Start Combat modal */
  document.getElementById('start-combat-submit').addEventListener('click', handleStartCombatSubmit);
  document.getElementById('start-combat-cancel').addEventListener('click', () => closeModal('modal-start-combat'));
  document.getElementById('start-combat-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="reroll"]');
    if (btn) handleRerollInModal(btn);
  });

  /* Saved Encounters modal — delegated */
  document.getElementById('saved-encounters-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'load-save') handleLoadSave(btn.dataset.id);
    if (btn.dataset.action === 'delete-save') {
      if (window.confirm('Delete this saved encounter?')) {
        deleteNamedEncounter(btn.dataset.id);
        renderSavedEncountersList();
      }
    }
  });

  /* Dice roller */
  document.getElementById('panel-dice').addEventListener('click', (e) => {
    const sideBtn = e.target.closest('[data-sides]');
    if (sideBtn) { handleDiceRoll(parseInt(sideBtn.dataset.sides, 10)); return; }

    const advBtn = e.target.closest('[data-adv]');
    if (advBtn) { setAdvMode(advBtn.dataset.adv); return; }

    const rerollBtn = e.target.closest('[data-action="reroll-history"]');
    if (rerollBtn) { handleRerollFromHistory(rerollBtn.dataset.id); }
  });

  /* Close modals via [data-close-modal] buttons */
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  /* Close modals on backdrop click */
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  /* Keyboard shortcuts */
  document.addEventListener('keydown', (e) => {
    /* Close open modals with Escape */
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(m => closeModal(m.id));
      return;
    }
    /* Undo: Ctrl+Z (or Cmd+Z on Mac) */
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    /* Redo: Ctrl+Y or Ctrl+Shift+Z */
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  });
}

function handleCombatantListClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'remove') {
    handleRemoveCombatant(id);
  } else if (action === 'damage' || action === 'heal') {
    const input = btn.closest('.hp-inputs').querySelector('.hp-input');
    applyDamageHeal(id, action, input);
  }
}

/* ── Helpers ────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Bootstrap ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
