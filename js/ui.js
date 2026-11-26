// Small shared helpers: DOM building, icons, toasts, the edit sheet, dates.

// h("button", { class: "btn", onclick: fn }, "Label") → <button>
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // only used for our own icons
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const svg = (d) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const icon = {
  edit: svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  link: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  chevron: svg('<path d="M6 9l6 6 6-6"/>'),
};

export const iconButton = (name, label, onclick, extra = "") =>
  h("button", { type: "button", class: `icon-btn ${extra}`, "aria-label": label, title: label, html: icon[name], onclick });

// ---------- Toast ----------
let toastTimer;
export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

// ---------- Sheet (dialog) ----------
const dialog = () => document.getElementById("sheet");

export function openSheet(title, ...content) {
  const d = dialog();
  d.replaceChildren(
    h("div", { class: "sheet-head" },
      h("h3", {}, title),
      iconButton("close", "Close", () => closeSheet())),
    h("div", { class: "sheet-body" }, ...content));
  if (!d.open) d.showModal();
  return d;
}
export const closeSheet = () => dialog().open && dialog().close();

/* Generic form in a sheet. Reused by tasks, goals and programs.
 * fields: [{ name, label, type: "text"|"url"|"date"|"textarea"|"select", options, required, placeholder }]
 */
export function openForm({ title, fields, values = {}, submitLabel = "Save", onSubmit, onDelete }) {
  const form = h("form", { class: "form", autocomplete: "off" });
  for (const f of fields) {
    const common = { name: f.name, id: "f-" + f.name, required: f.required, placeholder: f.placeholder || "" };
    let input;
    if (f.type === "textarea") input = h("textarea", { ...common, rows: 3 }, values[f.name] || "");
    else if (f.type === "select")
      input = h("select", common, f.options.map(([v, label]) =>
        h("option", { value: v, selected: values[f.name] === v }, label)));
    else input = h("input", { ...common, type: f.type || "text", value: values[f.name] || "",
      enterkeyhint: "done", inputmode: f.inputmode,
      autocapitalize: f.inputmode === "url" ? "off" : null, autocorrect: f.inputmode === "url" ? "off" : null });
    form.append(h("label", { class: "field", for: "f-" + f.name }, h("span", {}, f.label), input));
  }
  form.append(h("div", { class: "form-actions" },
    onDelete && h("button", { type: "button", class: "btn ghost danger", onclick: () => { closeSheet(); onDelete(); } }, "Delete"),
    h("span", { class: "spacer" }),
    h("button", { type: "button", class: "btn ghost", onclick: closeSheet }, "Cancel"),
    h("button", { type: "submit", class: "btn primary" }, submitLabel)));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    for (const k in data) data[k] = data[k].trim();
    closeSheet();
    onSubmit(data);
  });
  openSheet(title, form);
  // Don't pop the keyboard up automatically on phones.
  if (matchMedia("(hover: hover)").matches) form.querySelector("input, textarea")?.focus();
}

// ---------- Dates (stored as "YYYY-MM-DD") ----------
export function parseDay(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
export function daysUntil(s) {
  const d = parseDay(s);
  if (!d) return null;
  return Math.round((d - parseDay(todayISO())) / 86400000);
}
export function shortDate(s) {
  const d = parseDay(s);
  const opts = { month: "short", day: "numeric" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString(undefined, opts);
}
export function relative(s) {
  const n = daysUntil(s);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n < 0) return `${-n} days ago`;
  if (n < 7) return `in ${n} days`;
  if (n < 60) return `in ${Math.round(n / 7)} week${Math.round(n / 7) > 1 ? "s" : ""}`;
  return `in ${Math.round(n / 30)} months`;
}
