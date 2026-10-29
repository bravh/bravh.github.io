/* events.js - events list, event page, event form, guest form, invitations
   Loaded after layout.js + views.js, before app.js.
   Globals defined here: openEventForm, openGuestForm, openInvite, openBulkInvite, buildInviteText,
   VIEWS.events, VIEWS.event (everything else is prefixed ev / EV_). */

/* ---------- one-time setup: extra i18n strings + small CSS ---------- */
(function evSetup() {
  const add = {
    he: {
      events: {
        notFound: 'האירוע לא נמצא',
        openContact: 'כרטיס איש קשר',
        removeGuest: 'הסרת מוזמן',
        guestSearch: 'חיפוש מוזמן…'
      },
      invite: {
        signature: 'מאת: {name}',
        editHint: 'שינויים בטקסט חלים על שליחה זו בלבד',
        greetingPh: 'למשל: שלום! נשמח לראותכם בשמחתנו…'
      }
    },
    en: {
      events: {
        notFound: 'Event not found',
        openContact: 'Contact card',
        removeGuest: 'Remove guest',
        guestSearch: 'Search guests…'
      },
      invite: {
        signature: 'From: {name}',
        editHint: 'Edits apply to this send only',
        greetingPh: 'e.g. Hi! We would love to see you at our celebration…'
      }
    }
  };
  const merge = (dst, src) => {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object') { dst[k] = dst[k] || {}; merge(dst[k], src[k]); }
      else if (dst[k] === undefined) dst[k] = src[k];
    }
  };
  merge(I18N.he, add.he);
  merge(I18N.en, add.en);

  if (!document.getElementById('ev-css')) {
    const s = document.createElement('style');
    s.id = 'ev-css';
    s.textContent = `
.btn:disabled,.icon-btn:disabled{opacity:.4;cursor:not-allowed}
.ev-month{font-weight:700;color:var(--muted);font-size:14px;margin:16px 4px 6px}
.ev-month:first-child{margin-top:4px}
.date-box{width:50px;height:54px;border-radius:12px;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;line-height:1.1}
.date-box.past{background:color-mix(in srgb,var(--text) 7%,transparent);color:var(--muted)}
.date-box .d{font-size:21px;font-weight:800;font-variant-numeric:tabular-nums}
.date-box .m{font-size:11px;font-weight:600}
.ev-name{font-weight:700}
.ev-end{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.ev-end .row{gap:6px}
.ev-end svg{width:16px;height:16px}
.ev-end .badge svg{width:14px;height:14px}
.ev-line{align-items:flex-start;padding:6px 0}
.ev-line>svg{color:var(--muted);margin-top:1px}
.ev-line a{color:var(--primary);text-decoration:none;font-weight:600}
.ev-notes{white-space:pre-wrap}
.ev-kv{padding:10px 0;border-bottom:1px solid var(--line)}
.ev-kv:last-child{border-bottom:0}
.ev-kv .row{gap:8px}
.ev-click{cursor:pointer}
.ev-sum .stat .v{font-size:18px}
.ev-meta{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px}
.ev-chipline{display:inline-flex;align-items:center;gap:3px}
.ev-chipline svg{width:14px;height:14px}
.ev-amt{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none}
.ev-err{color:var(--red);font-size:13px}
.field .ev-bad{border-color:var(--red)}
.ev-host{justify-content:flex-start}
.ev-host.set{font-weight:700}
.ev-big{min-height:64px;font-size:17px;justify-content:flex-start;margin-bottom:10px}
.ev-big svg{width:28px;height:28px}
.ev-big.in svg{color:var(--green)}
.ev-big.out svg{color:var(--red)}
.ev-wa{color:#16a34a}
`;
    document.head.appendChild(s);
  }
})();

/* ---------- state + helpers ---------- */
const EV_STATUS_ICON = { invited: 'send', approved: 'check', declined: 'x', arrived: 'users' };
const EV_LIST_STATE = { who: 'all', when: 'upcoming', touched: false };
const EV_GUEST_UI = { eventId: null, status: 'all', q: '' };

