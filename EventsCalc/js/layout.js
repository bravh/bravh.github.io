/* Seating-map editor (VIEWS.layout) + helpers used by events.js:
   tableLabel(ev, tableId), renderSeatingThumb(ev)
   Loaded after ui.js, before views.js/events.js. All private helpers are prefixed "ly". */

/* ---- extra i18n strings (merged without overwriting existing keys) ---- */
(function lyMergeI18n() {
  const extra = {
    he: { layout: {
      zoomIn: 'הגדלה', zoomOut: 'הקטנה',
      summary: 'מקומות: {seats} · הושבו: {seated} · פנויים: {free}',
      pickTable: 'בחירת שולחן להושבה', allSeated: 'כל המוזמנים הושבו'
    } },
    en: { layout: {
      zoomIn: 'Zoom in', zoomOut: 'Zoom out',
      summary: 'Seats: {seats} · Seated: {seated} · Free: {free}',
      pickTable: 'Choose a table', allSeated: 'All guests are seated'
    } }
  };
  const merge = (dst, src) => {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object') { dst[k] = dst[k] || {}; merge(dst[k], src[k]); }
      else if (dst[k] === undefined) dst[k] = src[k];
    }
  };
  for (const l of ['he', 'en']) merge(I18N[l], extra[l]);
})();

const LY = { SEAT_R: 6, GAP: 11, GRID: 10, W: 800, H: 600, MINZ: 0.6, MAXZ: 3, ZSTEP: 1.25 };
const LY_NS = 'http://www.w3.org/2000/svg';
const LY_TYPES = ['round', 'square', 'rect', 'stage'];

/* ---- small utilities ---- */
function lyEl(tag, attrs, ...kids) {
  const el = document.createElementNS(LY_NS, tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
function lyClamp(v, lo, hi) { return hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)); }
function lySnap(v) { return Math.round(v / LY.GRID) * LY.GRID; }
function lyShort(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }
function lyGuestName(g) { const c = getContact(g.contactId); return c ? c.name : '?'; }
function lyToSvg(svg, x, y) {
  const m = svg.getScreenCTM();
  if (!m) return { x, y };
  const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
  const r = pt.matrixTransform(m.inverse());
  return { x: r.x, y: r.y };
}
function lyScale(svg) { const m = svg.getScreenCTM(); return m && m.a ? m.a : 1; }

function lyInjectCss() {
  if (document.getElementById('ly-css')) return;
  const s = document.createElement('style');
  s.id = 'ly-css';
  s.textContent =
    '.ly-meta{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);flex-wrap:wrap}' +
    '.ly-meta svg{width:14px;height:14px}' +
    '.ly-tick{min-width:44px;min-height:34px;justify-content:center}' +
    '.ly-dim{opacity:.55}' +
    '.ly-scroll{max-height:38vh;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:0 10px}' +
    '.layout-tools .btn span{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
  document.head.append(s);
}

/* modal wrapper; guard=true ignores pointer input on the overlay for a moment so the
   "ghost click" that follows a tap on the map cannot instantly close the sheet */
function lyModal(opts, guard) {
  const m = openModal(opts);
  if (guard && m.sheet && m.sheet.parentNode) {
    const ov = m.sheet.parentNode;
    ov.style.pointerEvents = 'none';
    setTimeout(() => { ov.style.pointerEvents = ''; }, 400);
  }
  return m;
}

/* ---- geometry ---- */
function lySeatCount(tb) { return tb.type === 'stage' ? 0 : Math.max(0, Math.floor(+tb.seats || 0)); }
function lyRectEnds(n) { return n >= 8 ? 2 : (n % 2 ? 1 : 0); }

function lyDims(tb) {
  const n = lySeatCount(tb);
  switch (tb.type) {
    case 'square': { const s = 80 + Math.max(0, n - 8) * 3; return { w: s, h: s }; }
    case 'rect': {
      let w = +tb.w || 220, h = +tb.h || 90;
      const need = Math.ceil((n - lyRectEnds(n)) / 2) * 18;
      if (w >= h) w = Math.max(w, need); else h = Math.max(h, need);
      return { w, h };
    }
    case 'stage': return { w: +tb.w || 300, h: +tb.h || 50 };
    default: { const r = 40 + Math.max(0, n - 8) * 2.5; return { w: 2 * r, h: 2 * r, r }; }
  }
}

