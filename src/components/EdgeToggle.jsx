const TOGGLE_CLASS =
  'panel-toggle absolute top-1/2 z-30 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-line bg-panel text-muted shadow-[0_1px_6px_rgba(43,41,37,0.12)] hover:border-accent hover:text-accent';

export const PANEL_SLIDE_CLASS = 'panel-slide relative z-30 h-full shrink-0 overflow-visible';

export default function EdgeToggle({ collapsed, side, onToggle, expandLabel, collapseLabel }) {
  const isLeft = side === 'left';
  const label = collapsed ? expandLabel : collapseLabel;
  const showRight = isLeft ? collapsed : !collapsed;
  const style = isLeft
    ? { right: '-14px', transform: collapsed ? 'translate(22px, -50%)' : 'translateY(-50%)' }
    : { left: '-14px', transform: collapsed ? 'translate(-22px, -50%)' : 'translateY(-50%)' };

  return (
    <button type="button" title={label} aria-label={label} onClick={onToggle} className={TOGGLE_CLASS} style={style}>
      {showRight ? <ChevronRight /> : <ChevronLeft />}
    </button>
  );
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
