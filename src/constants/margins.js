export const MARGIN_PRESETS = [
  { id: 'auto', label: 'Auto' },
  { id: 'narrow', label: 'Narrow' },
  { id: 'normal', label: 'Normal' },
  { id: 'wide', label: 'Wide' },
];

const MARGIN_MM = {
  narrow: 12.7,
  normal: 25.4,
  wide: 38.1,
};

export function getMarginPx(preset, paper, sheet) {
  const shortest = Math.min(sheet.width, sheet.height);
  if (preset === 'auto' || !MARGIN_MM[preset]) {
    return Math.round(Math.min(72, Math.max(28, shortest * 0.08)));
  }
  return Math.round((MARGIN_MM[preset] / paper.widthMm) * sheet.width);
}
  