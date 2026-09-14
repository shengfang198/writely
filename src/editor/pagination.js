import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const paginationKey = new PluginKey('writely-pagination');
export const MAX_PAGES = 500;
const LINE = 24;

const heightCache = new WeakMap();
let measureGen = 0;

export function invalidatePageHeights() {
  measureGen += 1;
}

function domContentHeight(dom) {
  if (!dom || typeof dom.getBoundingClientRect !== 'function') return LINE;
  let height = dom.getBoundingClientRect().height;
  dom.querySelectorAll?.('.page-break').forEach((el) => {
    height -= el.getBoundingClientRect().height;
  });
  return Math.max(LINE, Math.ceil(height / LINE) * LINE);
}

function contentHeightOfNode(view, node, pos) {
  const cached = heightCache.get(node);
  if (cached && cached.gen === measureGen) return cached.height;

  if (node.type.name === 'horizontal_rule') {
    heightCache.set(node, { gen: measureGen, height: LINE });
    return LINE;
  }

  if (node.type.name === 'bullet_list' || node.type.name === 'ordered_list') {
    let total = 0;
    node.forEach((child, offset) => {
      total += contentHeightOfNode(view, child, pos + 1 + offset);
    });
    const height = Math.max(LINE, total);
    heightCache.set(node, { gen: measureGen, height });
    return height;
  }

  if (node.type.name === 'list_item') {
    let total = 0;
    node.forEach((child, offset) => {
      total += contentHeightOfNode(view, child, pos + 1 + offset);
    });
    const height = Math.max(LINE, total);
    heightCache.set(node, { gen: measureGen, height });
    return height;
  }

  const dom = view.nodeDOM(pos);
  const height = domContentHeight(dom);
  heightCache.set(node, { gen: measureGen, height });
  return height;
}

function unpaginatedOffset(view, nodePos, pos) {
  let start;
  let coords;
  try {
    start = view.coordsAtPos(Math.min(nodePos + 1, pos));
    coords = view.coordsAtPos(pos);
  } catch {
    return 0;
  }
  let y = coords.top - start.top;
  const dom = view.nodeDOM(nodePos);
  if (dom?.querySelectorAll) {
    const startTop = start.top;
    const hereTop = coords.top;
    dom.querySelectorAll('.page-break').forEach((el) => {
      const box = el.getBoundingClientRect();
      if (box.top >= startTop - 1 && box.top < hereTop - 1) y -= box.height;
    });
  }
  return y;
}

function findPosAtOffset(view, nodePos, nodeSize, targetY) {
  let lo = nodePos + 1;
  let hi = Math.max(lo, nodePos + nodeSize - 1);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (unpaginatedOffset(view, nodePos, mid) < targetY) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function pageBreakWidget(spacerHeight) {
  return () => {
    const el = document.createElement('span');
    el.className = 'page-break';
    el.setAttribute('data-page-break', '1');
    el.setAttribute('aria-hidden', 'true');
    el.contentEditable = 'false';
    el.style.display = 'block';
    el.style.height = `${spacerHeight}px`;
    el.style.minHeight = `${spacerHeight}px`;
    el.style.lineHeight = '0';
    el.style.fontSize = '0';
    el.style.userSelect = 'none';
    return el;
  };
}

function addBreak(widgets, breaks, pos, spacerHeight, pages) {
  breaks.push(`${pos}:${spacerHeight}`);
  widgets.push(
    Decoration.widget(pos, pageBreakWidget(spacerHeight), {
      side: -1,
      key: `page-break-${spacerHeight}-${pages}-${pos}`,
    })
  );
}

function buildDecorations(view, metrics) {
  if (!view || !metrics) {
    return {
      pageCount: 1,
      contentHeight: 0,
      spacerHeight: 0,
      breakSignature: '',
      decos: DecorationSet.empty,
    };
  }
  const { contentHeight, spacerHeight } = metrics;
  const widgets = [];
  const breaks = [];
  let used = 0;
  let pages = 1;

  view.state.doc.forEach((node, pos) => {
    if (pages >= MAX_PAGES) return;

    const height = contentHeightOfNode(view, node, pos);

    if (used > 0 && used + height > contentHeight && pages < MAX_PAGES) {
      const remainingHeight = contentHeight - used;
      addBreak(widgets, breaks, pos, spacerHeight + remainingHeight, pages);
      pages += 1;
      used = 0;
    }

    if (height > contentHeight && pages < MAX_PAGES) {
      let filled = 0;
      while (height - filled > contentHeight && pages < MAX_PAGES) {
        filled += contentHeight;
        const breakPos = findPosAtOffset(view, pos, node.nodeSize, filled);
        if (breakPos <= pos + 1 || breakPos >= pos + node.nodeSize - 1) break;
        addBreak(widgets, breaks, breakPos, spacerHeight, pages);
        pages += 1;
      }
      used = height - filled;
      return;
    }

    used += height;
  });

  return {
    pageCount: pages,
    contentHeight,
    spacerHeight,
    breakSignature: breaks.join('|'),
    decos: DecorationSet.create(view.state.doc, widgets),
  };
}

export function paginationPlugin() {
  return new Plugin({
    key: paginationKey,
    state: {
      init: () => ({
        pageCount: 1,
        contentHeight: 0,
        spacerHeight: 0,
        breakSignature: '',
        decos: DecorationSet.empty,
      }),
      apply(tr, value) {
        const next = tr.getMeta(paginationKey);
        if (next) return next;
        if (tr.docChanged) {
          return { ...value, decos: value.decos.map(tr.mapping, tr.doc) };
        }
        return value;
      },
    },
    props: {
      decorations(state) {
        return paginationKey.getState(state)?.decos || DecorationSet.empty;
      },
    },
  });
}

function alignPageBreaks(view, metrics) {
  const stride = metrics?.stride;
  const paddingTop = metrics?.paddingTop;
  const minimumHeight = metrics?.spacerHeight;
  if (!view?.dom || !stride || paddingTop === undefined || !minimumHeight) return;

  const editorTop = view.dom.getBoundingClientRect().top;
  const breaks = [...view.dom.querySelectorAll('.page-break')];

  breaks.forEach((element, index) => {
    const expectedBottom = (index + 1) * stride + paddingTop;
    const bounds = element.getBoundingClientRect();
    const actualBottom = bounds.bottom - editorTop;
    const adjustment = expectedBottom - actualBottom;
    if (Math.abs(adjustment) < 0.5) return;

    const currentHeight = bounds.height;
    const nextHeight = Math.max(minimumHeight, currentHeight + adjustment);
    element.style.height = `${nextHeight}px`;
    element.style.minHeight = `${nextHeight}px`;
  });
}

export function relayoutPages(view, metrics) {
  if (!view) return 1;
  const layout = buildDecorations(view, metrics);
  const current = paginationKey.getState(view.state);
  const prev = current?.decos.find().map((deco) => deco.from) || [];
  const next = layout.decos.find().map((deco) => deco.from);
  const unchanged =
    current?.pageCount === layout.pageCount &&
    current?.contentHeight === layout.contentHeight &&
    current?.spacerHeight === layout.spacerHeight &&
    current?.breakSignature === layout.breakSignature &&
    prev.length === next.length &&
    prev.every((pos, index) => pos === next[index]);

  if (!unchanged) {
    const tr = view.state.tr.setMeta(paginationKey, layout);
    tr.setMeta('addToHistory', false);
    view.dispatch(tr);
  }
  alignPageBreaks(view, metrics);
  return layout.pageCount;
}
