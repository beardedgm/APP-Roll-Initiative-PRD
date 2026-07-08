// Normalize an Express query object to single string values (finding l2).
// A duplicate query key (?q=a&q=b) is parsed as an array, and bracket notation
// (?q[$ne]=x) as an object — either one crashes a later value.trim()/regex with
// a 500. Collapse arrays to their first element and drop non-strings, so the
// route handler stays graceful (and can't be fed an object into a Mongo filter).
export function flattenQuery(query) {
  const out = {};
  for (const [key, value] of Object.entries(query || {})) {
    const first = Array.isArray(value) ? value[0] : value;
    out[key] = typeof first === 'string' ? first : undefined;
  }
  return out;
}
