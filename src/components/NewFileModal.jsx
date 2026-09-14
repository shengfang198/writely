import { useEffect, useState } from 'react';
import { PAPER_SIZES, previewHeightPx } from '../constants/paperSizes.js';

export default function NewFileModal({ open, onClose, onConfirm }) {
  const [selected, setSelected] = useState('A4');

  useEffect(() => {
    if (open) setSelected('A4');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onConfirm(selected);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onConfirm, selected]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-file-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-panel shadow-[0_16px_40px_rgba(43,41,37,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-6 py-4">
          <h2 id="new-file-title" className="m-0 text-lg font-semibold text-ink">
            Choose canvas size
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3 overflow-y-auto p-5">
          {PAPER_SIZES.map((size) => {
            const isSelected = selected === size.id;
            const paperH = previewHeightPx(size.widthMm);
            const paperW = paperH * (size.widthMm / size.heightMm);
            return (
              <button
                key={size.id}
                type="button"
                onClick={() => setSelected(size.id)}
                onDoubleClick={() => onConfirm(size.id)}
                className={`flex cursor-pointer flex-col items-center rounded-lg border px-3 py-4 text-center transition-colors ${
                  isSelected
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-surface hover:border-accent/50'
                }`}
              >
                <div className="mb-3 flex h-[96px] items-end justify-center">
                  <div
                    className="border border-line bg-white shadow-sm"
                    style={{ width: paperW, height: paperH }}
                  />
                </div>
                <span className="text-sm font-semibold text-ink">{size.id}</span>
                <span className="mt-1 text-[11px] leading-snug text-muted">
                  {size.widthMm} x {size.heightMm} mm
                </span>
                <span className="text-[11px] leading-snug text-muted">
                  {size.inches} inches
                </span>
                {size.popular ? (
                  <span className="mt-1.5 text-[10px] font-medium text-accent">
                    Most common global standard
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-line px-6 py-3">
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="cursor-pointer rounded-md border-0 bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