function evLocale() { return LANG === 'he' ? 'he-IL' : 'en-GB'; }
function evMonthKey(date) { return date ? date.slice(0, 7) : ''; }
function evMonthTitle(key) {
  if (!key) return '—';
  return new Date(key + '-01T00:00:00').toLocaleDateString(evLocale(), { month: 'long', year: 'numeric' });
}
function evDayNum(date) { return date ? new Date(date + 'T00:00:00').getDate() : '—'; }
function evMonthShort(date) { return date ? new Date(date + 'T00:00:00').toLocaleDateString(evLocale(), { month: 'short' }) : ''; }
function evMethodIcon(m) { return typeof methodIcon === 'function' ? methodIcon(m) : m; }
function evTableLabel(ev, tableId) {
  if (!tableId) return '';
  if (typeof tableLabel === 'function') return tableLabel(ev, tableId) || '';
  const tb = (ev.tables || []).find(x => x.id === tableId);
  return tb ? String(tb.label || '') : '';
}
/* rerender but keep the scroll position */
function evRefresh() { const y = window.scrollY; rerender(); window.scrollTo(0, y); }
function evHasPhone(c) { return !!(c && normPhone(c.phone)); }
function evByName(a, b) { return a.c.name.localeCompare(b.c.name, LANG); }
function evOpenWa(phone, text) {
  const url = waLink(phone, text);
  const w = window.open(url, '_blank');
  if (w) { try { w.opener = null; } catch (e) { /* ignore */ } }
  else location.href = url;
}

/* =====================================================================
   1. Events list
   ===================================================================== */
function evFiltered() {
  const st = EV_LIST_STATE;
  const today = todayISO();
  const isPast = ev => !!(ev.date && ev.date < today);
  const list = DB.events
    .filter(ev => st.who === 'all' || (st.who === 'mine' ? ev.mine : !ev.mine))
    .filter(ev => st.when === 'past' ? isPast(ev) : !isPast(ev));
  const key = ev => (ev.date || '9999-99-99') + ' ' + (ev.time || '');
  list.sort((a, b) => st.when === 'past' ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b)));
  return list;
}

function evListRow(ev) {
  const today = todayISO();
  const past = !!(ev.date && ev.date < today);
  const sub = [t('events.kinds.' + ev.kind), ev.location].filter(Boolean).join(' · ');
  let end;
  if (ev.mine) {
    const s = eventStats(ev);
    end = h('div', { class: 'ev-end' },
      h('div', { class: 'row' }, h('span', { class: 'badge pill-pos' }, icon('in')), moneyEl(s.total)),
      h('div', { class: 'muted small row' }, icon('users'), String(s.guests)));
  } else {
    const gift = (+(ev.gift && ev.gift.amount) || 0);
    end = h('div', { class: 'ev-end' },
      h('div', { class: 'row' }, h('span', { class: 'badge pill-neg' }, icon('out')), moneyEl(-gift || 0)));
  }
  return h('div', { class: 'list-item', onClick: () => go('event', { id: ev.id }) },
    h('div', { class: 'date-box' + (past ? ' past' : '') },
      h('span', { class: 'd' }, evDayNum(ev.date)), h('span', { class: 'm' }, evMonthShort(ev.date))),
    h('div', { class: 'grow' },
      h('div', { class: 'ev-name ellipsis' }, ev.name),
      h('div', { class: 'muted ellipsis' }, sub)),
    end);
}

function evChooseType() {
  let m;
  const choose = mine => { m.close(); openEventForm({ mine, onSaved: ev => go('event', { id: ev.id }) }); };
  const big = (iconName, label, mine) => btn(label, { icon: iconName, class: 'block ev-big ' + iconName, onClick: () => choose(mine) });
  m = openModal({
    title: t('events.new'),
    body: h('div', null, big('in', t('events.typeMine'), true), big('out', t('events.typeAttended'), false))
  });
}

