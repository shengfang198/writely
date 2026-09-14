import { db } from '../db/writelyDb.js';
import { docToHtml, docToText, jsonToDoc } from '../editor/html.js';
import { bodyToHtml, escapeHtml, stripHtml } from './htmlText.js';
import { buildDocxBuffer } from './docx.js';
import { buildWritelyPdf } from './pdf.js';

function fileName(writely, ext) {
  return (writely.title || 'untitled').replace(/[^a-z0-9\-_ ]/gi, '_') + ext;
}

function downloadBlob(content, type, name) {
  const blob =
    content instanceof Uint8Array ? new Blob([content], { type }) : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function htmlFromWritely(writely) {
  if (writely.doc) return docToHtml(jsonToDoc(writely.doc));
  return bodyToHtml(writely.body || '');
}

function textFromWritely(writely) {
  if (writely.doc) return docToText(jsonToDoc(writely.doc));
  return stripHtml(writely.body || '');
}

export function downloadWritely(writely) {
  downloadBlob(textFromWritely(writely), 'text/plain', fileName(writely, '.txt'));
}

export function downloadWritelyHtml(writely) {
  const title = escapeHtml(writely.title || 'Untitled');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
</head>
<body>
${htmlFromWritely(writely)}
</body>
</html>
`;
  downloadBlob(html, 'text/html', fileName(writely, '.html'));
}

export function downloadWritelyPdf(writely) {
  const pdf = buildWritelyPdf(writely, textFromWritely(writely));
  downloadBlob(pdf, 'application/pdf', fileName(writely, '.pdf'));
}

export function downloadWritelyDocx(writely) {
  const buffer = buildDocxBuffer([
    { title: writely.title, doc: writely.doc, body: writely.body },
  ]);
  downloadBlob(
    buffer,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileName(writely, '.docx')
  );
}

export async function downloadMergedWritelyDocx() {
  const metas = await db.docs.toArray();
  if (!metas.length) return;
  metas.sort((a, b) => (a.updated || 0) - (b.updated || 0));
  const sections = [];
  for (const meta of metas) {
    const body = await db.bodies.get(meta.id);
    sections.push({ title: meta.title || 'Untitled', doc: body?.doc });
  }
  const buffer = buildDocxBuffer(sections);
  downloadBlob(
    buffer,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'writely-merge-all.docx'
  );
}

export function printWritely(writely) {
  const title = escapeHtml(writely.title || 'Untitled');
  const frame = window.open('', '_blank');
  if (!frame) return;
  frame.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Segoe UI, sans-serif; color: #2b2925; line-height: 1.6; padding: 32px; }
    img { max-width: 100%; }
  </style>
</head>
<body>
<h1>${title}</h1>
${htmlFromWritely(writely)}
</body>
</html>`);
  frame.document.close();
  frame.focus();
  frame.print();
}
