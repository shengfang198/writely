import { htmlToDoc } from '../editor/html.js';
import { docxToHtml } from './docx.js';
import { markdownToHtml } from './markdown.js';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = /\.(docx|md|markdown|txt)$/i;

export const IMPORT_ACCEPT = '.docx,.md,.markdown,.txt,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function extOf(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

export function titleFromFileName(name) {
  return String(name || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '')
    .trim();
}

async function readText(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes);
  }
  const start = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  return new TextDecoder('utf-8').decode(bytes.subarray(start));
}

export async function parseImportFile(file) {
  if (!file) throw new Error('No file selected');
  if (file.size > MAX_BYTES) throw new Error('File is too large (max 8 MB)');
  const name = file.name || 'Untitled';
  if (!ACCEPT.test(name)) {
    throw new Error('Unsupported file type. Use .docx, .md, or .txt.');
  }

  const ext = extOf(name);
  let html = '';
  if (ext === 'docx') {
    html = await docxToHtml(await file.arrayBuffer());
  } else if (ext === 'md' || ext === 'markdown') {
    html = markdownToHtml(await readText(file));
  } else {
    const text = await readText(file);
    html = text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => `<p>${line ? escapePlain(line) : ''}</p>`)
      .join('');
  }

  const doc = htmlToDoc(html);
  return {
    title: titleFromFileName(name),
    doc: doc.toJSON(),
  };
}

function escapePlain(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
