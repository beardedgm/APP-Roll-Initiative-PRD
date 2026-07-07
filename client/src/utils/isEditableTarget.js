// True when the given element is a text-editable field, so global keyboard
// shortcuts (undo/redo, space-to-advance) can skip themselves while the user is
// typing (finding f17).
export function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el.isContentEditable;
}
