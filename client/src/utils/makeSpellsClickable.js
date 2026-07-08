// Scan rendered stat-block HTML for known spell names and wrap them in clickable
// spans. Sorts by name length descending so "Greater Invisibility" matches before
// "Invisibility". Only matches text between HTML tags to avoid corrupting attrs.
//
// Each match is replaced with an opaque Private-Use-Area token, then tokens are
// swapped for the real spans at the end. A wrapped name is thus invisible to
// later spell regexes, so a shorter name can never nest inside an already-wrapped
// longer one (finding l4). The token char (U+E000) can't appear in stat content.
const TOKEN = String.fromCharCode(0xe000);

export function makeSpellsClickable(html, spellIndex) {
  if (!spellIndex?.length) return html;
  const sorted = [...spellIndex].sort((a, b) => b.name.length - a.name.length);
  const spans = [];
  let result = html;
  for (const spell of sorted) {
    const escaped = spell.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(>[^<]*?)(\\b${escaped}\\b)([^<]*?<)`, 'gi');
    result = result.replace(regex, (match, before, name, after) => {
      const token = `${TOKEN}${spans.length}${TOKEN}`;
      spans.push(`<span class="spell-link" data-spell-slug="${spell.slug}" title="View ${spell.name}">${name}</span>`);
      return `${before}${token}${after}`;
    });
  }
  return result.replace(new RegExp(`${TOKEN}(\\d+)${TOKEN}`, 'g'), (m, i) => spans[Number(i)]);
}
