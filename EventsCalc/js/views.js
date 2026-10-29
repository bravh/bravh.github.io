/* views.js - Home, Contacts, Contact detail, Settings + shared helpers
   (openContactForm, pickContact, openCategoryManager, methodIcon, importPhoneContacts).
   Internal helpers are prefixed "vw" to avoid global name clashes with other files. */

/* ------------------------------------------------------------------ */
/* Extra i18n strings (only filled in when the key does not exist yet) */
/* ------------------------------------------------------------------ */
(function vwExtendI18n() {
  const extra = {
    he: {
      contacts: {
        notFound: 'איש הקשר לא נמצא',
        deleteConfirm: 'למחוק את איש הקשר? הוא יוסר גם מכל רשימות המוזמנים.'
      },
      cat: { deleteConfirm: 'למחוק את הקטגוריה? אנשי הקשר שבה יועברו ל"אחר".' },
      settings: {
        demoConfirm: 'טעינת נתוני הדוגמה תחליף את כל הנתונים הקיימים. להמשיך?',
        clearConfirm: 'למחוק את כל הנתונים? פעולה זו אינה הפיכה.',
        demoLoaded: 'נתוני הדוגמה נטענו'
      }
    },
    en: {
      contacts: {
        notFound: 'Contact not found',
        deleteConfirm: 'Delete this contact? They will also be removed from all guest lists.'
      },
      cat: { deleteConfirm: 'Delete this category? Its contacts will move to "Other".' },
      settings: {
        demoConfirm: 'Loading demo data will replace all existing data. Continue?',
        clearConfirm: 'Delete all data? This cannot be undone.',
        demoLoaded: 'Demo data loaded'
      }
    }
  };
  const merge = (dst, src) => {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object') merge(dst[k] = dst[k] || {}, src[k]);
      else if (dst[k] === undefined) dst[k] = src[k];
    }
  };
  merge(I18N.he, extra.he);
  merge(I18N.en, extra.en);
})();

/* ------------------------------------------------------------------ */
/* One-time CSS for the few things style.css does not cover           */
/* ------------------------------------------------------------------ */
(function vwInjectCss() {
  if (document.getElementById('vw-style')) return;
  const s = document.createElement('style');
  s.id = 'vw-style';
  s.textContent = [
    '.vw-ic{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary)}',
    '.vw-quick{width:100%;flex-direction:column;min-height:88px;padding:10px 6px;text-align:center;line-height:1.2;font-size:13px;gap:6px}',
    '.vw-quick svg{width:30px;height:30px}',
    '.vw-meta{display:flex;align-items:center;flex-wrap:wrap;gap:2px 12px;color:var(--muted);font-size:13px}',
    '.vw-meta>span{display:inline-flex;align-items:center;gap:4px}',
    '.vw-meta svg{width:15px;height:15px}',
    '.vw-stack{display:flex;flex-direction:column;gap:8px}',
    '.vw-bold{font-weight:700}',
    '.vw-sec{display:flex;align-items:center;gap:8px;margin:0 0 10px}',
    '.vw-sec svg{width:20px;height:20px;color:var(--primary)}',
    'a.btn{text-decoration:none;color:var(--text)}',
    '.stat .v{font-size:clamp(15px,4.6vw,20px);text-align:center;overflow-wrap:anywhere}',
    '.stat .badge{white-space:normal;text-align:center;justify-content:center;line-height:1.25}',
    '.stat.vw-click{cursor:pointer}'
  ].join('\n');
  document.head.append(s);
})();

/* ------------------------------------------------------------------ */
/* Small shared helpers                                               */
/* ------------------------------------------------------------------ */
function methodIcon(method) {
  return ({ cash: 'cash', cheque: 'cheque', transfer: 'transfer', gift: 'gift' })[method] || 'money';
}

function vwKindLabel(kind) {
  if (!kind) return '';
  const key = 'events.kinds.' + kind;
  const s = t(key);
  return s === key ? '' : s;
}

function vwMethodLabel(method) {
  return ['cash', 'cheque', 'transfer', 'gift'].includes(method) ? t('events.' + method) : '';
}

