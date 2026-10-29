# פנקס אירועים / Event Ledger

Static web app (no build step) for tracking event gifts given and received, contacts by category,
guests with RSVP status, a venue seating map, and WhatsApp/SMS invitations. Hebrew by default, English toggle in the top bar.

## Run locally

Any static server works. For example:

```
python -m http.server 8787
```

Then open http://localhost:8787/ . Settings → "Load demo data" fills the app with sample contacts and events.

## Deploy to GitHub Pages

1. Push this folder to a repository (keep `index.html` at the root).
2. Repository → Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. The app is served at `https://<user>.github.io/<repo>/`.

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
