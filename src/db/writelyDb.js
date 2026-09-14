import Dexie from 'dexie';

export const db = new Dexie('writely');

db.version(1).stores({
  docs: 'id, updated',
  bodies: 'id',
});

export const MIGRATION_FLAG = 'writely-idb-migrated-v1';
export const LEGACY_STORAGE_KEY = 'writely-v1';
export const LEGACY_NOTEPAD_KEY = 'notepad-notes-v1';
