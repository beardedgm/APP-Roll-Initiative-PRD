import { useEffect, useRef, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMonster } from '../../api/useMonsters';
import { useSpell } from '../../api/useSpells';
import useUIStore from '../../store/useUIStore';
import useUserDataStore from '../../store/useUserDataStore';

/**
 * ContentViewer -- renders stat blocks (and future spell descriptions) in the right panel.
 * Reads from useUIStore.contentStack. Top of stack = what is displayed.
 *
 * Props:
 *   onRollDice    - (notation: string) => void -- called when dice notation is clicked
 *   onSpellClick  - (spellName: string) => void -- foundation for sub-project 3, not wired yet
 */
export default function ContentViewer({ onRollDice, onSpellClick }) {  // eslint-disable-line no-unused-vars
  const contentStack = useUIStore(s => s.contentStack);
  const popContent = useUIStore(s => s.popContent);

  const current = contentStack.length > 0 ? contentStack[contentStack.length - 1] : null;
  const previous = contentStack.length > 1 ? contentStack[contentStack.length - 2] : null;

  if (!current) {
    return (
      <div className="content-viewer content-viewer--empty">
        <BookOpen size={32} className="content-viewer__empty-icon" />
        <p className="content-viewer__empty-text">Select a creature or spell to view details</p>
      </div>
    );
  }

  if (current.type === 'creature') {
    return (
      <CreatureStatBlock
        slug={current.slug}
        breadcrumb={previous ? `\u2190 Back to ${previous.name}` : null}
        onBack={previous ? popContent : null}
        onRollDice={onRollDice}
      />
    );
  }

  if (current.type === 'spell') {
    return (
      <SpellContent
        slug={current.slug}
        breadcrumb={previous ? `\u2190 Back to ${previous.name}` : null}
        onBack={previous ? popContent : null}
        onRollDice={onRollDice}
      />
    );
  }

  return (
    <div className="content-viewer content-viewer--empty">
      <p className="content-viewer__empty-text">Content type not yet supported.</p>
    </div>
  );
}

/* ---- Creature Stat Block Sub-component ---- */

