import { describe, it, expect } from 'vitest';
import { mergedPageSlice } from './mergedPagination';

// M4: custom monsters were prepended in full to EVERY page (duplicates on
// each page + phantom trailing pages). The merged list is [ ...local, ...api ]
// and each page takes its slice of that combined ordering.
describe('mergedPageSlice', () => {
  const pageSize = 12;

  it('page 0 with fewer customs than a page: partial local + API fill, no api skip', () => {
    const r = mergedPageSlice({ page: 0, pageSize, localCount: 3, apiTotal: 96 });
    expect([r.localFrom, r.localTo]).toEqual([0, 3]);
    expect(r.apiSkip).toBe(0);
    expect(r.apiNeeded).toBe(9);
    expect(r.total).toBe(99);
    expect(r.totalPages).toBe(9);
  });

  it('later pages contain no customs and shift the API skip by the local count', () => {
    const r = mergedPageSlice({ page: 3, pageSize, localCount: 3, apiTotal: 96 });
    expect([r.localFrom, r.localTo]).toEqual([3, 3]); // empty slice
    expect(r.apiSkip).toBe(33); // 36 - 3 customs
    expect(r.apiNeeded).toBe(12);
  });

  it('a page straddling the local/API boundary takes both partial slices', () => {
    const r = mergedPageSlice({ page: 1, pageSize, localCount: 15, apiTotal: 50 });
    expect([r.localFrom, r.localTo]).toEqual([12, 15]); // last 3 customs
    expect(r.apiSkip).toBe(0);
    expect(r.apiNeeded).toBe(9);
  });

  it('an all-local page requests no API rows', () => {
    const r = mergedPageSlice({ page: 0, pageSize, localCount: 20, apiTotal: 50 });
    expect([r.localFrom, r.localTo]).toEqual([0, 12]);
    expect(r.apiNeeded).toBe(0);
    expect(r.apiSkip).toBe(0);
  });

  it('custom-only mode pages the local array alone', () => {
    const r = mergedPageSlice({ page: 1, pageSize, localCount: 30, apiTotal: 999, isCustomOnly: true });
    expect([r.localFrom, r.localTo]).toEqual([12, 24]);
    expect(r.apiNeeded).toBe(0);
    expect(r.total).toBe(30);
    expect(r.totalPages).toBe(3);
  });

  it('zero customs degrades to plain API pagination (the old behavior)', () => {
    const r = mergedPageSlice({ page: 2, pageSize, localCount: 0, apiTotal: 96 });
    expect([r.localFrom, r.localTo]).toEqual([0, 0]);
    expect(r.apiSkip).toBe(24); // page * pageSize, unchanged
    expect(r.apiNeeded).toBe(12);
    expect(r.totalPages).toBe(8);
  });

  it('no phantom page: totals line up with what pages can actually show', () => {
    // 3 customs + 96 api = 99 items → 9 pages; page 8 (last) shows 3 api rows.
    const r = mergedPageSlice({ page: 8, pageSize, localCount: 3, apiTotal: 96 });
    expect(r.apiSkip).toBe(93);
    expect(r.apiNeeded).toBe(12); // api returns only 3 remaining rows
    expect(r.totalPages).toBe(9);
  });

  it('handles the empty list', () => {
    const r = mergedPageSlice({ page: 0, pageSize, localCount: 0, apiTotal: 0 });
    expect(r.total).toBe(0);
    expect(r.totalPages).toBe(0);
    expect(r.apiNeeded).toBe(12);
  });
});
