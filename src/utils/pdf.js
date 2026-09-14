import { getPaperSize } from '../constants/paperSizes.js';

const MARGIN_MM = {
  auto: 20,
  narrow: 12.7,
  normal: 25.4,
  wide: 38.1,
};

function mmToPt(mm) {
  return (mm * 72) / 25.4;
}

function toPdfText(value) {
  return Array.from(String(value || ''))
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 10 || code === 13) return ch;
      if (code >= 32 && code <= 126) return ch;
      if (code >= 160 && code <= 255) return ch;
      return '?';
    })
    .join('');
}

function escapePdf(value) {
  let out = '';
  Array.from(toPdfText(value)).forEach((ch) => {
    const code = ch.charCodeAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '(') out += '\\(';
    else if (ch === ')') out += '\\)';
    else if (code < 32 || code > 126) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += ch;
  });
  return out;
}

function wrapLine(line, maxChars) {
  if (line.length <= maxChars) return [line];
  const rows = [];
  let current = '';
  line.split(/(\s+)/).forEach((part) => {
    if ((current + part).length <= maxChars) {
      current += part;
      return;
    }
    if (current) rows.push(current.trimEnd());
    if (part.length > maxChars) {
      let rest = part.trim();
      while (rest.length > maxChars) {
        rows.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      current = rest;
    } else {
      current = part.trimStart();
    }
  });
  if (current) rows.push(current.trimEnd());
  return rows.length ? rows : [''];
}

export function buildWritelyPdf(writely, bodyText) {
  const paper = getPaperSize(writely.size);
  const pageW = mmToPt(paper.widthMm);
  const pageH = mmToPt(paper.heightMm);
  const margin = mmToPt(MARGIN_MM[writely.margin] || MARGIN_MM.auto);
  const maxChars = Math.max(24, Math.floor((pageW - margin * 2) / 6.2));
  const lineH = 15;
  const wrapped = toPdfText(bodyText || '')
    .split(/\r?\n/)
    .flatMap((line) => wrapLine(line, maxChars));
  if (!wrapped.length) wrapped.push('');

  const startY = pageH - margin;
  const linesPerPage = Math.max(1, Math.floor((pageH - margin * 2) / lineH));
  const pages = [];
  for (let i = 0; i < wrapped.length; i += linesPerPage) {
    pages.push(wrapped.slice(i, i + linesPerPage));
  }

  const pageStreams = pages.map((lines) => {
    const ops = [`BT\n/F1 11 Tf\n${margin.toFixed(2)} ${startY.toFixed(2)} Td\n${lineH} TL`];
    lines.forEach((line, lineIndex) => {
      ops.push(lineIndex === 0 ? `(${escapePdf(line)}) Tj` : `T* (${escapePdf(line)}) Tj`);
    });
    ops.push('ET');
    return ops.join('\n');
  });

  const parts = [];
  const pushObj = (body) => {
    parts.push(body);
    return parts.length;
  };

  const catalogId = pushObj('');
  const pagesId = pushObj('');
  const fontId = pushObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const contentIds = pageStreams.map((stream) =>
    pushObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  );
  const pageIds = contentIds.map(
    (contentId) =>
      pushObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(
          2
        )}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
      )
  );

  parts[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  parts[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  parts.forEach((body, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${parts.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= parts.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${parts.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return pdf;
}
