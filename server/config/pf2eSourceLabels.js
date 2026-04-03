/**
 * PF2e source code → full human-readable book name.
 * Used by seed scripts to populate the `source` label field in the database.
 * Keys are the folder names inside Monsters/pf2e/ and spells/pf2e/ (no pf2e_ prefix).
 */
const PF2E_SOURCE_LABELS = {
  // ── Core Rulebooks ──────────────────────────────────────────
  crb:     'Core Rulebook',
  apg:     "Advanced Player's Guide",
  gmg:     'Gamemastery Guide',
  som:     'Secrets of Magic',
  da:      'Dark Archive',
  tv:      'Treasure Vault',
  roe:     'Rage of Elements',
  pc1:     'Player Core',
  pc2:     'Player Core 2',
  hotw:    'Howl of the Wild',
  woi:     'War of Immortals',

  // ── Bestiaries ──────────────────────────────────────────────
  b1:      'Bestiary',
  b2:      'Bestiary 2',
  b3:      'Bestiary 3',
  bb:      'Beginner Box',
  botd:    'Book of the Dead',

  // ── Lost Omens ──────────────────────────────────────────────
  locg:    'Lost Omens: Character Guide',
  logm:    'Lost Omens: Gods & Magic',
  lowg:    'Lost Omens: World Guide',
  loil:    'Lost Omens: Impossible Lands',
  lokl:    'Lost Omens: Knights of Lastwall',
  lol:     'Lost Omens: Legends',
  lomm:    'Lost Omens: Monsters of Myth',
  lopsg:   'Lost Omens: Pathfinder Society Guide',
  lora:    'Lost Omens: Rage of Elements',
  lohh:    'Lost Omens: Highhelm',
  losk:    "Lost Omens: Shadowcaster's Guide",
  lome:    'Lost Omens: Mwangi Expanse',
  loaclo:  'Lost Omens: Absalom, City of Lost Omens',
  lotxwg:  'Lost Omens: Travel Guide',

  // ── Age of Ashes ────────────────────────────────────────────
  aoa1:    'Age of Ashes: Hellknight Hill',
  aoa2:    'Age of Ashes: Cult of Cinders',
  aoa3:    'Age of Ashes: Tomorrow Must Burn',
  aoa4:    'Age of Ashes: Fires of the Haunted City',
  aoa5:    'Age of Ashes: Against the Scarlet Triad',
  aoa6:    'Age of Ashes: Broken Promises',

  // ── Agents of Edgewatch ─────────────────────────────────────
  aoe1:    'Agents of Edgewatch: Devil at the Dreaming Palace',
  aoe2:    'Agents of Edgewatch: Sixty Feet Under',
  aoe3:    'Agents of Edgewatch: All or Nothing',
  aoe4:    'Agents of Edgewatch: Assault on Hunting Lodge Seven',
  aoe5:    'Agents of Edgewatch: Belly of the Black Whale',
  aoe6:    'Agents of Edgewatch: Ruins of the Radiant Siege',

  // ── Extinction Curse ────────────────────────────────────────
  ec1:     'Extinction Curse: The Show Must Go On',
  ec2:     'Extinction Curse: Legacy of the Lost God',
  ec3:     "Extinction Curse: Life's Long Shadows",
  ec4:     'Extinction Curse: Siege of the Dinosaurs',
  ec5:     'Extinction Curse: Lord of the Black Sands',
  ec6:     'Extinction Curse: The Apocalypse Prophet',

  // ── Abomination Vaults ──────────────────────────────────────
  av1:     'Abomination Vaults: Ruins of Gauntlight',
  av2:     'Abomination Vaults: Hands of the Devil',
  av3:     'Abomination Vaults: Eyes of Empty Death',

  // ── Fists of the Ruby Phoenix ───────────────────────────────
  frp1:    'Fists of the Ruby Phoenix: Despair on Danger Island',
  frp2:    'Fists of the Ruby Phoenix: Ready? Fight!',
  frp3:    'Fists of the Ruby Phoenix: King of the Mountain',

  // ── Strength of Thousands ───────────────────────────────────
  sot1:    'Strength of Thousands: Kindled Magic',
  sot2:    'Strength of Thousands: Spoken on the Song Wind',
  sot3:    "Strength of Thousands: Hurricane's Howl",
  sot4:    'Strength of Thousands: Burning Tundra',
  sot5:    'Strength of Thousands: Doorway to the Red Star',
  sot6:    'Strength of Thousands: Shadows of the Ancients',

  // ── Outlaws of Alkenstar ────────────────────────────────────
  ooa1:    'Outlaws of Alkenstar: Punks in a Powderkeg',
  ooa2:    'Outlaws of Alkenstar: Cradle of Quartz',
  ooa3:    'Outlaws of Alkenstar: The Smoking Gun',

  // ── Gatewalkers ─────────────────────────────────────────────
  gw1:     'Gatewalkers: The Seventh Arch',
  gw2:     'Gatewalkers: They Watched the Stars',
  gw3:     'Gatewalkers: Dreamers of the Nameless Spires',

  // ── Blood Lords ─────────────────────────────────────────────
  cott:    'Blood Lords',

  // ── Season of Ghosts ────────────────────────────────────────
  sog1:    'Season of Ghosts: The Summer That Never Was',
  sog2:    'Season of Ghosts: Let the Leaves Fall',
  sog3:    'Season of Ghosts: No Breath to Cry',
  sog4:    'Season of Ghosts: To Bloom Below the Web',

  // ── Wardens of Wildwood ─────────────────────────────────────
  wow1:    'Wardens of Wildwood: Pactbreaker',
  wow2:    'Wardens of Wildwood: Severed at the Root',
  wow3:    'Wardens of Wildwood: Shepherd of Decay',

  // ── Seven Dooms for Sandpoint ───────────────────────────────
  sf1:     'Seven Dooms for Sandpoint 1',
  sf2:     'Seven Dooms for Sandpoint 2',
  sf3:     'Seven Dooms for Sandpoint 3',

  // ── When the Stars Go Dark ──────────────────────────────────
  wtd1:    'When the Stars Go Dark 1',
  wtd2:    'When the Stars Go Dark 2',
  wtd3:    'When the Stars Go Dark 3',
  wtd4:    'When the Stars Go Dark 4',
  wtd5:    'When the Stars Go Dark 5',

  // ── Standalone Adventures ───────────────────────────────────
  afof:    'A Fistful of Flowers',
  mal:     'Malevolence',
  ngd:     'Night of the Gray Death',
  tec:     'The Enmity Cycle',
  tok:     'Threshold of Knowledge',
  tio:     'Troubles in Otari',
  sli:     'The Slithering',
  fop:     'Fall of Plaguestone',
  sas:     'Shadows at Sundown',
  rust:    'Rusthenge',
  dall:    'Dawnsbury Archives',
  ltiba:   'Little Trouble in Big Absalom',
  motm:    'Mark of the Mantis',
  pos1:    'Prey of Shadows',
  tal:     'The Alchemy Lesson',
  sf0:     'Starfinder 2e Playtest',
  coa2:    'Clash of Adversaries 2',
};

export default PF2E_SOURCE_LABELS;
