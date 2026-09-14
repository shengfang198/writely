import { useEffect, useMemo, useState } from 'react';
import { getPaperSize } from '../constants/paperSizes.js';
import { db } from '../db/writelyDb.js';
import { docToHtml, jsonToDoc } from '../editor/html.js';
import PaperSheet, { getSheetSize } from './PaperSheet.jsx';

const BLANK_SLOTS = 4;
const PREVIEW_SOURCE_WIDTH = 720;

function hasPreview(html, text, fallback) {
  const source = html || text || fallback || '';
  return source.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length > 0;
}

function PreviewPage({ writely, html, text }) {
  const paper = getPaperSize(writely.size);
  const sheet = getSheetSize(paper.widthMm, paper.heightMm, 160, 220);
  const scale = sheet.width / PREVIEW_SOURCE_WIDTH;
  const showHtml = hasPreview(html);
  const showText = !showHtml && hasPreview('', text, writely.preview);
  const content = showHtml ? html : text || writely.preview || '';

  return (
    <>
      <PaperSheet
        widthMm={paper.widthMm}
        heightMm={paper.heightMm}
        maxWidth={160}
        maxHeight={220}
        className="border border-line transition-shadow group-hover:border-accent"
      >
        <div className="h-full w-full overflow-hidden bg-white">
          {showHtml || showText ? (
            <div
              className="page-preview origin-top-left text-left text-[15px] leading-[1.6] text-ink"
              style={{
                width: PREVIEW_SOURCE_WIDTH,
                transform: `scale(${scale})`,
                padding: '36px 32px',
                whiteSpace: showHtml ? 'normal' : 'pre-wrap',
                wordBreak: 'break-word',
              }}
              {...(showHtml
                ? { dangerouslySetInnerHTML: { __html: html } }
                : { children: content })}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-[10px] text-muted">
              No content
            </div>
          )}
        </div>
      </PaperSheet>
      <span className="mt-3 w-full truncate text-sm font-semibold text-ink">
        {writely.title || 'Untitled'}
      </span>
      <span className="mt-0.5 text-xs text-muted">{paper.id}</span>
    </>
  );
}

export default function SuggestedFiles({ writelys, onSelect, onCreate, onImport }) {
  const items = useMemo(
    () =>
      Object.values(writelys)
        .sort((a, b) => (b.updated || 0) - (a.updated || 0))
        .slice(0, BLANK_SLOTS),
    [writelys]
  );
  const blanks = BLANK_SLOTS - items.length;
  const paperA4 = getPaperSize('A4');
  const [previews, setPreviews] = useState({});

  const itemIds = items.map((item) => item.id).join(',');

  useEffect(() => {
    let cancelled = false;
    const ids = itemIds ? itemIds.split(',').filter(Boolean) : [];
    (async () => {
      const next = {};
      await Promise.all(
        ids.map(async (id) => {
          const body = await db.bodies.get(id);
          const doc = jsonToDoc(body?.doc);
          next[id] = docToHtml(doc);
        })
      );
      if (!cancelled) setPreviews(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemIds]);

  return (
    <div className="m-auto w-full max-w-5xl px-4">
      <div className="mb-8 text-center">
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted">
          Suggested Writely
        </h2>
        {onImport ? (
          <button
            type="button"
            onClick={onImport}
            className="mt-3 cursor-pointer border-0 bg-transparent p-0 text-[13px] text-accent hover:underline"
          >
            Import .docx, .md, or .txt
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        {items.map((writely) => (
          <button
            key={writely.id}
            type="button"
            onClick={() => onSelect(writely.id)}
            className="group flex w-[160px] cursor-pointer flex-col items-center bg-transparent p-0 text-center"
          >
            <PreviewPage writely={writely} html={previews[writely.id]} text={writely.preview} />
          </button>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <button
            key={`blank-${i}`}
            type="button"
            onClick={onCreate}
            className="group flex w-[160px] cursor-pointer flex-col items-center bg-transparent p-0 text-center"
          >
            <PaperSheet
              widthMm={paperA4.widthMm}
              heightMm={paperA4.heightMm}
              maxWidth={160}
              maxHeight={220}
              className="border border-dashed border-line bg-panel transition-shadow group-hover:border-accent"
            />
            <span className="mt-3 w-full truncate text-sm font-semibold text-muted">
              New Writely
            </span>
            <span className="mt-0.5 text-xs text-muted">&nbsp;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
