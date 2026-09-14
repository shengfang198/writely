import { escapeHtml } from './htmlText.js';

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, href) => {
    return `<img src="${href}" alt="${alt}">`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
    return `<a href="${href}">${label}</a>`;
  });
  s = s.replace(/`([^`]+)`/g, (_, code) => code);
  s = s.replace(/~~(.+?)~~/g, '<s>$1</s>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/__(.+?)__/g, '<b>$1</b>');
  s = s.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<i>$2</i>');
  s = s.replace(/(^|[^_])_(?!\s)([^_]+?)_(?!_)/g, '$1<i>$2</i>');
  return s;
}

export function markdownToHtml(source) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  let para = [];
  let listType = null;

  const flushPara = () => {
    if (!para.length) return;
    html.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };

  const flushList = () => {
    if (!listType) return;
    html.push(listType === 'ol' ? '</ol>' : '</ul>');
    listType = null;
  };

  const openList = (type) => {
    if (listType === type) return;
    flushList();
    html.push(type === 'ol' ? '<ol>' : '<ul>');
    listType = type;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flushPara();
      flushList();
      i += 1;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      html.push(`<p>${escapeHtml(code.join('\n')).replace(/\n/g, '<br>')}</p>`);
      if (i < lines.length) i += 1;
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushPara();
      flushList();
      html.push('<hr>');
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushPara();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2].replace(/\s+#+\s*$/, ''))}</h${level}>`);
      i += 1;
      continue;
    }

    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flushPara();
      flushList();
      html.push(`<p>${inline(quote[1])}</p>`);
      i += 1;
      continue;
    }

    const ul = /^\s*[-*+]\s+(.+)$/.exec(line);
    if (ul) {
      flushPara();
      openList('ul');
      html.push(`<li><p>${inline(ul[1])}</p></li>`);
      i += 1;
      continue;
    }

    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (ol) {
      flushPara();
      openList('ol');
      html.push(`<li><p>${inline(ol[1])}</p></li>`);
      i += 1;
      continue;
    }

    if (!line.trim()) {
      flushPara();
      flushList();
      i += 1;
      continue;
    }

    flushList();
    para.push(line.trimEnd());
    i += 1;
  }

  flushPara();
  flushList();
  return html.join('') || '<p></p>';
}