VIEWS.events = (root) => {
  setTitle(t('events.title'));
  const st = EV_LIST_STATE;
  const today = todayISO();
  if (!st.touched) {
    const hasUpcoming = DB.events.some(e => !(e.date && e.date < today));
    st.when = hasUpcoming || !DB.events.length ? 'upcoming' : 'past';
  }
  const listBox = h('div');
  const draw = () => {
    listBox.innerHTML = '';
    const list = evFiltered();
    if (!list.length) { listBox.append(emptyState('events', t('events.empty'))); return; }
    let curKey = null, card = null;
    list.forEach(ev => {
      const key = evMonthKey(ev.date);
      if (!card || key !== curKey) {
        curKey = key;
        listBox.append(h('div', { class: 'ev-month' }, evMonthTitle(key)));
        card = h('div', { class: 'card pad0' });
        listBox.append(card);
      }
      card.append(evListRow(ev));
    });
  };

  const whoChips = chips([
    { value: 'all', label: t('common.all') },
    { value: 'mine', label: t('events.mine'), icon: 'in' },
    { value: 'attended', label: t('events.attended'), icon: 'out' }
  ], st.who, v => { st.who = v; draw(); });

  const whenSeg = segmented([
    { value: 'upcoming', label: t('events.upcoming'), icon: 'events' },
    { value: 'past', label: t('events.past'), icon: 'clock' }
  ], st.when, v => { st.when = v; st.touched = true; draw(); });
  whenSeg.classList.add('mb');

  const fab = h('button', { class: 'fab', 'aria-label': t('events.new'), title: t('events.new'), onClick: evChooseType }, icon('plus'));
  root.append(whoChips, whenSeg, listBox, fab);
  draw();
};

/* =====================================================================
   2. Event form
   ===================================================================== */
function openEventForm({ event, mine, onSaved } = {}) {
  const ev = event || null;
  const isMine = ev ? !!ev.mine : mine !== false;
  let hostId = ev ? (ev.hostId || null) : null;
  let method = (ev && ev.gift && ev.gift.method) || 'cheque';

  /* a field with an inline "required" message */
  const mkField = (label, control, iconName) => {
    const err = h('div', { class: 'ev-err', hidden: true }, t('common.required'));
    const f = field(label, control, iconName);
    f.append(err);
    f.showErr = on => { err.hidden = !on; control.classList.toggle('ev-bad', !!on); };
    return f;
  };

  const nameIn = input({ value: ev ? (ev.name || '') : '', placeholder: t('events.eventName'), maxLength: 80 });
  const nameField = mkField(t('events.eventName'), nameIn, 'events');
  nameIn.addEventListener('input', () => nameField.showErr(false));

  const kindSel = select(KINDS.map(k => [k, t('events.kinds.' + k)]), ev ? ev.kind : 'wedding');
  const dateIn = input({ type: 'date', value: ev ? (ev.date || '') : todayISO() });
  const timeIn = input({ type: 'time', value: ev ? (ev.time || '') : '' });
  const locIn = input({ value: ev ? (ev.location || '') : '', placeholder: t('common.location') });
  const notesIn = h('textarea', { rows: 3, value: ev ? (ev.notes || '') : '' });

  const body = h('div', null,
    nameField,
    field(t('events.kind'), kindSel, 'tag'),
    h('div', { class: 'grid2' }, field(t('common.date'), dateIn, 'clock'), field(t('common.time'), timeIn, 'clock')),
    field(t('common.location'), locIn, 'pin'),
    field(t('common.notes'), notesIn, 'edit'));

  /* attended-only part */
  let hostField, compIn, giftIn;
  if (!isMine) {
    const hostBtn = h('button', { type: 'button', class: 'btn block ev-host' });
    const renderHost = () => {
      hostBtn.innerHTML = '';
      const c = hostId && getContact(hostId);
      hostBtn.classList.toggle('set', !!c);
      hostBtn.append(icon('contacts'), h('span', { class: 'ellipsis' }, c ? c.name : t('events.host')));
    };
    hostBtn.addEventListener('click', () => pickContact({
      exclude: [],
      onPick: c => { hostId = c.id; renderHost(); hostField.showErr(false); }
    }));
    renderHost();
    hostField = mkField(t('events.host'), hostBtn, 'contacts');

    compIn = input({ type: 'number', min: 0, inputMode: 'numeric', value: ev && ev.companions != null ? ev.companions : 1 });
    giftIn = input({ type: 'number', min: 0, inputMode: 'decimal', placeholder: '0', value: ev && ev.gift ? ev.gift.amount : '' });
    const methodSeg = segmented(METHODS.map(m => ({ value: m, label: t('events.' + m), icon: evMethodIcon(m) })), method, v => { method = v; });
    body.append(
      hostField,
      h('div', { class: 'grid2' }, field(t('events.companions'), compIn, 'users'), field(t('events.giftGiven'), giftIn, 'money')),
      field(t('events.method'), methodSeg, 'gift'));
  }

  const save = () => {
    const name = nameIn.value.trim();
    let ok = true;
    if (!name) { nameField.showErr(true); ok = false; }
    if (!isMine && !hostId) { hostField.showErr(true); ok = false; }
    if (!ok) return;
    const data = {
      name, kind: kindSel.value, date: dateIn.value, time: timeIn.value,
      location: locIn.value.trim(), notes: notesIn.value.trim(), mine: isMine
    };
    if (ev) data.id = ev.id;   /* upsertEvent merges, so guests/tables/greeting are preserved */
    if (!isMine) {
      const n = parseInt(compIn.value, 10);
      data.hostId = hostId;
      data.companions = isNaN(n) ? 1 : Math.max(0, n);
      data.gift = { amount: Math.max(0, +giftIn.value || 0), method };
    }
    const saved = upsertEvent(data);
    toast(t('common.saved'));
    m.close();
    if (onSaved) onSaved(getEvent(saved.id) || saved);
  };

  const m = openModal({
    title: ev ? t('events.edit') : t('events.new'),
    body,
    actions: [
      btn(t('common.cancel'), { onClick: () => m.close() }),
      btn(t('common.save'), { class: 'primary', icon: 'check', onClick: save })
    ]
  });
}

