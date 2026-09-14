import { useEffect, useRef, useState } from 'react';
import { MARGIN_PRESETS } from '../constants/margins.js';

function MarginIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <rect x="7" y="7" width="10" height="10" rx="0.5" strokeDasharray="2 2" />
    </svg>
  );
}

export default function MarginBar({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = (value || 'auto');
  const activePreset = MARGIN_PRESETS.some((p) => p.id === current && p.id !== 'auto');

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="Page margin"
        aria-label="Page margin"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        data-active={open || activePreset ? 'true' : 'false'}
        className="flex h-7 min-w-7 cursor-pointer items-center justify-center rounded px-1.5 text-ink hover:bg-accent-soft data-[active=true]:bg-accent-soft data-[active=true]:text-accent"
      >
        <MarginIcon />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[120px] rounded-md border border-line bg-panel py-1 shadow-[0_8px_24px_rgba(43,41,37,0.12)]">
          {MARGIN_PRESETS.map((preset) => {
            const selected = current === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(preset.id)}
                className={`flex w-full cursor-pointer border-0 bg-transparent px-3 py-1.5 text-left text-[13px] hover:bg-accent-soft ${
                  selected ? 'font-medium text-accent' : 'text-ink'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
