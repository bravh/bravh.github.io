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

## Data

Everything is stored in the browser's localStorage under `el.db.v1`. Settings has export/import of a JSON backup.
To move to a shared backend later (Supabase/Firebase), replace the functions in `js/store.js`; the screens only call those.
