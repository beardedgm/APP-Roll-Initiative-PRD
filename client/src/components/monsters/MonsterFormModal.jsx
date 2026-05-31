import { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import useUIStore from '../../store/useUIStore';
import useUserDataStore from '../../store/useUserDataStore';
import {
  getDefaultFormData, formDataToMonsterAPI,
  getDefaultPf2eFormData, pf2eFormDataToMonsterAPI,
  withEntryIds, newEntryId,
} from '../../utils/monsterFormHelpers';
import Section from './monsterForm/Section';
import RepeatableEntries from './monsterForm/RepeatableEntries';
import BasicsSection from './monsterForm/BasicsSection';
import AbilitiesSection from './monsterForm/AbilitiesSection';
import DefensesSection from './monsterForm/DefensesSection';

export default function MonsterFormModal({ editMonster: editMonsterProp }) {
  const closeModal = useUIStore(s => s.closeModal);
  const editMonsterStore = useUIStore(s => s.editMonsterData);
  const modalData = useUIStore(s => s.modalData);
  const addCustomMonster = useUserDataStore(s => s.addCustomMonster);
  const updateCustomMonster = useUserDataStore(s => s.updateCustomMonster);
  const findCustomMonsterByName = useUserDataStore(s => s.findCustomMonsterByName);

  const editMonster = editMonsterProp || editMonsterStore;
  const isEdit = !!editMonster;
  const gameSystem = modalData?.gameSystem || editMonster?.gameSystem || '5e';
  const isPf2e = gameSystem === 'pf2e';

  const [form, setForm] = useState(() => {
    const base = isPf2e ? getDefaultPf2eFormData() : getDefaultFormData();
    return withEntryIds(editMonster ? { ...base, ...editMonster } : base);
  });
  const [openSections, setOpenSections] = useState({ basics: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }
  function updateAbility(stat, value) {
    const num = Math.max(1, Math.min(30, parseInt(value) || 1));
    setForm(prev => ({ ...prev, abilities: { ...prev.abilities, [stat]: num } }));
  }
  function updateAbilityMod(stat, value) {
    const num = Math.max(-5, Math.min(10, parseInt(value) || 0));
    setForm(prev => ({ ...prev, abilities: { ...prev.abilities, [stat]: num } }));
  }
  function toggleSection(id) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Repeatable entries (traits, actions, reactions, legendary) — keyed by id.
  function addEntry(key) {
    setForm(prev => ({ ...prev, [key]: [...prev[key], { id: newEntryId(), name: '', description: '' }] }));
  }
  function updateEntry(key, id, field, value) {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].map(e => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  }
  function removeEntry(key, id) {
    setForm(prev => ({ ...prev, [key]: prev[key].filter(e => e.id !== id) }));
  }

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = isPf2e ? pf2eFormDataToMonsterAPI(form) : formDataToMonsterAPI(form);
      if (isEdit && editMonster?.slug) {
        updateCustomMonster(editMonster.slug, payload);
      } else {
        // Check for existing custom monster with same name
        const existing = findCustomMonsterByName(form.name);
        if (existing) {
          const overwrite = window.confirm(
            `A custom creature named "${existing.name}" already exists. Do you want to overwrite it?`
          );
          if (!overwrite) { setSaving(false); return; }
          addCustomMonster(payload, existing.slug);
        } else {
          addCustomMonster(payload);
        }
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Save failed');
      setSaving(false);
    }
  }, [form, isPf2e, isEdit, editMonster, addCustomMonster, updateCustomMonster, findCustomMonsterByName, closeModal]);

  const modalTitle = isEdit
    ? `Edit ${form.name || (isPf2e ? 'Creature' : 'Monster')}`
    : isPf2e ? 'Create Custom Creature' : 'Create Custom Monster';

  const entrySection = (key, label) => (
    <Section title={`${label} (${form[key].length})`} id={key} open={openSections[key]} onToggle={toggleSection}>
      <RepeatableEntries entries={form[key]} entryKey={key} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
    </Section>
  );

  return (
    <Modal id="monster-form" key={editMonster?.slug || 'create'} title={modalTitle}>
      <div className="monster-form">
        {error && <div className="monster-form__error">{error}</div>}

        <BasicsSection form={form} update={update} isPf2e={isPf2e} open={openSections.basics} onToggle={toggleSection} />
        <AbilitiesSection form={form} isPf2e={isPf2e} updateAbility={updateAbility} updateAbilityMod={updateAbilityMod} open={openSections.abilities} onToggle={toggleSection} />
        <DefensesSection form={form} update={update} isPf2e={isPf2e} open={openSections.defenses} onToggle={toggleSection} />

        {entrySection('traits', 'Traits')}
        {entrySection('actions', 'Actions')}
        {entrySection('reactions', 'Reactions')}
        {!isPf2e && entrySection('legendaryActions', 'Legendary Actions')}

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

        <button className="btn btn--primary monster-form__submit" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? `Update ${isPf2e ? 'Creature' : 'Monster'}` : `Save ${isPf2e ? 'Creature' : 'Monster'}`}
        </button>
      </div>
    </Modal>
  );
}
