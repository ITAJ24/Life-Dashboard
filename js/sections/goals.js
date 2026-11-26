// Goals with a progress bar. Progress comes from the checklist of steps
// if a goal has steps, otherwise from a slider you set yourself.
// data: { title, why, progress (0-100), steps: [{ id, text, done }] }

import { store } from "../store.js";
import { uuid } from "../db.js";
import { h, icon, iconButton, openForm } from "../ui.js";

const KIND = "goal";
const $ = (sel) => document.querySelector(sel);
const expanded = new Set();   // goals that are open
let refocusStepFor = null;    // keep typing steps after the list re-renders

export function mount() {
  const form = $("#goal-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    if (!title) return;
    form.reset();
    const goal = await store.add(KIND, { title, why: "", progress: 0, steps: [] });
    expanded.add(goal.id);
    render();
  });
  store.subscribe(render);
  render();
}

export const focusInput = () => $("#goal-form").title.focus();

export function progressOf(goal) {
  const steps = goal.data.steps || [];
  if (steps.length) return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  return Number(goal.data.progress) || 0;
}

function edit(goal) {
  openForm({
    title: "Edit goal",
    fields: [
      { name: "title", label: "Goal", required: true },
      { name: "why", label: "Why it matters (optional)", type: "textarea" },
    ],
    values: goal.data,
    onSubmit: (v) => store.update(goal.id, { title: v.title, why: v.why }),
    onDelete: () => { if (confirm(`Delete "${goal.data.title}"?`)) store.remove(goal.id); },
  });
}

function setSteps(goal, steps) {
  store.update(goal.id, { steps });
}

function stepRow(goal, step) {
  const steps = goal.data.steps;
  return h("li", { class: "step" + (step.done ? " done" : "") },
    h("button", { type: "button", class: "task-main",
        onclick: () => setSteps(goal, steps.map((s) => s.id === step.id ? { ...s, done: !s.done } : s)) },
      h("span", { class: "tick small", html: icon.check }),
      h("span", { class: "label" }, step.text)),
    iconButton("close", "Remove step", () => setSteps(goal, steps.filter((s) => s.id !== step.id)), "subtle"));
}

function card(goal) {
  const pct = progressOf(goal);
  const steps = goal.data.steps || [];
  const isOpen = expanded.has(goal.id);

  const stepForm = h("form", { class: "inline-form", autocomplete: "off",
    onsubmit: (e) => {
      e.preventDefault();
      const text = e.target.step.value.trim();
      if (!text) return;
      refocusStepFor = goal.id;
      setSteps(goal, [...steps, { id: uuid(), text, done: false }]);
    } },
    h("input", { name: "step", placeholder: "Add a step…", "aria-label": "New step", enterkeyhint: "done" }),
    h("button", { type: "submit", class: "btn small" }, "Add"));
  stepForm.dataset.goal = goal.id;

  const slider = !steps.length && h("label", { class: "slider" },
    h("span", {}, "Progress"),
    h("input", { type: "range", min: 0, max: 100, step: 5, value: String(pct),
      oninput: (e) => {
        const li = e.target.closest(".goal");
        li.querySelector(".bar span").style.width = e.target.value + "%";
        li.querySelector(".pct").textContent = e.target.value + "%";
      },
      onchange: (e) => store.update(goal.id, { progress: Number(e.target.value) }) }));

  return h("li", { class: "goal" + (isOpen ? " open" : "") + (pct === 100 ? " complete" : "") },
    h("button", { type: "button", class: "goal-head", "aria-expanded": String(isOpen),
        onclick: () => { isOpen ? expanded.delete(goal.id) : expanded.add(goal.id); render(); } },
      h("span", { class: "goal-title" }, goal.data.title),
      h("span", { class: "pct" }, pct + "%"),
      h("span", { class: "chev", html: icon.chevron })),
    h("div", { class: "bar", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 },
      h("span", { style: `width:${pct}%` })),
    isOpen && h("div", { class: "goal-body" },
      goal.data.why && h("p", { class: "why" }, goal.data.why),
      steps.length > 0 && h("ul", { class: "steps" }, steps.map((s) => stepRow(goal, s))),
      stepForm,
      slider,
      h("div", { class: "goal-actions" },
        h("button", { type: "button", class: "btn ghost small", onclick: () => edit(goal) }, "Edit"),
        h("button", { type: "button", class: "btn ghost small danger",
          onclick: () => { if (confirm(`Delete "${goal.data.title}"?`)) store.remove(goal.id); } }, "Delete"))));
}

function render() {
  const goals = store.all(KIND);
  $("#goal-list").replaceChildren(...goals.map(card));
  $("#goal-empty").hidden = goals.length > 0;
  if (refocusStepFor) {
    document.querySelector(`form[data-goal="${refocusStepFor}"] input`)?.focus();
    refocusStepFor = null;
  }
}
