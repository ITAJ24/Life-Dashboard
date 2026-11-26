// Programs & scholarships, sorted by nearest deadline.
// data: { name, link, deadline ("YYYY-MM-DD"), cost, status, notes }

import { store } from "../store.js";
import { h, icon, iconButton, openForm, shortDate, relative, daysUntil } from "../ui.js";

const KIND = "program";
const $ = (sel) => document.querySelector(sel);

export const STATUSES = [
  ["interested", "Interested"],
  ["applying", "Applying"],
  ["applied", "Applied"],
  ["accepted", "Accepted"],
];

const FIELDS = [
  { name: "name", label: "Name", required: true, placeholder: "e.g. Gates Scholarship" },
  { name: "link", label: "Link", placeholder: "website.com/apply", inputmode: "url" },
  { name: "deadline", label: "Deadline", type: "date" },
  { name: "cost", label: "Cost", placeholder: "e.g. Free, $45 application fee" },
  { name: "status", label: "Status", type: "select", options: STATUSES },
  { name: "notes", label: "Notes (optional)", type: "textarea" },
];

export function mount() {
  $("#program-add").addEventListener("click", add);
  store.subscribe(render);
  render();
}

export function add() {
  openForm({
    title: "Add program or scholarship",
    fields: FIELDS,
    values: { status: "interested" },
    submitLabel: "Add",
    onSubmit: (v) => store.add(KIND, clean(v)),
  });
}

function clean(v) {
  let link = v.link || "";
  if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
  return { ...v, link };
}

function edit(p) {
  openForm({
    title: "Edit program",
    fields: FIELDS,
    values: p.data,
    onSubmit: (v) => store.update(p.id, clean(v)),
    onDelete: () => { if (confirm(`Delete "${p.data.name}"?`)) store.remove(p.id); },
  });
}

// Upcoming deadlines first (soonest at top), then no deadline, then passed.
function sortKey(p) {
  const n = daysUntil(p.data.deadline);
  if (n === null) return [1, 0];
  if (n < 0) return [2, -n];
  return [0, n];
}
const compare = (a, b) => {
  const [ga, na] = sortKey(a), [gb, nb] = sortKey(b);
  return ga - gb || na - nb || a.data.name.localeCompare(b.data.name);
};

function deadlineText(d) {
  if (!d) return h("span", { class: "meta-item" }, "No deadline");
  const n = daysUntil(d);
  const cls = n < 0 ? "meta-item past" : n <= 7 ? "meta-item soon" : "meta-item";
  return h("span", { class: cls }, n < 0 ? `Closed ${shortDate(d)}` : `${shortDate(d)} · ${relative(d)}`);
}

function card(p) {
  const d = p.data;
  const status = h("select", { class: `status s-${d.status}`, "aria-label": "Status",
      onchange: (e) => store.update(p.id, { status: e.target.value }) },
    STATUSES.map(([v, label]) => h("option", { value: v, selected: d.status === v }, label)));

  return h("li", { class: "program" + (daysUntil(d.deadline) < 0 ? " is-past" : "") },
    h("div", { class: "program-top" },
      d.link
        ? h("a", { class: "program-name", href: d.link, target: "_blank", rel: "noopener" },
            d.name, h("span", { class: "ext", html: icon.link }))
        : h("span", { class: "program-name" }, d.name),
      status),
    h("div", { class: "program-meta" },
      deadlineText(d.deadline),
      d.cost && h("span", { class: "meta-item" }, d.cost)),
    d.notes && h("p", { class: "notes" }, d.notes),
    h("div", { class: "row-actions end" },
      iconButton("edit", "Edit program", () => edit(p)),
      iconButton("trash", "Delete program", () => { if (confirm(`Delete "${d.name}"?`)) store.remove(p.id); })));
}

function render() {
  const programs = store.all(KIND).sort(compare);
  $("#program-list").replaceChildren(...programs.map(card));
  $("#program-empty").hidden = programs.length > 0;
}
