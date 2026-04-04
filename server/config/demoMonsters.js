// server/config/demoMonsters.js

// 10 iconic D&D 5e creatures from SRD 5.1
export const DEMO_SLUGS_5E = [
  '5.1_srd--goblin',
  '5.1_srd--skeleton',
  '5.1_srd--wolf',
  '5.1_srd--zombie',
  '5.1_srd--ogre',
  '5.1_srd--owlbear',
  '5.1_srd--giant-spider',
  '5.1_srd--mimic',
  '5.1_srd--basilisk',
  '5.1_srd--young-green-dragon',
];

// 10 iconic Pathfinder 2e creatures from Bestiary 1
export const DEMO_SLUGS_PF2E = [
  'pf2e_b1--goblin-warrior',
  'pf2e_b1--skeleton-guard',
  'pf2e_b1--wolf',
  'pf2e_b1--zombie-shambler',
  'pf2e_b1--ogre-glutton',
  'pf2e_b1--owlbear',
  'pf2e_b1--hunting-spider',
  'pf2e_b1--mimic',
  'pf2e_b1--basilisk',
  'pf2e_b1--young-green-dragon',
];

export const DEMO_SLUGS = new Set([...DEMO_SLUGS_5E, ...DEMO_SLUGS_PF2E]);
