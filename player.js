/* ============================================================
   player.js — Read-only player view with localStorage polling
   Depends on state.js being loaded first.
   ============================================================ */

'use strict';

const POLL_INTERVAL = 1000;

/* ── DOM References ─────────────────────────────────────────── */
const playerRound    = document.getElementById('player-round');
const playerWaiting  = document.getElementById('player-waiting');
const initiativeList = document.getElementById('initiative-list');

/* ── Change Detection ───────────────────────────────────────── */
let lastStateString = null;

/* ── Init ───────────────────────────────────────────────────── */
function init() {
  const raw = getRawState();
  lastStateString = raw;
  render(raw ? safeParseState(raw) : null);
  setInterval(pollAndUpdate, POLL_INTERVAL);
  window.addEventListener('resize', () => requestAnimationFrame(updateDynamicSizing));
}

/* ── Polling ────────────────────────────────────────────────── */
function pollAndUpdate() {
  const raw = getRawState();
  if (raw === lastStateString) return;
  lastStateString = raw;
  render(raw ? safeParseState(raw) : null);
}

function safeParseState(raw) {
  try {
    let parsed = JSON.parse(raw);

    /* Graceful handling of old schema */
    if (typeof parsed.state === 'undefined') {
      parsed.state           = 'pre-combat';
      parsed.currentRound    = parsed.round || 1;
      parsed.activeCreatureId = null;
      if (typeof parsed.currentTurnIndex === 'number' && Array.isArray(parsed.combatants)) {
        const active = parsed.combatants[parsed.currentTurnIndex];
        if (active) {
          parsed.activeCreatureId = active.id;
          parsed.state = 'combat';
        }
      }
      parsed.combatants.forEach(c => {
        if (!c.status)           c.status           = 'normal';
        if (c.ac === undefined)  c.ac               = 10;
        if (!c.initiativeModifier) c.initiativeModifier = 0;
      });
    }

    if (!Array.isArray(parsed.combatants))    parsed.combatants      = [];
    if (typeof parsed.currentRound !== 'number') parsed.currentRound = 1;
    if (parsed.activeCreatureId === undefined)   parsed.activeCreatureId = null;

    return parsed;
  } catch (e) {
    return null;
  }
}

/* ── Render dispatch ────────────────────────────────────────── */
function render(state) {
  if (!state) {
    showWaiting('Waiting for encounter to begin...');
    return;
  }

  if (state.state === 'pre-combat') {
    renderPreCombat(state);
  } else {
    renderCombat(state);
  }
}

/* ── Pre-combat render ──────────────────────────────────────── */
function renderPreCombat(state) {
  const pcs = state.combatants.filter(c => c.type === 'player');

  if (pcs.length === 0) {
    showWaiting('GM is preparing the encounter...');
    return;
  }

  showList();
  playerRound.textContent = 'Preparing...';
  initiativeList.innerHTML = '';

  /* Header row */
  const header = document.createElement('li');
  header.className = 'initiative-item initiative-item--preparing';
  header.innerHTML = `<span class="initiative-item__preparing-text">&#9876; GM is preparing the encounter...</span>`;
  initiativeList.appendChild(header);

  /* PC names only */
  pcs.forEach(pc => {
    const li = document.createElement('li');
    li.className = 'initiative-item type-border-player';
    li.innerHTML = `
      <div class="initiative-item__left">
        <span class="initiative-item__name">${escHtml(pc.name)}</span>
      </div>
      <span class="type-badge player">PC</span>
    `;
    initiativeList.appendChild(li);
  });

  requestAnimationFrame(updateDynamicSizing);
}

/* ── Combat render ──────────────────────────────────────────── */
function renderCombat(state) {
  const { combatants, activeCreatureId, currentRound } = state;

  if (combatants.length === 0) {
    showWaiting('Combat in progress...');
    return;
  }

  showList();
  playerRound.textContent = `Round ${currentRound}`;

  initiativeList.innerHTML = '';

  combatants.forEach(combatant => {
    const isActive = combatant.id === activeCreatureId;
    initiativeList.appendChild(buildPlayerRow(combatant, isActive));
  });

  requestAnimationFrame(updateDynamicSizing);
}

