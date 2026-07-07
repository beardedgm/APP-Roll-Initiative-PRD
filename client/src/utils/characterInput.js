// Clamp character form values to the ranges the server accepts (finding f7).
// The form read values straight from parseInt with no clamp, so a typed "-5" HP
// or an out-of-range initMod reached the store and was later dropped server-side
// — a silent, device-side data loss. Clamping here means nothing invalid is ever
// created. Ranges mirror characterSchema in server/validators/userData.js.

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {{ maxHP: number|null, ac?: number, initMod?: number }} fields
 * @returns clamped { maxHP, ac, initMod } (maxHP stays null when unset)
 */
export function clampCharacterFields({ maxHP, ac, initMod }) {
  return {
    maxHP: maxHP == null ? null : clampInt(maxHP, 1, 99999),
    ac: clampInt(ac ?? 10, 0, 99),
    initMod: clampInt(initMod ?? 0, -10, 50),
  };
}
