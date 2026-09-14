export function getSheetSize(widthMm, heightMm, maxWidth, maxHeight) {
  const aspect = widthMm / heightMm;
  let width = maxWidth;
  let height = width / aspect;
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export default function PaperSheet({
  widthMm,
  heightMm,
  maxWidth,
  maxHeight,
  className = '',
  style,
  children,
  ...rest
}) {
  const { width, height } = getSheetSize(widthMm, heightMm, maxWidth, maxHeight);

  return (
    <div
      className={`overflow-hidden bg-white border border-line ${className}`}
      style={{ width, height, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