/* =====================================================================
   3. Event page
   ===================================================================== */
function evLine(iconName, content) {
  return h('div', { class: 'row ev-line' }, icon(iconName), h('div', { class: 'grow' }, content));
}
function evKV(iconName, label, value) {
  return h('div', { class: 'row between ev-kv' }, h('div', { class: 'row muted' }, icon(iconName), label), value);
}

function evHeaderCard(ev) {
  const today = todayISO();
  const when = [fmtDate(ev.date), ev.time].filter(Boolean).join(' · ');
  const badges = [
    h('span', { class: 'badge cat' }, icon('events'), t('events.kinds.' + ev.kind)),
    ev.mine
      ? h('span', { class: 'badge pill-pos' }, icon('in'), t('events.mine'))
      : h('span', { class: 'badge pill-neg' }, icon('out'), t('events.attended')),
    ev.date === today ? h('span', { class: 'badge pill-amber' }, t('events.today')) : null
  ];
  const tools = h('div', { class: 'row', style: { gap: '0' } },
    iconBtn('edit', () => openEventForm({ event: ev, mine: ev.mine, onSaved: evRefresh }), t('common.edit')),
    iconBtn('trash', () => confirmDialog(undefined, () => {
      deleteEvent(ev.id);
      toast(t('common.deleted'));
      go('events');
    }), t('common.delete')));
  const locLink = ev.location
    ? h('a', { href: 'https://maps.google.com/?q=' + encodeURIComponent(ev.location), target: '_blank', rel: 'noopener' }, ev.location)
    : null;
  return h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('div', { class: 'row wrap grow' }, badges), tools),
    when ? evLine('clock', when) : null,
    locLink ? evLine('pin', locLink) : null,
    ev.notes ? evLine('edit', h('span', { class: 'ev-notes' }, ev.notes)) : null);
}

