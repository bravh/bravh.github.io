/* Data store: localStorage now, swappable for Supabase/Firebase later */
const STORE_KEY = 'el.db.v1';
const DEFAULT_CATS = ['friends', 'family', 'work', 'class', 'army', 'neighbors', 'other'];
const METHODS = ['cash', 'cheque', 'transfer', 'gift'];
const STATUSES = ['invited', 'approved', 'declined', 'arrived'];
const KINDS = ['wedding', 'barmitzvah', 'brit', 'birthday', 'henna', 'engagement', 'other'];

let DB = null;

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayISO() { const d = new Date(); return d.toISOString().slice(0, 10); }

function emptyDB() {
  return {
    settings: { myName: '', partnerName: '' },
    categories: DEFAULT_CATS.map(id => ({ id, custom: false })),
    contacts: [],
    events: []
  };
}

function normalizeDB(d) {
  if (!d || typeof d !== 'object') d = emptyDB();
  if (!d.categories) d.categories = emptyDB().categories;
  if (!d.settings) d.settings = {};
  d.contacts = d.contacts || [];
  d.events = d.events || [];
  d.updatedAt = +d.updatedAt || 0;
  return d;
}
function loadDB() {
  let d = null;
  try { const raw = localStorage.getItem(STORE_KEY); d = raw ? JSON.parse(raw) : null; } catch (e) { d = null; }
  DB = normalizeDB(d);
  return DB;
}

/* Save hooks: sync.js registers one to push changes to the cloud.
   opts: { keepStamp: true } keeps DB.updatedAt (used when restoring from the cloud),
         { fromSync: true } marks a save that came from the cloud so hooks must not push it back. */
const DB_HOOKS = [];
function onDBSaved(fn) { DB_HOOKS.push(fn); }
function saveDB(opts) {
  opts = opts || {};
  if (!opts.keepStamp) DB.updatedAt = Date.now();
  localStorage.setItem(STORE_KEY, JSON.stringify(DB));
  DB_HOOKS.forEach(fn => { try { fn(opts); } catch (e) { console.error(e); } });
}
/* Replace the whole database with data that came from the cloud (keeps its updatedAt). */
function replaceDB(d) { DB = normalizeDB(d); saveDB({ keepStamp: true, fromSync: true }); return DB; }

/* ---- categories ---- */
function catLabel(id) {
  const c = DB.categories.find(c => c.id === id);
  if (!c) return t('cat.other');
  return c.custom ? c.label : t('cat.' + c.id);
}
function addCategory(label) {
  const c = { id: 'c_' + uid(), label, custom: true };
  DB.categories.push(c); saveDB(); return c;
}
function removeCategory(id) {
  DB.categories = DB.categories.filter(c => c.id !== id);
  DB.contacts.forEach(c => { if (c.cat === id) c.cat = 'other'; });
  saveDB();
}

/* ---- contacts ---- */
function getContact(id) { return DB.contacts.find(c => c.id === id); }
function upsertContact(data) {
  if (data.id) {
    const c = getContact(data.id); Object.assign(c, data);
  } else {
    data.id = uid(); data.created = Date.now(); DB.contacts.push(data);
  }
  saveDB(); return data;
}
function deleteContact(id) {
  DB.contacts = DB.contacts.filter(c => c.id !== id);
  DB.events.forEach(ev => {
    if (ev.hostId === id) ev.hostId = null;
    ev.guests = (ev.guests || []).filter(g => g.contactId !== id);
  });
  saveDB();
}
function normPhone(p) { return (p || '').replace(/[^\d+]/g, ''); }
function findContactByPhone(p) {
  const n = normPhone(p); if (!n) return null;
  return DB.contacts.find(c => normPhone(c.phone).endsWith(n.slice(-9)));
}

/* ---- events ---- */
function getEvent(id) { return DB.events.find(e => e.id === id); }
function upsertEvent(data) {
  if (data.id) {
    const e = getEvent(data.id); Object.assign(e, data);
  } else {
    data.id = uid(); data.created = Date.now();
    data.guests = data.guests || []; data.tables = data.tables || [];
    DB.events.push(data);
  }
  saveDB(); return data;
}
function deleteEvent(id) { DB.events = DB.events.filter(e => e.id !== id); saveDB(); }

function addGuest(ev, guest) {
  ev.guests = ev.guests || [];
  const existing = ev.guests.find(g => g.contactId === guest.contactId);
  if (existing) Object.assign(existing, guest);
  else ev.guests.push(Object.assign({ companions: 1, amount: 0, method: 'cheque', status: 'invited', tableId: null, sent: false }, guest));
  saveDB();
}
function removeGuest(ev, contactId) { ev.guests = ev.guests.filter(g => g.contactId !== contactId); saveDB(); }

