import type { SharedEntry } from './types';

const STORAGE_KEY = 'rc_shared_space';
const MAX_ENTRIES = 50;

/** Read all shared entries from storage */
export async function getEntries(): Promise<SharedEntry[]> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

/** Add a new entry to the shared space */
export async function addEntry(entry: SharedEntry): Promise<SharedEntry[]> {
  const entries = await getEntries();
  entries.push(entry);
  // Keep last N entries
  const trimmed = entries.slice(-MAX_ENTRIES);
  await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });
  return trimmed;
}

/** Get a single entry by ID */
export async function getEntry(id: string): Promise<SharedEntry | undefined> {
  const entries = await getEntries();
  return entries.find(e => e.id === id);
}

/** Clear all entries */
export async function clearEntries(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
}

/** Generate a unique entry ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