function evAttendedSections(root, ev) {
  const host = ev.hostId ? getContact(ev.hostId) : null;
  const gift = +(ev.gift && ev.gift.amount) || 0;
  const gm = ev.gift && ev.gift.method;

  const hostCard = h('div', { class: 'card' }, h('h3', null, t('events.host')));
  if (host) {
    hostCard.append(
      h('div', { class: 'row ev-click', onClick: () => go('contact', { id: host.id }) },
        avatar(host.name),
        h('div', { class: 'grow' },
          h('div', { class: 'ev-name ellipsis' }, host.name),
          h('div', { class: 'muted ellipsis' }, [catLabel(host.cat), host.phone].filter(Boolean).join(' · '))),
        icon('chevron', 'chev')),
      h('div', { class: 'row between mt' },
        h('span', { class: 'muted' }, t('contacts.net')),
        balancePill(contactBalance(host.id).net)));
  } else {
    hostCard.append(h('div', { class: 'muted' }, t('common.none')));
  }
  root.append(hostCard);

  root.append(h('div', { class: 'card' },
    evKV('users', t('events.companions'), h('span', { class: 'amount' }, String(ev.companions != null ? ev.companions : 0))),
    evKV('gift', t('events.giftGiven'), moneyEl(-gift || 0)),
    gm ? evKV('money', t('events.method'), h('span', { class: 'badge' }, icon(evMethodIcon(gm)), t('events.' + gm))) : null));
}

function evStat(iconName, value, label, sub) {
  return h('div', { class: 'stat' },
    icon(iconName), h('div', { class: 'v' }, value), h('div', { class: 'l' }, label),
    sub ? h('div', { class: 'l' }, sub) : null);
}

function evSummaryCard(ev) {
  const s = eventStats(ev);
  const free = s.seats - s.seated;
  return h('div', { class: 'card ev-sum' },
    h('h3', null, t('events.summary')),
    h('div', { class: 'grid3' },
      evStat('contacts', String(s.guests), t('events.guestCount'), s.people + ' ' + t('common.people')),
      evStat('check', String(s.approved), t('events.approvedCount')),
      evStat('users', String(s.came), t('events.came'))),
    h('div', { class: 'grid3 mt' },
      evStat('gift', moneyEl(s.total), t('events.giftsTotal')),
      evStat('money', moneyEl(s.avg), t('events.avgGift')),
      evStat('seat', String(s.seated), t('events.seatsTaken'), '/ ' + s.seats)),
    h('div', { class: 'grid2 mt' },
      evStat('table', h('span', { class: free < 0 ? 'neg' : '' }, String(free)), t('events.seatsFree')),
      evStat('seat', String(s.seats), t('events.seats'))));
}

function evGuestRow(ev, g, c) {
  const tl = evTableLabel(ev, g.tableId);
  const meta = h('div', { class: 'muted small ev-meta' },
    h('span', null, catLabel(c.cat)),
    h('span', { class: 'ev-chipline' }, icon('users'), '×' + (g.companions || 1)),
    h('span', { class: 'ev-chipline' }, icon('table'), tl || t('events.noTable')));
  const sendBtn = iconBtn(g.sent ? 'check' : 'send', e => { e.stopPropagation(); openInvite(ev, g); }, t('invite.send'));
  sendBtn.style.color = g.sent ? 'var(--muted)' : 'var(--primary)';
  return h('div', { class: 'guest-row ev-click', onClick: () => openGuestForm(ev, g, evRefresh) },
    h('span', { class: 'status-dot st-' + g.status, title: t('events.' + g.status) }),
    avatar(c.name),
    h('div', { class: 'grow' }, h('div', { class: 'ev-name ellipsis' }, c.name), meta),
    h('div', { class: 'ev-amt' },
      moneyEl(g.amount),
      (+g.amount > 0) ? h('span', { class: 'muted ev-chipline' }, icon(evMethodIcon(g.method))) : null),
    sendBtn);
}

