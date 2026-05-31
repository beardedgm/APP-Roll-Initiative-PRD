/* Add/remove/edit list of { id, name, description } entries (traits, actions,
 * reactions, legendary actions). Keyed by stable `entry.id` — never the array
 * index — so removing a middle entry doesn't shift controlled-input values. */
export default function RepeatableEntries({ entries, entryKey, onAdd, onUpdate, onRemove }) {
  return (
    <div className="monster-form__entries">
      {entries.map(entry => (
        <div key={entry.id} className="monster-form__entry">
          <div className="monster-form__entry-header">
            <input
              type="text"
              className="monster-form__entry-name"
              value={entry.name}
              onChange={e => onUpdate(entryKey, entry.id, 'name', e.target.value)}
              placeholder="Name"
            />
            <button className="btn btn--remove btn--sm" onClick={() => onRemove(entryKey, entry.id)} title="Remove">&times;</button>
          </div>
          <textarea
            className="monster-form__entry-desc"
            value={entry.description}
            onChange={e => onUpdate(entryKey, entry.id, 'description', e.target.value)}
            placeholder="Description..."
            rows={3}
          />
        </div>
      ))}
      <button className="btn btn--sm" onClick={() => onAdd(entryKey)}>+ Add</button>
    </div>
  );
}
