import { useEffect, useRef, useState } from 'react';
import { AllSelection, EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, chainCommands, splitBlock, toggleMark } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import PaperSheet, { getSheetSize } from './PaperSheet.jsx';
import { getMarginPx } from '../constants/margins.js';
import { jsonToDoc } from '../editor/html.js';
import { schema } from '../editor/schema.js';
import {
  invalidatePageHeights,
  paginationPlugin,
  relayoutPages,
} from '../editor/pagination.js';
import { setEditorView } from '../editor/viewRegistry.js';
import { normalizePastedHtml } from '../utils/htmlText.js';

export const PAGE_MAX_WIDTH = 720;
export const PAGE_MAX_HEIGHT = 920;
export const LINE_HEIGHT = 24;
export const PAGE_GAP = 24;

function pageMetrics(sheet, marginPx) {
  const safeMargin = marginPx + LINE_HEIGHT;
  const inner = Math.max(LINE_HEIGHT, sheet.height - safeMargin * 2);
  const rowsPerPage = Math.max(1, Math.floor(inner / LINE_HEIGHT));
  const contentHeight = rowsPerPage * LINE_HEIGHT;
  const paddingTop = safeMargin;
  const paddingBottom = sheet.height - paddingTop - contentHeight;
  const spacerHeight = paddingBottom + PAGE_GAP + paddingTop;
  return {
    rowsPerPage,
    contentHeight,
    spacerHeight,
    paddingTop,
    paddingBottom,
    marginPx,
    sheetHeight: sheet.height,
    pageGap: PAGE_GAP,
    stride: sheet.height + PAGE_GAP,
  };
}

function editorPlugins() {
  return [
    history(),
    keymap(baseKeymap),
    keymap({
      'Mod-z': undo,
      'Mod-y': redo,
      'Shift-Mod-z': redo,
      'Mod-b': toggleMark(schema.marks.strong),
      'Mod-i': toggleMark(schema.marks.em),
      'Mod-u': toggleMark(schema.marks.underline),
      Enter: chainCommands(splitListItem(schema.nodes.list_item), splitBlock),
      Tab: chainCommands(sinkListItem(schema.nodes.list_item), () => true),
      'Shift-Tab': liftListItem(schema.nodes.list_item),
    }),
    paginationPlugin(),
  ];
}

