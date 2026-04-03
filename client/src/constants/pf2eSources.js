/**
 * PF2e source key → short badge label for creature/spell list items.
 * Keys match the sourceKey field in the database (e.g., "pf2e_crb").
 */
const PF2E_SOURCE_BADGES = {
  // ── Core Rulebooks ──────────────────────────────────────────
  pf2e_crb:     'CRB',       // Core Rulebook
  pf2e_apg:     'APG',       // Advanced Player's Guide
  pf2e_gmg:     'GMG',       // Gamemastery Guide
  pf2e_som:     'SoM',       // Secrets of Magic
  pf2e_da:      'DA',        // Dark Archive
  pf2e_tv:      'TV',        // Treasure Vault
  pf2e_roe:     'RoE',       // Rage of Elements
  pf2e_pc1:     'PC1',       // Player Core
  pf2e_pc2:     'PC2',       // Player Core 2
  pf2e_hotw:    'HotW',      // Howl of the Wild
  pf2e_woi:     'WoI',       // War of Immortals

  // ── Bestiaries ──────────────────────────────────────────────
  pf2e_b1:      'B1',        // Bestiary 1
  pf2e_b2:      'B2',        // Bestiary 2
  pf2e_b3:      'B3',        // Bestiary 3
  pf2e_bb:      'BB',        // Beginner Box
  pf2e_botd:    'BotD',      // Book of the Dead

  // ── Lost Omens ──────────────────────────────────────────────
  pf2e_locg:    'LOCG',      // Lost Omens: Character Guide
  pf2e_logm:    'LOGM',      // Lost Omens: Gods & Magic
  pf2e_lowg:    'LOWG',      // Lost Omens: World Guide
  pf2e_loil:    'LOIL',      // Lost Omens: Impossible Lands
  pf2e_lokl:    'LOKL',      // Lost Omens: Knights of Lastwall
  pf2e_lol:     'LoL',       // Lost Omens: Legends
  pf2e_lomm:    'LOMM',      // Lost Omens: Monsters of Myth
  pf2e_lopsg:   'LOPSG',     // Lost Omens: Pathfinder Society Guide
  pf2e_lora:    'LORA',      // Lost Omens: Rage of Elements
  pf2e_lohh:    'LOHH',      // Lost Omens: Highhelm
  pf2e_losk:    'LOSK',      // Lost Omens: Shadowcaster's Guide
  pf2e_lome:    'LOME',      // Lost Omens: Mwangi Expanse
  pf2e_loaclo:  'LOACLO',    // Lost Omens: Absalom, City of Lost Omens
  pf2e_lotxwg:  'LOTXWG',    // Lost Omens: Travel Guide

  // ── Adventure Paths ─────────────────────────────────────────
  // Age of Ashes
  pf2e_aoa1:    'AoA1',      // Hellknight Hill
  pf2e_aoa2:    'AoA2',      // Cult of Cinders
  pf2e_aoa3:    'AoA3',      // Tomorrow Must Burn
  pf2e_aoa4:    'AoA4',      // Fires of the Haunted City
  pf2e_aoa5:    'AoA5',      // Against the Scarlet Triad
  pf2e_aoa6:    'AoA6',      // Broken Promises

  // Agents of Edgewatch
  pf2e_aoe1:    'AoE1',      // Devil at the Dreaming Palace
  pf2e_aoe2:    'AoE2',      // Sixty Feet Under
  pf2e_aoe3:    'AoE3',      // All or Nothing
  pf2e_aoe4:    'AoE4',      // Assault on Hunting Lodge Seven
  pf2e_aoe5:    'AoE5',      // Belly of the Black Whale
  pf2e_aoe6:    'AoE6',      // Ruins of the Radiant Siege

  // Extinction Curse
  pf2e_ec1:     'EC1',       // The Show Must Go On
  pf2e_ec2:     'EC2',       // Legacy of the Lost God
  pf2e_ec3:     'EC3',       // Life's Long Shadows
  pf2e_ec4:     'EC4',       // Siege of the Dinosaurs
  pf2e_ec5:     'EC5',       // Lord of the Black Sands
  pf2e_ec6:     'EC6',       // The Apocalypse Prophet

  // Abomination Vaults
  pf2e_av1:     'AV1',       // Ruins of Gauntlight
  pf2e_av2:     'AV2',       // Hands of the Devil
  pf2e_av3:     'AV3',       // Eyes of Empty Death

  // Fists of the Ruby Phoenix
  pf2e_frp1:    'FRP1',      // Despair on Danger Island
  pf2e_frp2:    'FRP2',      // Ready? Fight!
  pf2e_frp3:    'FRP3',      // King of the Mountain

  // Strength of Thousands
  pf2e_sot1:    'SoT1',      // Kindled Magic
  pf2e_sot2:    'SoT2',      // Spoken on the Song Wind
  pf2e_sot3:    'SoT3',      // Hurricane's Howl
  pf2e_sot4:    'SoT4',      // Burning Tundra
  pf2e_sot5:    'SoT5',      // Doorway to the Red Star
  pf2e_sot6:    'SoT6',      // Shadows of the Ancients

  // Outlaws of Alkenstar
  pf2e_ooa1:    'OoA1',      // Punks in a Powderkeg
  pf2e_ooa2:    'OoA2',      // Cradle of Quartz
  pf2e_ooa3:    'OoA3',      // The Smoking Gun

  // Gatewalkers
  pf2e_gw1:     'GW1',       // The Seventh Arch
  pf2e_gw2:     'GW2',       // They Watched the Stars
  pf2e_gw3:     'GW3',       // Dreamers of the Nameless Spires

  // Blood Lords
  // (uses pf2e_cott which may be Crown of the Tomb-Taker or similar)

  // Season of Ghosts
  pf2e_sog1:    'SoG1',      // The Summer That Never Was
  pf2e_sog2:    'SoG2',      // Let the Leaves Fall
  pf2e_sog3:    'SoG3',      // No Breath to Cry
  pf2e_sog4:    'SoG4',      // To Bloom Below the Web

  // Wardens of Wildwood
  pf2e_wow1:    'WoW1',      // Pactbreaker
  pf2e_wow2:    'WoW2',      // Severed at the Root
  pf2e_wow3:    'WoW3',      // Shepherd of Decay

  // Curtain Call
  pf2e_sf1:     'SF1',       // Curtain Call 1
  pf2e_sf2:     'SF2',       // Curtain Call 2
  pf2e_sf3:     'SF3',       // Curtain Call 3

  // When the Stars Go Dark
  pf2e_wtd1:    'WtD1',
  pf2e_wtd2:    'WtD2',
  pf2e_wtd3:    'WtD3',
  pf2e_wtd4:    'WtD4',
  pf2e_wtd5:    'WtD5',

  // ── Standalone Adventures ───────────────────────────────────
  pf2e_afof:    'AFoF',      // A Fistful of Flowers
  pf2e_mal:     'Mal',       // Malevolence
  pf2e_ngd:     'NGD',       // Night of the Gray Death
  pf2e_tec:     'TEC',       // The Enmity Cycle
  pf2e_tok:     'TOK',       // Threshold of Knowledge
  pf2e_tio:     'TiO',       // Troubles in Otari
  pf2e_sli:     'Sli',       // The Slithering
  pf2e_fop:     'FoP',       // Fall of Plaguestone
  pf2e_sas:     'SaS',       // Shadows at Sundown
  pf2e_rust:    'Rust',      // Rusthenge
  pf2e_cott:    'CotT',      // Crown of the Tomb-Taker
  pf2e_dall:    'DALL',      // Dawnsbury Archives
  pf2e_ltiba:   'LtIBA',     // Little Trouble in Big Absalom
  pf2e_motm:    'MotM',      // Mark of the Mantis
  pf2e_pos1:    'PoS1',      // Prey of Shadows
  pf2e_tal:     'TAL',       // The Alchemy Lesson
  pf2e_sf0:     'SF0',       // Starfinder 2e Playtest

  // ── Custom ──────────────────────────────────────────────────
  'custom-pf2e': 'Custom',
};

export default PF2E_SOURCE_BADGES;
