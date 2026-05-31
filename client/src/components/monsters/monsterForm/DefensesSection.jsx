import Section from './Section';

/* Saves / skills / resistances / immunities / senses / languages. Branches on
 * game system (PF2e saves + immunities/resistances/weaknesses vs 5e saving
 * throws + damage res/imm/vuln + condition immunities). */
export default function DefensesSection({ form, update, isPf2e, open, onToggle }) {
  return (
    <Section title="Defenses &amp; Senses" id="defenses" open={open} onToggle={onToggle}>
      {isPf2e && (
        <div className="monster-form__row">
          <label className="monster-form__field">
            <span>Fort</span>
            <input
              type="number" min={-10} max={40}
              value={form.fort}
              onChange={e => update('fort', parseInt(e.target.value) || 0)}
            />
          </label>
          <label className="monster-form__field">
            <span>Ref</span>
            <input
              type="number" min={-10} max={40}
              value={form.ref}
              onChange={e => update('ref', parseInt(e.target.value) || 0)}
            />
          </label>
          <label className="monster-form__field">
            <span>Will</span>
            <input
              type="number" min={-10} max={40}
              value={form.will}
              onChange={e => update('will', parseInt(e.target.value) || 0)}
            />
          </label>
        </div>
      )}
      {!isPf2e && (
        <label className="monster-form__field monster-form__field--full">
          <span>Saving Throws</span>
          <input type="text" value={form.savingThrows} onChange={e => update('savingThrows', e.target.value)} placeholder="e.g. Dex +5, Con +3" />
        </label>
      )}
      <label className="monster-form__field monster-form__field--full">
        <span>Skills</span>
        <input type="text" value={form.skills} onChange={e => update('skills', e.target.value)} placeholder="e.g. Perception +5, Stealth +4" />
      </label>
      {isPf2e ? (
        <>
          <label className="monster-form__field monster-form__field--full">
            <span>Immunities</span>
            <input type="text" value={form.immunities} onChange={e => update('immunities', e.target.value)} />
          </label>
          <label className="monster-form__field monster-form__field--full">
            <span>Resistances</span>
            <input type="text" value={form.resistances} onChange={e => update('resistances', e.target.value)} />
          </label>
          <label className="monster-form__field monster-form__field--full">
            <span>Weaknesses</span>
            <input type="text" value={form.weaknesses} onChange={e => update('weaknesses', e.target.value)} />
          </label>
        </>
      ) : (
        <>
          <label className="monster-form__field monster-form__field--full">
            <span>Damage Resistances</span>
            <input type="text" value={form.damageResistances} onChange={e => update('damageResistances', e.target.value)} placeholder="e.g. Fire, Cold" />
          </label>
          <label className="monster-form__field monster-form__field--full">
            <span>Damage Immunities</span>
            <input type="text" value={form.damageImmunities} onChange={e => update('damageImmunities', e.target.value)} />
          </label>
          <label className="monster-form__field monster-form__field--full">
            <span>Damage Vulnerabilities</span>
            <input type="text" value={form.damageVulnerabilities} onChange={e => update('damageVulnerabilities', e.target.value)} />
          </label>
          <label className="monster-form__field monster-form__field--full">
            <span>Condition Immunities</span>
            <input type="text" value={form.conditionImmunities} onChange={e => update('conditionImmunities', e.target.value)} />
          </label>
        </>
      )}
      <label className="monster-form__field monster-form__field--full">
        <span>Senses</span>
        <input type="text" value={form.senses} onChange={e => update('senses', e.target.value)} placeholder="e.g. darkvision 60 ft., passive Perception 13" />
      </label>
      <label className="monster-form__field monster-form__field--full">
        <span>Languages</span>
        <input type="text" value={form.languages} onChange={e => update('languages', e.target.value)} placeholder="e.g. Common, Draconic" />
      </label>
    </Section>
  );
}
