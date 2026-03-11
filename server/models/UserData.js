import mongoose from 'mongoose';

const CharacterSchema = new mongoose.Schema({
  id:                 { type: String, required: true },
  name:               { type: String, required: true },
  type:               { type: String, enum: ['player', 'npc'], default: 'player' },
  maxHP:              { type: Number, default: null },
  ac:                 { type: Number, default: 10 },
  initMod:            { type: Number, default: 0 },
  createdAt:          { type: Date, default: Date.now },
  updatedAt:          { type: Date, default: Date.now },
}, { _id: false });

const CustomMonsterSchema = new mongoose.Schema({
  slug:                 { type: String, required: true },
  name:                 { type: String, required: true },
  size:                 { type: String },
  type:                 { type: String },
  alignment:            { type: String },
  ac:                   { type: Number },
  acDesc:               { type: String },
  hp:                   { type: Number },
  hpFormula:            { type: String },
  speed:                { type: String },
  abilities:            { type: mongoose.Schema.Types.Mixed },
  savingThrows:         { type: String },
  skills:               { type: String },
  damageResistances:    { type: String },
  damageImmunities:     { type: String },
  damageVulnerabilities:{ type: String },
  conditionImmunities:  { type: String },
  senses:               { type: String },
  languages:            { type: String },
  cr:                   { type: String },
  initMod:              { type: Number },
  traits:               [{ name: String, description: String, _id: false }],
  actions:              [{ name: String, description: String, _id: false }],
  reactions:            [{ name: String, description: String, _id: false }],
  legendaryActions:     [{ name: String, description: String, _id: false }],
  rawMarkdown:          { type: String },
  createdAt:            { type: Date, default: Date.now },
  updatedAt:            { type: Date, default: Date.now },
}, { _id: false });

const EncounterPresetSchema = new mongoose.Schema({
  id:                { type: String, required: true },
  name:              { type: String, required: true },
  combatants:        [{ type: mongoose.Schema.Types.Mixed }],
  state:             { type: String, enum: ['pre-combat', 'combat'], default: 'pre-combat' },
  currentRound:      { type: Number, default: 1 },
  activeCreatureId:  { type: String, default: null },
  diceHistory:       [{ type: mongoose.Schema.Types.Mixed }],
  createdAt:         { type: Date, default: Date.now },
  updatedAt:         { type: Date, default: Date.now },
}, { _id: false });

const UserDataSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  version:           { type: Number, default: 1 },
  characters:        [CharacterSchema],
  customMonsters:    [CustomMonsterSchema],
  encounterPresets:  [EncounterPresetSchema],
}, { timestamps: true });

const UserData = mongoose.model('UserData', UserDataSchema);
export default UserData;