function vwWaHref(phone) {
  let p = normPhone(phone).replace(/^\+/, '');
  if (p.startsWith('00')) p = p.slice(2);
  else if (p.startsWith('0')) p = '972' + p.slice(1);
  return 'https://wa.me/' + p;
}

function vwMatchContact(c, q) {
  q = (q || '').trim().toLowerCase();
  if (!q) return true;
  if ((c.name || '').toLowerCase().includes(q)) return true;
  if ((c.phone || '').toLowerCase().includes(q)) return true;
  const nq = normPhone(q);
  return !!nq && normPhone(c.phone).includes(nq);
}

/* Clickable row (keyboard accessible). cls: 'list-item' | 'tl' */
function vwRow(cls, children, onClick) {
  return h('div', {
    class: cls, role: 'button', tabindex: 0, onClick,
    onKeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } }
  }, ...children);
}

function vwSearchBox(placeholder, value, onInput) {
  const inp = h('input', {
    type: 'search', placeholder, value: value || '', autocomplete: 'off',
    onInput: e => onInput(e.target.value)
  });
  return { el: h('div', { class: 'search' }, icon('search'), inp), input: inp };
}

function vwIconBox(name) { return h('div', { class: 'vw-ic' }, icon(name)); }

function vwPhoneText(phone) { return h('bdi', { dir: 'ltr' }, phone); }

function vwStat(o) {
  const ic = icon(o.icon);
  if (o.color) ic.style.color = o.color;
  const el = h('div', { class: 'stat' + (o.onClick ? ' vw-click' : ''), role: o.onClick ? 'button' : null, onClick: o.onClick },
    ic,
    h('div', { class: 'v ' + (o.cls || '') }, o.value),
    h('div', { class: 'l' }, o.label));
  return el;
}

function vwEventRow(ev) {
  const sub = [fmtDate(ev.date), ev.location].filter(Boolean).join(' · ');
  return vwRow('list-item', [
    vwIconBox('events'),
    h('div', { class: 'grow' },
      h('div', { class: 'vw-bold ellipsis' }, ev.name),
      sub ? h('div', { class: 'muted ellipsis' }, sub) : null),
    icon('chevron', 'chev')
  ], () => go('event', { id: ev.id }));
}

/* Contact row used by home search (category badge) and contacts list (muted line) */
function vwContactRow(c, subNode) {
  const bal = contactBalance(c.id);
  return vwRow('list-item', [
    avatar(c.name),
    h('div', { class: 'grow' },
      h('div', { class: 'vw-bold ellipsis' }, c.name),
      subNode),
    balancePill(bal.net),
    icon('chevron', 'chev')
  ], () => go('contact', { id: c.id }));
}

