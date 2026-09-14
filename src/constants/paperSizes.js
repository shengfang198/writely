export const PAPER_SIZES = [
  { id: 'A0', widthMm: 841, heightMm: 1189, inches: '33.1 x 46.8' },
  { id: 'A1', widthMm: 594, heightMm: 841, inches: '23.4 x 33.1' },
  { id: 'A2', widthMm: 420, heightMm: 594, inches: '16.5 x 23.4' },
  { id: 'A3', widthMm: 297, heightMm: 420, inches: '11.7 x 16.5' },
  { id: 'A4', widthMm: 210, heightMm: 297, inches: '8.3 x 11.7', popular: true },
  { id: 'A5', widthMm: 148, heightMm: 210, inches: '5.8 x 8.3' },
  { id: 'A6', widthMm: 105, heightMm: 148, inches: '4.1 x 5.8' },
  { id: 'A7', widthMm: 74, heightMm: 105, inches: '2.9 x 4.1' },
  { id: 'A8', widthMm: 52, heightMm: 74, inches: '2.0 x 2.9' },
];

export function getPaperSize(id) {
  return PAPER_SIZES.find((size) => size.id === id) || PAPER_SIZES.find((size) => size.id === 'A4');
}

export function previewHeightPx(widthMm) {
  const min = 32;
  const max = 92;
  const t = (widthMm - 52) / (841 - 52);
  return min + Math.sqrt(Math.max(0, t)) * (max - min);
}
