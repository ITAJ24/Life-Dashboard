/* Life Dashboard
 * Plain JavaScript, no build step. Each section is a small self-contained block,
 * so new sections can be added the same way.
 * Data is saved in the browser's localStorage on this device.
 */

// ---------- Storage helpers ----------
const store = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const $ = (id) => document.getElementById(id);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Greeting ----------
(function greeting() {
  const now = new Date();
  $("today-date").textContent = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
  const h = now.getHours();
  $("greeting-text").textContent =
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
})();

// ---------- 1. Vision slideshow ----------
const slideshow = (function () {
  const photos = (window.PHOTOS || []).filter((p) => p && p.file);
  const seconds = Number(window.SLIDE_SECONDS) || 7;
  const slidesEl = $("slides");
  const dotsEl = $("slide-dots");
  let index = 0;
  let timer = null;

  if (photos.length === 0) {
    $("slide-empty").hidden = false;
    $("slide-prev").hidden = $("slide-next").hidden = true;
    return { next() {}, prev() {} };
  }

  const caption = document.createElement("div");
  caption.className = "slide-caption";

  photos.forEach((p, i) => {
    const img = document.createElement("img");
    img.src = "photos/" + encodeURIComponent(p.file);
    img.alt = p.caption || "";
    img.loading = i === 0 ? "eager" : "lazy";
    slidesEl.appendChild(img);
    dotsEl.appendChild(document.createElement("span"));
  });
  slidesEl.appendChild(caption);

  if (photos.length < 2) {
    $("slide-prev").hidden = $("slide-next").hidden = true;
    dotsEl.hidden = true;
  }

  function show(i) {
    index = (i + photos.length) % photos.length;
    slidesEl.querySelectorAll("img").forEach((img, n) =>
      img.classList.toggle("active", n === index));
    dotsEl.querySelectorAll("span").forEach((d, n) =>
      d.classList.toggle("active", n === index));
    caption.textContent = photos[index].caption || "";
  }

  function restart() {
    clearInterval(timer);
    if (photos.length > 1) timer = setInterval(() => show(index + 1), seconds * 1000);
  }

  const next = () => { show(index + 1); restart(); };
  const prev = () => { show(index - 1); restart(); };

  $("slide-next").addEventListener("click", next);
  $("slide-prev").addEventListener("click", prev);

  // Swipe support for touch
  let startX = null;
  $("slideshow").addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  $("slideshow").addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    startX = null;
  });

  show(0);
  restart();
  return { next, prev };
})();

// ---------- Reusable editable list ----------
/* Options:
 *   key       localStorage key
 *   form, input, list, empty   element ids
 *   checkable true to show a checkbox per item
 *   onChange  called after every render with the items
 */
function createList(opts) {
  let items = store.load(opts.key, []);
  const listEl = $(opts.list);
  const input = $(opts.input);

  function commit() {
    store.save(opts.key, items);
    render();
  }

  function startEdit(li, item) {
    const field = document.createElement("input");
    field.type = "text";
    field.value = item.text;
    field.setAttribute("aria-label", "Edit");
    const textEl = li.querySelector(".item-text");
    textEl.replaceWith(field);
    li.querySelector(".item-actions").hidden = true;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);

    let finished = false;
    const finish = (save) => {
      if (finished) return;
      finished = true;
      const text = field.value.trim();
      if (save && text) item.text = text;
      commit();
    };
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); finish(true); }
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
    });
    field.addEventListener("blur", () => finish(true));
  }

  function render() {
    listEl.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      if (item.done) li.classList.add("done");

      if (opts.checkable) {
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = !!item.done;
        box.setAttribute("aria-label", "Mark done");
        box.addEventListener("change", () => { item.done = box.checked; commit(); });
        li.appendChild(box);
      } else {
        const mark = document.createElement("span");
        mark.className = "goal-mark";
        li.appendChild(mark);
      }

      const text = document.createElement("span");
      text.className = "item-text";
      text.textContent = item.text;
      text.addEventListener("dblclick", () => startEdit(li, item));
      li.appendChild(text);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      const edit = document.createElement("button");
      edit.className = "icon-btn";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => startEdit(li, item));
      const remove = document.createElement("button");
      remove.className = "icon-btn";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        items = items.filter((i) => i.id !== item.id);
        commit();
      });
      actions.append(edit, remove);
      li.appendChild(actions);

      listEl.appendChild(li);
    });
    $(opts.empty).hidden = items.length > 0;
    if (opts.onChange) opts.onChange(items);
  }

  $(opts.form).addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    items.push({ id: newId(), text, done: false, created: Date.now() });
    input.value = "";
    commit();
  });

  render();

  return {
    get items() { return items; },
    removeWhere(fn) { items = items.filter((i) => !fn(i)); commit(); },
    focus() { input.focus(); },
  };
}

// ---------- 2. Goals ----------
const goals = createList({
  key: "lifeDashboard.goals",
  form: "goal-form",
  input: "goal-input",
  list: "goal-list",
  empty: "goal-empty",
});

// ---------- 3. Today's to-do list ----------
const todos = createList({
  key: "lifeDashboard.todos",
  form: "todo-form",
  input: "todo-input",
  list: "todo-list",
  empty: "todo-empty",
  checkable: true,
  onChange(items) {
    const done = items.filter((i) => i.done).length;
    $("todo-count").textContent = items.length ? `${done} of ${items.length} done` : "";
    $("clear-done").hidden = done === 0;
  },
});

$("clear-done").addEventListener("click", () => todos.removeWhere((i) => i.done));

// ---------- Keyboard shortcuts ----------
document.addEventListener("keydown", (e) => {
  const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) &&
    document.activeElement.type !== "checkbox";

  if (e.key === "Escape" && typing) {
    document.activeElement.blur();
    return;
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

  switch (e.key.toLowerCase()) {
    case "g": e.preventDefault(); goals.focus(); break;
    case "t": e.preventDefault(); todos.focus(); break;
    case "arrowright": slideshow.next(); break;
    case "arrowleft": slideshow.prev(); break;
  }
});
