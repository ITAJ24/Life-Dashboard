// Today's to-do list.
// data: { text, done, doneAt, due }  (due is optional "YYYY-MM-DD")

import { store } from "../store.js";
import { DONE_TASKS_KEEP_DAYS } from "../config.js";
import { h, icon, iconButton, openForm, shortDate, relative, daysUntil } from "../ui.js";

const KIND = "task";
const $ = (sel) => document.querySelector(sel);

export function mount() {
  const form = $("#task-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = form.text.value.trim();
    if (!text) return;
    store.add(KIND, { text, done: false, due: form.due.value || "" });
    form.reset();
    form.text.focus();
  });
  $("#done-group").querySelector(".fine").textContent =
    `Finished tasks clear out after ${DONE_TASKS_KEEP_DAYS} days.`;
  store.subscribe(render);
  render();
}

export const focusInput = () => $("#task-form").text.focus();

// Remove finished tasks older than the keep window.
export function purgeOldDone() {
  const cutoff = Date.now() - DONE_TASKS_KEEP_DAYS * 86400000;
  store.all(KIND)
    .filter((t) => t.data.done && t.data.doneAt && new Date(t.data.doneAt).getTime() < cutoff)
    .forEach((t) => store.remove(t.id));
}

function byDue(a, b) {
  const da = a.data.due || "9999", db = b.data.due || "9999";
  return da.localeCompare(db) || a.created_at.localeCompare(b.created_at);
}

function toggle(task, li) {
  const done = !task.data.done;
  if (done) {
    // Cross it out first, then move it to "Done".
    li.classList.add("completing");
    setTimeout(() => store.update(task.id, { done: true, doneAt: new Date().toISOString() }), 550);
  } else {
    store.update(task.id, { done: false, doneAt: null });
  }
}

function edit(task) {
  openForm({
    title: "Edit task",
    fields: [
      { name: "text", label: "Task", required: true },
      { name: "due", label: "Due date (optional)", type: "date" },
    ],
    values: task.data,
    onSubmit: (v) => store.update(task.id, { text: v.text, due: v.due || "" }),
    onDelete: () => store.remove(task.id),
  });
}

function dueLabel(due) {
  if (!due) return null;
  const n = daysUntil(due);
  const cls = n < 0 ? "due overdue" : n <= 1 ? "due soon" : "due";
  const text = n < 0 ? `Overdue · ${shortDate(due)}` : n <= 1 ? `Due ${relative(due)}` : `Due ${shortDate(due)}`;
  return h("span", { class: cls }, text);
}

function row(task) {
  const li = h("li", { class: "task" + (task.data.done ? " done" : "") });
  li.append(
    h("button", { type: "button", class: "task-main", "aria-pressed": String(!!task.data.done),
        onclick: () => toggle(task, li) },
      h("span", { class: "tick", html: icon.check }),
      h("span", { class: "task-text" },
        h("span", { class: "label" }, task.data.text),
        !task.data.done && dueLabel(task.data.due))),
    h("div", { class: "row-actions" },
      iconButton("edit", "Edit task", () => edit(task)),
      iconButton("trash", "Delete task", () => store.remove(task.id))));
  return li;
}

function render() {
  const tasks = store.all(KIND);
  const open = tasks.filter((t) => !t.data.done).sort(byDue);
  const done = tasks.filter((t) => t.data.done)
    .sort((a, b) => (b.data.doneAt || "").localeCompare(a.data.doneAt || ""));

  $("#task-list").replaceChildren(...open.map(row));
  $("#task-empty").hidden = open.length > 0;
  $("#task-count").textContent = open.length ? `${open.length} to go` : "";

  const group = $("#done-group");
  group.hidden = done.length === 0;
  group.querySelector("summary .n").textContent = done.length;
  $("#done-list").replaceChildren(...done.map(row));
}
