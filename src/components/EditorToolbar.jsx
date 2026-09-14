import { useEffect, useState } from 'react';
import {
  applyFontColor,
  applyFontFamily,
  applyFontSize,
  applyFontWeight,
  applyHighlight,
  getSelectionFormat,
  insertLink,
  redoEdit,
  setAlign,
  toggleBold,
  toggleBulletList,
  toggleItalic,
  toggleOrderedList,
  toggleUnderline,
  undoEdit,
} from '../editor/commands.js';
import { onEditorViewChange } from '../editor/viewRegistry.js';
import { rgbToHex } from '../utils/htmlText.js';
import MarginBar from './MarginBar.jsx';

const FONTS = [
  'Segoe UI',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Garamond',
];

const SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '36px', '48px'];

const WEIGHTS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
];

function ToolButton({ active, title, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      data-active={active ? 'true' : 'false'}
      className={`flex h-7 min-w-7 cursor-pointer items-center justify-center rounded px-1.5 text-[13px] text-ink hover:bg-accent-soft data-[active=true]:bg-accent-soft data-[active=true]:text-accent ${className}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />;
}

export default function EditorToolbar({ margin, onChangeMargin, showGridlines, onToggleGridlines }) {
  const [format, setFormat] = useState(getSelectionFormat);

  useEffect(() => {
    const update = () => setFormat(getSelectionFormat());
    document.addEventListener('selectionchange', update);
    const off = onEditorViewChange(update);
    return () => {
      document.removeEventListener('selectionchange', update);
      off();
    };
  }, []);

  const act = (fn) => {
    fn();
    setFormat(getSelectionFormat());
  };

  const selectClass =
    'h-7 max-w-[140px] cursor-pointer rounded border border-line bg-panel px-1.5 text-xs text-ink outline-none focus:border-accent';

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-panel px-2 py-1.5">
      <ToolButton title="Undo" onClick={() => act(undoEdit)}>
        <UndoIcon />
      </ToolButton>
      <ToolButton title="Redo" onClick={() => act(redoEdit)}>
        <RedoIcon />
      </ToolButton>
      <Divider />
      <select
        aria-label="Font"
        className={selectClass}
        value={FONTS.includes(format.fontName) ? format.fontName : 'Segoe UI'}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => act(() => applyFontFamily(e.target.value))}
      >
        {FONTS.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
      <select
        aria-label="Weight"
        className={selectClass}
        value={Number(format.fontWeight) >= 700 ? '700' : Number(format.fontWeight) >= 600 ? '600' : Number(format.fontWeight) >= 500 ? '500' : '400'}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => act(() => applyFontWeight(e.target.value))}
      >
        {WEIGHTS.map((weight) => (
          <option key={weight.value} value={weight.value}>
            {weight.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Size"
        className={`${selectClass} w-[72px] max-w-[72px]`}
        value={SIZES.includes(format.fontSize) ? format.fontSize : '15px'}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => act(() => applyFontSize(e.target.value))}
      >
        {SIZES.map((size) => (
          <option key={size} value={size}>
            {size.replace('px', '')}
          </option>
        ))}
      </select>
      <Divider />
      <ToolButton title="Bold" active={format.bold} onClick={() => act(toggleBold)} className="font-bold">
        B
      </ToolButton>
      <ToolButton title="Italic" active={format.italic} onClick={() => act(toggleItalic)} className="italic">
        I
      </ToolButton>
      <ToolButton title="Underline" active={format.underline} onClick={() => act(toggleUnderline)} className="underline">
        U
      </ToolButton>
      <label title="Font color" className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-accent-soft">
        <span className="text-[13px] font-semibold text-ink">A</span>
        <span
          className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded"
          style={{ background: rgbToHex(format.color) }}
        />
        <input
          type="color"
          aria-label="Font color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={rgbToHex(format.color)}
          onChange={(e) => act(() => applyFontColor(e.target.value))}
        />
      </label>
      <label title="Highlight" className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-accent-soft">
        <HighlightIcon />
        <input
          type="color"
          aria-label="Highlight color"
          className="absolute inset-0 cursor-pointer opacity-0"
          defaultValue="#fff2a8"
          onChange={(e) => act(() => applyHighlight(e.target.value))}
        />
      </label>
      <Divider />
      <ToolButton title="Insert link" onClick={() => act(() => insertLink())}>
        <LinkIcon />
      </ToolButton>
      <ToolButton title="Bulleted list" onClick={() => act(toggleBulletList)}>
        <BulletIcon />
      </ToolButton>
      <ToolButton title="Numbered list" onClick={() => act(toggleOrderedList)}>
        <NumberIcon />
      </ToolButton>
      <Divider />
      <ToolButton title="Align left" active={format.align === 'left'} onClick={() => act(() => setAlign('left'))}>
        <AlignLeftIcon />
      </ToolButton>
      <ToolButton title="Align center" active={format.align === 'center'} onClick={() => act(() => setAlign('center'))}>
        <AlignCenterIcon />
      </ToolButton>
      <ToolButton title="Align right" active={format.align === 'right'} onClick={() => act(() => setAlign('right'))}>
        <AlignRightIcon />
      </ToolButton>
      <ToolButton title="Justify" active={format.align === 'justify'} onClick={() => act(() => setAlign('justify'))}>
        <AlignJustifyIcon />
      </ToolButton>
      {onChangeMargin ? <MarginBar value={margin} onChange={onChangeMargin} /> : null}
      {onToggleGridlines ? (
        <ToolButton
          title={showGridlines ? 'Hide gridlines' : 'Show gridlines'}
          active={showGridlines}
          onClick={onToggleGridlines}
        >
          <GridIcon />
        </ToolButton>
      ) : null}
    </div>
  );
}

function UndoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l1.91-1.91a5 5 0 0 0-7.07-7.07L10.59 6.34" />
      <path d="M14 11a5 5 0 0 0-7.54-.54L4.55 12.38a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function HighlightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
  );
}

function BulletIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="5" cy="6" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="18" r="1" fill="currentColor" />
      <path d="M9 6h12M9 12h12M9 18h12" />
    </svg>
  );
}

function NumberIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 16h2M4 18h2l-2 2" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h10M4 18h14" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M7 12h10M5 18h14" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M10 12h10M6 18h14" />
    </svg>
  );
}

function AlignJustifyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}
