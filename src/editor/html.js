import { DOMParser as PmParser, DOMSerializer } from 'prosemirror-model';
import { emptyDoc, schema } from './schema.js';
import { normalizePastedHtml } from '../utils/htmlText.js';

export function htmlToDoc(html) {
  if (!html) return emptyDoc();
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    const lines = String(html).split('\n');
    const blocks = lines.map((line) =>
      schema.node('paragraph', null, line ? [schema.text(line)] : [])
    );
    return schema.node('doc', null, blocks);
  }
  const wrap = document.createElement('div');
  wrap.innerHTML = normalizePastedHtml(html);
  return PmParser.fromSchema(schema).parse(wrap);
}

export function docToHtml(doc) {
  if (!doc) return '';
  const wrap = document.createElement('div');
  wrap.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  return wrap.innerHTML;
}

export function docToText(doc) {
  if (!doc) return '';
  return doc.textBetween(0, doc.content.size, '\n\n');
}

export function jsonToDoc(json) {
  if (!json) return emptyDoc();
  if (typeof json === 'string') return htmlToDoc(json);
  try {
    return schema.nodeFromJSON(json);
  } catch {
    return emptyDoc();
  }
}

export function previewFromDoc(doc) {
  return (docToText(doc) || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 500);
}