function CreatureStatBlock({ slug, breadcrumb, onBack, onRollDice }) {
  const detailRef = useRef(null);
  const openEditMonster = useUIStore(s => s.openEditMonster);
  const storeMonsters = useUserDataStore(s => s.customMonsters);
  const removeCustomMonster = useUserDataStore(s => s.removeCustomMonster);
  const clearContent = useUIStore(s => s.clearContent);

  const isCustomSlug = storeMonsters.some(m => m.slug === slug);
  const { data: apiMonster, isLoading } = useMonster(isCustomSlug ? null : slug);
  const storeDetailMonster = isCustomSlug ? storeMonsters.find(m => m.slug === slug) : null;
  const monster = isCustomSlug ? storeDetailMonster : apiMonster;
  const loading = isCustomSlug ? false : isLoading;

  // Event delegation for dice clicks in the rendered HTML.
  // Must re-run when monster loads (detailRef is null during loading state).
  useEffect(() => {
    if (!detailRef.current || !onRollDice) return;

    const el = detailRef.current;
    const handler = (e) => {
      const diceEl = e.target.closest('.dice-roll');
      if (!diceEl || !el.contains(diceEl)) return;
      const notation = diceEl.dataset.dice;
      if (notation) onRollDice(notation);
    };

    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onRollDice, monster, loading]);

  const handleDelete = useCallback((deleteSlug) => {
    try {
      removeCustomMonster(deleteSlug);
      clearContent();
    } catch {
      window.alert('Failed to delete monster.');
    }
  }, [removeCustomMonster, clearContent]);

  if (loading) {
    return (
      <div className="content-viewer">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
        <p className="content-viewer__loading">Loading stat block...</p>
      </div>
    );
  }

  if (!monster) {
    return (
      <div className="content-viewer">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
        <p className="content-viewer__loading">Monster not found.</p>
      </div>
    );
  }

  const markdown = monster.rawMarkdown || buildFallbackMarkdown(monster);
  const htmlWithDice = makeDiceClickable(marked.parse(markdown));
  const html = DOMPurify.sanitize(htmlWithDice, {
    ADD_ATTR: ['data-dice'],
    ADD_TAGS: ['span'],
  });

  return (
    <div className="content-viewer">
      <div className="content-viewer__header">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
        <div className="content-viewer__header-actions">
          {monster.isCustom && (
            <button
              className="btn btn--sm btn--secondary"
              onClick={() => openEditMonster(monster)}
            >
              Edit
            </button>
          )}
          {monster.isCustom && (
            <button
              className="btn btn--danger btn--sm"
              onClick={() => {
                if (window.confirm(`Delete "${monster.name}"? This cannot be undone.`)) {
                  handleDelete(monster.slug);
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div
        ref={detailRef}
        className="stat-block-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/* ---- Spell Content Sub-component ---- */

function SpellContent({ slug, breadcrumb, onBack, onRollDice }) {
  const detailRef = useRef(null);
  const { data: spell, isLoading } = useSpell(slug);

  // Event delegation for dice clicks in spell descriptions
  useEffect(() => {
    if (!detailRef.current || !onRollDice) return;

    const el = detailRef.current;
    const handler = (e) => {
      const diceEl = e.target.closest('.dice-roll');
      if (!diceEl || !el.contains(diceEl)) return;
      const notation = diceEl.dataset.dice;
      if (notation) onRollDice(notation);
    };

    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onRollDice, spell, isLoading]);

  if (isLoading) {
    return (
      <div className="content-viewer">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
        <p className="content-viewer__loading">Loading spell...</p>
      </div>
    );
  }

  if (!spell) {
    return (
      <div className="content-viewer">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
        <p className="content-viewer__loading">Spell not found.</p>
      </div>
    );
  }

  const markdown = spell.rawMarkdown || `# ${spell.name}\n\nNo description available.`;
  const htmlWithDice = makeDiceClickable(marked.parse(markdown));
  const html = DOMPurify.sanitize(htmlWithDice, {
    ADD_ATTR: ['data-dice'],
    ADD_TAGS: ['span'],
  });

  return (
    <div className="content-viewer">
      <div className="content-viewer__header">
        {breadcrumb && (
          <button className="content-viewer__breadcrumb" onClick={onBack}>{breadcrumb}</button>
        )}
      </div>
      <div
        ref={detailRef}
        className="stat-block-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/* ---- Utility: makeDiceClickable ---- */

function makeDiceClickable(html) {
  let result = html.replace(
    /(\d+d\d+(?:\s*[+-]\s*\d+)?)/g,
    '<span class="dice-roll" data-dice="$1" title="Click to roll $1">$1</span>'
  );

  let insideDiceSpan = 0;
  result = result.replace(
    /(<span[^>]*class="[^"]*dice-roll[^"]*"[^>]*>)|(<\/span>)|(<[^>]*>)|([+-]\d+)/g,
    (match, diceOpen, spanClose, otherTag, mod) => {
      if (diceOpen) { insideDiceSpan++; return diceOpen; }
      if (spanClose) { if (insideDiceSpan > 0) insideDiceSpan--; return spanClose; }
      if (otherTag) return otherTag;
      if (insideDiceSpan > 0) return match;
      const diceExpr = `1d20${mod}`;
      return `<span class="dice-roll mod-roll" data-dice="${diceExpr}" title="Click to roll ${diceExpr}">${mod}</span>`;
    }
  );

  return result;
}

/* ---- Utility: buildFallbackMarkdown ---- */

function buildFallbackMarkdown(m) {
  const mod = (score) => {
    const v = Math.floor((score - 10) / 2);
    return v >= 0 ? `+${v}` : `${v}`;
  };

  const lines = [];
  lines.push(`# ${m.name}`);
  lines.push(`*${m.size || 'Medium'} ${m.type || 'creature'}${m.alignment ? `, ${m.alignment}` : ''}*`);
  lines.push('---');
  lines.push(`**Armor Class** ${m.ac || 10}${m.acDesc ? ` (${m.acDesc})` : ''}`);
  lines.push(`**Hit Points** ${m.hp || 1}${m.hpFormula ? ` (${m.hpFormula})` : ''}`);
  lines.push(`**Speed** ${m.speed || '30 ft.'}`);
  lines.push('---');

  if (m.abilities) {
    const a = m.abilities;
    lines.push(`| STR | DEX | CON | INT | WIS | CHA |`);
    lines.push(`|:---:|:---:|:---:|:---:|:---:|:---:|`);
    lines.push(`| ${a.str} (${mod(a.str)}) | ${a.dex} (${mod(a.dex)}) | ${a.con} (${mod(a.con)}) | ${a.int} (${mod(a.int)}) | ${a.wis} (${mod(a.wis)}) | ${a.cha} (${mod(a.cha)}) |`);
    lines.push('---');
  }

  if (m.savingThrows) lines.push(`**Saving Throws** ${m.savingThrows}`);
  if (m.skills) lines.push(`**Skills** ${m.skills}`);
  if (m.damageResistances) lines.push(`**Damage Resistances** ${m.damageResistances}`);
  if (m.damageImmunities) lines.push(`**Damage Immunities** ${m.damageImmunities}`);
  if (m.damageVulnerabilities) lines.push(`**Damage Vulnerabilities** ${m.damageVulnerabilities}`);
  if (m.conditionImmunities) lines.push(`**Condition Immunities** ${m.conditionImmunities}`);
  if (m.senses) lines.push(`**Senses** ${m.senses}`);
  if (m.languages) lines.push(`**Languages** ${m.languages}`);
  if (m.cr) lines.push(`**Challenge** ${m.cr}`);

  if (m.traits?.length) {
    lines.push('---');
    for (const t of m.traits) {
      lines.push(`***${t.name}.*** ${t.description}`);
      lines.push('');
    }
  }

  if (m.actions?.length) {
    lines.push('## Actions');
    for (const a of m.actions) {
      lines.push(`***${a.name}.*** ${a.description}`);
      lines.push('');
    }
  }

  if (m.reactions?.length) {
    lines.push('## Reactions');
    for (const r of m.reactions) {
      lines.push(`***${r.name}.*** ${r.description}`);
      lines.push('');
    }
  }

  if (m.legendaryActions?.length) {
    lines.push('## Legendary Actions');
    for (const l of m.legendaryActions) {
      lines.push(`***${l.name}.*** ${l.description}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