/* Last ledger entries across all contacts */
function vwRecentEntries(limit) {
  const list = [];
  for (const ev of DB.events) {
    if (ev.mine) {
      for (const g of ev.guests || []) {
        const a = +g.amount || 0;
        if (a > 0) list.push({ dir: 'in', contactId: g.contactId, ev, amount: a });
      }
    } else {
      const a = +(ev.gift && ev.gift.amount) || 0;
      if (a > 0) list.push({ dir: 'out', contactId: ev.hostId, ev, amount: a });
    }
  }
  list.sort((a, b) => (b.ev.date || '').localeCompare(a.ev.date || '') || (b.ev.created || 0) - (a.ev.created || 0));
  return list.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* HOME                                                               */
/* ------------------------------------------------------------------ */
function vwDashboard() {
  const tt = totals();
  const wrap = h('div');

  wrap.append(
    h('div', { class: 'grid3 mb' },
      vwStat({ icon: 'in', cls: 'pos', value: fmtMoney(tt.received), label: t('home.received'), color: 'var(--green)' }),
      vwStat({ icon: 'out', cls: 'neg', value: fmtMoney(tt.gave), label: t('home.gave'), color: 'var(--red)' }),
      vwStat({ icon: 'money', value: balancePill(tt.net), label: t('home.balance') })),
    h('div', { class: 'grid2 mb' },
      vwStat({ icon: 'events', value: String(tt.events), label: t('home.events'), onClick: () => go('events') }),
      vwStat({ icon: 'contacts', value: String(tt.contacts), label: t('home.contacts'), onClick: () => go('contacts') })));

  /* quick actions */
  const qBtn = (iconName, label, color, onClick) => {
    const b = btn(label, { class: 'vw-quick', icon: iconName, onClick });
    b.querySelector('svg').style.color = color;
    return b;
  };
  wrap.append(
    h('h2', null, t('home.quick')),
    h('div', { class: 'grid3 mb' },
      qBtn('out', t('home.addGave'), 'var(--red)', () => openEventForm({ mine: false, onSaved: () => rerender() })),
      qBtn('in', t('home.addReceived'), 'var(--green)', () => openEventForm({ mine: true, onSaved: () => rerender() })),
      qBtn('plus', t('home.addContact'), 'var(--primary)', () => openContactForm(null, () => rerender()))));

  /* upcoming events */
  const today = todayISO();
  const upcoming = DB.events
    .filter(e => (e.date || '') >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  if (upcoming.length) {
    wrap.append(
      h('h2', null, t('home.upcoming')),
      h('div', { class: 'card pad0' }, upcoming.map(vwEventRow)));
  }

  /* recent activity */
  const recent = vwRecentEntries(6);
  if (recent.length) {
    wrap.append(
      h('h2', null, t('home.recent')),
      h('div', { class: 'card' }, recent.map(e => {
        const c = e.contactId ? getContact(e.contactId) : null;
        return vwRow('tl', [
          h('div', { class: 'ic ' + e.dir }, icon(e.dir)),
          h('div', { class: 'grow' },
            h('div', { class: 'vw-bold ellipsis' }, c ? c.name : e.ev.name),
            h('div', { class: 'muted small ellipsis' }, c ? e.ev.name : fmtDate(e.ev.date))),
          moneyEl(e.dir === 'in' ? e.amount : -e.amount, true)
        ], () => (c ? go('contact', { id: c.id }) : go('event', { id: e.ev.id })));
      })));
  }
  return wrap;
}

function vwSearchResults(q) {
  const res = searchAll(q);
  const wrap = h('div');
  if (!res.contacts.length && !res.events.length) {
    wrap.append(emptyState('search', t('home.noResults')));
    return wrap;
  }
  if (res.contacts.length) {
    wrap.append(
      h('h2', null, t('nav.contacts')),
      h('div', { class: 'card pad0' }, res.contacts.map(c =>
        vwContactRow(c, h('div', null, h('span', { class: 'badge cat' }, icon('tag'), catLabel(c.cat)))))));
  }
  if (res.events.length) {
    wrap.append(
      h('h2', null, t('nav.events')),
      h('div', { class: 'card pad0' }, res.events.map(vwEventRow)));
  }
  return wrap;
}

function vwHome(root) {
  setTitle(t('app'));
  let q = '';
  const body = h('div');
  const sb = vwSearchBox(t('home.searchPh'), '', v => { q = v; renderBody(); });
  function renderBody() {
    body.replaceChildren(q.trim() ? vwSearchResults(q) : vwDashboard());
  }
  root.append(sb.el, body);
  renderBody();
}

/* ------------------------------------------------------------------ */
/* CONTACTS LIST                                                      */
/* ------------------------------------------------------------------ */
async function importPhoneContacts() {
  if (!(navigator.contacts && navigator.contacts.select)) { toast(t('contacts.importNA')); return; }
  let picked;
  try {
    picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
  } catch (e) { return; } /* cancelled / denied */
  let n = 0;
  for (const r of picked || []) {
    const phone = ((r.tel && r.tel[0]) || '').trim();
    const name = ((r.name && r.name[0]) || '').trim() || phone;
    if (!name) continue;
    if (phone && findContactByPhone(phone)) continue;
    upsertContact({ name, phone, cat: 'other', notes: '' });
    n++;
  }
  toast(t('contacts.imported', { n }));
  rerender();
}

function vwContacts(root) {
  setTitle(t('contacts.title'));
  let q = '', cat = 'all', sort = 'name';
  const listWrap = h('div');

  const sb = vwSearchBox(t('common.search'), '', v => { q = v; renderList(); });
  const catChips = chips(
    [{ value: 'all', label: t('common.all'), icon: 'tag' }]
      .concat(DB.categories.map(c => ({ value: c.id, label: catLabel(c.id), icon: 'tag' }))),
    cat, v => { cat = v; renderList(); });
  const sortSeg = segmented([
    { value: 'name', label: t('contacts.sortName') },
    { value: 'balance', label: t('contacts.sortBalance') }
  ], sort, v => { sort = v; renderList(); });
  sortSeg.style.marginBottom = '12px';

  const fab = h('button', {
    class: 'fab', type: 'button', 'aria-label': t('contacts.new'), title: t('contacts.new'),
    onClick: () => openContactForm(null, () => rerender())
  }, icon('plus'));

  function renderList() {
    if (!DB.contacts.length) {
      listWrap.replaceChildren(emptyState('contacts', t('contacts.empty')));
      return;
    }
    const rows = DB.contacts
      .filter(c => (cat === 'all' || (c.cat || 'other') === cat) && vwMatchContact(c, q))
      .map(c => ({ c, net: contactBalance(c.id).net }));
    if (sort === 'balance') {
      rows.sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.c.name.localeCompare(b.c.name, LANG));
    } else {
      rows.sort((a, b) => a.c.name.localeCompare(b.c.name, LANG));
    }
    if (!rows.length) {
      listWrap.replaceChildren(emptyState('search', t('home.noResults')));
      return;
    }
    listWrap.replaceChildren(h('div', { class: 'card pad0' }, rows.map(({ c }) => {
      const sub = h('div', { class: 'muted ellipsis' },
        catLabel(c.cat),
        c.phone ? ' · ' : null,
        c.phone ? vwPhoneText(c.phone) : null);
      return vwContactRow(c, sub);
    })));
  }

  root.append(
    sb.el, catChips, sortSeg, listWrap,
    btn(t('contacts.import'), { icon: 'import', class: 'block', onClick: importPhoneContacts }),
    h('div', { style: { height: '72px' } }),
    fab);
  renderList();
}

/* ------------------------------------------------------------------ */
/* CONTACT DETAIL                                                     */
/* ------------------------------------------------------------------ */
function vwContact(root, params) {
  const c = getContact(params && params.id);
  if (!c) {
    setTitle(t('contacts.title'));
    root.append(emptyState('contacts', t('contacts.notFound')));
    return;
  }
  setTitle(c.name);
  const bal = contactBalance(c.id);

  const av = avatar(c.name);
  Object.assign(av.style, { width: '64px', height: '64px', fontSize: '22px' });
  const del = iconBtn('trash', () => {
    confirmDialog(t('contacts.deleteConfirm'), () => {
      deleteContact(c.id);
      toast(t('common.deleted'));
      go('contacts');
    });
  }, t('common.delete'));
  del.style.color = 'var(--red)';

  const phoneIc = icon('phone'); phoneIc.style.color = 'var(--primary)';
  const waIc = icon('whatsapp'); waIc.style.color = 'var(--green)';

  root.append(
    h('div', { class: 'card' },
      h('div', { class: 'row', style: { alignItems: 'flex-start' } },
        av,
        h('div', { class: 'grow' },
          h('div', { style: { fontSize: '20px', fontWeight: '800', overflowWrap: 'anywhere' } }, c.name),
          h('div', { style: { marginTop: '4px' } },
            h('span', { class: 'badge cat' }, icon('tag'), catLabel(c.cat)))),
        iconBtn('edit', () => openContactForm(c, () => rerender()), t('common.edit')),
        del),
      c.phone ? h('div', { class: 'row wrap mt' },
        h('a', { class: 'btn', href: 'tel:' + normPhone(c.phone) }, phoneIc, vwPhoneText(c.phone)),
        h('a', { class: 'btn', href: vwWaHref(c.phone), target: '_blank', rel: 'noopener' }, waIc, 'WhatsApp')) : null,
      c.notes ? h('div', { class: 'muted mt', style: { whiteSpace: 'pre-wrap' } }, c.notes) : null),

    h('div', { class: 'card' },
      h('div', { class: 'grid3' },
        vwStat({ icon: 'in', cls: 'pos', value: fmtMoney(bal.received), label: t('contacts.gaveMe'), color: 'var(--green)' }),
        vwStat({ icon: 'out', cls: 'neg', value: fmtMoney(bal.gave), label: t('contacts.iGave'), color: 'var(--red)' }),
        vwStat({ icon: 'money', value: balancePill(bal.net), label: t('contacts.net') }))),

    h('h2', null, t('contacts.history')));

  const hist = contactHistory(c.id);
  if (!hist.length) {
    root.append(emptyState('events', t('contacts.noHistory')));
    return;
  }
  root.append(h('div', { class: 'card' }, hist.map(e => {
    const ev = e.event;
    const kind = vwKindLabel(ev.kind);
    const meta = [];
    if (e.companions > 0) meta.push(h('span', null, icon('users'), '×' + e.companions));
    const ml = vwMethodLabel(e.method);
    if (ml) meta.push(h('span', null, icon(methodIcon(e.method)), ml));
    const amount = e.dir === 'in' ? e.amount : (e.amount ? -e.amount : 0);
    return vwRow('tl', [
      h('div', { class: 'ic ' + e.dir }, icon(e.dir)),
      h('div', { class: 'grow' },
        h('div', { class: 'vw-bold ellipsis' }, ev.name),
        h('div', { class: 'muted small' }, [fmtDate(ev.date), kind].filter(Boolean).join(' · ')),
        meta.length ? h('div', { class: 'vw-meta' }, meta) : null),
      moneyEl(amount, true)
    ], () => go('event', { id: ev.id }));
  })));
}

/* ------------------------------------------------------------------ */
/* SETTINGS                                                           */
/* ------------------------------------------------------------------ */
function vwDownloadBackup() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: 'event-ledger-backup-' + todayISO() + '.json' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function vwSettings(root) {
  setTitle(t('settings.title'));
  DB.settings = DB.settings || {};

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        importJSON(String(r.result));
        loadDB(); /* re-normalise missing fields from the saved copy */
        toast(t('settings.imported'));
        rerender();
      } catch (err) { toast(t('settings.badFile')); }
    };
    r.onerror = () => toast(t('settings.badFile'));
    r.readAsText(f);
    e.target.value = '';
  }
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onChange: onFile });

  const nameField = (key, label) => {
    const inp = input({
      value: DB.settings[key] || '', autocomplete: 'off',
      onInput: e => { DB.settings[key] = e.target.value; saveDB(); },
      onChange: e => { const v = e.target.value.trim(); e.target.value = v; DB.settings[key] = v; saveDB(); }
    });
    return field(label, inp, 'users');
  };

  const clearIc = btn(t('settings.clear'), {
    icon: 'trash', class: 'danger block',
    onClick: () => confirmDialog(t('settings.clearConfirm'), () => {
      clearAll();
      toast(t('settings.cleared'));
      rerender();
    })
  });

  root.append(
    h('div', { class: 'card' },
      h('h3', { class: 'vw-sec' }, icon('lang'), t('settings.language')),
      segmented([
        { value: 'he', label: t('settings.he') },
        { value: 'en', label: t('settings.en') }
      ], LANG, v => { setLang(v); rerender(); })),

    h('div', { class: 'card' },
      nameField('myName', t('settings.myName')),
      nameField('partnerName', t('settings.partnerName'))),

    h('div', { class: 'card' },
      h('h3', { class: 'vw-sec' }, icon('tag'), t('settings.categories')),
      btn(t('cat.manage'), { icon: 'tag', class: 'block', onClick: () => openCategoryManager(() => rerender()) })),

    h('div', { class: 'card' },
      h('h3', { class: 'vw-sec' }, icon('export'), t('settings.data')),
      h('div', { class: 'vw-stack' },
        btn(t('settings.export'), { icon: 'export', class: 'block', onClick: vwDownloadBackup }),
        btn(t('settings.import'), { icon: 'import', class: 'block', onClick: () => fileIn.click() }),
        fileIn,
        btn(t('settings.demo'), {
          icon: 'star', class: 'block',
          onClick: () => confirmDialog(t('settings.demoConfirm'), () => {
            loadDemo();
            toast(t('settings.demoLoaded'));
            rerender();
          })
        }),
        clearIc)),

    h('div', { class: 'card' },
      h('h3', { class: 'vw-sec' }, icon('question'), t('settings.about')),
      h('div', { class: 'muted' }, t('settings.local')),
      h('div', { class: 'muted mt' }, t('settings.version') + ' 0.1')));
}

