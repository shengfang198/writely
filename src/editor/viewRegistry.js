let view = null;
const listeners = new Set();

export function setEditorView(next) {
  view = next;
  listeners.forEach((fn) => fn(view));
}

export function getEditorView() {
  return view;
}

export function onEditorViewChange(fn) {
  listeners.add(fn);
  fn(view);
  return () => listeners.delete(fn);
}
