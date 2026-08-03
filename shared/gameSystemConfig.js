// shared/gameSystemConfig.js
// Pure config — no dependencies. Importable by both Node.js and Vite.

export const GAME_SYSTEMS = {
  '5e': {
    label: 'D&D 5E',
    creatures: {
      // Lowercase — the tracked dir name. A capitalized path resolves on
      // case-insensitive Windows but finds nothing on a Linux FS.
      directory: 'monsters/5e',
      crLabel: 'CR',
      crAllLabel: 'All CRs',
      crOptions: [
        '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
        '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23',
        '24', '25', '26', '27', '28', '29', '30',
      ],
    },
    spells: {
      directory: 'spells/5e',
      primaryFilter: {
        label: 'All Schools',
        paramName: 'school',
        options: [
          { value: 'Abjuration', label: 'Abjuration' },
          { value: 'Conjuration', label: 'Conjuration' },
          { value: 'Divination', label: 'Divination' },
          { value: 'Enchantment', label: 'Enchantment' },
          { value: 'Evocation', label: 'Evocation' },
          { value: 'Illusion', label: 'Illusion' },
          { value: 'Necromancy', label: 'Necromancy' },
          { value: 'Transmutation', label: 'Transmutation' },
        ],
      },
      levelLabel: 'Level',
      levelAllLabel: 'All Levels',
      levelOptions: [
        { value: '0', label: 'Cantrip' },
        { value: '1', label: '1st Level' },
        { value: '2', label: '2nd Level' },
        { value: '3', label: '3rd Level' },
        { value: '4', label: '4th Level' },
        { value: '5', label: '5th Level' },
        { value: '6', label: '6th Level' },
        { value: '7', label: '7th Level' },
        { value: '8', label: '8th Level' },
        { value: '9', label: '9th Level' },
      ],
    },
  },
  'pf2e': {
    label: 'PF2E',
    creatures: {
      directory: 'monsters/pf2e',
      crLabel: 'Level',
      crAllLabel: 'All Levels',
      crOptions: [
        '-1', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
        '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
        '21', '22', '23', '24', '25',
      ],
    },
    spells: {
      directory: 'spells/pf2e',
      primaryFilter: {
        label: 'All Categories',
        paramName: 'category',
        options: [
          { value: 'arcane', label: 'Arcane' },
          { value: 'divine', label: 'Divine' },
          { value: 'occult', label: 'Occult' },
          { value: 'primal', label: 'Primal' },
          { value: 'elemental', label: 'Elemental' },
          { value: 'focus', label: 'Focus Spells' },
          { value: 'ritual', label: 'Ritual Spells' },
        ],
      },
      levelLabel: 'Rank',
      levelAllLabel: 'All Ranks',
      levelOptions: [
        { value: '0', label: 'Cantrip' },
        { value: '1', label: 'Rank 1' },
        { value: '2', label: 'Rank 2' },
        { value: '3', label: 'Rank 3' },
        { value: '4', label: 'Rank 4' },
        { value: '5', label: 'Rank 5' },
        { value: '6', label: 'Rank 6' },
        { value: '7', label: 'Rank 7' },
        { value: '8', label: 'Rank 8' },
        { value: '9', label: 'Rank 9' },
        { value: '10', label: 'Rank 10' },
      ],
    },
  },
};
