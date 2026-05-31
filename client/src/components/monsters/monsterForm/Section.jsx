/* Accordion section wrapper for the monster form. */
export default function Section({ title, id, open, onToggle, children }) {
  return (
    <div className={`monster-form__section ${open ? 'monster-form__section--open' : ''}`}>
      <button className="monster-form__section-header" onClick={() => onToggle(id)} type="button">
        <span>{title}</span>
        <span className="monster-form__section-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="monster-form__section-body">{children}</div>}
    </div>
  );
}
