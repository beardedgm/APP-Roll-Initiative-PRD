export function generateId() {
  return `combatant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function generateEncounterId() {
  return `enc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
