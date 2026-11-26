// Vision board: a slideshow of uploaded photos.
// data: { path }  (the photo file in storage)

import { store } from "../store.js";
import * as db from "../db.js";
import { SLIDE_SECONDS } from "../config.js";
import { h, iconButton, openSheet, toast } from "../ui.js";

const KIND = "photo";
const $ = (sel) => document.querySelector(sel);
let index = 0;
let timer = null;
let shownKey = "";
let urls = {};

export function mount() {
  $("#photo-input").addEventListener("change", (e) => upload([...e.target.files]).finally(() => (e.target.value = "")));
  $("#photo-manage").addEventListener("click", manage);
  $("#slide-prev").addEventListener("click", prev);
  $("#slide-next").addEventListener("click", next);

  let startX = null;
  const el = $("#slideshow");
  el.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
  el.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
    startX = null;
  });

  store.subscribe(render);
  render();
}

const photos = () => store.all(KIND);

// Shrink big phone photos before uploading: faster and saves storage.
async function resize(file) {
  const max = db.mode === "local" ? 1200 : 2000;
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = h("canvas", { width: Math.round(img.naturalWidth * scale), height: Math.round(img.naturalHeight * scale) });
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob(res, "image/jpeg", db.mode === "local" ? 0.8 : 0.86));
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function upload(files) {
  if (!files.length) return;
  const label = $("#photo-add-label");
  const original = label.textContent;
  let added = 0;
  for (const [i, file] of files.entries()) {
    label.textContent = files.length > 1 ? `Uploading ${i + 1}/${files.length}…` : "Uploading…";
    try {
      const blob = await resize(file);
      const path = await db.uploadPhoto(blob);
      await store.add(KIND, { path });
      added++;
    } catch (err) {
      console.error(err);
      toast(err.message?.includes("space") ? err.message : `Couldn't upload ${file.name || "a photo"}.`);
      break;
    }
  }
  label.textContent = original;
  if (added) {
    index = photos().length - added; // jump to the first new photo
    shownKey = "";
    render();
  }
}

async function remove(photo) {
  if (!confirm("Delete this photo from your vision board?")) return;
  await store.remove(photo.id);
  db.deletePhoto(photo.data.path).catch(console.error);
  if ($("#sheet").open) manage();
}

async function manage() {
  const list = photos();
  const map = await db.photoUrls(list.map((p) => p.data.path)).catch(() => ({}));
  openSheet("Vision photos",
    list.length
      ? h("ul", { class: "photo-grid" }, list.map((p) =>
          h("li", {},
            h("img", { src: map[p.data.path] || "", alt: "", loading: "lazy" }),
            iconButton("trash", "Delete photo", () => remove(p), "on-photo"))))
      : h("p", { class: "muted" }, "No photos yet."),
    h("label", { class: "btn primary block" }, "Add photos",
      h("input", { type: "file", accept: "image/*", multiple: true, hidden: true,
        onchange: async (e) => { await upload([...e.target.files]); manage(); } })));
}

function show(i) {
  const imgs = $("#slides").querySelectorAll("img");
  if (!imgs.length) return;
  index = (i + imgs.length) % imgs.length;
  imgs.forEach((img, n) => img.classList.toggle("active", n === index));
  $("#slide-dots").querySelectorAll("span").forEach((d, n) => d.classList.toggle("active", n === index));
}
function restart() {
  clearInterval(timer);
  if (photos().length > 1) timer = setInterval(() => show(index + 1), SLIDE_SECONDS * 1000);
}
export const next = () => { show(index + 1); restart(); };
export const prev = () => { show(index - 1); restart(); };

async function render() {
  const list = photos();
  const key = list.map((p) => p.id).join();
  if (key === shownKey) return;
  shownKey = key;

  $("#vision").classList.toggle("empty", list.length === 0);
  $("#photo-manage").hidden = list.length === 0;
  const multi = list.length > 1;
  $("#slide-prev").hidden = $("#slide-next").hidden = $("#slide-dots").hidden = !multi;

  try {
    urls = await db.photoUrls(list.map((p) => p.data.path));
  } catch (err) {
    console.error(err);
  }
  if (key !== shownKey) return; // a newer render started meanwhile

  $("#slides").replaceChildren(...list.map((p, i) =>
    h("img", { src: urls[p.data.path] || "", alt: "", decoding: "async", loading: i < 2 ? "eager" : "lazy" })));
  $("#slide-dots").replaceChildren(...list.map(() => h("span")));
  show(Math.min(index, Math.max(0, list.length - 1)));
  restart();
}