function evGuestsCard(ev) {
  const ui = EV_GUEST_UI;
  if (ui.eventId !== ev.id) { ui.eventId = ev.id; ui.status = 'all'; ui.q = ''; }
  const card = h('div', { class: 'card' }, h('h3', null, t('events.guests')));
  const listBox = h('div');

  const draw = () => {
    const q = ui.q.trim().toLowerCase();
    const rows = ev.guests
      .map(g => ({ g, c: getContact(g.contactId) }))
      .filter(x => x.c)
      .filter(x => ui.status === 'all' || x.g.status === ui.status)
      .filter(x => !q || x.c.name.toLowerCase().includes(q))
      .sort(evByName);
    listBox.innerHTML = '';
    if (!rows.length) { listBox.append(emptyState('users', t('home.noResults'))); return; }
    rows.forEach(({ g, c }) => listBox.append(evGuestRow(ev, g, c)));
  };

  if (!ev.guests.length) {
    card.append(emptyState('users', t('events.noGuests')));
    return card;
  }
  const counts = { all: ev.guests.length };
  STATUSES.forEach(s => { counts[s] = ev.guests.filter(g => g.status === s).length; });
  const opts = [{ value: 'all', label: t('common.all') + ' (' + counts.all + ')' }].concat(
    STATUSES.map(s => ({ value: s, label: t('events.' + s) + ' (' + counts[s] + ')', icon: EV_STATUS_ICON[s] })));
  const searchIn = input({ type: 'search', placeholder: t('events.guestSearch'), value: ui.q });
  searchIn.addEventListener('input', () => { ui.q = searchIn.value; draw(); });
  card.append(
    chips(opts, ui.status, v => { ui.status = v; draw(); }),
    h('div', { class: 'search' }, icon('search'), searchIn),
    listBox);
  draw();
  return card;
}

function evMineSections(root, ev) {
  root.append(evSummaryCard(ev));

  const mk = (label, o) => { const b = btn(label, o); b.style.flex = '1 1 150px'; return b; };
  root.append(h('div', { class: 'row wrap mb' },
    mk(t('events.layout'), { icon: 'table', onClick: () => go('layout', { id: ev.id }) }),
    mk(t('invite.sendAll'), { icon: 'send', onClick: () => openBulkInvite(ev) }),
    mk(t('events.addGuest'), {
      icon: 'plus', class: 'primary',
      onClick: () => pickContact({
        exclude: ev.guests.map(g => g.contactId),
        onPick: c => openGuestForm(ev, { contactId: c.id }, evRefresh)
      })
    })));

  if (ev.tables.length && typeof renderSeatingThumb === 'function') {
    root.append(h('div', { class: 'card ev-click', onClick: () => go('layout', { id: ev.id }) },
      h('div', { class: 'row between mb' }, h('h3', { style: { margin: '0' } }, t('events.layout')), icon('chevron', 'chev')),
      renderSeatingThumb(ev)));
  }

  root.append(evGuestsCard(ev));
}

VIEWS.event = (root, params) => {
  const ev = getEvent(params && params.id);
  if (!ev) {
    setTitle(t('events.title'));
    root.append(emptyState('events', t('events.notFound')));
    return;
  }
  ev.guests = ev.guests || [];
  ev.tables = ev.tables || [];
  setTitle(ev.name);
  root.append(evHeaderCard(ev));
  if (ev.mine) evMineSections(root, ev);
  else evAttendedSections(root, ev);
};

/* =====================================================================
   4. Guest form
   ===================================================================== */