/* half-size of the table including its seat ring */
function lyExtent(tb) {
  const d = lyDims(tb);
  const pad = lySeatCount(tb) ? LY.GAP + LY.SEAT_R + 2 : 0;
  return { hw: d.w / 2 + pad, hh: d.h / 2 + pad };
}

function lyRectSeatPts(long, short, n) {
  const G = LY.GAP, ends = lyRectEnds(n), rest = n - ends;
  const top = Math.ceil(rest / 2), bot = rest - top, pts = [];
  for (let i = 0; i < top; i++) pts.push({ x: -long / 2 + (i + 0.5) * long / top, y: -short / 2 - G });
  if (ends >= 1) pts.push({ x: long / 2 + G, y: 0 });
  for (let i = 0; i < bot; i++) pts.push({ x: long / 2 - (i + 0.5) * long / bot, y: short / 2 + G });
  if (ends >= 2) pts.push({ x: -long / 2 - G, y: 0 });
  return pts;
}

/* seat centres relative to the table centre, in clockwise order starting at the top */
function lySeatPoints(tb) {
  const n = lySeatCount(tb);
  if (!n) return [];
  const d = lyDims(tb), G = LY.GAP, pts = [];
  if (tb.type === 'square') {
    const s = d.w, c = [0, 0, 0, 0].map(() => Math.floor(n / 4));      // top, right, bottom, left
    [0, 2, 1, 3].slice(0, n % 4).forEach(i => c[i]++);
    for (let i = 0; i < c[0]; i++) pts.push({ x: -s / 2 + (i + 0.5) * s / c[0], y: -s / 2 - G });
    for (let i = 0; i < c[1]; i++) pts.push({ x: s / 2 + G, y: -s / 2 + (i + 0.5) * s / c[1] });
    for (let i = 0; i < c[2]; i++) pts.push({ x: s / 2 - (i + 0.5) * s / c[2], y: s / 2 + G });
    for (let i = 0; i < c[3]; i++) pts.push({ x: -s / 2 - G, y: s / 2 - (i + 0.5) * s / c[3] });
  } else if (tb.type === 'rect') {
    const horiz = d.w >= d.h;
    const p = lyRectSeatPts(horiz ? d.w : d.h, horiz ? d.h : d.w, n);
    return horiz ? p : p.map(q => ({ x: q.y, y: q.x }));
  } else {
    const R = d.w / 2 + G;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n;
      pts.push({ x: R * Math.cos(a), y: R * Math.sin(a) });
    }
  }
  return pts;
}

/* viewBox that contains the default canvas and every table, kept at 4:3 */
function lyBounds(ev) {
  let x0 = 0, y0 = 0, x1 = LY.W, y1 = LY.H;
  for (const tb of ev.tables || []) {
    const e = lyExtent(tb), m = 6, x = +tb.x || 0, y = +tb.y || 0;
    x0 = Math.min(x0, x - e.hw - m); x1 = Math.max(x1, x + e.hw + m);
    y0 = Math.min(y0, y - e.hh - m); y1 = Math.max(y1, y + e.hh + m);
  }
  let w = x1 - x0, h = y1 - y0;
  const ar = LY.W / LY.H;
  if (w / h > ar) { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; }
  else { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; }
  return { x: x0, y: y0, w, h };
}

function lyNextNumber(ev) {
  let max = 0, cnt = 0;
  (ev.tables || []).forEach(tb => {
    if (tb.type === 'stage') return;
    cnt++;
    const n = parseInt(tb.label, 10);
    if (n > max) max = n;
  });
  return Math.max(max, cnt) + 1;
}