/* ---- calculations ---- */
/* History entries: {event, dir:'in'|'out', amount, companions, status, method} */
function contactHistory(contactId) {
  const out = [];
  for (const ev of DB.events) {
    if (ev.mine) {
      const g = (ev.guests || []).find(g => g.contactId === contactId);
      if (g) out.push({ event: ev, dir: 'in', amount: +g.amount || 0, companions: +g.companions || 0, status: g.status, method: g.method, tableId: g.tableId });
    } else if (ev.hostId === contactId) {
      out.push({ event: ev, dir: 'out', amount: +(ev.gift && ev.gift.amount) || 0, companions: +ev.companions || 0, method: ev.gift && ev.gift.method });
    }
  }
  return out.sort((a, b) => (b.event.date || '').localeCompare(a.event.date || ''));
}
function contactBalance(contactId) {
  let received = 0, gave = 0, n = 0;
  for (const h of contactHistory(contactId)) { n++; if (h.dir === 'in') received += h.amount; else gave += h.amount; }
  return { received, gave, net: received - gave, count: n };
}
function totals() {
  let received = 0, gave = 0;
  for (const ev of DB.events) {
    if (ev.mine) (ev.guests || []).forEach(g => received += +g.amount || 0);
    else gave += +(ev.gift && ev.gift.amount) || 0;
  }
  return { received, gave, net: received - gave, events: DB.events.length, contacts: DB.contacts.length };
}
function eventStats(ev) {
  const gs = ev.guests || [];
  const s = { guests: gs.length, people: 0, came: 0, approved: 0, total: 0, seats: 0, seated: 0 };
  gs.forEach(g => {
    s.people += +g.companions || 0; s.total += +g.amount || 0;
    if (g.status === 'arrived') s.came += +g.companions || 0;
    if (g.status === 'approved' || g.status === 'arrived') s.approved += +g.companions || 0;
    if (g.tableId) s.seated += +g.companions || 0;
  });
  (ev.tables || []).forEach(tb => { if (tb.type !== 'stage') s.seats += +tb.seats || 0; });
  s.avg = gs.length ? s.total / gs.length : 0;
  return s;
}
function tableOccupancy(ev, tableId) {
  return (ev.guests || []).filter(g => g.tableId === tableId).reduce((a, g) => a + (+g.companions || 0), 0);
}

/* ---- search ---- */
function searchAll(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) return { contacts: [], events: [] };
  const nq = normPhone(q);
  const contacts = DB.contacts.filter(c =>
    c.name.toLowerCase().includes(q) || (nq && normPhone(c.phone).includes(nq)) || (c.notes || '').toLowerCase().includes(q) || catLabel(c.cat).toLowerCase().includes(q));
  const events = DB.events.filter(e =>
    (e.name || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q) || (e.date || '').includes(q) || t('events.kinds.' + e.kind).toLowerCase().includes(q));
  return { contacts, events };
}

/* ---- backup ---- */
function exportJSON() { return JSON.stringify(DB, null, 2); }
function importJSON(txt) {
  const d = JSON.parse(txt);
  if (!d || !Array.isArray(d.contacts) || !Array.isArray(d.events)) throw new Error('bad');
  DB = d; saveDB();
}
function clearAll() { DB = emptyDB(); saveDB(); }

/* ---- demo ---- */
function loadDemo() {
  DB = emptyDB();
  const he = LANG === 'he';
  const names = he
    ? [['דני כהן', '050-1234567', 'friends'], ['מיכל לוי', '052-7654321', 'work'], ['יוסי אברהם', '054-1112233', 'army'], ['רונית שמש', '053-4445566', 'class'], ['אבי ורותי מזרחי', '058-9998877', 'family'], ['נועה פרץ', '050-2223344', 'neighbors']]
    : [['Danny Cohen', '050-1234567', 'friends'], ['Michal Levi', '052-7654321', 'work'], ['Yossi Avraham', '054-1112233', 'army'], ['Ronit Shemesh', '053-4445566', 'class'], ['Avi & Ruti Mizrahi', '058-9998877', 'family'], ['Noa Peretz', '050-2223344', 'neighbors']];
  const ids = names.map(([name, phone, cat]) => upsertContact({ name, phone, cat, notes: '' }).id);
  const y = new Date().getFullYear();
  upsertEvent({ name: he ? 'חתונה של דני ושירה' : "Danny & Shira's wedding", kind: 'wedding', date: `${y - 1}-06-12`, time: '19:30', location: he ? 'גן האירועים "הרמוניה", ראשל"צ' : 'Harmonia Garden, Rishon', mine: false, hostId: ids[0], companions: 2, gift: { amount: 800, method: 'cheque' }, notes: '' });
  upsertEvent({ name: he ? 'בר מצווה של איתי' : "Itay's Bar Mitzvah", kind: 'barmitzvah', date: `${y}-03-02`, time: '18:00', location: he ? 'אולמי "פנינת הים", אשדוד' : 'Pninat HaYam Hall, Ashdod', mine: false, hostId: ids[1], companions: 1, gift: { amount: 400, method: 'cash' }, notes: '' });
  const mine = upsertEvent({ name: he ? 'החתונה שלנו' : 'Our wedding', kind: 'wedding', date: `${y}-11-20`, time: '20:00', location: he ? 'אחוזת "לב השדה", כפר ויתקין' : 'Lev HaSade Estate, Kfar Vitkin', mine: true, notes: '' });
  mine.tables = [
    { id: uid(), type: 'round', x: 160, y: 160, seats: 10, label: '1' },
    { id: uid(), type: 'round', x: 360, y: 160, seats: 10, label: '2' },
    { id: uid(), type: 'square', x: 560, y: 160, seats: 8, label: '3' },
    { id: uid(), type: 'rect', x: 360, y: 360, seats: 12, label: '4', w: 220, h: 90 },
    { id: uid(), type: 'stage', x: 360, y: 40, w: 300, h: 50, label: he ? 'במה' : 'Stage' }
  ];
  addGuest(mine, { contactId: ids[0], companions: 2, amount: 1000, method: 'cheque', status: 'approved', tableId: mine.tables[0].id });
  addGuest(mine, { contactId: ids[1], companions: 1, amount: 0, method: 'cheque', status: 'invited', tableId: mine.tables[0].id });
  addGuest(mine, { contactId: ids[2], companions: 2, amount: 600, method: 'transfer', status: 'arrived', tableId: mine.tables[1].id });
  addGuest(mine, { contactId: ids[4], companions: 4, amount: 1500, method: 'cheque', status: 'approved', tableId: mine.tables[2].id });
  addGuest(mine, { contactId: ids[5], companions: 2, amount: 0, method: 'cheque', status: 'declined' });
  saveDB();
}
