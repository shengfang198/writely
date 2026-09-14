import { useCallback, useEffect, useRef, useState } from 'react';
import { db, LEGACY_NOTEPAD_KEY, LEGACY_STORAGE_KEY, MIGRATION_FLAG } from '../db/writelyDb.js';
import { htmlToDoc, jsonToDoc, previewFromDoc } from '../editor/html.js';
import { emptyDoc } from '../editor/schema.js';
import { parseImportFile } from '../utils/importWritely.js';

function uid() {
  return 'w' + Date.now() + Math.random().toString(36).slice(2, 8);
}

function readHashId() {
  const match = window.location.hash.match(/^#(?:writely|note)-(.+)$/);
  return match ? match[1] : null;
}

function metaFromRow(row) {
  return {
    id: row.id,
    title: row.title || '',
    size: row.size || 'A4',
    margin: row.margin || 'auto',
    updated: row.updated || 0,
    preview: row.preview || '',
  };
}

async function migrateFromLocalStorage() {
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return;
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY) || localStorage.getItem(LEGACY_NOTEPAD_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATION_FLAG, '1');
    return;
  }
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.setItem(MIGRATION_FLAG, '1');
    return;
  }
  const rows = Object.values(parsed || {});
  if (!rows.length) {
    localStorage.setItem(MIGRATION_FLAG, '1');
    return;
  }
  await db.transaction('rw', db.docs, db.bodies, async () => {
    for (const item of rows) {
      if (!item?.id) continue;
      const doc = htmlToDoc(item.body || '');
      await db.docs.put({
        id: item.id,
        title: item.title || '',
        size: item.size || 'A4',
        margin: item.margin || 'auto',
        updated: item.updated || Date.now(),
        preview: previewFromDoc(doc),
      });
      await db.bodies.put({ id: item.id, doc: doc.toJSON() });
    }
  });
  localStorage.setItem(MIGRATION_FLAG, '1');
}

export function useWritely() {
  const [list, setList] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState({ message: '', error: false, visible: false });
  const persistTimer = useRef(0);
  const pendingBody = useRef(null);
  const openGen = useRef(0);

  const setHash = (id) => {
    const next = id ? `#writely-${id}` : '';
    if (window.location.hash === next) return;
    const path = `${window.location.pathname}${window.location.search}${next}`;
    history.replaceState(null, '', path || '/');
  };

  const flushPending = useCallback(async () => {
    const pending = pendingBody.current;
    if (!pending) return;
    pendingBody.current = null;
    clearTimeout(persistTimer.current);
    await db.bodies.put({ id: pending.id, doc: pending.doc });
    await db.docs.put(pending.meta);
  }, []);

  const refreshList = useCallback(async () => {
    const rows = await db.docs.toArray();
    const next = {};
    rows.forEach((row) => {
      next[row.id] = metaFromRow(row);
    });
    setList(next);
    return next;
  }, []);

  const openWritely = useCallback(async (id) => {
    const gen = ++openGen.current;
    await flushPending();
    if (openGen.current !== gen) return;

    if (!id) {
      setActiveId(null);
      setActiveDoc(null);
      setHash(null);
      return;
    }

    const [body, meta] = await Promise.all([db.bodies.get(id), db.docs.get(id)]);
    if (openGen.current !== gen) return;

    setActiveId(id);
    setActiveDoc({
      ...(meta ? metaFromRow(meta) : { id, title: '', size: 'A4', margin: 'auto', updated: Date.now() }),
      doc: body?.doc || emptyDoc().toJSON(),
    });
    setHash(id);
  }, [flushPending]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateFromLocalStorage();
      if (cancelled) return;
      const next = await refreshList();
      const hashId = readHashId();
      if (hashId && next[hashId]) await openWritely(hashId);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [openWritely, refreshList]);

  useEffect(() => {
    if (!status.visible) return undefined;
    const timer = setTimeout(() => setStatus((prev) => ({ ...prev, visible: false })), 1500);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    const onHashChange = () => {
      const id = readHashId();
      if (id) openWritely(id);
      else {
        setActiveId(null);
        setActiveDoc(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [openWritely]);

  const createWritely = useCallback(
    async (size = 'A4') => {
      const id = uid();
      const doc = emptyDoc();
      const row = {
        id,
        title: '',
        size,
        margin: 'auto',
        updated: Date.now(),
        preview: '',
      };
      await db.docs.put(row);
      await db.bodies.put({ id, doc: doc.toJSON() });
      await refreshList();
      await openWritely(id);
      setStatus({ message: 'Saved', error: false, visible: true });
    },
    [openWritely, refreshList]
  );

  const importWritely = useCallback(
    async (file, size = 'A4') => {
      try {
        const parsed = await parseImportFile(file);
        const id = uid();
        const pmDoc = jsonToDoc(parsed.doc);
        const row = {
          id,
          title: parsed.title || '',
          size,
          margin: 'auto',
          updated: Date.now(),
          preview: previewFromDoc(pmDoc),
        };
        await db.docs.put(row);
        await db.bodies.put({ id, doc: parsed.doc });
        await refreshList();
        await openWritely(id);
        setStatus({ message: 'Imported', error: false, visible: true });
      } catch (err) {
        console.error(err);
        setStatus({
          message: err?.message || 'Could not import file',
          error: true,
          visible: true,
        });
      }
    },
    [openWritely, refreshList]
  );

  const updateWritely = useCallback(
    async (id, patch) => {
      if (!patch.doc && pendingBody.current?.id === id) {
        await flushPending();
      }
      const current = await db.docs.get(id);
      if (!current) return;
      const next = { ...current, ...patch, updated: Date.now() };
      if (patch.doc) {
        const pmDoc = jsonToDoc(patch.doc);
        next.preview = previewFromDoc(pmDoc);
        pendingBody.current = { id, doc: patch.doc, meta: next };
        clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(async () => {
          const pending = pendingBody.current;
          if (!pending) return;
          pendingBody.current = null;
          try {
            await db.bodies.put({ id: pending.id, doc: pending.doc });
            await db.docs.put(pending.meta);
            setStatus({ message: 'Saved', error: false, visible: true });
            refreshList();
          } catch (err) {
            console.error(err);
            setStatus({ message: 'Storage full — could not save', error: true, visible: true });
          }
        }, 400);
        setActiveDoc((prev) => (prev && prev.id === id ? { ...prev, ...metaFromRow(next), doc: patch.doc } : prev));
        return;
      }
      await db.docs.put(next);
      await refreshList();
      setActiveDoc((prev) => (prev && prev.id === id ? { ...prev, ...metaFromRow(next) } : prev));
    },
    [flushPending, refreshList]
  );

  const deleteWritely = useCallback(
    async (id) => {
      await db.docs.delete(id);
      await db.bodies.delete(id);
      if (activeId === id) {
        setActiveId(null);
        setActiveDoc(null);
        setHash(null);
      }
      await refreshList();
      setStatus({ message: 'Saved', error: false, visible: true });
    },
    [activeId, refreshList]
  );

  useEffect(() => {
    const flush = () => {
      const pending = pendingBody.current;
      if (!pending) return;
      pendingBody.current = null;
      db.bodies.put({ id: pending.id, doc: pending.doc });
      db.docs.put(pending.meta);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      clearTimeout(persistTimer.current);
      flush();
    };
  }, []);

  const activeWritely = activeDoc;

  return {
    writelys: list,
    activeId,
    activeWritely,
    ready,
    status,
    openWritely,
    createWritely,
    importWritely,
    updateWritely,
    deleteWritely,
  };
}
