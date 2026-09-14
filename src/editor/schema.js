import { Schema } from 'prosemirror-model';

function isBoldWeight(value) {
  return /^(bold|[7-9]00)$/i.test(String(value || '').trim());
}

function isNormalWeight(value) {
  return /^(normal|[1-4]00)$/i.test(String(value || '').trim());
}

export const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      attrs: { align: { default: 'left' } },
      parseDOM: [
        {
          tag: 'p',
          getAttrs: (el) => ({ align: el.style?.textAlign || 'left' }),
        },
        {
          tag: 'div',
          getAttrs: (el) => ({ align: el.style?.textAlign || 'left' }),
        },
      ],
      toDOM: (node) => {
        const align = node.attrs.align;
        return ['p', align && align !== 'left' ? { style: `text-align: ${align}` } : {}, 0];
      },
    },
    heading: {
      content: 'inline*',
      group: 'block',
      attrs: { level: { default: 1 }, align: { default: 'left' } },
      parseDOM: [1, 2, 3].map((level) => ({
        tag: `h${level}`,
        attrs: { level },
      })),
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
    horizontal_rule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM: () => ['hr'],
    },
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0],
    },
    ordered_list: {
      content: 'list_item+',
      group: 'block',
      attrs: { order: { default: 1 } },
      parseDOM: [
        {
          tag: 'ol',
          getAttrs: (el) => ({ order: el.hasAttribute('start') ? Number(el.getAttribute('start')) : 1 }),
        },
      ],
      toDOM: (node) =>
        node.attrs.order === 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0],
    },
    list_item: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM: () => ['li', 0],
    },
    image: {
      inline: true,
      group: 'inline',
      draggable: true,
      attrs: { src: {}, alt: { default: '' } },
      parseDOM: [
        {
          tag: 'img[src]',
          getAttrs: (el) => ({
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt') || '',
          }),
        },
      ],
      toDOM: (node) => [
        'img',
        {
          src: node.attrs.src,
          alt: node.attrs.alt,
          style: 'max-width:100%;height:auto',
        },
      ],
    },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br'],
    },
    text: { group: 'inline' },
  },
  marks: {
    strong: {
      parseDOM: [
        { tag: 'strong' },
        {
          tag: 'b',
          getAttrs: (el) => (isNormalWeight(el.style?.fontWeight) ? false : null),
        },
        {
          style: 'font-weight',
          getAttrs: (value) => (isBoldWeight(value) ? null : false),
        },
        {
          tag: 'span',
          getAttrs: (el) => (isBoldWeight(el.style?.fontWeight) ? null : false),
        },
      ],
      toDOM: () => ['b', { style: 'font-weight:bold' }, 0],
    },
    em: {
      parseDOM: [
        { tag: 'i' },
        { tag: 'em' },
        { style: 'font-style=italic' },
        {
          tag: 'span',
          getAttrs: (el) => (/^(italic|oblique)$/i.test(el.style?.fontStyle) ? null : false),
        },
      ],
      toDOM: () => ['i', { style: 'font-style:italic' }, 0],
    },
    underline: {
      parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
      toDOM: () => ['u', 0],
    },
    strike: {
      parseDOM: [{ tag: 's' }, { tag: 'strike' }, { style: 'text-decoration=line-through' }],
      toDOM: () => ['s', 0],
    },
    link: {
      attrs: { href: {} },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs: (el) => ({ href: el.getAttribute('href') }),
        },
      ],
      toDOM: (node) => ['a', { href: node.attrs.href }, 0],
    },
    textStyle: {
      attrs: {
        fontFamily: { default: null },
        fontSize: { default: null },
        fontWeight: { default: null },
        color: { default: null },
        background: { default: null },
      },
      parseDOM: [
        {
          tag: 'span',
          getAttrs: (el) => {
            const style = el.style;
            const weight = style.fontWeight;
            const bold = /^(bold|[7-9]00)$/i.test(weight);
            if (
              !style.fontFamily &&
              !style.fontSize &&
              !style.color &&
              !style.backgroundColor &&
              (!weight || bold)
            ) {
              return false;
            }
            return {
              fontFamily: style.fontFamily || null,
              fontSize: style.fontSize || null,
              fontWeight: bold ? null : weight || null,
              color: style.color || null,
              background: style.backgroundColor || null,
            };
          },
        },
      ],
      toDOM: (node) => {
        const { fontFamily, fontSize, fontWeight, color, background } = node.attrs;
        const style = [
          fontFamily && `font-family:${fontFamily}`,
          fontSize && `font-size:${fontSize}`,
          fontWeight && `font-weight:${fontWeight}`,
          color && `color:${color}`,
          background && `background:${background}`,
        ]
          .filter(Boolean)
          .join(';');
        return ['span', style ? { style } : {}, 0];
      },
    },
  },
});

export function emptyDoc() {
  return schema.node('doc', null, schema.node('paragraph'));
}
