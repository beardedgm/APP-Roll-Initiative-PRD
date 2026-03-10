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

const EncounterSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:             { type: String, required: true, trim: true, default: 'New Encounter' },
  shareCode:        { type: String, unique: true, sparse: true },
  state:            { type: String, enum: ['pre-combat', 'combat'], default: 'pre-combat' },
  currentRound:     { type: Number, default: 1 },
  activeCreatureId: { type: String, default: null },
  combatants:       [CombatantSchema],
  diceHistory:      { type: Array, default: [] },
  lastSyncedAt:     { type: Date, default: Date.now },
}, { timestamps: true });

EncounterSchema.statics.generateShareCode = function () {
  return crypto.randomBytes(4).toString('hex'); // 8-char hex code
};

const Encounter = mongoose.model('Encounter', EncounterSchema);
export default Encounter;