/* ── Row builder ────────────────────────────────────────────── */
function buildPlayerRow(combatant, isActive) {
  const { name, initiative, type, hp, status } = combatant;
  const isUnconscious = status === 'unconscious' || hp.current <= 0;
  const statusBadge   = getStatusBadge(type, hp, status);
  const initDisplay   = Number.isInteger(initiative) ? initiative : initiative.toFixed(1);

  const li = document.createElement('li');
  li.className = `initiative-item type-border-${type}${isActive ? ' initiative-item--active' : ''}`;

  li.innerHTML = `
    <div class="initiative-item__left">
      ${isActive ? '<span class="initiative-item__arrow">&#9654;</span>' : ''}
      <span class="initiative-item__name${isUnconscious ? ' initiative-item__name--unconscious' : ''}">${escHtml(name)}</span>
    </div>
    <div class="initiative-item__right">
      ${statusBadge}
      <span class="initiative-item__score">${initDisplay}</span>
    </div>
  `;

  return li;
}

/**
 * Returns an HTML status badge for monsters/NPCs, or '' for PCs or Normal state.
 */
function getStatusBadge(type, hp, status) {
  /* PCs never get a status badge on the player view */
  if (type === 'player') return '';

  if (status === 'unconscious' || hp.current <= 0) {
    return '<span class="status-badge status-badge--unconscious">Unconscious</span>';
  }

  const hpPct = hp.max > 0 ? hp.current / hp.max : 0;

  if (hpPct <= 0.25) {
    return '<span class="status-badge status-badge--bloody">Bloody</span>';
  }

  if (hp.current < hp.max) {
    return '<span class="status-badge status-badge--hurt">Hurt</span>';
  }

  return ''; /* Normal — no badge */
}

/* ── Dynamic sizing ─────────────────────────────────────────── */
/**
 * Reads the actual rendered list height and writes proportional CSS custom
 * properties so every initiative row — and the text inside it — fills its
 * equal share of the available space without overflowing.
 *
 * Called via requestAnimationFrame so the browser has finished layout before
 * we measure clientHeight / offsetHeight.
 */
function updateDynamicSizing() {
  if (initiativeList.classList.contains('hidden')) return;

  const allItems = Array.from(initiativeList.children);
  if (allItems.length === 0) return;

  const preparingRow  = initiativeList.querySelector('.initiative-item--preparing');
  const scalableItems = allItems.filter(el => !el.classList.contains('initiative-item--preparing'));
  const scalableCount = scalableItems.length;
  if (scalableCount === 0) return;

  const GAP         = 4; // must match the gap value in CSS
  const totalHeight = initiativeList.clientHeight;
  const preparingH  = preparingRow ? preparingRow.offsetHeight : 0;
  const totalGaps   = GAP * (allItems.length - 1);
  const scalableH   = totalHeight - preparingH - totalGaps;
  const itemHeight  = scalableH / scalableCount;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  const el = initiativeList;
  el.style.setProperty('--player-name-size',      `${clamp(itemHeight * 0.42, 14, 54)}px`);
  el.style.setProperty('--player-score-size',     `${clamp(itemHeight * 0.35, 12, 44)}px`);
  el.style.setProperty('--player-arrow-size',     `${clamp(itemHeight * 0.35, 12, 36)}px`);
  el.style.setProperty('--player-badge-size',     `${clamp(itemHeight * 0.20,  9, 18)}px`);
  el.style.setProperty('--player-preparing-size', `${clamp(itemHeight * 0.28, 11, 22)}px`);
  el.style.setProperty('--player-h-pad',          `${clamp(itemHeight * 0.20, 12, 60)}px`);
  el.style.setProperty('--player-v-pad',          `${clamp(itemHeight * 0.15,  8, 32)}px`);
  el.style.setProperty('--player-left-gap',       `${clamp(itemHeight * 0.15,  8, 24)}px`);
  el.style.setProperty('--player-badge-v-pad',    `${clamp(itemHeight * 0.08,  2,  8)}px`);
  el.style.setProperty('--player-badge-h-pad',    `${clamp(itemHeight * 0.18,  8, 20)}px`);
}

/* ── Visibility helpers ─────────────────────────────────────── */
function showWaiting(message) {
  playerWaiting.classList.remove('hidden');
  initiativeList.classList.add('hidden');
  playerRound.textContent = '';
  const textEl = playerWaiting.querySelector('.player-waiting__text');
  if (textEl) textEl.textContent = message;
}

function showList() {
  playerWaiting.classList.add('hidden');
  initiativeList.classList.remove('hidden');
}

/* ── Helper ─────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Bootstrap ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