/* a free spot for a new table: nearest collision-free grid point to a preferred position */
function lyFreeSpot(ev, tb, base) {
  const ext = lyExtent(tb), tables = ev.tables || [];
  const others = tables.map(o => ({ x: +o.x || 0, y: +o.y || 0, e: lyExtent(o) }));
  const lastNon = tables.filter(o => o.type !== 'stage').pop();
  const pref = tb.type === 'stage'
    ? { x: base.x + base.w / 2, y: base.y + ext.hh + 10 }
    : lastNon ? { x: (+lastNon.x || 0) + 140, y: +lastNon.y || 0 }
      : { x: base.x + base.w / 2, y: base.y + base.h / 2 };
  const x0 = Math.ceil((base.x + ext.hw) / LY.GRID) * LY.GRID, x1 = base.x + base.w - ext.hw;
  const y0 = Math.ceil((base.y + ext.hh) / LY.GRID) * LY.GRID, y1 = base.y + base.h - ext.hh;
  let best = null, bestD = Infinity;
  for (let y = y0; y <= y1; y += LY.GRID) {
    for (let x = x0; x <= x1; x += LY.GRID) {
      let ok = true;
      for (const o of others) {
        if (Math.abs(x - o.x) < ext.hw + o.e.hw + 6 && Math.abs(y - o.y) < ext.hh + o.e.hh + 6) { ok = false; break; }
      }
      if (!ok) continue;
      const d = (x - pref.x) * (x - pref.x) + (y - pref.y) * (y - pref.y);
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
  }
  if (best) return best;
  /* map is full: start a new row below the current canvas (viewBox grows automatically) */
  return { x: lySnap(base.x + base.w / 2), y: lySnap(base.y + base.h + ext.hh + 10) };
}

/* ---- drawing ---- */
function lyOrder(ev, selId) {
  const rank = tb => (tb.id === selId ? 2 : tb.type === 'stage' ? 0 : 1);
  return (ev.tables || []).slice().sort((a, b) => rank(a) - rank(b));
}

function lyTableG(ev, tb, o) {
  o = o || {};
  const n = lySeatCount(tb), d = lyDims(tb), isStage = tb.type === 'stage';
  const occ = isStage ? 0 : tableOccupancy(ev, tb.id);
  const arrived = isStage ? 0 : (ev.guests || [])
    .filter(g => g.tableId === tb.id && g.status === 'arrived')
    .reduce((a, g) => a + (+g.companions || 0), 0);
  const attrs = { class: 'tbl', transform: 'translate(' + (+tb.x || 0) + ' ' + (+tb.y || 0) + ')' };
  if (o.interactive) attrs['data-tid'] = tb.id;
  const g = lyEl('g', attrs);

  const name = tb.label == null ? '' : String(tb.label);
  if (o.interactive) g.append(lyEl('title', null, isStage ? name : name + '  ' + occ + '/' + n));

  lySeatPoints(tb).forEach((p, i) => {
    g.append(lyEl('circle', {
      class: 'seat' + (i < arrived ? ' arrived' : i < occ ? ' taken' : ''),
      cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: LY.SEAT_R
    }));
  });

  const cls = 'tbl-shape' + (o.sel ? ' sel' : '') + (isStage ? ' stage' : '');
  if (tb.type === 'square' || tb.type === 'rect' || isStage) {
    g.append(lyEl('rect', {
      class: cls, x: -d.w / 2, y: -d.h / 2, width: d.w, height: d.h,
      rx: isStage ? 6 : tb.type === 'rect' ? 12 : 10
    }));
  } else {
    g.append(lyEl('circle', { class: cls, cx: 0, cy: 0, r: d.r }));
  }

  const showSub = !isStage;
  g.append(lyEl('text', {
    class: 'tbl-label', x: 0, y: showSub ? -7 : 0,
    style: 'font-size:' + (isStage ? 14 : 16) + 'px'
  }, lyShort(name, Math.floor((d.w - 8) / 9.5))));
  if (showSub) {
    g.append(lyEl('text', {
      class: 'tbl-sub', x: 0, y: 10,
      style: 'font-size:11px' + (occ > n ? ';fill:#b91c1c' : '')
    }, occ + '/' + n));
  }
  return g;
}

/* ---- exports for events.js ---- */
function tableLabel(ev, tableId) {
  if (!ev || !tableId) return '';
  const tb = (ev.tables || []).find(x => x.id === tableId);
  return tb && tb.label != null ? String(tb.label) : '';
}

function renderSeatingThumb(ev) {
  const b = lyBounds(ev || {});
  const svg = lyEl('svg', {
    class: 'seating-thumb', viewBox: b.x + ' ' + b.y + ' ' + b.w + ' ' + b.h,
    preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true',
    style: 'width:100%;height:auto;max-height:160px;display:block;stroke:none;fill:none;pointer-events:none'
  });
  lyOrder(ev || {}, null).forEach(tb => svg.append(lyTableG(ev, tb, { interactive: false })));
  return svg;
}

/* ---- table editor modal ---- */
function lyToggleRow(ev, tb, g, getSeats, onChange) {
  const name = lyGuestName(g);
  const other = h('span');
  const tick = h('span', { class: 'chip ly-tick' });
  const row = h('div', {
    class: 'guest-row' + (g.status === 'declined' ? ' ly-dim' : ''), role: 'checkbox', tabindex: '0',
    style: { cursor: 'pointer' }
  },
  avatar(name),
  h('div', { class: 'grow' },
    h('div', { class: 'ellipsis' }, name),
    h('div', { class: 'ly-meta' }, icon('users'), String(+g.companions || 0),
      h('span', { class: 'status-dot st-' + g.status, title: t('events.' + g.status) }), other)),
  tick);
  const update = () => {
    const on = g.tableId === tb.id;
    tick.className = 'chip ly-tick' + (on ? ' on' : '');
    tick.textContent = '';
    tick.append(icon(on ? 'check' : 'plus'));
    row.setAttribute('aria-checked', on ? 'true' : 'false');
    const tl = g.tableId && !on ? tableLabel(ev, g.tableId) : '';
    other.textContent = tl ? '· ' + t('events.table') + ' ' + tl : '';
  };
  const toggle = () => {
    if (g.tableId === tb.id) g.tableId = null;
    else {
      if (tableOccupancy(ev, tb.id) + (+g.companions || 0) > getSeats()) toast(t('layout.fullCapacity'));
      g.tableId = tb.id;
    }
    saveDB();
    update();
    onChange();
  };
  row.addEventListener('click', toggle);
  row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  update();
  return { el: row, update };
}

function lyOpenTableEditor(ev, tb, ctx) {
  let curType = LY_TYPES.includes(tb.type) ? tb.type : 'round';
  const nameIn = input({ value: tb.label == null ? '' : String(tb.label), maxLength: 24 });
  const seatsIn = input({ type: 'number', min: 1, max: 60, step: 1, value: tb.type === 'stage' ? 10 : (tb.seats || 10), inputMode: 'numeric' });
  const seatsField = field(t('layout.seats'), seatsIn, 'seat');
  const curSeats = () => (curType === 'stage' ? 0 : Math.max(0, parseInt(seatsIn.value, 10) || 0));

  const occBadge = h('span', { class: 'badge' });
  const refreshOcc = () => {
    const occ = tableOccupancy(ev, tb.id), s = curSeats();
    occBadge.textContent = occ + '/' + s;
    occBadge.className = 'badge' + (occ > s ? ' pill-neg' : '');
  };

  const rank = g => (g.tableId === tb.id ? 0 : !g.tableId ? (g.status === 'declined' ? 3 : 1) : 2);
  const guests = (ev.guests || []).slice().sort((a, b) =>
    rank(a) - rank(b) || lyGuestName(a).localeCompare(lyGuestName(b), LANG));
  const rows = guests.map(g => lyToggleRow(ev, tb, g, curSeats, () => { rows.forEach(r => r.update()); refreshOcc(); }));
  const list = h('div', { class: 'ly-scroll' }, rows.map(r => r.el));

  const assignSection = h('div', null,
    h('div', { class: 'row between', style: { margin: '4px 0 8px' } },
      h('h3', { style: { margin: '0' } }, t('layout.assign')),
      h('span', { class: 'row muted' }, t('layout.atTable') + ':', occBadge)),
    guests.length ? list : h('div', { class: 'muted' }, t('events.noGuests')));

  const sync = () => {
    seatsField.hidden = curType === 'stage';
    assignSection.hidden = curType === 'stage';
    refreshOcc();
  };
  const typeSeg = segmented(LY_TYPES.map(k => ({ value: k, label: t('layout.' + k), icon: k })), curType, v => { curType = v; sync(); });
  seatsIn.addEventListener('input', refreshOcc);

  const save = () => {
    const label = nameIn.value.trim() || String(tb.label || lyNextNumber(ev));
    let seats = parseInt(seatsIn.value, 10);
    if (!(seats >= 1)) seats = tb.seats > 0 ? tb.seats : 10;
    seats = Math.min(60, seats);
    if (curType !== tb.type) {
      if (curType === 'rect') { tb.w = 220; tb.h = 90; }
      else if (curType === 'stage') { tb.w = 300; tb.h = 50; }
      else { delete tb.w; delete tb.h; }
    }
    tb.type = curType;
    tb.label = label;
    if (curType === 'stage') {
      tb.seats = 0;
      (ev.guests || []).forEach(g => { if (g.tableId === tb.id) g.tableId = null; });
    } else tb.seats = seats;
    saveDB();
    m.close();
  };
  const remove = () => confirmDialog(t('common.confirmDelete'), () => {
    ev.tables = (ev.tables || []).filter(x => x.id !== tb.id);
    (ev.guests || []).forEach(g => { if (g.tableId === tb.id) g.tableId = null; });
    if (ctx.st.sel === tb.id) ctx.st.sel = null;
    saveDB();
    m.close();
  });
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });

  const body = h('div', null,
    field(t('layout.tableName'), nameIn, 'tag'),
    h('div', { class: 'field' }, typeSeg),
    seatsField,
    assignSection);
  const title = tb.type === 'stage' ? String(tb.label || t('layout.stage')) : t('events.table') + ' ' + (tb.label == null ? '' : tb.label);
  const m = lyModal({
    title, body,
    actions: [
      btn(t('common.save'), { class: 'primary', icon: 'check', onClick: save }),
      btn(t('layout.remove'), { class: 'danger', icon: 'trash', onClick: remove })
    ],
    onClose: () => ctx.refresh()
  }, true);
  sync();
}

