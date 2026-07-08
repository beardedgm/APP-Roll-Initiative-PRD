// Decide which game system a creature slug belongs to, for routing the left
// panel to the right tab (finding l6). Seeded monsters encode the system in the
// slug prefix (pf2e_*), but custom monsters use custom-* slugs that don't — so
// look them up in the user's library and use their stored gameSystem instead.
export function resolveCreatureSystem(slug, customMonsters = []) {
  const custom = customMonsters.find((m) => m.slug === slug);
  if (custom) return custom.gameSystem || '5e';
  return slug.startsWith('pf2e_') ? 'pf2e' : '5e';
}