/* ------------------------------------------------------------------ */
/* SHARED MODALS                                                      */
/* ------------------------------------------------------------------ */
function openContactForm(contact, onSaved) {
  const isEdit = !!contact;
  const NEW = '__new__';

  const nameIn = input({ value: contact ? (contact.name || '') : '', autocomplete: 'off' });
  const errEl = h('div', { class: 'small neg', hidden: true }, t('common.required'));
  nameIn.addEventListener('input', () => { errEl.hidden = true; });
  const nameField = field(t('common.name') + ' *', nameIn, 'contacts');
  nameField.append(errEl);

  const phoneIn = input({ type: 'tel', value: contact ? (contact.phone || '') : '', inputmode: 'tel', autocomplete: 'off' });

  const catSel = select(
    DB.categories.map(c => [c.id, catLabel(c.id)]).concat([[NEW, '+ ' + t('cat.newCat')]]),
    contact ? (contact.cat || 'other') : 'other',
    { onChange: () => {
      const isNew = catSel.value === NEW;
      newCatRow.hidden = !isNew;
      if (isNew) newCatIn.focus();
    } });
  const newOpt = catSel.lastElementChild;

  const newCatIn = input({ placeholder: t('cat.newCat'), autocomplete: 'off' });
  newCatIn.addEventListener('input', () => { newCatIn.style.borderColor = ''; });
  newCatIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitNewCat(); } });
  const newCatRow = h('div', { class: 'row', hidden: true, style: { marginTop: '-4px', marginBottom: '12px' } },
    h('div', { class: 'field grow', style: { margin: '0' } }, newCatIn),
    btn(t('common.add'), { icon: 'check', class: 'primary', onClick: () => commitNewCat() }));

  /* returns the chosen/created category id, or null when the input is empty */
  function commitNewCat() {
    const label = newCatIn.value.trim();
    if (!label) { newCatIn.style.borderColor = 'var(--red)'; newCatIn.focus(); return null; }
    const lower = label.toLowerCase();
    let cat = DB.categories.find(c => catLabel(c.id).toLowerCase() === lower);
    if (!cat) {
      cat = addCategory(label);
      catSel.insertBefore(h('option', { value: cat.id }, cat.label), newOpt);
    }
    catSel.value = cat.id;
    newCatIn.value = '';
    newCatRow.hidden = true;
    return cat.id;
  }

  const notesIn = h('textarea', { value: contact ? (contact.notes || '') : '', rows: 3 });

  function save() {
    const name = nameIn.value.trim();
    if (!name) { errEl.hidden = false; nameIn.focus(); return; }
    let cat = catSel.value;
    if (cat === NEW) { cat = commitNewCat(); if (!cat) return; }
    const data = { name, phone: phoneIn.value.trim(), cat, notes: notesIn.value.trim() };
    if (isEdit) data.id = contact.id;
    const saved = upsertContact(data);
    const full = getContact(saved.id) || saved;
    m.close();
    toast(t('common.saved'));
    if (onSaved) onSaved(full);
  }
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });

  const m = openModal({
    title: isEdit ? t('contacts.edit') : t('contacts.new'),
    body: h('div', null,
      nameField,
      field(t('common.phone'), phoneIn, 'phone'),
      field(t('contacts.category'), catSel, 'tag'),
      newCatRow,
      field(t('common.notes'), notesIn, 'edit')),
    actions: [
      btn(t('common.cancel'), { onClick: () => m.close() }),
      btn(t('common.save'), { class: 'primary', icon: 'check', onClick: save })
    ]
  });
  return m;
}

