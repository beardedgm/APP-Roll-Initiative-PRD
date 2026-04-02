import { useEffect, useCallback } from 'react';

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export default function useDynamicSizing(listRef) {
  const update = useCallback(() => {
    const list = listRef.current;
    if (!list || list.classList.contains('hidden')) return;

    const allItems = Array.from(list.children);
    if (allItems.length === 0) return;

    const preparingRow = list.querySelector('.initiative-item--preparing');
    const scalableItems = allItems.filter(el => !el.classList.contains('initiative-item--preparing'));
    const scalableCount = scalableItems.length;
    if (scalableCount === 0) return;

    const GAP = 8;
    const totalHeight = list.clientHeight;
    const preparingH = preparingRow ? preparingRow.offsetHeight : 0;
    const totalGaps = GAP * (allItems.length - 1);
    const scalableH = totalHeight - preparingH - totalGaps;
    const itemHeight = scalableH / scalableCount;

    list.style.setProperty('--player-name-size', `${clamp(itemHeight * 0.42, 14, 54)}px`);
    list.style.setProperty('--player-score-size', `${clamp(itemHeight * 0.35, 12, 44)}px`);
    list.style.setProperty('--player-arrow-size', `${clamp(itemHeight * 0.35, 12, 36)}px`);
    list.style.setProperty('--player-badge-size', `${clamp(itemHeight * 0.20, 9, 18)}px`);
    list.style.setProperty('--player-preparing-size', `${clamp(itemHeight * 0.28, 11, 22)}px`);
    list.style.setProperty('--player-h-pad', `${clamp(itemHeight * 0.20, 12, 60)}px`);
    list.style.setProperty('--player-v-pad', `${clamp(itemHeight * 0.15, 8, 32)}px`);
    list.style.setProperty('--player-left-gap', `${clamp(itemHeight * 0.15, 8, 24)}px`);
    list.style.setProperty('--player-badge-v-pad', `${clamp(itemHeight * 0.08, 2, 8)}px`);
    list.style.setProperty('--player-badge-h-pad', `${clamp(itemHeight * 0.18, 8, 20)}px`);
  }, [listRef]);

  useEffect(() => {
    const handle = () => requestAnimationFrame(update);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [update]);

  return update;
}
