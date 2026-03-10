import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMonster } from '../../api/useMonsters';
import useUIStore from '../../store/useUIStore';
import Modal from '../ui/Modal';

function makeDiceClickable(html) {
  return html.replace(
    /(\d+d\d+(?:\s*[+-]\s*\d+)?)/g,
    '<span class="dice-roll" data-dice="$1" title="Click to roll $1">$1</span>'
  );
}

export default function StatBlockModal({ onAddToEncounter, onRollDice }) {
  const activeModal = useUIStore(s => s.activeModal);
  const slug = useUIStore(s => s.statBlockSlug);
  const contentRef = useRef(null);
  const { data: monster, isLoading, error } = useMonster(
    activeModal === 'stat-block' ? slug : null
  );

  // Attach dice roll click handlers
  useEffect(() => {
    if (!contentRef.current || !onRollDice || !monster) return;

    const el = contentRef.current;
    const diceEls = el.querySelectorAll('.dice-roll');
    const handlers = [];

    diceEls.forEach(diceEl => {
      const notation = diceEl.dataset.dice;
      if (!notation) return;
      const handler = () => onRollDice(notation);
      diceEl.addEventListener('click', handler);
      handlers.push({ el: diceEl, handler });
    });

    return () => {
      handlers.forEach(({ el: diceEl, handler }) => {
        diceEl.removeEventListener('click', handler);
      });
    };
  }, [monster, onRollDice]);

  if (activeModal !== 'stat-block') return null;

  function handleAdd() {
    if (monster && onAddToEncounter) {
      onAddToEncounter({
        name: monster.name,
        hp: monster.hp || 1,
        ac: monster.ac || 10,
        initiativeModifier: monster.initMod || 0,
        type: 'monster',
        slug: monster.slug,
      });
      useUIStore.getState().closeModal();
    }
  }

  const renderedMarkdown = monster
    ? makeDiceClickable(DOMPurify.sanitize(marked.parse(monster.rawMarkdown)))
    : '';

  return (
    <Modal
      id="stat-block"
      title={monster ? monster.name : 'Loading...'}
      footer={
        monster && onAddToEncounter ? (
          <button className="btn btn--primary btn--full" onClick={handleAdd}>
            + Add to Encounter
          </button>
        ) : null
      }
    >
      {isLoading && <p style={{ textAlign: 'center', padding: '2rem' }}>Loading stat block...</p>}
      {error && <p style={{ textAlign: 'center', color: 'var(--color-accent-red)' }}>Failed to load monster.</p>}
      {monster && (
        <div
          ref={contentRef}
          className="stat-block-content"
          dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
        />
      )}
    </Modal>
  );
}