function pickContact(opts) {
  opts = opts || {};
  const exclude = new Set(opts.exclude || []);
  let q = '';

  const listEl = h('div', { class: 'card pad0', style: { maxHeight: '48vh', overflow: 'auto', marginBottom: '0' } });
  const sb = vwSearchBox(t('common.search'), '', v => { q = v; renderList(); });
  const newBtn = btn(t('contacts.new'), {
    icon: 'plus', class: 'block',
    onClick: () => openContactForm(null, c => { m.close(); if (opts.onPick) opts.onPick(c); })
  });
  newBtn.style.marginBottom = '12px';

  const m = openModal({ title: t('events.pickContact'), body: h('div', null, newBtn, sb.el, listEl) });

  function renderList() {
    const items = DB.contacts
      .filter(c => !exclude.has(c.id) && vwMatchContact(c, q))
      .sort((a, b) => a.name.localeCompare(b.name, LANG));
    if (!items.length) {
      listEl.replaceChildren(emptyState(q.trim() ? 'search' : 'contacts', q.trim() ? t('home.noResults') : t('contacts.empty')));
      return;
    }
    listEl.replaceChildren(...items.map(c => vwRow('list-item', [
      avatar(c.name),
      h('div', { class: 'grow' },
        h('div', { class: 'vw-bold ellipsis' }, c.name),
        h('div', { class: 'muted ellipsis' },
          catLabel(c.cat),
          c.phone ? ' · ' : null,
          c.phone ? vwPhoneText(c.phone) : null)),
      icon('chevron', 'chev')
    ], () => { m.close(); if (opts.onPick) opts.onPick(c); })));
  }
  renderList();
  return m;
}

