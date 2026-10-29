# פנקס אירועים / Event Ledger

Static web app (no build step) for tracking event gifts given and received, contacts by category,
guests with RSVP status, a venue seating map, and WhatsApp/SMS invitations. Hebrew by default, English toggle in the top bar.

Live: https://bravh.github.io/EventsCalc/

## Where this lives

This folder is part of the `bravh.github.io` repository, which is the GitHub Pages site.
Editing files here and running `git push` from the repository root deploys them; the site rebuilds in about a minute.

## Run locally

From the repository root (one level up):

```
python -m http.server 8787
```

Then open http://localhost:8787/EventsCalc/ . Settings → "Load demo data" fills the app with sample contacts and events.

## Files

| File | Role |
|------|------|
| `index.html` | shell, icon sprite, nav |
| `css/style.css` | responsive RTL/LTR styles, dark mode |
| `js/i18n.js` | Hebrew + English strings, `t()`, date/money formatting |
| `js/store.js` | data model, localStorage persistence, balance calculations, demo data |
| `js/ui.js` | DOM helpers, modals, toasts, view registry |
| `js/layout.js` | seating map editor (round/square/rect tables, stage, drag, seat assignment) |
| `js/views.js` | home dashboard + search, contacts, contact page, settings |
| `js/events.js` | events list, event page, guests, invitations |
| `js/app.js` | router and startup |

## Google sign-in, Drive sync and contact import

Sign-in uses Google Identity Services in the browser only (no server). Once signed in the app:

- keeps a copy of the database in the user's hidden Google Drive app folder (`eventledger.json`, scope `drive.appdata`) and syncs it automatically, last writer wins by `updatedAt`;
- can import the user's Google Contacts (People API, scope `contacts.readonly`) from the Contacts screen.

### One-time setup (owner of the app)

1. Google Cloud Console → create or pick a project.
2. APIs & Services → Library → enable **Google Drive API** and **People API**.
3. APIs & Services → OAuth consent screen → External → fill the app name and emails. While the app is in *Testing*, add every tester's Google address under **Test users**.
4. APIs & Services → Credentials → Create credentials → **OAuth client ID** → type *Web application*.
   Authorized JavaScript origins: `https://bravh.github.io` and `http://localhost:8787` (add any other local port you use). No redirect URIs are needed.
5. Copy the Client ID. Either paste it into the app under Settings → Google account, or put it in `js/config.js` (`googleClientId`) so every user gets it.

### Files

| File | Role |
|------|------|
| `js/config.js` | client ID and sync file name |
| `js/auth.js` | `Auth`: sign-in/out, profile, access tokens with incremental scopes |
| `js/sync.js` | `Sync`: Drive app-folder push/pull/reconcile, Google Contacts import |

## Data

Everything is stored in the browser's localStorage under `el.db.v1` and, when signed in, mirrored to Google Drive. Settings has export/import of a JSON backup.
To move to a shared multi-user backend later (Supabase/Firebase), replace the functions in `js/store.js`; the screens only call those.
