import mongoose from 'mongoose';

const MonsterSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  slug:       { type: String, required: true, unique: true },
  source:     { type: String, required: true },
  sourceKey:  { type: String, required: true },
  gameSystem: { type: String, enum: ['5e', 'pf2e'], default: '5e', index: true },
  cr:         { type: String },
  crNumeric:  { type: Number },
  hp:         { type: Number },
  hpFormula:  { type: String },
  ac:         { type: Number },
  acDesc:     { type: String },
  initMod:    { type: Number, default: 0 },
  size:       { type: String },
  type:       { type: String },
  alignment:  { type: String },
  abilities: {
    str: Number,
    dex: Number,
    con: Number,
    int: Number,
    wis: Number,
    cha: Number,
  },
  rawMarkdown: { type: String },
  isCustom:   { type: Boolean, default: false },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isPublic:   { type: Boolean, default: false },
}, { timestamps: true });

MonsterSchema.index({ name: 'text', type: 'text', source: 'text' });
MonsterSchema.index({ crNumeric: 1 });
MonsterSchema.index({ sourceKey: 1 });
MonsterSchema.index({ name: 1 });
MonsterSchema.index({ isCustom: 1, createdBy: 1 });
MonsterSchema.index({ gameSystem: 1, sourceKey: 1 });

const Monster = mongoose.model('Monster', MonsterSchema);

export default Monster;
