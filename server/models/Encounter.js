import mongoose from 'mongoose';
import crypto from 'crypto';

const CombatantSchema = new mongoose.Schema({
  id:                 { type: String, required: true },
  name:               { type: String, required: true },
  type:               { type: String, enum: ['player', 'monster', 'npc'], default: 'monster' },
  initiative:         { type: Number, default: 0 },
  initiativeModifier: { type: Number, default: 0 },
  ac:                 { type: Number, default: 10 },
  hp: {
    current: { type: Number, required: true },
    max:     { type: Number, required: true },
  },
  status:      { type: String, enum: ['normal', 'unconscious'], default: 'normal' },
  monsterSlug: { type: String },
}, { _id: false });

const DiceHistoryEntrySchema = new mongoose.Schema({
  id:        { type: String, required: true },
  sides:     { type: Number, required: true },
  count:     { type: Number, required: true },
  modifier:  { type: Number, required: true },
  advantage: { type: String, enum: ['normal', 'advantage', 'disadvantage'], required: true },
  rolls:     { type: [Number], required: true },
  total:     { type: Number, required: true },
}, { _id: false });

const SharedRollSchema = new mongoose.Schema({
  id:        { type: String, required: true },
  label:     { type: String, required: true },
  sides:     { type: Number, required: true },
  count:     { type: Number, required: true },
  modifier:  { type: Number, required: true },
  advantage: { type: String, enum: ['normal', 'advantage', 'disadvantage'], required: true },
  rolls:     { type: [Number], required: true },
  total:     { type: Number, required: true },
  timestamp: { type: Number, required: true },
}, { _id: false });

const EncounterSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:             { type: String, required: true, trim: true, default: 'New Encounter' },
  shareCode:        { type: String, unique: true, sparse: true },
  state:            { type: String, enum: ['pre-combat', 'combat'], default: 'pre-combat' },
  currentRound:     { type: Number, default: 1 },
  activeCreatureId: { type: String, default: null },
  combatants:       [CombatantSchema],
  diceHistory:      [DiceHistoryEntrySchema],
  latestSharedRoll: { type: SharedRollSchema, default: null },
  lastSyncedAt:     { type: Date, default: Date.now },
  rev:              { type: Number, default: 0 },
}, { timestamps: true });

// Compound index supports the common "list a user's encounters by recency" query
// (scoped by userId, sorted by updatedAt desc) without an in-memory sort.
EncounterSchema.index({ userId: 1, updatedAt: -1 });

EncounterSchema.statics.generateShareCode = function () {
  return crypto.randomBytes(8).toString('hex'); // 16-char hex code
};

const Encounter = mongoose.model('Encounter', EncounterSchema);
export default Encounter;