function openGuestForm(ev, guest, onSaved) {
  const c = getContact(guest && guest.contactId);
  if (!c) return;
  ev.guests = ev.guests || [];
  const existing = ev.guests.find(x => x.contactId === c.id) || null;
  const g = Object.assign({ companions: 1, amount: 0, method: 'cheque', status: 'invited', tableId: null }, existing || {}, guest || {});
  let status = g.status;
  let method = g.method;

  const statusSeg = segmented(
    STATUSES.map(s => ({ value: s, label: t('events.' + s), icon: EV_STATUS_ICON[s] })),
    status, v => { status = v; });
  const compIn = input({ type: 'number', min: 1, inputMode: 'numeric', value: g.companions || 1 });
  const amtIn = input({ type: 'number', min: 0, inputMode: 'decimal', placeholder: '0', value: g.amount || '' });
  const methodSeg = segmented(
    METHODS.map(m => ({ value: m, label: t('events.' + m), icon: evMethodIcon(m) })),
    method, v => { method = v; });

  const tables = (ev.tables || []).filter(tb => tb.type !== 'stage');
  const tableSel = select(
    [['', t('events.noTable')]].concat(tables.map(tb => [
      tb.id,
      (evTableLabel(ev, tb.id) || tb.label || '') + ' (' + ((+tb.seats || 0) - tableOccupancy(ev, tb.id)) + '/' + (+tb.seats || 0) + ')'
    ])),
    g.tableId || '');

  const infoLine = [catLabel(c.cat), c.phone].filter(Boolean).join(' · ');
  const body = h('div', null,
    h('div', { class: 'row between mb' },
      h('div', { class: 'muted grow ellipsis' }, infoLine),
      btn(t('events.openContact'), { class: 'ghost sm', icon: 'contacts', onClick: () => { m.close(); go('contact', { id: c.id }); } })),
    field(t('events.status'), statusSeg, 'filter'),
    h('div', { class: 'grid2' },
      field(t('events.guestCompanions'), compIn, 'users'),
      field(t('events.guestGift'), amtIn, 'money')),
    field(t('events.method'), methodSeg, 'gift'),
    tables.length ? field(t('events.table'), tableSel, 'table') : null);

  const save = () => {
    const n = parseInt(compIn.value, 10);
    addGuest(ev, {
      contactId: c.id,
      status,
      companions: isNaN(n) ? 1 : Math.max(1, n),
      amount: Math.max(0, +amtIn.value || 0),
      method,
      tableId: tableSel.value || null
    });
    toast(t('common.saved'));
    m.close();
    if (onSaved) onSaved();
  };

  const actions = [btn(t('common.save'), { class: 'primary', icon: 'check', onClick: save })];
  if (existing) {
    actions.push(btn(t('events.removeGuest'), {
      class: 'danger', icon: 'trash',
      onClick: () => confirmDialog(undefined, () => {
        removeGuest(ev, c.id);
        toast(t('common.deleted'));
        m.close();
        if (onSaved) onSaved();
      })
    }));
  }

  const m = openModal({
    title: h('span', { class: 'row' }, avatar(c.name), h('span', { class: 'ellipsis' }, c.name)),
    body,
    actions
  });
}

/* =====================================================================
   5. Invitations
   ===================================================================== */
function buildInviteText(ev, guest) {
  const tl = guest && guest.tableId ? evTableLabel(ev, guest.tableId) : '';
  let body = t('invite.template', {
    event: ev.name || '',
    date: fmtDate(ev.date),
    time: ev.time || '',
    location: ev.location || '',
    table: tl ? t('invite.tableLine', { table: tl }) : '',
    rsvp: t('invite.rsvpLine')
  });
  if (!ev.time) body = body.replace(/ (?:בשעה|at) *(?=\n|$)/, '');
  if (!ev.location) body = body.replace(/^📍[ \t]*\n/m, '');
  const parts = [];
  if (ev.greeting && ev.greeting.trim()) parts.push(ev.greeting.trim());
  parts.push(body.trim());
  const me = DB.settings && typeof DB.settings.myName === 'string' ? DB.settings.myName.trim() : '';
  if (me) parts.push(t('invite.signature', { name: me }));
  return parts.join('\n\n');
}

