import { useEffect, useRef, useState } from 'react';
import { getPaperSize } from '../constants/paperSizes.js';
import EditorMenuBar from './EditorMenuBar.jsx';
import EditorToolbar from './EditorToolbar.jsx';
import PageScrollArea from './PageScrollArea.jsx';
import PagedCanvas from './PagedCanvas.jsx';
import {
  downloadMergedWritelyDocx,
  downloadWritely,
  downloadWritelyDocx,
  downloadWritelyHtml,
  downloadWritelyPdf,
  printWritely,
} from '../utils/downloadWritely.js';

export default function WritelyEditor({
  writely,
  onChangeTitle,
  onChangeDoc,
  onChangeMargin,
  onDelete,
  onNew,
  onImport,
  onHome,
  onSave,
}) {
  const paper = getPaperSize(writely.size);
  const titleRef = useRef(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [spellCheck, setSpellCheck] = useState(true);
  const [pageCount, setPageCount] = useState(1);
  const [showGridlines, setShowGridlines] = useState(false);
  const margin = writely.margin || 'auto';

  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === 's') {
        event.preventDefault();
        onSave();
      }
      if (event.key === 'n') {
        event.preventDefault();
        onNew();
      }
      if (event.key === 'p') {
        event.preventDefault();
        printWritely(writely);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNew, onSave, writely]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 flex-col gap-2">
        <input
          ref={titleRef}
          value={writely.title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Untitled"
          className="border-0 bg-transparent text-[26px] font-bold text-ink outline-none placeholder:font-semibold placeholder:text-muted"
        />
        <EditorMenuBar
          showToolbar={showToolbar}
          zoom={zoom}
          spellCheck={spellCheck}
          margin={margin}
          onNew={onNew}
          onImport={onImport}
          onHome={onHome}
          onSave={onSave}
          onRename={() => titleRef.current?.focus()}
          onExportTxt={() => downloadWritely(writely)}
          onExportHtml={() => downloadWritelyHtml(writely)}
          onExportPdf={() => downloadWritelyPdf(writely)}
          onExportDocx={() => downloadWritelyDocx(writely)}
          onExportMergeDocx={() => downloadMergedWritelyDocx()}
          onPrint={() => printWritely(writely)}
          onDelete={onDelete}
          onToggleToolbar={() => setShowToolbar((value) => !value)}
          onZoom={setZoom}
          onToggleSpellCheck={() => setSpellCheck((value) => !value)}
          onChangeMargin={onChangeMargin}
          pageCount={pageCount}
        />
        <div className="text-xs text-muted">
          {paper.id} · Last edited{' '}
          {writely.updated ? new Date(writely.updated).toLocaleString() : 'just now'}
        </div>
      </div>
      {showToolbar ? (
        <div className="mb-3 shrink-0">
          <EditorToolbar
            margin={margin}
            onChangeMargin={onChangeMargin}
            showGridlines={showGridlines}
            onToggleGridlines={() => setShowGridlines((value) => !value)}
          />
        </div>
      ) : null}
      <PageScrollArea pageCount={pageCount} showGridlines={showGridlines}>
        <div className="mx-auto" style={{ zoom }}>
          <PagedCanvas
            paper={paper}
            docJson={writely.doc}
            onChangeDoc={onChangeDoc}
            spellCheck={spellCheck}
            margin={margin}
            onPageCount={setPageCount}
          />
        </div>
      </PageScrollArea>
    </div>
  );
}
