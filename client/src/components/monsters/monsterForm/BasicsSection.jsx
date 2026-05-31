import Section from './Section';
import {
  SIZE_OPTIONS, TYPE_OPTIONS, ALIGNMENT_OPTIONS, CR_OPTIONS,
  PF2E_SIZE_OPTIONS, PF2E_RARITY_OPTIONS, PF2E_LEVEL_RANGE,
} from '../../../utils/monsterFormHelpers';

/* Name / size / type / AC / HP / speed — the "Basics" accordion section.
 * Branches on game system; everything reads/writes through `update`. */
export default function BasicsSection({ form, update, isPf2e, open, onToggle }) {
  return (
    <Section title="Basics" id="basics" open={open} onToggle={onToggle}>
      {isPf2e ? (
        <>
          <div className="monster-form__row">
            <label className="monster-form__field monster-form__field--wide">
              <span>Name *</span>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} maxLength={100} />
            </label>
            <label className="monster-form__field">
              <span>Level</span>
              <input
                type="number"
                min={PF2E_LEVEL_RANGE.min}
                max={PF2E_LEVEL_RANGE.max}
                value={form.level}
                onChange={e => update('level', parseInt(e.target.value) || 0)}
              />
            </label>
          </div>
          <div className="monster-form__row">
            <label className="monster-form__field">
              <span>Size</span>
              <select value={form.size} onChange={e => update('size', e.target.value)}>
                {PF2E_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="monster-form__field">
              <span>Creature Type / Traits</span>
              <input
                type="text"
                value={form.type}
                onChange={e => update('type', e.target.value)}
                placeholder="e.g. Humanoid, Animal"
              />
            </label>
            <label className="monster-form__field">
              <span>Rarity</span>
              <select value={form.rarity} onChange={e => update('rarity', e.target.value)}>
                {PF2E_RARITY_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
          <div className="monster-form__row">
            <label className="monster-form__field">
              <span>AC</span>
              <input type="number" min={0} max={99} value={form.ac} onChange={e => update('ac', parseInt(e.target.value) || 0)} />
            </label>
            <label className="monster-form__field">
              <span>AC Description</span>
              <input type="text" value={form.acDesc} onChange={e => update('acDesc', e.target.value)} placeholder="e.g. +1 plate armor" />
            </label>
            <label className="monster-form__field">
              <span>HP</span>
              <input type="number" min={1} value={form.hp} onChange={e => update('hp', parseInt(e.target.value) || 1)} />
            </label>
          </div>
          <div className="monster-form__row">
            <label className="monster-form__field monster-form__field--full">
              <span>Speed</span>
              <input type="text" value={form.speed} onChange={e => update('speed', e.target.value)} placeholder="25 feet, fly 40 feet" />
            </label>
          </div>
          <div className="monster-form__row">
            <label className="monster-form__field">
              <span>Perception</span>
              <input
                type="number"
                min={-10}
                max={50}
                value={form.perception}
                onChange={e => update('perception', parseInt(e.target.value) || 0)}
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="monster-form__row">
            <label className="monster-form__field monster-form__field--wide">
              <span>Name *</span>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} maxLength={100} />
            </label>
            <label className="monster-form__field">
              <span>CR</span>
              <select value={form.cr} onChange={e => update('cr', e.target.value)}>
                {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{cr}</option>)}
              </select>
            </label>
          </div>
          <div className="monster-form__row">
            <label className="monster-form__field">
              <span>Size</span>
              <select value={form.size} onChange={e => update('size', e.target.value)}>
                {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="monster-form__field">
              <span>Type</span>
              <select value={form.type} onChange={e => update('type', e.target.value)}>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="monster-form__field">
              <span>Alignment</span>
              <select value={form.alignment} onChange={e => update('alignment', e.target.value)}>
                <option value="">None</option>
                {ALIGNMENT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <div className="monster-form__row">
            <label className="monster-form__field">
              <span>AC</span>
              <input type="number" min={0} max={99} value={form.ac} onChange={e => update('ac', parseInt(e.target.value) || 0)} />
            </label>
            <label className="monster-form__field">
              <span>AC Description</span>
              <input type="text" value={form.acDesc} onChange={e => update('acDesc', e.target.value)} placeholder="e.g. natural armor" />
            </label>
            <label className="monster-form__field">
              <span>HP</span>
              <input type="number" min={1} value={form.hp} onChange={e => update('hp', parseInt(e.target.value) || 1)} />
            </label>
            <label className="monster-form__field">
              <span>HP Formula</span>
              <input type="text" value={form.hpFormula} onChange={e => update('hpFormula', e.target.value)} placeholder="e.g. 6d8+18" />
            </label>
          </div>
          <label className="monster-form__field monster-form__field--full">
            <span>Speed</span>
            <input type="text" value={form.speed} onChange={e => update('speed', e.target.value)} placeholder="30 ft., fly 60 ft." />
          </label>
        </>
      )}
    </Section>
  );
}