/* ---- assign an unseated guest to a table ---- */
function lyOpenAssign(ev, g, ctx) {
  const name = lyGuestName(g), need = +g.companions || 0;
  const tables = (ev.tables || []).filter(x => x.type !== 'stage');
  const choose = tb => {
    const free = (+tb.seats || 0) - tableOccupancy(ev, tb.id);
    if (free < need) toast(t('layout.fullCapacity'));
    g.tableId = tb.id;
    ctx.st.sel = tb.id;
    saveDB();
    m.close();
  };
  const listEl = tables.length
    ? h('div', { style: { border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' } },
      tables.map(tb => {
        const free = (+tb.seats || 0) - tableOccupancy(ev, tb.id);
        return h('div', { class: 'list-item', onClick: () => choose(tb) },
          icon(LY_TYPES.includes(tb.type) ? tb.type : 'round'),
          h('div', { class: 'grow ellipsis' }, t('events.table') + ' ' + (tb.label == null ? '' : tb.label)),
          h('span', { class: 'badge ' + (free >= need ? 'pill-pos' : 'pill-amber') }, Math.max(0, free) + ' ' + t('events.seatsFree')));
      }))
    : emptyState('table', t('layout.empty'));
  const body = h('div', null,
    h('div', { class: 'guest-row' },
      avatar(name),
      h('div', { class: 'grow' },
        h('div', { class: 'ellipsis' }, name),
        h('div', { class: 'ly-meta' }, icon('users'), t('layout.needSeats', { n: need })))),
    listEl);
  const m = lyModal({ title: t('layout.pickTable'), body, onClose: () => ctx.refresh() });
}

/* ---- the view ---- */
VIEWS.layout = function (root, params) {
  const ev = getEvent(params && params.id);
  if (!ev) { root.append(emptyState('question', t('events.empty'))); return; }
  lyInjectCss();
  setTitle(ev.name + ' · ' + t('layout.title'));
  ev.tables = ev.tables || [];
  ev.guests = ev.guests || [];

  const st = { sel: null, z: 1, panX: 0, panY: 0, base: lyBounds(ev) };
  let drag = null;

  const svg = lyEl('svg', { preserveAspectRatio: 'xMidYMid meet', 'aria-label': t('layout.title') });
  const layer = lyEl('g');
  svg.append(layer);
  const wrap = h('div', { class: 'layout-wrap' }, svg);
  const emptyHolder = h('div');
  const summaryEl = h('div', { class: 'muted', style: { marginTop: '8px' } });
  const unassignedHolder = h('div', { style: { marginTop: '12px' } });
  const findTable = id => ev.tables.find(x => x.id === id);

  function applyView() {
    const b = st.base, z = st.z;
    const w = b.w / z, hh = b.h / z;
    const mx = Math.max(0, (b.w - w) / 2), my = Math.max(0, (b.h - hh) / 2);
    st.panX = lyClamp(st.panX, -mx, mx);
    st.panY = lyClamp(st.panY, -my, my);
    const cx = b.x + b.w / 2 + st.panX, cy = b.y + b.h / 2 + st.panY;
    svg.setAttribute('viewBox', (cx - w / 2) + ' ' + (cy - hh / 2) + ' ' + w + ' ' + hh);
  }

  function drawTables() {
    layer.textContent = '';
    if (st.sel && !findTable(st.sel)) st.sel = null;
    lyOrder(ev, st.sel).forEach(tb => layer.append(lyTableG(ev, tb, { interactive: true, sel: tb.id === st.sel })));
  }

  function select(id) {
    st.sel = id;
    layer.querySelectorAll('.tbl').forEach(g => {
      const on = g.getAttribute('data-tid') === id;
      const shape = g.querySelector('.tbl-shape');
      if (shape) shape.classList.toggle('sel', on);
      if (on) layer.append(g);
    });
  }

  function refreshSummary() {
    const s = eventStats(ev);
    summaryEl.textContent = t('layout.summary', { seats: s.seats, seated: s.seated, free: Math.max(0, s.seats - s.seated) });
  }

  function refreshEmpty() {
    emptyHolder.textContent = '';
    if (!ev.tables.length) emptyHolder.append(emptyState('table', t('layout.empty')));
  }

  function refreshUnassigned() {
    unassignedHolder.textContent = '';
    const ids = new Set(ev.tables.map(x => x.id));
    const un = ev.guests.filter(g => (!g.tableId || !ids.has(g.tableId)) && g.status !== 'declined');
    const card = h('div', { class: 'card' },
      h('div', { class: 'row between' },
        h('h3', { style: { margin: '0' } }, t('layout.unassigned')),
        un.length ? h('span', { class: 'badge pill-amber' }, un.length) : null));
    if (!ev.guests.length) card.append(h('div', { class: 'muted', style: { marginTop: '8px' } }, t('events.noGuests')));
    else if (!un.length) card.append(h('div', { class: 'row muted', style: { marginTop: '8px' } }, icon('check'), t('layout.allSeated')));
    else {
      un.forEach(g => {
        const name = lyGuestName(g);
        card.append(h('div', { class: 'guest-row', style: { cursor: 'pointer' }, onClick: () => lyOpenAssign(ev, g, ctx) },
          avatar(name),
          h('div', { class: 'grow' },
            h('div', { class: 'ellipsis' }, name),
            h('div', { class: 'ly-meta' }, icon('users'), String(+g.companions || 0),
              h('span', { class: 'status-dot st-' + g.status, title: t('events.' + g.status) }))),
          icon('chevron', 'chev')));
      });
    }
    unassignedHolder.append(card);
  }

  function refresh() {
    st.base = lyBounds(ev);
    applyView();
    drawTables();
    refreshSummary();
    refreshEmpty();
    refreshUnassigned();
  }
  const ctx = { st, refresh, select };

  function addTable(type) {
    const tb = {
      id: uid(), type, x: 0, y: 0,
      seats: type === 'stage' ? 0 : 10,
      label: type === 'stage' ? t('layout.stage') : String(lyNextNumber(ev))
    };
    if (type === 'rect') { tb.w = 220; tb.h = 90; }
    if (type === 'stage') { tb.w = 300; tb.h = 50; }
    const p = lyFreeSpot(ev, tb, st.base);
    tb.x = p.x; tb.y = p.y;
    ev.tables.push(tb);
    saveDB();
    st.sel = tb.id;
    if (st.z > 1) {                       /* keep the new table in view when zoomed in */
      const nb = lyBounds(ev);
      st.panX = tb.x - (nb.x + nb.w / 2);
      st.panY = tb.y - (nb.y + nb.h / 2);
    }
    refresh();
  }

  function zoom(f) {
    let z = lyClamp(st.z * f, LY.MINZ, LY.MAXZ);
    if (Math.abs(z - 1) < 0.05) z = 1;
    st.z = z;
    if (z <= 1) { st.panX = 0; st.panY = 0; }
    applyView();
  }

  /* ---- pointer interaction (mouse + touch + pen) ---- */
  svg.addEventListener('pointerdown', e => {
    if (drag) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const tg = e.target && e.target.closest ? e.target.closest('[data-tid]') : null;
    const tb = tg ? findTable(tg.getAttribute('data-tid')) : null;
    drag = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, scale: lyScale(svg) };
    if (tb) {
      select(tb.id);
      Object.assign(drag, { mode: 'table', id: tb.id, ox: +tb.x || 0, oy: +tb.y || 0, p0: lyToSvg(svg, e.clientX, e.clientY), g: tg });
    } else {
      select(null);
      Object.assign(drag, { mode: 'pan', px: st.panX, py: st.panY });
    }
    try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    e.preventDefault();
  });

  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
      drag.moved = true;
    }
    if (drag.mode === 'table') {
      const tb = findTable(drag.id);
      if (!tb) return;
      const p = lyToSvg(svg, e.clientX, e.clientY), ext = lyExtent(tb), b = st.base;
      tb.x = lyClamp(lySnap(drag.ox + p.x - drag.p0.x), b.x + ext.hw, b.x + b.w - ext.hw);
      tb.y = lyClamp(lySnap(drag.oy + p.y - drag.p0.y), b.y + ext.hh, b.y + b.h - ext.hh);
      drag.g.setAttribute('transform', 'translate(' + tb.x + ' ' + tb.y + ')');
    } else if (st.z > 1) {
      st.panX = drag.px - (e.clientX - drag.sx) / drag.scale;
      st.panY = drag.py - (e.clientY - drag.sy) / drag.scale;
      applyView();
    }
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag;
    drag = null;
    try { svg.releasePointerCapture(d.pid); } catch (_) { /* ignore */ }
    if (d.mode !== 'table') return;
    if (d.moved) { saveDB(); refreshSummary(); }
    else if (!cancelled) {
      const tb = findTable(d.id);
      if (tb) lyOpenTableEditor(ev, tb, ctx);
    }
  }
  svg.addEventListener('pointerup', e => endDrag(e, false));
  svg.addEventListener('pointercancel', e => endDrag(e, true));

  /* ---- toolbar ---- */
  const addBtn = type => {
    const b = btn('+ ' + t('layout.' + type), { icon: type, class: 'sm', onClick: () => addTable(type) });
    b.title = t('layout.addTable') + ': ' + t('layout.' + type);
    return b;
  };
  const zoomBtn = (name, label, f) => {
    const b = btn('', { icon: name, class: 'sm', onClick: () => zoom(f) });
    b.setAttribute('aria-label', label);
    b.title = label;
    return b;
  };

  root.append(
    h('div', { class: 'layout-tools' }, LY_TYPES.map(addBtn)),
    h('div', { class: 'layout-tools' },
      zoomBtn('zoomout', t('layout.zoomOut'), 1 / LY.ZSTEP),
      zoomBtn('zoomin', t('layout.zoomIn'), LY.ZSTEP),
      btn(ev.name || t('events.title'), { icon: 'events', class: 'sm', onClick: () => go('event', { id: ev.id }) })),
    h('div', { class: 'muted', style: { marginBottom: '8px' } }, t('layout.hint')),
    emptyHolder,
    wrap,
    h('div', { class: 'legend' },
      h('span', null, h('i', { style: { background: 'var(--card)' } }), t('layout.free')),
      h('span', null, h('i', { style: { background: '#1f6feb', borderColor: '#1f6feb' } }), t('layout.taken')),
      h('span', null, h('i', { style: { background: '#15803d', borderColor: '#15803d' } }), t('layout.arrived'))),
    summaryEl,
    unassignedHolder);

  refresh();
};