function openCategoryManager(onChange) {
  const listEl = h('div', { class: 'card pad0' });
  const notify = () => { if (onChange) onChange(); };

  const nameIn = input({ placeholder: t('cat.newCat'), autocomplete: 'off' });
  nameIn.addEventListener('input', () => { nameIn.style.borderColor = ''; });
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });

  function add() {
    const label = nameIn.value.trim();
    if (!label) { nameIn.style.borderColor = 'var(--red)'; nameIn.focus(); return; }
    const lower = label.toLowerCase();
    if (!DB.categories.some(c => catLabel(c.id).toLowerCase() === lower)) {
      addCategory(label);
      notify();
    }
    nameIn.value = '';
    renderList();
  }

  function renderList() {
    listEl.replaceChildren(...DB.categories.map(cat => {
      const n = DB.contacts.filter(c => c.cat === cat.id).length;
      const trash = cat.custom ? iconBtn('trash', () => {
        confirmDialog(t('cat.deleteConfirm'), () => {
          removeCategory(cat.id);
          renderList();
          notify();
        });
      }, t('common.delete')) : null;
      if (trash) trash.style.color = 'var(--red)';
      return h('div', { class: 'list-item', style: { cursor: 'default' } },
        vwIconBox('tag'),
        h('div', { class: 'grow vw-bold ellipsis' }, catLabel(cat.id)),
        h('span', { class: 'badge' }, icon('contacts'), String(n)),
        trash);
    }));
  }

  const m = openModal({
    title: t('cat.manage'),
    body: h('div', null,
      listEl,
      h('div', { class: 'row' },
        h('div', { class: 'field grow', style: { margin: '0' } }, nameIn),
        btn(t('common.add'), { icon: 'plus', class: 'primary', onClick: add }))),
    actions: [btn(t('common.done'), { class: 'primary', icon: 'check', onClick: () => m.close() })]
  });
  renderList();
  return m;
}

/* ------------------------------------------------------------------ */
/* Register views. app.js declares `const VIEWS` AFTER this file loads, */
/* so if VIEWS does not exist yet, register on DOMContentLoaded (this   */
/* listener is added before app.js' own go('home') listener).          */
/* ------------------------------------------------------------------ */
function vwRegisterViews() {
  VIEWS.home = vwHome;
  VIEWS.contacts = vwContacts;
  VIEWS.contact = vwContact;
  VIEWS.settings = vwSettings;
}
if (typeof VIEWS !== 'undefined') vwRegisterViews();
else document.addEventListener('DOMContentLoaded', vwRegisterViews);
