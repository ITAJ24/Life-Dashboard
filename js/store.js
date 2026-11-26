// In-memory copy of all items, kept in sync with the database.
// Sections read from here and re-render when it changes.
// Changes show instantly, then save in the background.

import * as db from "./db.js";
import { toast } from "./ui.js";

let items = [];
const listeners = new Set();
const now = () => new Date().toISOString();

function emit() {
  try { localStorage.setItem(db.cacheKey(), JSON.stringify(items)); } catch {}
  listeners.forEach((fn) => fn());
}

async function persist(fn) {
  try {
    await fn();
  } catch (err) {
    console.error(err);
    toast("Couldn't save. Check your connection and try again.");
  }
}

export const store = {
  all: (kind) => items.filter((i) => i.kind === kind),
  get: (id) => items.find((i) => i.id === id),
  subscribe(fn) { listeners.add(fn); },

  // Show the last saved copy immediately while the real data loads.
  loadCached() {
    try { items = JSON.parse(localStorage.getItem(db.cacheKey()) || "[]"); } catch { items = []; }
    emit();
  },

  async refresh() {
    try {
      const fresh = await db.listItems();
      if (JSON.stringify(fresh) !== JSON.stringify(items)) {
        items = fresh;
        emit();
      }
      return true;
    } catch (err) {
      console.error(err);
      toast("Offline. Showing your last saved copy.");
      return false;
    }
  },

  async add(kind, data) {
    const item = { id: db.uuid(), kind, data, created_at: now(), updated_at: now() };
    items.push(item);
    emit();
    await persist(() => db.saveItem(item));
    return item;
  },

  async update(id, patch) {
    const item = store.get(id);
    if (!item) return;
    item.data = { ...item.data, ...patch };
    item.updated_at = now();
    emit();
    await persist(() => db.saveItem(item));
  },

  async remove(id) {
    items = items.filter((i) => i.id !== id);
    emit();
    await persist(() => db.deleteItem(id));
  },
};
