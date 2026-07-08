import { describe, it, expect } from 'vitest';
import { makeSpellsClickable } from './makeSpellsClickable';

const index = [
  { name: 'Greater Invisibility', slug: 'greater-invisibility' },
  { name: 'Invisibility', slug: 'invisibility' },
];

// l4: makeSpellsClickable wrapped a shorter spell name INSIDE an already-wrapped
// longer one ("Invisibility" inside "Greater Invisibility"), nesting spans so a
// click opened the wrong spell.
describe('makeSpellsClickable — overlapping names', () => {
  it('wraps the longest match without nesting a shorter one inside it', () => {
    const out = makeSpellsClickable('<p>The wizard casts Greater Invisibility now.</p>', index);
    const links = out.match(/class="spell-link"/g) || [];
    expect(links.length).toBe(1);
    expect(out).toContain('data-spell-slug="greater-invisibility"');
    expect(out).not.toContain('data-spell-slug="invisibility"');
    // no spell-link nested inside another spell-link
    expect(/spell-link[^>]*>[^<]*<span class="spell-link"/.test(out)).toBe(false);
  });

  it('still wraps a standalone shorter spell', () => {
    const out = makeSpellsClickable('<p>She casts Invisibility.</p>', index);
    expect(out).toContain('data-spell-slug="invisibility"');
  });

  it('does not leak the internal token into the output', () => {
    const out = makeSpellsClickable('<p>casts Invisibility here</p>', index);
    expect(out.includes(String.fromCharCode(0xe000))).toBe(false);
  });

  it('returns the html unchanged with an empty index', () => {
    expect(makeSpellsClickable('<p>hi</p>', [])).toBe('<p>hi</p>');
  });
});
