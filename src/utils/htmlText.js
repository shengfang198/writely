export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

export function bodyToHtml(body) {
  if (!body) return '';
  if (/<[a-z][\s\S]*>/i.test(body)) return body;
  return escapeHtml(body).replace(/\n/g, '<br>');
}

const LAYOUT_STYLE_PROPS = [
  'height',
  'min-height',
  'max-height',
  'position',
  'top',
  'left',
  'bottom',
  'right',
  'margin',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'padding',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'float',
  'transform',
  'line-height',
  'font-size',
  'letter-spacing',
  'word-spacing',
  'text-indent',
  'vertical-align',
];

function unwrapElement(el) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function wrapContents(el, tag) {
  const wrap = document.createElement(tag);
  while (el.firstChild) wrap.appendChild(el.firstChild);
  el.appendChild(wrap);
}

function isBoldWeight(value) {
  return /^(bold|[7-9]00)$/i.test(String(value || '').trim());
}

function isNormalWeight(value) {
  return /^(normal|[1-4]00)$/i.test(String(value || '').trim());
}

function promoteDocsFormatting(root) {
  root.querySelectorAll('b, strong').forEach((el) => {
    if (isNormalWeight(el.style.fontWeight)) unwrapElement(el);
  });
  root.querySelectorAll('span, font').forEach((el) => {
    const bold = isBoldWeight(el.style.fontWeight);
    const italic = /^(italic|oblique)$/i.test(el.style.fontStyle);
    if (italic) wrapContents(el, 'i');
    if (bold) wrapContents(el, 'b');
    if (bold) el.style.fontWeight = '';
    if (italic) el.style.fontStyle = '';
  });
}

function extractClipboardFragment(html) {
  const start = html.indexOf('<!--StartFragment-->');
  const end = html.indexOf('<!--EndFragment-->');
  if (start !== -1 && end !== -1) return html.slice(start + 20, end);
  return html;
}

function isBlankNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return !node.textContent.replace(/[\u200b\u00a0\s]/g, '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return true;
  if (node.nodeName === 'IMG' || node.nodeName === 'HR') return false;
  if (node.querySelector('img, hr, video, canvas')) return false;
  if (node.nodeName === 'BR') return true;
  return !node.textContent.replace(/[\u200b\u00a0\s]/g, '');
}

function cleanInlineStyle(el) {
  if (el.nodeName === 'IMG') return;
  const style = el.getAttribute('style');
  if (!style) return;
  const kept = style
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const name = part.split(':')[0].trim().toLowerCase();
      return name && !LAYOUT_STYLE_PROPS.includes(name);
    });
  if (kept.length) el.setAttribute('style', kept.join('; '));
  else el.removeAttribute('style');
}

export function normalizePastedHtml(html) {
  if (!html) return '';
  const template = document.createElement('template');
  template.innerHTML = extractClipboardFragment(html);
  const root = template.content;

  root.querySelectorAll('script, style, iframe, object, embed, meta, link').forEach((el) => el.remove());
  root.querySelectorAll('[data-page-break], .page-break, [data-writely-caret]').forEach((el) => el.remove());
  promoteDocsFormatting(root);

  root.querySelectorAll('p, div, li, span, h1, h2, h3').forEach((el) => {
    if (el.childElementCount === 0 && isBlankNode(el)) {
      el.innerHTML = '';
    }
  });

  root.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (
        attr.name.startsWith('on') ||
        attr.name === 'srcdoc' ||
        attr.name.startsWith('data-') ||
        attr.name === 'class' ||
        attr.name === 'id'
      ) {
        el.removeAttribute(attr.name);
      }
    });
    cleanInlineStyle(el);
    if (el.classList?.contains('page-break')) el.remove();
  });

  root.querySelectorAll('div').forEach((el) => {
    if (el.querySelector('div, p, ul, ol, h1, h2, h3, table')) return;
    const tag = el.querySelector('h1, h2, h3') ? el.querySelector('h1, h2, h3').nodeName.toLowerCase() : 'p';
    const replacement = document.createElement(tag);
    replacement.innerHTML = el.innerHTML;
    el.replaceWith(replacement);
  });

  [...root.querySelectorAll('div, p, span, h1, h2, h3, h4, h5, h6')].forEach((el) => {
    const height = parseFloat(el.style.height || el.style.minHeight || '');
    if (height > 36 && isBlankNode(el)) el.remove();
  });

  const blocks = [...root.querySelectorAll('div, p')];
  let emptyRun = 0;
  blocks.forEach((el) => {
    if (!el.isConnected) return;
    if (!isBlankNode(el)) {
      emptyRun = 0;
      return;
    }
    emptyRun += 1;
    if (emptyRun > 1) el.remove();
  });

  return template.innerHTML.trim();
}

export function rgbToHex(color) {
  if (!color) return '#2b2925';
  if (color.startsWith('#')) return color;
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#2b2925';
  return `#${[match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, '0'))
    .join('')}`;
}
