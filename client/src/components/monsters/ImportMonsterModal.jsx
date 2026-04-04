import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import useUIStore from '../../store/useUIStore';
import useUserDataStore from '../../store/useUserDataStore';
import { parseMonsterJSON, validateMonsterData, MONSTER_JSON_TEMPLATE, PF2E_MONSTER_JSON_TEMPLATE, parsePf2eMonsterJSON, validatePf2eMonsterData } from '../../utils/monsterImport';

export default function ImportMonsterModal() {
  const closeModal = useUIStore(s => s.closeModal);
  const addCustomMonster = useUserDataStore(s => s.addCustomMonster);

  const modalData = useUIStore(s => s.modalData);
  // Track user override separately; reset when modalData changes
  const [systemOverride, setSystemOverride] = useState(null);
  const lastModalSystem = useRef(modalData?.gameSystem);
  if (modalData?.gameSystem !== lastModalSystem.current) {
    lastModalSystem.current = modalData?.gameSystem;
    if (systemOverride !== null) setSystemOverride(null);
  }
  const gameSystem = systemOverride ?? modalData?.gameSystem ?? '5e';
  const isPf2e = gameSystem === 'pf2e';

  const [tab, setTab] = useState('paste'); // 'paste' | 'upload'
  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  function reset() {
    setJsonText('');
    setParsed(null);
    setErrors([]);
    setSaving(false);
  }

  function handleParse(text) {
    setErrors([]);
    setParsed(null);
    try {
      // Auto-detect PF2e format by checking for PF2e-specific fields
      let raw;
      try { raw = JSON.parse(text); } catch { raw = null; }
      const looksLikePf2e = raw && (
        raw.level !== undefined ||
        raw.abilityMods !== undefined ||
        raw.defenses !== undefined ||
        (raw.creature && Array.isArray(raw.creature))
      );

      // If auto-detected as PF2e, switch the toggle too
      const usePf2e = isPf2e || looksLikePf2e;
      if (looksLikePf2e && !isPf2e) {
        setSystemOverride('pf2e');
      }

      const monster = usePf2e ? parsePf2eMonsterJSON(text) : parseMonsterJSON(text);
      const validationErrors = usePf2e ? validatePf2eMonsterData(monster) : validateMonsterData(monster);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      setParsed(monster);
    } catch (err) {
      setErrors([err.message]);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setJsonText(text);
      handleParse(text);
    };
    reader.onerror = () => setErrors(['Failed to read file.']);
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleLoadTemplate() {
    const template = isPf2e ? PF2E_MONSTER_JSON_TEMPLATE : MONSTER_JSON_TEMPLATE;
    const text = JSON.stringify(template, null, 2);
    setJsonText(text);
    setParsed(null);
    setErrors([]);
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    try {
      addCustomMonster(parsed);
      reset();
      closeModal();
    } catch (err) {
      setErrors([err.message || 'Save failed']);
      setSaving(false);
    }
  }

  const fmtMod = (n) => n >= 0 ? `+${n}` : String(n);

  return (
    <Modal id="import-monster" title={`Import ${isPf2e ? 'PF2e Creature' : '5e Monster'}`}>
      <div className="import-monster">
        {/* Game system toggle */}
        <div className="import-monster__system-toggle">
          <button
            className={`import-monster__system-btn${!isPf2e ? ' import-monster__system-btn--active' : ''}`}
            onClick={() => { setSystemOverride('5e'); reset(); }}
            type="button"
          >
            D&amp;D 5E
          </button>
          <button
            className={`import-monster__system-btn${isPf2e ? ' import-monster__system-btn--active' : ''}`}
            onClick={() => { setSystemOverride('pf2e'); reset(); }}
            type="button"
          >
            PF2E
          </button>
        </div>

        {/* Input method tabs + action buttons */}
        <div className="import-monster__toolbar">
          <div className="import-monster__tabs">
            <button
              className={`import-monster__tab ${tab === 'paste' ? 'import-monster__tab--active' : ''}`}
              onClick={() => { setTab('paste'); reset(); }}
            >
              Paste JSON
            </button>
            <button
              className={`import-monster__tab ${tab === 'upload' ? 'import-monster__tab--active' : ''}`}
              onClick={() => { setTab('upload'); reset(); }}
            >
              Upload File
            </button>
          </div>
          {tab === 'paste' && (
            <div className="import-monster__actions-row">
              <button className="btn btn--sm" onClick={handleLoadTemplate}>
                Template
              </button>
              <button
                className="btn btn--sm btn--primary"
                onClick={() => handleParse(jsonText)}
                disabled={!jsonText.trim()}
              >
                Parse
              </button>
            </div>
          )}
        </div>

        {/* Paste tab */}
        {tab === 'paste' && (
          <textarea
            className="import-monster__textarea"
            placeholder={isPf2e ? 'Paste PF2eTools creature JSON here...' : 'Paste 5e monster JSON here...'}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            rows={12}
            spellCheck={false}
          />
        )}

        {/* Upload tab */}
        {tab === 'upload' && (
          <div className="import-monster__upload">
            <label className="btn btn--primary" htmlFor="import-monster-file" style={{ cursor: 'pointer' }}>
              Choose .json file
            </label>
            <input
              ref={fileRef}
              id="import-monster-file"
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileUpload}
            />
            {jsonText && <p className="import-monster__file-loaded">File loaded — see preview below.</p>}
          </div>
        )}

        {/* Validation errors */}
        {errors.length > 0 && (
          <div className="import-monster__errors">
            {errors.map((err, i) => (
              <p key={i} className="import-monster__error">{err}</p>
            ))}
          </div>
        )}

        {/* Preview */}
        {parsed && (
          <div className="import-monster__preview">
            <h3 className="import-monster__preview-title">{parsed.name}</h3>

            <div className="import-monster__preview-stats">
              <span className="import-monster__stat-pill">{isPf2e ? `Level ${parsed.cr}` : `CR ${parsed.cr}`}</span>
              <span className="import-monster__stat-pill">HP {parsed.hp}</span>
              <span className="import-monster__stat-pill">AC {parsed.ac}{parsed.acDesc ? ` (${parsed.acDesc})` : ''}</span>
            </div>

            <div className="import-monster__preview-grid">
              {parsed.size && <div><strong>Size:</strong> {parsed.size}</div>}
              {parsed.type && <div><strong>Type:</strong> {parsed.type}</div>}
              {parsed.speed && <div><strong>Speed:</strong> {parsed.speed}</div>}
              {!isPf2e && parsed.alignment && <div><strong>Alignment:</strong> {parsed.alignment}</div>}
              {isPf2e && parsed.savingThrows && <div><strong>Saves:</strong> {parsed.savingThrows}</div>}
              {parsed.skills && <div><strong>Skills:</strong> {parsed.skills}</div>}
              {parsed.senses && <div><strong>Senses:</strong> {parsed.senses}</div>}
              {parsed.languages && <div><strong>Languages:</strong> {parsed.languages}</div>}
            </div>

            {parsed.abilities && (
              <div className="import-monster__abilities">
                {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
                  <span key={stat} className="import-monster__ability">
                    <strong>{stat.toUpperCase()}</strong>
                    {isPf2e ? (
                      <span>{fmtMod(parsed.abilities[stat])}</span>
                    ) : (
                      <span>{parsed.abilities[stat]} ({fmtMod(Math.floor((parsed.abilities[stat] - 10) / 2))})</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {parsed.damageImmunities && (
              <div className="import-monster__section"><strong>Immunities:</strong> {parsed.damageImmunities}</div>
            )}
            {parsed.damageResistances && (
              <div className="import-monster__section"><strong>Resistances:</strong> {parsed.damageResistances}</div>
            )}
            {parsed.damageVulnerabilities && (
              <div className="import-monster__section"><strong>Weaknesses:</strong> {parsed.damageVulnerabilities}</div>
            )}

            <button
              className="btn btn--primary import-monster__save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : `Save to Library`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
