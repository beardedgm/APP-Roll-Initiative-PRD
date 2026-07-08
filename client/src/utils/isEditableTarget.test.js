import { describe, it, expect } from 'vitest';
import { isEditableTarget } from './isEditableTarget';

// f17: Ctrl+Z / Ctrl+Y (and Space) fired even while typing in a form field,
// reverting combat actions mid-edit. The handler must ignore shortcuts when an
// editable element is focused.
describe('isEditableTarget', () => {
  it('is true for input, textarea, and select', () => {
    expect(isEditableTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true);
  });

  it('is true for a contenteditable element', () => {
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('is false for a non-editable element or null', () => {
    expect(isEditableTarget({ tagName: 'BUTTON' })).toBe(false);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: false })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
