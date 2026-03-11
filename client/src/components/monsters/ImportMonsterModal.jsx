import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import useUIStore from '../../store/useUIStore';
import { useCurrentUser } from '../../api/useAuth';
import { useCreateMonster } from '../../api/useMonsters';
import { parseMonsterJSON, validateMonsterData, MONSTER_JSON_TEMPLATE } from '../../utils/monsterImport';
import { saveLocalMonster } from '../../utils/customMonsterStorage';

export default function ImportMonsterModal({ onLocalSave }) {
  const closeModal = useUIStore(s => s.closeModal);
  const createMonster = useCreateMonster();
  const { data: user } = useCurrentUser();
  const isPremium = user && (user.subscriptionStatus === 'active' || user.role === 'admin');

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
      const monster = parseMonsterJSON(text);
      const validationErrors = validateMonsterData(monster);
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
    const text = JSON.stringify(MONSTER_JSON_TEMPLATE, null, 2);
    setJsonText(text);
    setParsed(null);
    setErrors([]);
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    try {
      if (isPremium) {
        await createMonster.mutateAsync(parsed);
      } else {
        saveLocalMonster(parsed);
        onLocalSave?.();
      }
      reset();
      closeModal();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Save failed';
      setErrors([msg]);
      setSaving(false);
    }
  }

  return (
    <Modal id="import-monster" title="Import Custom Monster">
      <div className="import-monster">
        {/* Tab selector */}
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

        {/* Paste tab */}
        {tab === 'paste' && (
          <div className="import-monster__paste">
            <div className="import-monster__actions-row">
              <button className="btn btn--sm" onClick={handleLoadTemplate}>
                Load Template
              </button>
              <button
                className="btn btn--sm btn--primary"
                onClick={() => handleParse(jsonText)}
                disabled={!jsonText.trim()}
              >
                Parse JSON
              </button>
            </div>
            <textarea
              className="import-monster__textarea"
              placeholder="Paste 5e monster JSON here..."
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              rows={12}
              spellCheck={false}
            />
          </div>
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
            <h3 className="import-monster__preview-title">Preview</h3>
            <div className="import-monster__preview-grid">
              <div><strong>Name:</strong> {parsed.name}</div>
              <div><strong>Size:</strong> {parsed.size}</div>
              <div><strong>Type:</strong> {parsed.type}</div>
              <div><strong>CR:</strong> {parsed.cr}</div>
              <div><strong>HP:</strong> {parsed.hp}{parsed.hpFormula ? ` (${parsed.hpFormula})` : ''}</div>
              <div><strong>AC:</strong> {parsed.ac}{parsed.acDesc ? ` (${parsed.acDesc})` : ''}</div>
              <div><strong>Speed:</strong> {parsed.speed}</div>
              {parsed.alignment && <div><strong>Alignment:</strong> {parsed.alignment}</div>}
            </div>
            {parsed.abilities && (
              <div className="import-monster__abilities">
                {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
                  <span key={stat} className="import-monster__ability">
                    <strong>{stat.toUpperCase()}</strong>
                    <span>{parsed.abilities[stat]} ({Math.floor((parsed.abilities[stat] - 10) / 2) >= 0 ? '+' : ''}{Math.floor((parsed.abilities[stat] - 10) / 2)})</span>
                  </span>
                ))}
              </div>
            )}
            {parsed.traits?.length > 0 && (
              <div className="import-monster__section">
                <strong>Traits:</strong> {parsed.traits.map(t => t.name).join(', ')}
              </div>
            )}
            {parsed.actions?.length > 0 && (
              <div className="import-monster__section">
                <strong>Actions:</strong> {parsed.actions.map(a => a.name).join(', ')}
              </div>
            )}
            {parsed.reactions?.length > 0 && (
              <div className="import-monster__section">
                <strong>Reactions:</strong> {parsed.reactions.map(r => r.name).join(', ')}
              </div>
            )}
            {parsed.legendaryActions?.length > 0 && (
              <div className="import-monster__section">
                <strong>Legendary Actions:</strong> {parsed.legendaryActions.map(l => l.name).join(', ')}
              </div>
            )}

            <button
              className="btn btn--primary import-monster__save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : isPremium ? 'Save to Library' : 'Save Locally'}
            </button>
            {!isPremium && (
              <p className="import-monster__local-note">
                Saved to browser storage (max 50). Upgrade for cloud sync.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
