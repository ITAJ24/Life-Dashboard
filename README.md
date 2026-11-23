# Life Dashboard

A calm personal dashboard to open every morning: a photo slideshow of your favourite moments, your big goals, and today's to-do list.

Plain HTML, CSS and JavaScript. No install, no build step.

## Files

| File | What it does |
|---|---|
| `index.html` | Page layout (the three sections) |
| `styles.css` | Design: colours are at the top as variables |
| `app.js` | Behaviour: slideshow, goals, to-dos, keyboard shortcuts |
| `photos/` | Your slideshow images |
| `photos/photos.js` | The list of photos to show (and the slide timing) |

## Adding photos

1. Put image files (`.jpg`, `.png` or `.webp`; iPhone `.heic` photos should be exported as JPG first) in the `photos` folder.
2. Open `photos/photos.js` and add one line per photo:

```js
window.PHOTOS = [
  { file: "graduation.jpg", caption: "Graduation day" },
  { file: "first-marathon.jpg" },
];
```

A web page can't look inside a folder by itself, so this list is how the slideshow knows which photos to show.

## Opening it on your iPad

The easiest way is GitHub Pages: in the repository go to **Settings → Pages**, set the source to the `main` branch, and open the address it gives you in Safari. Then tap **Share → Add to Home Screen** so it opens like an app.

## Saving

Goals and tasks are saved in the browser on that device (localStorage). They stay there when you close and reopen the page, but they don't sync between devices, and clearing Safari's website data will erase them.

## Keyboard shortcuts

- `G`: add a goal
- `T`: add a task
- `Enter`: save; `Esc`: cancel / leave the text box
- `←` / `→`: previous / next photo
- Double-click (or the Edit button) to edit an item

## Adding features later

Each section in `app.js` is its own block. `createList(...)` is a reusable editable list: a new list section (e.g. habits, gratitude) needs a new `<section>` in `index.html` and one `createList({...})` call with its own storage key.
