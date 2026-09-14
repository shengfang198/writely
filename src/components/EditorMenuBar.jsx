import { useEffect, useRef, useState } from 'react';
import {
  applyFontColor,
  applyFontFamily,
  applyFontSize,
  applyFontWeight,
  applyHighlight,
  clearFormatting,
  documentStats,
  findInDocument,
  focusEditor,
  insertDateTime,
  insertHorizontalLine,
  insertLink,
  redoEdit,
  selectAll,
  setAlign,
  toggleBold,
  toggleBulletList,
  toggleItalic,
  toggleOrderedList,
  toggleStrike,
  toggleUnderline,
  undoEdit,
} from '../editor/commands.js';
import { MARGIN_PRESETS } from '../constants/margins.js';

function MenuItem({ label, shortcut, danger, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center justify-between gap-8 border-0 bg-transparent px-3 py-1.5 text-left text-[13px] hover:bg-accent-soft ${
        danger ? 'text-danger' : 'text-ink'
      }`}
    >
      <span>{label}</span>
      {shortcut ? <span className="text-[11px] text-muted">{shortcut}</span> : null}
    </button>
  );
}

function Separator() {
  return <div className="my-1 h-px bg-line" />;
}

function SubMenu({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        className="flex w-full cursor-pointer items-center justify-between gap-8 border-0 bg-transparent px-3 py-1.5 text-left text-[13px] text-ink hover:bg-accent-soft"
      >
        <span>{label}</span>
        <span className="text-[11px] text-muted">›</span>
      </button>
      {open ? (
        <div className="absolute left-full top-0 z-40 ml-0.5 min-w-[200px] rounded-md border border-line bg-panel py-1 shadow-[0_8px_24px_rgba(43,41,37,0.12)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Menu({ id, label, openId, setOpenId, children }) {
  const isOpen = openId === id;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpenId(isOpen ? null : id)}
        className={`cursor-pointer rounded px-2.5 py-1 text-[13px] ${
          isOpen ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-accent-soft'
        }`}
      >
        {label}
      </button>
      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded-md border border-line bg-panel py-1 shadow-[0_8px_24px_rgba(43,41,37,0.12)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function EditorMenuBar({
  showToolbar,
  zoom,
  spellCheck,
  onNew,
  onImport,
  onHome,
  onSave,
  onRename,
  onExportTxt,
  onExportHtml,
  onExportPdf,
  onExportDocx,
  onExportMergeDocx,
  onPrint,
  onDelete,
  onToggleToolbar,
  onZoom,
  onToggleSpellCheck,
  margin,
  onChangeMargin,
  pageCount = 1,
}) {
  const [openId, setOpenId] = useState(null);
  const [counts, setCounts] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpenId(null);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpenId(null);
        setCounts(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const close = (fn) => {
    setOpenId(null);
    fn?.();
  };

  const edit = (fn) => {
    close(() => {
      focusEditor();
      fn();
    });
  };

  const nativeEdit = (command) => {
    close(() => {
      focusEditor();
      document.execCommand(command);
    });
  };

  const showWordCount = () => {
    const stats = documentStats();
    setOpenId(null);
    setCounts({ ...stats, pages: pageCount || 1 });
  };

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-0.5">
      <Menu id="file" label="File" openId={openId} setOpenId={setOpenId}>
        <MenuItem label="New" shortcut="Ctrl+N" onClick={() => close(onNew)} />
        <MenuItem label="Home" onClick={() => close(onHome)} />
        <MenuItem label="Import..." onClick={() => close(onImport)} />
        <Separator />
        <MenuItem label="Save" shortcut="Ctrl+S" onClick={() => close(onSave)} />
        <MenuItem label="Rename" onClick={() => close(onRename)} />
        <Separator />
        <SubMenu label="Export">
          <MenuItem label=".txt" onClick={() => close(onExportTxt)} />
          <MenuItem label=".html" onClick={() => close(onExportHtml)} />
          <MenuItem label=".pdf" onClick={() => close(onExportPdf)} />
          <MenuItem label=".docx" onClick={() => close(onExportDocx)} />
          <Separator />
          <MenuItem label="Merge all (.docx)" onClick={() => close(onExportMergeDocx)} />
        </SubMenu>
        <MenuItem label="Print" shortcut="Ctrl+P" onClick={() => close(onPrint)} />
        <Separator />
        <MenuItem label="Delete" danger onClick={() => close(onDelete)} />
      </Menu>

      <Menu id="edit" label="Edit" openId={openId} setOpenId={setOpenId}>
        <MenuItem label="Undo" shortcut="Ctrl+Z" onClick={() => edit(undoEdit)} />
        <MenuItem label="Redo" shortcut="Ctrl+Y" onClick={() => edit(redoEdit)} />
        <Separator />
        <MenuItem label="Cut" shortcut="Ctrl+X" onClick={() => nativeEdit('cut')} />
        <MenuItem label="Copy" shortcut="Ctrl+C" onClick={() => nativeEdit('copy')} />
        <MenuItem label="Paste" shortcut="Ctrl+V" onClick={() => nativeEdit('paste')} />
        <MenuItem label="Select all" shortcut="Ctrl+A" onClick={() => edit(selectAll)} />
        <Separator />
        <MenuItem label="Find" shortcut="Ctrl+F" onClick={() => close(findInDocument)} />
      </Menu>

      <Menu id="view" label="View" openId={openId} setOpenId={setOpenId}>
        <MenuItem
          label={showToolbar ? 'Hide formatting bar' : 'Show formatting bar'}
          onClick={() => close(onToggleToolbar)}
        />
        <Separator />
        {[75, 100, 125, 150].map((value) => (
          <MenuItem
            key={value}
            label={zoom === value / 100 ? `Zoom ${value}% (current)` : `Zoom ${value}%`}
            onClick={() => close(() => onZoom(value / 100))}
          />
        ))}
        <Separator />
        <MenuItem label="Print preview" onClick={() => close(onPrint)} />
      </Menu>

      <Menu id="insert" label="Insert" openId={openId} setOpenId={setOpenId}>
        <MenuItem label="Link" shortcut="Ctrl+K" onClick={() => edit(insertLink)} />
        <MenuItem label="Horizontal line" onClick={() => edit(insertHorizontalLine)} />
        <MenuItem label="Date and time" onClick={() => edit(insertDateTime)} />
        <Separator />
        <MenuItem label="Bulleted list" onClick={() => edit(toggleBulletList)} />
        <MenuItem label="Numbered list" onClick={() => edit(toggleOrderedList)} />
      </Menu>

      <Menu id="format" label="Format" openId={openId} setOpenId={setOpenId}>
        <MenuItem label="Bold" shortcut="Ctrl+B" onClick={() => edit(toggleBold)} />
        <MenuItem label="Italic" shortcut="Ctrl+I" onClick={() => edit(toggleItalic)} />
        <MenuItem label="Underline" shortcut="Ctrl+U" onClick={() => edit(toggleUnderline)} />
        <MenuItem label="Strikethrough" onClick={() => edit(toggleStrike)} />
        <Separator />
        <MenuItem label="Font: Arial" onClick={() => edit(() => applyFontFamily('Arial'))} />
        <MenuItem label="Size: 18" onClick={() => edit(() => applyFontSize('18px'))} />
        <MenuItem label="Weight: Bold" onClick={() => edit(() => applyFontWeight('700'))} />
        <MenuItem label="Text color" onClick={() => edit(() => applyFontColor('#c9622a'))} />
        <MenuItem label="Highlight" onClick={() => edit(() => applyHighlight('#fff2a8'))} />
        <Separator />
        <MenuItem label="Align left" onClick={() => edit(() => setAlign('left'))} />
        <MenuItem label="Align center" onClick={() => edit(() => setAlign('center'))} />
        <MenuItem label="Align right" onClick={() => edit(() => setAlign('right'))} />
        <MenuItem label="Justify" onClick={() => edit(() => setAlign('justify'))} />
        <Separator />
        {MARGIN_PRESETS.map((preset) => (
          <MenuItem
            key={preset.id}
            label={
              (margin || 'auto') === preset.id
                ? `Margin: ${preset.label} (current)`
                : `Margin: ${preset.label}`
            }
            onClick={() => close(() => onChangeMargin(preset.id))}
          />
        ))}
        <Separator />
        <MenuItem label="Clear formatting" onClick={() => edit(clearFormatting)} />
      </Menu>

      <Menu id="tools" label="Tools" openId={openId} setOpenId={setOpenId}>
        <MenuItem label="Word count" onClick={showWordCount} />
        <MenuItem label="Find" onClick={() => close(findInDocument)} />
        <MenuItem
          label={spellCheck ? 'Spell check: On' : 'Spell check: Off'}
          onClick={() => close(onToggleSpellCheck)}
        />
      </Menu>

      {counts ? (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[200px] rounded-md border border-line bg-panel px-3 py-3 text-[13px] text-ink shadow-[0_8px_24px_rgba(43,41,37,0.12)]">
          <p className="m-0 mb-1 font-semibold">Word count</p>
          <p className="m-0 text-muted">Words: {counts.words}</p>
          <p className="m-0 text-muted">Characters: {counts.chars}</p>
          <p className="m-0 text-muted">Pages: {counts.pages}</p>
          <button
            type="button"
            onClick={() => setCounts(null)}
            className="mt-2 cursor-pointer rounded border border-line bg-transparent px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
