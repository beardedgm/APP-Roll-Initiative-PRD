// Tests for pf2eSpellRenderer.js — first coverage for this module (M9/L4).
// Run: node --test shared/pf2eSpellRenderer.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPf2eSpellToMarkdown } from './pf2eSpellRenderer.js';

function baseSpell(overrides = {}) {
  return {
    name: 'Test Spell',
    level: 3,
    source: 'CRB',
    page: 123,
    traits: ['evocation', 'fire'],
    traditions: ['arcane', 'primal'],
    cast: { number: 2, unit: 'action' },
    components: [['S', 'V']],
    entries: ['You hurl a blast of flame.'],
    ...overrides,
  };
}

describe('renderPf2eSpellToMarkdown — header and metadata', () => {
  it('renders name, traits, level, traditions, cast with action symbols', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell());
    assert.match(md, /^# Test Spell/m);
    assert.match(md, /^\*evocation, fire\*$/m);
    assert.match(md, /^- \*\*Level\*\*: Spell 3$/m);
    assert.match(md, /^- \*\*Traditions\*\*: arcane, primal$/m);
    assert.match(md, /- \*\*Cast\*\*: ◆◆ \(somatic, verbal\)/);
    assert.match(md, /^- \*\*Source\*\*: CRB p\.123$/m);
  });

  it('renders Focus for focus spells', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({ focus: true }));
    assert.match(md, /^- \*\*Level\*\*: Focus 3$/m);
  });
});

describe('renderPf2eSpellToMarkdown — bold-entry spacing (f26)', () => {
  // Adjacent **Name** lines separated by a single \n collapse into one
  // run-on paragraph when the markdown is rendered. Every bold entry must be
  // followed by a blank line.
  it('separates adjacent named entries with a blank line', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({
      entries: [
        { type: 'entries', name: 'First', entry: 'alpha' },
        { type: 'entries', name: 'Second', entry: 'beta' },
      ],
    }));
    assert.match(md, /\*\*First\*\* alpha\n\n\*\*Second\*\* beta/);
  });

  it('separates every affliction component with a blank line', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({
      entries: [{
        type: 'affliction',
        name: 'Venom',
        DC: 20,
        savingThrow: 'Fortitude',
        onset: '1 round',
        maxDuration: '6 rounds',
        stages: [
          { stage: 1, entry: 'sickened 1', duration: '1 round' },
          { stage: 2, entry: 'sickened 2', duration: '1 round' },
        ],
      }],
    }));
    assert.match(md, /\*\*Venom\*\*\n\nDC 20 Fortitude\n\n\*\*Onset\*\* 1 round/);
    assert.match(md, /\*\*Maximum Duration\*\* 6 rounds\n\n\*\*Stage 1\*\* sickened 1 \(1 round\)\n\n\*\*Stage 2\*\* sickened 2 \(1 round\)/);
  });

  it('separates success degrees with blank lines', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({
      entries: [{
        type: 'successDegree',
        entries: { Success: 'Half damage.', Failure: 'Full damage.' },
      }],
    }));
    assert.match(md, /\*\*Success\*\* Half damage\.\n\n\*\*Failure\*\* Full damage\./);
  });

  it('separates a named entry from its nested entries', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({
      entries: [
        { type: 'entries', name: 'Outer', entry: 'intro', entries: ['nested text'] },
        { type: 'entries', name: 'After', entry: 'tail' },
      ],
    }));
    assert.match(md, /\*\*Outer\*\* intro\n\n/);
    assert.match(md, /nested text\n\n[\s\S]*\*\*After\*\* tail/);
  });
});

describe('renderPf2eSpellToMarkdown — heightening', () => {
  it('renders plusX and X heightening with ordinals, blank-line separated', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({
      heightened: {
        plusX: { 1: ['The damage increases by 2d6.'] },
        X: { 2: ['Second rank text.'], 3: ['Third rank text.'], 4: ['Fourth rank text.'] },
      },
    }));
    assert.match(md, /\*\*Heightened \(\+1\)\*\* The damage increases by 2d6\./);
    assert.match(md, /\*\*Heightened \(2nd\)\*\* Second rank text\./);
    assert.match(md, /\*\*Heightened \(3rd\)\*\* Third rank text\./);
    assert.match(md, /\*\*Heightened \(4th\)\*\* Fourth rank text\./);
    assert.match(md, /2d6\.\n\n\*\*Heightened \(2nd\)/);
  });
});

describe('renderPf2eSpellToMarkdown — missing-field guards (l4)', () => {
  it('omits the Level line instead of rendering "Spell undefined"', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({ level: undefined }));
    assert.ok(!md.includes('undefined'));
    assert.ok(!/- \*\*Level\*\*/.test(md));
  });

  it('renders level 0 (cantrip rank) rather than omitting it', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({ level: 0 }));
    assert.match(md, /^- \*\*Level\*\*: Spell 0$/m);
  });

  it('omits the Source line instead of rendering "undefined p.?"', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({ source: undefined, page: undefined }));
    assert.ok(!md.includes('undefined'));
    assert.ok(!/- \*\*Source\*\*/.test(md));
  });

  it('renders source without a page instead of "p.?"', () => {
    const md = renderPf2eSpellToMarkdown(baseSpell({ page: undefined }));
    assert.match(md, /^- \*\*Source\*\*: CRB$/m);
    assert.ok(!md.includes('p.?'));
  });
});
