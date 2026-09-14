import { htmlToDoc, jsonToDoc } from '../editor/html.js';
import { escapeHtml } from './htmlText.js';
import { unzip, zipCreate, zipText } from './zip.js';

const HIGHLIGHT = {
  yellow: '#fff2a8',
  green: '#c6efce',
  cyan: '#c6efef',
  magenta: '#ffc6ef',
  red: '#ffc7ce',
  blue: '#bdd7ee',
  darkBlue: '#8db4e2',
  darkCyan: '#7fc5c5',
  darkGreen: '#8cbf8c',
  darkMagenta: '#d5a6bd',
  darkRed: '#e6a0a0',
  darkYellow: '#e2d48a',
  darkGray: '#a6a6a6',
  lightGray: '#d9d9d9',
};

function children(el, name) {
  return [...(el?.children || [])].filter((child) => child.localName === name);
}

function first(el, name) {
  return children(el, name)[0] || null;
}

function wVal(el) {
  if (!el) return '';
  return el.getAttribute('w:val') || el.getAttribute('val') || '';
}

function relId(el) {
  return (
    el.getAttribute('r:id') ||
    el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ||
    el.getAttribute('id') ||
    ''
  );
}

function documentPath(files) {
  if (files['word/document.xml']) return 'word/document.xml';
  const types = files['[Content_Types].xml'];
  if (!types) return '';
  const xml = zipText(types);
  const match = xml.match(/PartName="\/([^"]+)"[^>]*document\.main\+xml/i);
  return match ? decodeURIComponent(match[1]) : '';
}

function onOff(el) {
  if (!el) return false;
  const value = wVal(el).toLowerCase();
  return value !== '0' && value !== 'false' && value !== 'off';
}

function parseRels(xml) {
  const rels = {};
  if (!xml) return rels;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  [...doc.getElementsByTagName('*')].forEach((el) => {
    if (el.localName !== 'Relationship') return;
    const type = el.getAttribute('Type') || '';
    if (!/hyperlink$/i.test(type)) return;
    const id = el.getAttribute('Id');
    const target = el.getAttribute('Target');
    if (id && target) rels[id] = target;
  });
  return rels;
}

function runToHtml(run) {
  const rPr = first(run, 'rPr');
  const parts = [];
  for (const child of run.children) {
    const name = child.localName;
    if (name === 't') parts.push(escapeHtml(child.textContent || ''));
    else if (name === 'tab') parts.push('    ');
    else if (name === 'br' || name === 'cr') {
      if ((child.getAttribute('w:type') || child.getAttribute('type')) === 'page') continue;
      parts.push('<br>');
    }
  }
  let html = parts.join('');
  if (!html) return '';
  if (rPr) {
    const color = wVal(first(rPr, 'color'));
    const highlight = wVal(first(rPr, 'highlight'));
    const sz = Number(wVal(first(rPr, 'sz')));
    const style = [];
    if (color && color !== 'auto' && /^[0-9a-fA-F]{6}$/.test(color)) style.push(`color:#${color}`);
    if (HIGHLIGHT[highlight]) style.push(`background:${HIGHLIGHT[highlight]}`);
    if (sz > 0) style.push(`font-size:${sz / 2}pt`);
    if (style.length) html = `<span style="${style.join(';')}">${html}</span>`;
    if (onOff(first(rPr, 'strike')) || onOff(first(rPr, 'dstrike'))) html = `<s>${html}</s>`;
    if (first(rPr, 'u') && wVal(first(rPr, 'u')).toLowerCase() !== 'none') html = `<u>${html}</u>`;
    if (onOff(first(rPr, 'i'))) html = `<i>${html}</i>`;
    if (onOff(first(rPr, 'b'))) html = `<b>${html}</b>`;
  }
  return html;
}

function collectRuns(el, rels) {
  let html = '';
  for (const child of el.children) {
    const name = child.localName;
    if (name === 'r') html += runToHtml(child);
    else if (name === 'hyperlink') {
      const id = relId(child);
      const href = rels[id] || child.getAttribute('w:anchor') || '#';
      html += `<a href="${escapeHtml(href)}">${collectRuns(child, rels)}</a>`;
    } else if (name === 'sdt') {
      const content = first(child, 'sdtContent');
      if (content) html += collectRuns(content, rels);
    } else if (name === 'ins' || name === 'smartTag' || name === 'del' || name === 'pPr') {
      if (name !== 'pPr' && name !== 'del') html += collectRuns(child, rels);
    } else if (child.children?.length) {
      html += collectRuns(child, rels);
    }
  }
  return html;
}

function headingLevel(styleVal) {
  const value = String(styleVal || '').toLowerCase();
  if (value === 'title' || value === 'heading1' || value === 'heading 1') return 1;
  if (value === 'heading2' || value === 'heading 2' || value === 'subtitle') return 2;
  if (value === 'heading3' || value === 'heading 3') return 3;
  const match = value.match(/^heading\s*([123])$/);
  return match ? Number(match[1]) : 0;
}