function openInvite(ev, guest) {
  const c = getContact(guest && guest.contactId);
  if (!c) return;
  const hasPhone = evHasPhone(c);
  const ta = h('textarea', { rows: 9, value: buildInviteText(ev, guest) });
  ta.style.minHeight = '180px';
  ta.style.lineHeight = '1.6';

  const markSent = () => {
    const real = (ev.guests || []).find(x => x.contactId === c.id);
    if (real && !real.sent) { real.sent = true; saveDB(); }
    evRefresh();
  };
  const sendWa = () => { const text = ta.value; evOpenWa(c.phone, text); markSent(); m.close(); };
  const sendSms = () => { const text = ta.value; markSent(); m.close(); location.href = smsLink(c.phone, text); };
  const doShare = () => {
    navigator.share({ text: ta.value, title: ev.name })
      .then(() => { markSent(); m.close(); })
      .catch(() => { /* cancelled */ });
  };

  const waBtn = btn(t('invite.sendWa'), { icon: 'whatsapp', class: 'primary', disabled: !hasPhone, onClick: sendWa });
  waBtn.style.gridColumn = '1 / -1';
  const grid = h('div', { class: 'grid2 mt' },
    waBtn,
    btn(t('invite.sendSms'), { icon: 'phone', disabled: !hasPhone, onClick: sendSms }),
    btn(t('common.copy'), { icon: 'copy', onClick: () => copyText(ta.value) }));
  if (navigator.share) {
    const shareBtn = btn(t('common.share'), { icon: 'share', onClick: doShare });
    shareBtn.style.gridColumn = '1 / -1';
    grid.append(shareBtn);
  }

  const m = openModal({
    title: t('invite.title'),
    body: h('div', null,
      h('div', { class: 'row mb' },
        avatar(c.name),
        h('div', { class: 'grow' },
          h('div', { class: 'ev-name ellipsis' }, c.name),
          h('div', { class: 'muted ellipsis' }, hasPhone ? c.phone : ''))),
      hasPhone ? null : h('div', { class: 'badge pill-amber mb' }, icon('phone'), t('invite.noPhone')),
      field(t('invite.preview'), ta, 'send'),
      h('div', { class: 'muted small' }, t('invite.editHint')),
      grid)
  });
}

function openBulkInvite(ev) {
  const gTA = h('textarea', { rows: 2, placeholder: t('invite.greetingPh'), value: ev.greeting || '' });
  gTA.addEventListener('input', () => { ev.greeting = gTA.value; saveDB(); });

  const listBox = h('div');
  const draw = () => {
    listBox.innerHTML = '';
    const items = (ev.guests || [])
      .filter(g => g.status !== 'declined')
      .map(g => ({ g, c: getContact(g.contactId) }))
      .filter(x => x.c)
      .sort(evByName);
    if (!items.length) { listBox.append(emptyState('users', t('events.noGuests'))); return; }
    items.forEach(({ g, c }) => {
      const hasPhone = evHasPhone(c);
      const send = h('button', {
        type: 'button', class: 'icon-btn ev-wa', disabled: !hasPhone,
        'aria-label': t('invite.sendWa'), title: t('invite.sendWa'),
        onClick: () => {
          ev.greeting = gTA.value;
          evOpenWa(c.phone, buildInviteText(ev, g));
          g.sent = true;
          saveDB();
          draw();
          evRefresh();
        }
      }, icon('whatsapp'));
      listBox.append(h('div', { class: 'guest-row' },
        avatar(c.name),
        h('div', { class: 'grow' },
          h('div', { class: 'ev-name ellipsis' }, c.name),
          h('div', { class: 'muted small ellipsis' }, hasPhone ? c.phone : t('invite.noPhone'))),
        g.sent ? h('span', { class: 'badge pill-pos' }, icon('check'), t('invite.sent')) : null,
        send));
    });
  };
  draw();

  const m = openModal({
    title: t('invite.sendAll'),
    body: h('div', null,
      h('p', { class: 'muted', style: { marginTop: '0' } }, t('invite.bulkHint')),
      field(t('invite.greeting'), gTA, 'edit'),
      listBox),
    actions: [btn(t('common.done'), { class: 'primary', icon: 'check', onClick: () => m.close() })]
  });
}
