# Life Dashboard

A dark, quiet personal dashboard for your phone and laptop:

- **Vision board**: a slideshow of photos you upload from your camera roll
- **Today**: tasks with optional due dates; tap to cross off; finished tasks move to *Done* and clear after 3 days
- **Goals**: each with a progress bar, driven by a checklist of steps or a slider
- **Programs & scholarships**: name, link, deadline, cost and status, sorted by nearest deadline
- **Today's date** and a **daily lesson**: a different practical finance or life tip each day (113 tips in `js/tips.js`)

Everything syncs between your devices through a free [Supabase](https://supabase.com) project, and only you can see it (email sign-in).

Plain HTML, CSS and JavaScript. No build step.

---

## Setup (about 15 minutes, once)

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), sign up (free), and click **New project**. Pick any name and a strong database password (you won't need it again), and a region near you.
2. When it's ready, open **SQL Editor → New query**, paste the whole of [`supabase/setup.sql`](supabase/setup.sql), and click **Run**. This creates your private table and photo storage.

### 2. Connect the website to it

1. In Supabase, open **Project Settings → API** (may be called **Data API** / **API Keys**).
2. Copy the **Project URL** and the **anon / publishable** key.
3. In this repository, edit [`js/config.js`](js/config.js) and paste them between the quotes:

   ```js
   export const SUPABASE_URL = "https://abcdxyz.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```

   The anon key is designed to be public. Never paste the **service_role / secret** key.

### 3. Put it online with GitHub Pages

1. In this GitHub repository: **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`, and save.
2. After a minute your site is at `https://<your-username>.github.io/Life-Dashboard/`.

GitHub Pages on a free plan needs the repository to be **public**. That's fine: the code is public but your data isn't. It's protected by sign-in and the database rules.

### 4. Set up sign-in emails

In Supabase, go to **Authentication**:

1. **URL Configuration**: set **Site URL** to your GitHub Pages address (from step 3), and add the same address under **Redirect URLs**.
2. **Emails → Templates**: in both the **Magic Link** and **Confirm signup** templates, add this line so the email also contains a code:

   ```html
   <p>Or enter this code: <strong>{{ .Token }}</strong></p>
   ```

   The code matters on iPhone: a dashboard saved to your Home Screen can't receive the link from Mail, so you type the code instead.

### 5. Sign in on each device

Open the site, enter your email, then tap the link in the email **or** type the code. You stay signed in on that device.

**After you've signed in on your devices**, lock the door: **Authentication → Sign In / Providers → turn off "Allow new users to sign up"**. Your account keeps working; nobody else can create one.

### 6. Add it to your iPhone Home Screen

In Safari: **Share → Add to Home Screen**. It opens full-screen like an app. Sign in once inside it using the **code** from the email.

---

## Good to know

- **Demo mode**: if `js/config.js` is empty, the dashboard still works but saves only in that browser. A dashed banner tells you when you're in demo mode.
- **Your old dashboard data**: the first time you open the new version on the iPad you used before, your old goals and tasks are copied in automatically.
- **Photos** are resized to max 2000px before upload, so the free 1 GB holds thousands. Photos picked on an iPhone are converted to JPEG automatically.
- **Syncing** happens as you make changes; when you switch back to the dashboard on another device, it refreshes.
- **Free Supabase projects pause after a week without use.** If that happens, log into supabase.com and click **Restore**. Nothing is lost.
- **Email limits**: Supabase's built-in email sender only sends a few sign-in emails per hour. You'll rarely need more than one per device.

## Keyboard shortcuts (laptop or iPad keyboard)

`T` new task · `G` new goal · `P` new program · `←` `→` photos · `Esc` close / leave a text box

## Files

| Path | What it is |
|---|---|
| `index.html` | Page layout |
| `css/styles.css` | Design: colours are variables at the top |
| `js/config.js` | Your Supabase settings and small options (done-task days, slide speed) |
| `js/main.js` | Startup, sign-in, keyboard shortcuts |
| `js/db.js` | All saving/loading (Supabase or demo storage) |
| `js/store.js` | In-memory data that sections read and update |
| `js/ui.js` | Shared helpers: edit sheet, icons, dates |
| `js/sections/*.js` | One file per section |
| `js/tips.js` | The daily lessons; add your own |
| `js/vendor/supabase.js` | Supabase library v2.119.2 (MIT licence) |
| `supabase/setup.sql` | Database and storage setup |

## Adding a feature later

All data lives in one table as `{ kind, data }`, so a new section doesn't need database changes:

1. Add a `<section>` to `index.html`.
2. Create `js/sections/<name>.js` with a `mount()` that uses `store.all("<kind>")`, `store.add("<kind>", {...})`, `store.update(id, {...})` and `store.remove(id)`, and re-renders on `store.subscribe(...)`.
3. Call its `mount()` in `startApp()` in `js/main.js`.

`openForm(...)` in `js/ui.js` gives you an add/edit form for free. See `programs.js` for an example.
