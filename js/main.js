// Starts the app: sign-in (when Supabase is set up), loading data,
// and mounting each section. To add a section: create a file in
// js/sections/, give it a mount() function, and call it in startApp().

import * as db from "./db.js";
import { store } from "./store.js";
import { toast } from "./ui.js";
import * as header from "./sections/header.js";
import * as vision from "./sections/vision.js";
import * as tasks from "./sections/tasks.js";
import * as goals from "./sections/goals.js";
import * as programs from "./sections/programs.js";

const $ = (sel) => document.querySelector(sel);
let started = false;

header.mount();

const { mode, user } = await db.init().catch((err) => {
  console.error(err);
  toast("Couldn't reach the database. Check config.js and your connection.");
  return { mode: "error", user: null };
});

if (mode === "local") $("#demo-banner").hidden = false;
if (user) startApp(); else showSignIn();

db.onAuthChange((event) => {
  if (event === "SIGNED_IN" && !started) startApp();
  if (event === "SIGNED_OUT") location.reload();
});

// ---------- Sign in ----------
function showSignIn() {
  document.body.classList.add("signed-out");
  $("#signin").hidden = false;
  const emailForm = $("#signin-email");
  const codeForm = $("#signin-code");
  const msg = $("#signin-msg");
  let email = "";

  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    email = emailForm.email.value.trim();
    const btn = emailForm.querySelector("button");
    btn.disabled = true;
    msg.textContent = "Sending…";
    try {
      await db.sendSignInEmail(email);
      emailForm.hidden = true;
      codeForm.hidden = false;
      msg.textContent = `Check ${email}. Tap the link in the email, or type the code here.`;
      codeForm.code.focus();
    } catch (err) {
      msg.textContent = err.message || "Couldn't send the email. Try again in a minute.";
    } finally {
      btn.disabled = false;
    }
  });

  codeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Checking…";
    try {
      await db.verifyCode(email, codeForm.code.value.replace(/\s/g, ""));
    } catch (err) {
      msg.textContent = "That code didn't work. Check it, or request a new one.";
    }
  });

  $("#signin-back").addEventListener("click", () => {
    codeForm.hidden = true;
    emailForm.hidden = false;
    msg.textContent = "";
  });
}

// ---------- App ----------
async function startApp() {
  started = true;
  document.body.classList.remove("signed-out");
  $("#signin").hidden = true;
  $("#app").hidden = false;
  if (mode === "cloud") $("#signout").hidden = false;

  vision.mount();
  tasks.mount();
  goals.mount();
  programs.mount();

  store.loadCached();
  if (await store.refresh()) {
    tasks.purgeOldDone();
    await importOldData();
  }

  // Pick up changes made on your other device when you come back to this one.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") store.refresh().then(tasks.purgeOldDone);
  });
}

// One-time import of goals and tasks from the first version of the dashboard.
async function importOldData() {
  if (localStorage.getItem(`ld.imported.${mode}`)) return;
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
  const oldGoals = read("lifeDashboard.goals");
  const oldTodos = read("lifeDashboard.todos");
  if (!oldGoals.length && !oldTodos.length) return;
  for (const g of oldGoals) await store.add("goal", { title: g.text, why: "", progress: 0, steps: [] });
  for (const t of oldTodos)
    await store.add("task", { text: t.text, done: !!t.done, doneAt: t.done ? new Date().toISOString() : null, due: "" });
  localStorage.setItem(`ld.imported.${mode}`, "1");
  toast("Imported your goals and tasks from the old dashboard.");
}

// ---------- Sign out ----------
$("#signout").addEventListener("click", async () => {
  if (confirm("Sign out on this device?")) await db.signOut();
});

// ---------- Keyboard shortcuts (laptop / iPad keyboard) ----------
document.addEventListener("keydown", (e) => {
  const el = document.activeElement;
  const typing = el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  if (e.key === "Escape" && typing && !$("#sheet").open) return el.blur();
  if (typing || e.metaKey || e.ctrlKey || e.altKey || $("#sheet").open || !started) return;

  const actions = {
    t: tasks.focusInput,
    g: goals.focusInput,
    p: programs.add,
    ArrowRight: vision.next,
    ArrowLeft: vision.prev,
  };
  const fn = actions[e.key] || actions[e.key.toLowerCase()];
  if (fn) { e.preventDefault(); fn(); }
});
