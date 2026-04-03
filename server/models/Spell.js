import mongoose from 'mongoose';

const SpellSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  source:      { type: String, required: true },
  sourceKey:   { type: String, required: true },
  gameSystem:  { type: String, enum: ['5e', 'pf2e'], default: '5e', index: true },
  level:       { type: Number },          // 0 = cantrip, 1-9 for 5e; rank 1-10 for PF2e
  school:      { type: String },          // Evocation, Conjuration, etc.
  classes:     [{ type: String }],        // 5e: Wizard, Cleric, etc. PF2e: traditions
  castingTime: { type: String },
  range:       { type: String },
  components:  { type: String },          // "V, S, M (bat guano)"
  duration:    { type: String },
  rawMarkdown: { type: String },
}, { timestamps: true });

SpellSchema.index({ name: 'text', school: 'text', source: 'text' });
SpellSchema.index({ level: 1 });
SpellSchema.index({ sourceKey: 1 });
SpellSchema.index({ name: 1 });
SpellSchema.index({ gameSystem: 1, sourceKey: 1 });
SpellSchema.index({ gameSystem: 1, level: 1 });

const Spell = mongoose.model('Spell', SpellSchema);

export default Spell;
