/**
 * Page math for a list that merges a fully-local array (custom monsters) with
 * server-paginated results, ordered [ ...local, ...api ].
 *
 * The local array must be SLICED per page and the API skip offset shifted by
 * the local count — naively prepending all local items to every page shows
 * them repeatedly and inflates the page count (M4).
 *
 * @param {object} p
 * @param {number} p.page        zero-based page index
 * @param {number} p.pageSize    items per page
 * @param {number} p.localCount  total local (custom) items after filtering
 * @param {number} p.apiTotal    total API items for the current filter
 * @param {boolean} [p.isCustomOnly] the Custom source filter — local items only
 * @returns {{localFrom: number, localTo: number, apiSkip: number, apiNeeded: number, total: number, totalPages: number}}
 *   localFrom/localTo: slice bounds into the local array for THIS page.
 *   apiSkip: skip to request from the API (page start minus all local items).
 *   apiNeeded: how many API rows this page still needs after the local slice.
 */
export function mergedPageSlice({ page, pageSize, localCount, apiTotal, isCustomOnly = false }) {
  const start = page * pageSize;
  const localFrom = Math.min(start, localCount);
  const localTo = Math.min(start + pageSize, localCount);
  const apiSkip = Math.max(0, start - localCount);
  const apiNeeded = isCustomOnly ? 0 : pageSize - (localTo - localFrom);
  const total = isCustomOnly ? localCount : apiTotal + localCount;
  const totalPages = Math.ceil(total / pageSize);
  return { localFrom, localTo, apiSkip, apiNeeded, total, totalPages };
}
