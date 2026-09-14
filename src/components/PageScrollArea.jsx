import { useEffect, useRef, useState } from 'react';

const PAGE_GAP = 24;

function offsetWithin(el, ancestor) {
  let y = 0;
  let node = el;
  while (node && node !== ancestor) {
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return y;
}

export default function PageScrollArea({ pageCount = 1, showGridlines = false, children }) {
  const ref = useRef(null);
  const hideTimer = useRef(null);
  const [hud, setHud] = useState({ page: 1, top: 12, visible: false });

  const update = (scrolling) => {
    const root = ref.current;
    if (!root) return;
    const stack = root.querySelector('[data-page-stack]');
    const count = Math.max(1, pageCount || Number(stack?.getAttribute('data-page-count')) || 1);
    const gap = Number(stack?.getAttribute('data-page-gap') || PAGE_GAP);
    const box = root.getBoundingClientRect();
    const stackHeight = stack?.offsetHeight || 1;
    const stride = (stackHeight + gap) / count;
    const stackTop = stack ? offsetWithin(stack, root) : 0;
    const focusY = root.scrollTop + box.height * 0.42 - stackTop;
    const page = Math.min(count, Math.max(1, Math.floor(focusY / stride) + 1));

    const maxScroll = Math.max(1, root.scrollHeight - root.clientHeight);
    const ratio = root.scrollTop / maxScroll;
    const top = 10 + ratio * Math.max(0, root.clientHeight - 36);

    setHud({ page, top, visible: scrolling });
    if (scrolling) {
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setHud((prev) => ({ ...prev, visible: false }));
      }, 1000);
    }
  };

  useEffect(() => {
    update(false);
  }, [pageCount]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={ref}
        onScroll={() => update(true)}
        className={`canvas-scroll h-full overflow-auto py-6${showGridlines ? ' canvas-grid-bg' : ''}`}
      >
        {children}
      </div>
      <div
        className={`pointer-events-none absolute right-3 rounded-md border border-line bg-panel px-2 py-1 text-[11px] font-medium tabular-nums text-ink shadow-[0_2px_8px_rgba(43,41,37,0.12)] transition-opacity duration-200 ${
          hud.visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ top: hud.top }}
      >
        {hud.page} / {Math.max(1, pageCount)}
      </div>
    </div>
  );
}