export default function PagedCanvas({
  paper,
  docJson,
  onChangeDoc,
  spellCheck = true,
  margin = 'auto',
  onPageCount,
}) {
  const stackRef = useRef(null);
  const mountRef = useRef(null);
  const viewRef = useRef(null);
  const metricsRef = useRef(null);
  const layoutFrame = useRef(0);
  const persistTimer = useRef(0);
  const onChangeDocRef = useRef(onChangeDoc);
  const onPageCountRef = useRef(onPageCount);
  const [pageCount, setPageCount] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(800);

  onChangeDocRef.current = onChangeDoc;
  onPageCountRef.current = onPageCount;

  const sheet = getSheetSize(paper.widthMm, paper.heightMm, PAGE_MAX_WIDTH, PAGE_MAX_HEIGHT);
  const marginPx = getMarginPx(margin, paper, sheet);
  const metrics = pageMetrics(sheet, marginPx);
  metricsRef.current = metrics;
  const stackHeight = pageCount * sheet.height + Math.max(0, pageCount - 1) * PAGE_GAP;
  const stride = sheet.height + PAGE_GAP;

  const applyChrome = (view) => {
    view.dom.style.padding = `${metrics.paddingTop}px ${marginPx}px ${metrics.paddingBottom}px`;
    view.dom.style.setProperty('--page-margin', `${marginPx}px`);
    view.dom.style.setProperty('--page-margin-top', `${metrics.paddingTop}px`);
    view.dom.style.setProperty('--page-margin-bottom', `${metrics.paddingBottom}px`);
    view.dom.style.setProperty('--sheet-height', `${sheet.height}px`);
    view.dom.style.setProperty('--page-gap', `${PAGE_GAP}px`);
    view.dom.style.setProperty('--page-spacer-height', `${metrics.spacerHeight}px`);
    view.dom.style.setProperty('--page-content-height', `${metrics.contentHeight}px`);
    view.dom.style.minHeight = `${stackHeight}px`;
  };

  const scheduleLayout = (view) => {
    if (layoutFrame.current) cancelAnimationFrame(layoutFrame.current);
    layoutFrame.current = requestAnimationFrame(() => {
      layoutFrame.current = 0;
      const pages = relayoutPages(view, metricsRef.current);
      setPageCount((prev) => (prev === pages ? prev : pages));
      onPageCountRef.current?.(pages);
    });
  };

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const state = EditorState.create({
      doc: jsonToDoc(docJson),
      plugins: editorPlugins(),
    });
    const view = new EditorView(mountRef.current, {
      state,
      attributes: {
        class: 'page-editor',
        'data-placeholder': 'Start typing...',
        spellcheck: spellCheck ? 'true' : 'false',
        role: 'textbox',
        'aria-label': 'Document',
      },
      transformPastedHTML: (html) => normalizePastedHtml(html),
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        view.dom.classList.toggle('is-empty', next.doc.textContent.length === 0);
        if (tr.docChanged) {
          invalidatePageHeights();
          scheduleLayout(view);
          requestAnimationFrame(() => {
            invalidatePageHeights();
            scheduleLayout(view);
          });
          clearTimeout(persistTimer.current);
          persistTimer.current = setTimeout(() => {
            onChangeDocRef.current?.(next.doc.toJSON());
          }, 250);
        }
      },
    });
    applyChrome(view);
    view.dom.classList.toggle('is-empty', view.state.doc.textContent.length === 0);
    viewRef.current = view;
    setEditorView(view);
    scheduleLayout(view);

    const onSelectAll = () => {
      view.dispatch(view.state.tr.setSelection(new AllSelection(view.state.doc)));
      view.focus();
    };
    window.addEventListener('writely-select-all', onSelectAll);

    return () => {
      window.removeEventListener('writely-select-all', onSelectAll);
      cancelAnimationFrame(layoutFrame.current);
      clearTimeout(persistTimer.current);
      onChangeDocRef.current?.(view.state.doc.toJSON());
      if (viewRef.current === view) {
        viewRef.current = null;
        setEditorView(null);
      }
      view.destroy();
    };
    // Mount once per document; WritelyEditor remounts with key={activeId}.
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    invalidatePageHeights();
    view.dom.spellcheck = spellCheck;
    applyChrome(view);
    scheduleLayout(view);
    requestAnimationFrame(() => {
      invalidatePageHeights();
      applyChrome(view);
      scheduleLayout(view);
    });
  }, [marginPx, sheet.height, stackHeight, spellCheck]);

  useEffect(() => {
    const scroll = stackRef.current?.closest('.canvas-scroll');
    if (!scroll) return undefined;
    const update = () => {
      setScrollTop(scroll.scrollTop);
      setViewHeight(scroll.clientHeight);
    };
    update();
    scroll.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      scroll.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pageCount]);

  const first = Math.max(0, Math.floor(scrollTop / stride) - 2);
  const last = Math.min(pageCount - 1, Math.ceil((scrollTop + viewHeight) / stride) + 2);
  const visiblePages = [];
  for (let i = first; i <= last; i += 1) visiblePages.push(i);

  return (
    <div
      ref={stackRef}
      className="relative mx-auto"
      data-page-stack="true"
      data-page-count={pageCount}
      data-page-gap={PAGE_GAP}
      style={{
        width: sheet.width,
        height: stackHeight,
        ['--page-gap']: `${PAGE_GAP}px`,
        backgroundImage: `repeating-linear-gradient(to bottom, #ffffff 0, #ffffff ${sheet.height}px, var(--color-surface) ${sheet.height}px, var(--color-surface) ${sheet.height + PAGE_GAP}px)`,
      }}
    >
      {visiblePages.map((pageIndex) => (
        <PaperSheet
          key={pageIndex}
          widthMm={paper.widthMm}
          heightMm={paper.heightMm}
          maxWidth={PAGE_MAX_WIDTH}
          maxHeight={PAGE_MAX_HEIGHT}
          data-page={pageIndex + 1}
          className="pointer-events-none absolute left-0 z-0"
          style={{ top: pageIndex * stride }}
        />
      ))}
      {visiblePages
        .filter((pageIndex) => pageIndex < pageCount - 1)
        .map((pageIndex) => (
          <div
            key={`page-gap-${pageIndex}`}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 z-[2]"
            style={{
              top: pageIndex * stride + sheet.height,
              width: sheet.width,
              height: PAGE_GAP,
              backgroundColor: 'var(--color-surface)',
            }}
          />
        ))}
      <div
        ref={mountRef}
        className="absolute inset-x-0 top-0 z-[1] w-full"
        style={{ height: stackHeight }}
      />
    </div>
  );
}
