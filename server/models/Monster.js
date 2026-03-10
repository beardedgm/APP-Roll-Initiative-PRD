import mongoose from 'mongoose';

const MonsterSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  slug:       { type: String, required: true, unique: true },
  source:     { type: String, required: true },
  sourceKey:  { type: String, required: true },
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
  rawMarkdown: { type: String, required: true },
}, { timestamps: true });

MonsterSchema.index({ name: 'text', type: 'text', source: 'text' });
MonsterSchema.index({ crNumeric: 1 });
MonsterSchema.index({ sourceKey: 1 });
MonsterSchema.index({ name: 1 });

const Monster = mongoose.model('Monster', MonsterSchema);

export default Monster;
