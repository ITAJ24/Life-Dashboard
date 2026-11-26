// Data layer. Everything the app saves goes through these functions.
// Cloud mode uses Supabase (synced between devices); local mode uses
// this browser's storage (demo, used when config.js is empty).
//
// All records live in one table, `items`: { id, kind, data, created_at, updated_at }.
// `kind` is "task", "goal", "program", "photo"... so a new feature
// just needs a new kind, with no database changes.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const BUCKET = "photos";
let sb = null;
let userId = null;
export let mode = "local";

export const uuid = () =>
  crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

export async function init() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { mode, user: { id: "local" } };

  // Supabase library: js/vendor/supabase.js (v2.119.2), loaded in index.html.
  if (!window.supabase) throw new Error("Supabase library failed to load");
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
  });
  mode = "cloud";
  const { data } = await sb.auth.getSession();
  userId = data.session?.user?.id ?? null;
  return { mode, user: data.session?.user ?? null };
}

// ---------- Auth (cloud only) ----------
export async function sendSignInEmail(email) {
  if (!sb) throw new Error("Can't reach the database right now. Check your connection and reload.");
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function verifyCode(email, token) {
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
  userId = data.user.id;
  return data.user;
}

export function onAuthChange(cb) {
  if (!sb) return;
  sb.auth.onAuthStateChange((event, session) => {
    userId = session?.user?.id ?? null;
    cb(event, session);
  });
}

export async function signOut() {
  if (sb) await sb.auth.signOut();
}

export const cacheKey = () => `ld.cache.${userId || "local"}`;

// ---------- Items ----------
const LOCAL_ITEMS = "ld.local.items";
const readLocal = () => JSON.parse(localStorage.getItem(LOCAL_ITEMS) || "[]");
const writeLocal = (items) => localStorage.setItem(LOCAL_ITEMS, JSON.stringify(items));

export async function listItems() {
  if (mode === "local") return readLocal();
  const { data, error } = await sb.from("items")
    .select("id, kind, data, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveItem(item) {
  if (mode === "local") {
    const items = readLocal().filter((i) => i.id !== item.id);
    items.push(item);
    writeLocal(items);
    return;
  }
  const { id, kind, data, created_at, updated_at } = item;
  const { error } = await sb.from("items").upsert({ id, kind, data, created_at, updated_at });
  if (error) throw error;
}

export async function deleteItem(id) {
  if (mode === "local") return writeLocal(readLocal().filter((i) => i.id !== id));
  const { error } = await sb.from("items").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Photos ----------
const urlCache = new Map();

export async function uploadPhoto(blob) {
  const path = `${userId || "local"}/${uuid()}.jpg`;
  if (mode === "local") {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
    try {
      localStorage.setItem("ld.local.photo." + path, dataUrl);
    } catch {
      throw new Error("Demo mode is out of space. Connect Supabase to store more photos.");
    }
    return path;
  }
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

// Returns { path: url } for every path. Cloud photos are private, so we use
// signed links that expire after a day (refreshed on each load).
export async function photoUrls(paths) {
  const missing = paths.filter((p) => !urlCache.has(p));
  if (missing.length) {
    if (mode === "local") {
      missing.forEach((p) => urlCache.set(p, localStorage.getItem("ld.local.photo." + p)));
    } else {
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(missing, 60 * 60 * 24);
      if (error) throw error;
      data.forEach((d) => d.signedUrl && urlCache.set(d.path, d.signedUrl));
    }
  }
  return Object.fromEntries(paths.map((p) => [p, urlCache.get(p)]));
}

export async function deletePhoto(path) {
  urlCache.delete(path);
  if (mode === "local") return localStorage.removeItem("ld.local.photo." + path);
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
