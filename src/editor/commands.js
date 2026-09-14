import { toggleMark, setBlockType } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { TextSelection, AllSelection } from 'prosemirror-state';
import { schema } from './schema.js';
import { getEditorView } from './viewRegistry.js';

function withView(fn) {
  const view = getEditorView();
  if (!view) return false;
  const result = fn(view);
  view.focus();
  return result;
}

function run(command, value) {
  return withView((view) => command(view.state, view.dispatch, view, value));
}

function currentMarks(state) {
  return state.storedMarks || state.selection.$from.marks();
}

function currentTextStyle(state) {
  const mark = schema.marks.textStyle.isInSet(currentMarks(state));
  return mark ? { ...mark.attrs } : {};
}

export function applyTextStyle(attrs) {
  return withView((view) => {
    const { state, dispatch } = view;
    const markType = schema.marks.textStyle;
    const { from, to, empty } = state.selection;
    const next = { ...currentTextStyle(state), ...attrs };
    const has = Object.values(next).some(Boolean);
    if (empty) {
      dispatch(
        has
          ? state.tr.addStoredMark(markType.create(next))
          : state.tr.removeStoredMark(markType)
      );
      return true;
    }
    let tr = state.tr.removeMark(from, to, markType);
    if (has) tr = tr.addMark(from, to, markType.create(next));
    dispatch(tr);
    return true;
  });
}

export function toggleBold() {
  return run(toggleMark(schema.marks.strong));
}

export function toggleItalic() {
  return run(toggleMark(schema.marks.em));
}

export function toggleUnderline() {
  return run(toggleMark(schema.marks.underline));
}

export function toggleStrike() {
  return run(toggleMark(schema.marks.strike));
}

export function applyFontFamily(font) {
  return applyTextStyle({ fontFamily: font });
}

export function applyFontSize(px) {
  return applyTextStyle({ fontSize: px });
}

export function applyFontWeight(weight) {
  const numeric = String(weight === 'bold' ? '700' : weight);
  applyTextStyle({ fontWeight: numeric });
  return withView((view) => {
    const { state, dispatch } = view;
    const isBold = Number(numeric) >= 700;
    const hasStrong = Boolean(schema.marks.strong.isInSet(currentMarks(state)));
    if (isBold !== hasStrong) {
      toggleMark(schema.marks.strong)(state, dispatch);
    }
    return true;
  });
}

export function applyFontColor(color) {
  return applyTextStyle({ color });
}

export function applyHighlight(color) {
  return applyTextStyle({ background: color });
}

export function setAlign(align) {
  return withView((view) => {
    const { state, dispatch } = view;
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type === schema.nodes.paragraph || node.type === schema.nodes.heading) {
        dispatch(state.tr.setNodeMarkup($from.before(depth), null, { ...node.attrs, align }));
        return true;
      }
    }
    return setBlockType(schema.nodes.paragraph, { align })(state, dispatch);
  });
}

export function insertLink() {
  return withView((view) => {
    const url = window.prompt('Enter URL', 'https://');
    if (!url) return false;
    const { state, dispatch } = view;
    const mark = schema.marks.link.create({ href: url });
    const { from, to, empty } = state.selection;
    if (empty) {
      dispatch(state.tr.insertText(url).addMark(from, from + url.length, mark));
      return true;
    }
    dispatch(state.tr.addMark(from, to, mark));
    return true;
  });
}

export function insertHorizontalLine() {
  return withView((view) => {
    const node = schema.nodes.horizontal_rule.create();
    dispatchInsert(view, node);
    return true;
  });
}

export function insertDateTime() {
  return withView((view) => {
    const text = new Date().toLocaleString();
    view.dispatch(view.state.tr.insertText(text));
    return true;
  });
}

function dispatchInsert(view, node) {
  const { state } = view;
  view.dispatch(state.tr.replaceSelectionWith(node));
}

export function toggleBulletList() {
  return withView((view) => {
    const { state, dispatch } = view;
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type === schema.nodes.bullet_list) {
        return liftListItem(schema.nodes.list_item)(state, dispatch);
      }
    }
    return wrapInList(schema.nodes.bullet_list)(state, dispatch);
  });
}

export function toggleOrderedList() {
  return withView((view) => {
    const { state, dispatch } = view;
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type === schema.nodes.ordered_list) {
        return liftListItem(schema.nodes.list_item)(state, dispatch);
      }
    }
    return wrapInList(schema.nodes.ordered_list)(state, dispatch);
  });
}

export function clearFormatting() {
  return withView((view) => {
    const { state, dispatch } = view;
    const { from, to } = state.selection;
    let tr = state.tr;
    Object.values(schema.marks).forEach((mark) => {
      tr = tr.removeMark(from, to, mark);
    });
    dispatch(tr);
    return true;
  });
}

export function selectAll() {
  return withView((view) => {
    const { state, dispatch } = view;
    dispatch(state.tr.setSelection(new AllSelection(state.doc)));
    return true;
  });
}

export function undoEdit() {
  return run(undo);
}

export function redoEdit() {
  return run(redo);
}

export function findInDocument() {
  const query = window.prompt('Find');
  if (!query) return false;
  return withView((view) => {
    const text = view.state.doc.textBetween(0, view.state.doc.content.size, '\n', '\n');
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index < 0) return false;
    let pos = 0;
    let found = null;
    view.state.doc.nodesBetween(0, view.state.doc.content.size, (node, start) => {
      if (found || !node.isText) return true;
      const end = pos + node.text.length;
      if (index >= pos && index < end) {
        const offset = index - pos;
        found = TextSelection.create(view.state.doc, start + offset, start + offset + query.length);
        return false;
      }
      pos = end;
      return true;
    });
    if (found) {
      view.dispatch(view.state.tr.setSelection(found).scrollIntoView());
      return true;
    }
    return false;
  });
}

export function getSelectionFormat() {
  const view = getEditorView();
  const empty = {
    bold: false,
    italic: false,
    underline: false,
    fontName: 'Segoe UI',
    fontSize: '15px',
    fontWeight: '400',
    color: '#2b2925',
    align: 'left',
  };
  if (!view) return empty;
  const { state } = view;
  const marks = currentMarks(state);
  const style = currentTextStyle(state);
  const { $from } = state.selection;
  let align = 'left';
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.attrs.align) {
      align = node.attrs.align;
      break;
    }
  }
  const family = (style.fontFamily || 'Segoe UI').split(',')[0].replace(/['"]/g, '').trim();
  return {
    bold: Boolean(schema.marks.strong.isInSet(marks)),
    italic: Boolean(schema.marks.em.isInSet(marks)),
    underline: Boolean(schema.marks.underline.isInSet(marks)),
    fontName: family || 'Segoe UI',
    fontSize: style.fontSize || '15px',
    fontWeight: style.fontWeight || (schema.marks.strong.isInSet(marks) ? '700' : '400'),
    color: style.color || '#2b2925',
    align,
  };
}

export function focusEditor() {
  getEditorView()?.focus();
}

export function documentStats() {
  const view = getEditorView();
  if (!view) return { words: 0, chars: 0 };
  const text = view.state.doc.textBetween(0, view.state.doc.content.size, ' ', ' ');
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return {
    words: trimmed ? trimmed.split(' ').length : 0,
    chars: trimmed.replace(/\s/g, '').length,
  };
}