function alignOf(pPr) {
  const jc = wVal(first(pPr, 'jc'));
  if (jc === 'center' || jc === 'right' || jc === 'both') return jc === 'both' ? 'justify' : jc;
  return '';
}

function paragraphBlock(p, rels) {
  const pPr = first(p, 'pPr');
  const style = headingLevel(wVal(first(pPr, 'pStyle')));
  const align = alignOf(pPr);
  const isList = !!first(pPr, 'numPr');
  const inner = collectRuns(p, rels);
  if (first(pPr, 'pBdr') && !inner.trim()) return { type: 'hr' };
  if (style) return { type: 'h', level: style, html: inner, align };
  if (isList) return { type: 'li', html: inner, align };
  return { type: 'p', html: inner, align };
}

function alignAttr(align) {
  return align ? ` style="text-align:${align}"` : '';
}

export async function docxToHtml(buffer) {
  const files = await unzip(buffer);
  const path = documentPath(files);
  const docBytes = path ? files[path] : null;
  if (!docBytes) throw new Error('Could not read this Word document');
  const relsName = path.replace(/[^/]+$/, '_rels/$&') + '.rels';
  const rels = parseRels(files[relsName] ? zipText(files[relsName]) : '');
  const xml = zipText(docBytes);
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');
  if (parsed.querySelector('parsererror')) throw new Error('Could not read this Word document');
  const body = [...parsed.getElementsByTagName('*')].find((el) => el.localName === 'body');
  if (!body) throw new Error('Could not read this Word document');

  const blocks = [];
  for (const child of body.children) {
    if (child.localName === 'p') blocks.push(paragraphBlock(child, rels));
    else if (child.localName === 'tbl') {
      for (const row of children(child, 'tr')) {
        const cells = children(row, 'tc')
          .map((cell) =>
            children(cell, 'p')
              .map((p) => collectRuns(p, rels))
              .filter(Boolean)
              .join(' ')
          )
          .filter(Boolean);
        if (cells.length) blocks.push({ type: 'p', html: cells.join(' — '), align: '' });
      }
    }
  }

  const html = [];
  let listOpen = false;
  for (const block of blocks) {
    if (block.type === 'li') {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li><p>${block.html}</p></li>`);
      continue;
    }
    if (listOpen) {
      html.push('</ul>');
      listOpen = false;
    }
    if (block.type === 'hr') html.push('<hr>');
    else if (block.type === 'h') html.push(`<h${block.level}${alignAttr(block.align)}>${block.html}</h${block.level}>`);
    else html.push(`<p${alignAttr(block.align)}>${block.html}</p>`);
  }
  if (listOpen) html.push('</ul>');
  return html.join('') || '<p></p>';
}

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

function xmlText(value) {
  return escapeHtml(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

function createLinkContext() {
  const links = [];
  return {
    addLink(href) {
      const id = `rId${links.length + 2}`;
      links.push({ id, href: href || '#' });
      return id;
    },
    documentRels() {
      const parts = [
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
      ];
      links.forEach(({ id, href }) => {
        parts.push(
          `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xmlText(href)}" TargetMode="External"/>`
        );
      });
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PKG_NS}">
${parts.join('\n')}
</Relationships>`;
    },
  };
}

function markNames(marks) {
  const set = new Set();
  marks.forEach((mark) => set.add(mark.type.name));
  return set;
}

function runProperties(marks) {
  const names = markNames(marks);
  const textStyle = marks.find((m) => m.type.name === 'textStyle')?.attrs || {};
  const parts = [];
  if (names.has('strong') || (textStyle.fontWeight && !/^(normal|[1-4]00)$/i.test(textStyle.fontWeight))) {
    parts.push('<w:b/>');
  }
  if (names.has('em')) parts.push('<w:i/>');
  if (names.has('underline')) parts.push('<w:u w:val="single"/>');
  if (names.has('strike')) parts.push('<w:strike/>');
  if (textStyle.color) {
    const hex = textStyle.color.replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(hex)) parts.push(`<w:color w:val="${hex}"/>`);
  }
  if (textStyle.fontSize) {
    const pt = parseFloat(textStyle.fontSize);
    if (pt > 0) parts.push(`<w:sz w:val="${Math.round(pt * 2)}"/>`);
  }
  return parts.length ? `<w:rPr>${parts.join('')}</w:rPr>` : '';
}

function runsFromText(text, marks, ctx) {
  if (!text) return '';
  const link = marks.find((m) => m.type.name === 'link');
  const rPr = runProperties(marks.filter((m) => m.type.name !== 'link'));
  const chunks = [];
  const segments = text.split(/(\n|\t)/);
  for (const segment of segments) {
    if (segment === '\n') chunks.push(`<w:r>${rPr}<w:br/></w:r>`);
    else if (segment === '\t') chunks.push(`<w:r>${rPr}<w:tab/></w:r>`);
    else if (segment) chunks.push(`<w:r>${rPr}<w:t xml:space="preserve">${xmlText(segment)}</w:t></w:r>`);
  }
  const inner = chunks.join('');
  if (!inner) return '';
  if (link) {
    const id = ctx.addLink(link.attrs.href);
    return `<w:hyperlink r:id="${id}">${inner}</w:hyperlink>`;
  }
  return inner;
}

function serializeInline(node, marks, ctx) {
  if (node.isText) return runsFromText(node.text, marks.concat(node.marks), ctx);
  const childMarks = marks.concat(node.marks);
  if (node.type.name === 'hard_break') return `<w:r>${runProperties(childMarks)}<w:br/></w:r>`;
  if (node.type.name === 'image') {
    const label = node.attrs.alt ? `[Image: ${node.attrs.alt}]` : '[Image]';
    return runsFromText(label, childMarks, ctx);
  }
  let html = '';
  node.forEach((child) => {
    html += serializeInline(child, childMarks, ctx);
  });
  return html;
}

function inlineBlockXml(block, ctx) {
  let runs = '';
  block.forEach((child) => {
    runs += serializeInline(child, [], ctx);
  });
  return runs || '<w:r><w:t xml:space="preserve"></w:t></w:r>';
}

function paragraphAlignPr(align) {
  if (!align || align === 'left') return '';
  const jc = align === 'justify' ? 'both' : align;
  return `<w:jc w:val="${jc}"/>`;
}

function blockToXml(node, ctx) {
  const name = node.type.name;
  if (name === 'paragraph') {
    const pPrInner = paragraphAlignPr(node.attrs.align);
    const pPr = pPrInner ? `<w:pPr>${pPrInner}</w:pPr>` : '';
    return `<w:p>${pPr}${inlineBlockXml(node, ctx)}</w:p>`;
  }
  if (name === 'heading') {
    const level = Math.min(3, Math.max(1, node.attrs.level || 1));
    const align = paragraphAlignPr(node.attrs.align);
    const pPr = `<w:pPr><w:pStyle w:val="Heading${level}"/>${align}</w:pPr>`;
    return `<w:p>${pPr}${inlineBlockXml(node, ctx)}</w:p>`;
  }
  if (name === 'horizontal_rule') {
    return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>';
  }
  if (name === 'bullet_list' || name === 'ordered_list') {
    const order = node.attrs.order || 1;
    return node.content.content
      .map((item, index) => {
        const prefix = name === 'bullet_list' ? '• ' : `${order + index}. `;
        return listItemToXml(item, prefix, ctx);
      })
      .join('');
  }
  return '';
}

function listItemToXml(item, prefix, ctx) {
  let out = '';
  item.forEach((child) => {
    if (child.type.name === 'paragraph') {
      const prefixRun = runsFromText(prefix, [], ctx);
      out += `<w:p><w:pPr><w:ind w:left="720"/></w:pPr>${prefixRun}${inlineBlockXml(child, ctx)}</w:p>`;
    } else {
      out += blockToXml(child, ctx);
    }
  });
  return out;
}

function docToBodyXml(doc, ctx) {
  let body = '';
  doc.forEach((node) => {
    body += blockToXml(node, ctx);
  });
  return body || '<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>';
}

function sectionToBodyXml(section, ctx) {
  const pmDoc = section.doc ? jsonToDoc(section.doc) : htmlToDoc(section.body || '');
  return docToBodyXml(pmDoc, ctx);
}

function pageBreakXml() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function titleParagraphXml(title) {
  const safe = xmlText(title || 'Untitled');
  return `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${PKG_NS}">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W_NS}">
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:sz w:val="56"/><w:b/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:sz w:val="32"/><w:b/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:sz w:val="28"/><w:b/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:sz w:val="24"/><w:b/></w:rPr>
  </w:style>
</w:styles>`;

/**
 * @param {{ title?: string, doc?: object, body?: string }[]} sections
 */
export function buildDocxBuffer(sections) {
  const ctx = createLinkContext();
  const bodyParts = [];
  sections.forEach((section, index) => {
    if (index > 0) bodyParts.push(pageBreakXml());
    if (section.title) bodyParts.push(titleParagraphXml(section.title));
    bodyParts.push(sectionToBodyXml(section, ctx));
  });
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}">
  <w:body>
    ${bodyParts.join('')}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  return zipCreate([
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: '_rels/.rels', data: ROOT_RELS },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/_rels/document.xml.rels', data: ctx.documentRels() },
    { name: 'word/styles.xml', data: STYLES },
  ]);
}
