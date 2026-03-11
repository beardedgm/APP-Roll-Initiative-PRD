import { useState, useCallback, useEffect } from 'react';
import Modal from '../ui/Modal';
import useUIStore from '../../store/useUIStore';
import { useCurrentUser } from '../../api/useAuth';
import { useCreateMonster, useUpdateMonster } from '../../api/useMonsters';
import { saveLocalMonster } from '../../utils/customMonsterStorage';
import {
  SIZE_OPTIONS, TYPE_OPTIONS, ALIGNMENT_OPTIONS, CR_OPTIONS,
  ABILITY_NAMES, ABILITY_LABELS, formatModifier,
  getDefaultFormData, formDataToMonsterAPI,
} from '../../utils/monsterFormHelpers';

export default function MonsterFormModal({ editMonster: editMonsterProp, onLocalSave }) {
  const closeModal = useUIStore(s => s.closeModal);
  const editMonsterStore = useUIStore(s => s.editMonsterData);
  const createMonster = useCreateMonster();
  const updateMonster = useUpdateMonster();
  const { data: user } = useCurrentUser();
  const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');

  const editMonster = editMonsterProp || editMonsterStore;
  const isEdit = !!editMonster;
  const mergedEdit = editMonster ? { ...getDefaultFormData(), ...editMonster } : null;
  const [form, setForm] = useState(() => mergedEdit || getDefaultFormData());
  const [openSections, setOpenSections] = useState({ basics: true });

  // Reset form when editMonster changes (opening modal with different data)
  useEffect(() => {
    setForm(editMonster ? { ...getDefaultFormData(), ...editMonster } : getDefaultFormData());
  }, [editMonster]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateAbility(stat, value) {
    const num = Math.max(1, Math.min(30, parseInt(value) || 1));
    setForm(prev => ({ ...prev, abilities: { ...prev.abilities, [stat]: num } }));
  }

  function toggleSection(id) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Repeatable entries (traits, actions, reactions, legendary)
  function addEntry(key) {
    setForm(prev => ({ ...prev, [key]: [...prev[key], { name: '', description: '' }] }));
  }
  function updateEntry(key, idx, field, value) {
    setForm(prev => {
      const arr = [...prev[key]];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...prev, [key]: arr };
    });
  }
  function removeEntry(key, idx) {
    setForm(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  }

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = formDataToMonsterAPI(form);
      if (isPremium) {
        if (isEdit && editMonster?.slug) {
          await updateMonster.mutateAsync({ slug: editMonster.slug, ...payload });
        } else {
          await createMonster.mutateAsync(payload);
        }
      } else {
        if (isEdit && editMonster?.slug) {
          saveLocalMonster({ ...payload, slug: editMonster.slug });
        } else {
          saveLocalMonster(payload);
        }
        onLocalSave?.();
      }
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Save failed');
      setSaving(false);
    }
  }, [form, isPremium, isEdit, editMonster, createMonster, updateMonster, closeModal, onLocalSave]);

  return (
    <Modal id="monster-form" title={isEdit ? `Edit ${form.name || 'Monster'}` : 'Create Custom Monster'}>
      <div className="monster-form">
        {error && <div className="monster-form__error">{error}</div>}

        {/* ── Basics ─────────────────────────────────── */}
        <Section title="Basics" id="basics" open={openSections.basics} onToggle={toggleSection}>
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
        </Section>

        {/* ── Ability Scores ────────────────────────── */}
        <Section title="Ability Scores" id="abilities" open={openSections.abilities} onToggle={toggleSection}>
          <div className="monster-form__abilities">
            {ABILITY_NAMES.map(stat => (
              <label key={stat} className="monster-form__ability">
                <span className="monster-form__ability-label">{ABILITY_LABELS[stat]}</span>
                <input
                  type="number" min={1} max={30}
                  value={form.abilities[stat]}
                  onChange={e => updateAbility(stat, e.target.value)}
                />
                <span className="monster-form__ability-mod">{formatModifier(form.abilities[stat])}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* ── Defenses & Senses ─────────────────────── */}
        <Section title="Defenses &amp; Senses" id="defenses" open={openSections.defenses} onToggle={toggleSection}>
          <label className="monster-form__field monster-form__field--full">
            <span>Saving Throws</span>
            <input type="text" value={form.savingThrows} onChange={e => update('savingThrows', e.target.value)} placeholder="e.g. Dex +5, Con +3" />
          </label>
          <label className="monster-form__field monster-form__field--full">
            <span>Skills</span>
            <input type="text" value={form.skills} onChange={e => update('skills', e.target.value)} placeholder="e.g. Perception +5, Stealth +4" />
          </label>
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
          <label className="monster-form__field monster-form__field--full">
            <span>Senses</span>
            <input type="text" value={form.senses} onChange={e => update('senses', e.target.value)} placeholder="e.g. darkvision 60 ft., passive Perception 13" />
          </label>
          <label className="monster-form__field monster-form__field--full">
            <span>Languages</span>
            <input type="text" value={form.languages} onChange={e => update('languages', e.target.value)} placeholder="e.g. Common, Draconic" />
          </label>
        </Section>

        {/* ── Traits ────────────────────────────────── */}
        <Section title={`Traits (${form.traits.length})`} id="traits" open={openSections.traits} onToggle={toggleSection}>
          <RepeatableEntries entries={form.traits} entryKey="traits" onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        </Section>

        {/* ── Actions ───────────────────────────────── */}
        <Section title={`Actions (${form.actions.length})`} id="actions" open={openSections.actions} onToggle={toggleSection}>
          <RepeatableEntries entries={form.actions} entryKey="actions" onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        </Section>

        {/* ── Reactions ─────────────────────────────── */}
        <Section title={`Reactions (${form.reactions.length})`} id="reactions" open={openSections.reactions} onToggle={toggleSection}>
          <RepeatableEntries entries={form.reactions} entryKey="reactions" onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        </Section>

        {/* ── Legendary Actions ─────────────────────── */}
        <Section title={`Legendary Actions (${form.legendaryActions.length})`} id="legendary" open={openSections.legendary} onToggle={toggleSection}>
          <RepeatableEntries entries={form.legendaryActions} entryKey="legendaryActions" onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        </Section>

        {/* ── Raw Markdown ──────────────────────────── */}
        <Section title="Raw Markdown (Advanced)" id="rawMarkdown" open={openSections.rawMarkdown} onToggle={toggleSection}>
          <p className="monster-form__hint">Optional. If provided, overrides the auto-generated stat block display.</p>
          <textarea
            className="monster-form__markdown"
            value={form.rawMarkdown}
            onChange={e => update('rawMarkdown', e.target.value)}
            rows={10}
            maxLength={50000}
            placeholder="# Monster Name&#10;*Size Type, alignment*&#10;---&#10;**Armor Class** 15&#10;..."
          />
        </Section>

        {/* ── Save ──────────────────────────────────── */}
        <button className="btn btn--primary monster-form__submit" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Update Monster' : isPremium ? 'Save to Library' : 'Save Locally'}
        </button>
        {!isPremium && (
          <p className="monster-form__local-note">Saved to browser storage (max 50). Upgrade for cloud sync.</p>
        )}
      </div>
    </Modal>
  );
}

/* ── Accordion Section ────────────────────────────────────── */
function Section({ title, id, open, onToggle, children }) {
  return (
    <div className={`monster-form__section ${open ? 'monster-form__section--open' : ''}`}>
      <button className="monster-form__section-header" onClick={() => onToggle(id)} type="button">
        <span>{title}</span>
        <span className="monster-form__section-arrow">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && <div className="monster-form__section-body">{children}</div>}
    </div>
  );
}

/* ── Repeatable Name + Description Entries ─────────────────── */
function RepeatableEntries({ entries, entryKey, onAdd, onUpdate, onRemove }) {
  return (
    <div className="monster-form__entries">
      {entries.map((entry, i) => (
        <div key={i} className="monster-form__entry">
          <div className="monster-form__entry-header">
            <input
              type="text"
              className="monster-form__entry-name"
              value={entry.name}
              onChange={e => onUpdate(entryKey, i, 'name', e.target.value)}
              placeholder="Name"
            />
            <button className="btn btn--remove btn--sm" onClick={() => onRemove(entryKey, i)} title="Remove">&times;</button>
          </div>
          <textarea
            className="monster-form__entry-desc"
            value={entry.description}
            onChange={e => onUpdate(entryKey, i, 'description', e.target.value)}
            placeholder="Description..."
            rows={3}
          />
        </div>
      ))}
      <button className="btn btn--sm" onClick={() => onAdd(entryKey)}>+ Add</button>
    </div>
  );
}
