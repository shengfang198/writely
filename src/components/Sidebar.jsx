import { useEffect, useMemo, useRef, useState } from 'react';
import EdgeToggle, { PANEL_SLIDE_CLASS } from './EdgeToggle.jsx';

const SORTS = [
  { id: 'date-new', label: 'Date: newest' },
  { id: 'date-old', label: 'Date: oldest' },
  { id: 'alpha-az', label: 'Alphabetical: A-Z' },
  { id: 'alpha-za', label: 'Alphabetical: Z-A' },
];

function titleOf(writely) {
  return (writely.title || 'Untitled').trim().toLowerCase();
}

function sortItems(items, sort) {
  const next = [...items];
  next.sort((a, b) => {
    if (sort === 'date-old') return (a.updated || 0) - (b.updated || 0);
    if (sort === 'alpha-az') return titleOf(a).localeCompare(titleOf(b));
    if (sort === 'alpha-za') return titleOf(b).localeCompare(titleOf(a));
    return (b.updated || 0) - (a.updated || 0);
  });
  return next;
}

export default function Sidebar({ writelys, activeId, onSelect, onCreate, onHome, collapsed, onToggle }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date-new');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    if (!sortOpen) return undefined;
    const onDocClick = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) setSortOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setSortOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (collapsed) setSortOpen(false);
  }, [collapsed]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = Object.values(writelys).filter((writely) => {
      if (!q) return true;
      return (
        (writely.title || '').toLowerCase().includes(q) ||
        (writely.preview || '').toLowerCase().includes(q)
      );
    });
    return sortItems(filtered, sort);
  }, [writelys, query, sort]);

  return (
    <div className={PANEL_SLIDE_CLASS} style={{ width: collapsed ? 0 : 260 }}>
      <div className="h-full w-full overflow-hidden" inert={collapsed || undefined}>
        <aside className="flex h-full w-[260px] min-w-0 flex-col overflow-x-hidden overflow-y-hidden border-r border-line bg-panel text-left">
          <div className="flex min-w-0 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-line px-4 py-3.5">
          <button
            type="button"
            onClick={onHome}
            className="m-0 min-w-0 truncate cursor-pointer border-0 bg-transparent p-0 text-[15px] font-semibold uppercase tracking-wide text-muted"
          >
            Writely
          </button>
          <button
            type="button"
            title="New Writely"
            onClick={onCreate}
            className="flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-accent text-lg leading-none text-white hover:opacity-85"
          >
            +
          </button>
        </div>
        <div className="relative mx-3 mb-2.5 mt-2.5 flex min-w-0 items-center gap-1.5" ref={sortRef}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Writely..."
            className="min-w-0 flex-1 rounded-md border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          />
          <button
            type="button"
            title={SORTS.find((option) => option.id === sort)?.label || 'Sort'}
            aria-label="Sort"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((open) => !open)}
            className={`flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-transparent text-muted hover:border-accent hover:text-accent ${
              sortOpen ? 'border-accent text-accent' : ''
            }`}
          >
            <SortIcon />
          </button>
          {sortOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-[180px] max-w-full rounded-md border border-line bg-panel py-1 shadow-[0_8px_24px_rgba(43,41,37,0.12)]">
              {SORTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSort(option.id);
                    setSortOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-[13px] hover:bg-accent-soft ${
                    sort === option.id ? 'text-accent' : 'text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="sidebar-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-1">
          {items.map((writely) => {
            const isActive = writely.id === activeId;
            return (
              <button
                key={writely.id}
                type="button"
                onClick={() => onSelect(writely.id)}
                className={`mb-0.5 flex w-full min-w-0 max-w-full cursor-pointer flex-col items-start overflow-hidden rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-accent-soft ${
                  isActive ? 'bg-accent-soft' : ''
                }`}
              >
                <span className="block w-full truncate text-sm font-semibold text-accent hover:underline">
                  {writely.title || 'Untitled'}
                </span>
                <span className="mt-0.5 block w-full truncate text-xs text-muted">
                  {(writely.preview || 'No content').slice(0, 60)}
                </span>
                <span className="mt-0.5 block w-full truncate text-[11px] text-muted/70">
                  {writely.updated ? new Date(writely.updated).toLocaleString() : ''}
                </span>
              </button>
            );
          })}
        </div>
      </aside>
      </div>
      <EdgeToggle
        side="left"
        collapsed={collapsed}
        onToggle={onToggle}
        expandLabel="Expand sidebar"
        collapseLabel="Collapse sidebar"
      />
    </div>
  );
}

function SortIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h10M4 12h7M4 17h4M16 5v14M16 19l3-3M16 19l-3-3" />
    </svg>
  );
}
