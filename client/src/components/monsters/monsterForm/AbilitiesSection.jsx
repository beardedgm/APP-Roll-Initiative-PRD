import Section from './Section';
import { ABILITY_NAMES, ABILITY_LABELS, formatModifier } from '../../../utils/monsterFormHelpers';

/* Ability scores (5e, 1-30) or ability modifiers (PF2e, -5..+10). */
export default function AbilitiesSection({ form, isPf2e, updateAbility, updateAbilityMod, open, onToggle }) {
  return (
    <Section title={isPf2e ? 'Ability Modifiers' : 'Ability Scores'} id="abilities" open={open} onToggle={onToggle}>
      <div className="monster-form__abilities">
        {ABILITY_NAMES.map(stat => (
          <label key={stat} className="monster-form__ability">
            <span className="monster-form__ability-label">{ABILITY_LABELS[stat]}</span>
            {isPf2e ? (
              <>
                <input
                  type="number" min={-5} max={10}
                  value={form.abilities[stat]}
                  onChange={e => updateAbilityMod(stat, e.target.value)}
                />
                <span className="monster-form__ability-mod">
                  {form.abilities[stat] >= 0 ? `+${form.abilities[stat]}` : String(form.abilities[stat])}
                </span>
              </>
            ) : (
              <>
                <input
                  type="number" min={1} max={30}
                  value={form.abilities[stat]}
                  onChange={e => updateAbility(stat, e.target.value)}
                />
                <span className="monster-form__ability-mod">{formatModifier(form.abilities[stat])}</span>
              </>
            )}
          </label>
        ))}
      </div>
    </Section>
  );
}
