/* Tiny DOM helpers, modal, toast */
/* View registry: views register as VIEWS[name] = (root, params) => void; app.js routes to them */
const VIEWS = {};
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list' && k !== 'form') { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
function icon(name, cls) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (cls) s.setAttribute('class', cls);
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', '#i-' + name);
  s.appendChild(u);
  return s;
}
function iconBtn(name, onClick, label) {
  return h('button', { class: 'icon-btn', onClick, 'aria-label': label || name, title: label || '' }, icon(name));
}
function btn(label, opts = {}) {
  return h('button', { class: 'btn ' + (opts.class || ''), onClick: opts.onClick, type: opts.type || 'button', disabled: opts.disabled },
    opts.icon ? icon(opts.icon) : null, label ? h('span', null, label) : null);
}
function field(labelText, input, iconName) {
  return h('div', { class: 'field' }, h('label', null, iconName ? icon(iconName) : null, labelText), input);
}
function input(attrs) { return h('input', Object.assign({ type: 'text' }, attrs)); }
function select(options, value, attrs) {
  const s = h('select', attrs);
  options.forEach(([v, label]) => s.append(h('option', { value: v, selected: v === value }, label)));
  return s;
}
function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'seg' });
  const render = () => {
    wrap.innerHTML = '';
    options.forEach(o => wrap.append(h('button', {
      type: 'button', class: o.value === value ? 'on' : '',
      onClick: () => { value = o.value; onChange(value); render(); }
    }, o.icon ? icon(o.icon) : null, h('span', null, o.label))));
  };
  render();
  wrap.getValue = () => value;
  return wrap;
}
function chips(options, value, onChange) {
  const wrap = h('div', { class: 'chips' });
  const render = () => {
    wrap.innerHTML = '';
    options.forEach(o => wrap.append(h('button', {
      type: 'button', class: 'chip ' + (o.value === value ? 'on' : ''),
      onClick: () => { value = o.value; onChange(value); render(); }
    }, o.icon ? icon(o.icon) : null, o.label)));
  };
  render();
  return wrap;
}

const AV_COLORS = ['#1f6feb', '#d9480f', '#2b8a3e', '#862e9c', '#c92a2a', '#0b7285', '#e67700', '#5f3dc4'];
function avatar(name) {
  let s = 0; for (const ch of name || '') s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const parts = (name || '?').trim().split(/\s+/);
  const ini = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2);
  return h('div', { class: 'avatar', style: { background: AV_COLORS[s % AV_COLORS.length] } }, ini);
}
function moneyEl(n, signed) {
  const v = Number(n) || 0;
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero';
  const txt = (signed && v > 0 ? '+' : '') + fmtMoney(v);
  return h('span', { class: 'amount ' + cls }, txt);
}
function balancePill(net) {
  const v = Number(net) || 0;
  const cls = v > 0 ? 'pill-pos' : v < 0 ? 'pill-neg' : '';
  /* net = received - gave: positive means I received more, so I owe them back */
  const label = v > 0 ? t('home.iOwe') : v < 0 ? t('home.owedToMe') : t('home.even');
  return h('span', { class: 'badge ' + cls }, label, ' ', fmtMoney(Math.abs(v)));
}
function emptyState(iconName, text) {
  return h('div', { class: 'empty' }, icon(iconName), h('div', null, text));
}

/* ---- modal ---- */
function openModal({ title, body, actions, onClose }) {
  const root = document.getElementById('modal-root');
  const close = () => { overlay.remove(); onClose && onClose(); };
  const sheet = h('div', { class: 'sheet', onClick: e => e.stopPropagation() },
    h('div', { class: 'sheet-head' }, h('h2', null, title), iconBtn('x', close, t('common.close'))),
    body,
    actions ? h('div', { class: 'actions' }, actions) : null);
  const overlay = h('div', { class: 'overlay', onClick: close }, sheet);
  root.append(overlay);
  const first = sheet.querySelector('input,select,textarea');
  if (first && window.innerWidth > 600) setTimeout(() => first.focus(), 50);
  return { close, sheet };
}
function confirmDialog(text, onYes) {
  const m = openModal({
    title: t('common.delete'),
    body: h('p', null, text || t('common.confirmDelete')),
    actions: [
      btn(t('common.cancel'), { onClick: () => m.close() }),
      btn(t('common.delete'), { class: 'danger', icon: 'trash', onClick: () => { m.close(); onYes(); } })
    ]
  });
}
function toast(msg) {
  const root = document.getElementById('toast');
  root.innerHTML = '';
  const s = h('span', null, msg);
  root.append(s);
  requestAnimationFrame(() => s.classList.add('show'));
  setTimeout(() => s.classList.remove('show'), 1800);
}
function copyText(txt) {
  if (navigator.clipboard) return navigator.clipboard.writeText(txt).then(() => toast(t('common.copied')));
  const ta = h('textarea', { value: txt }); document.body.append(ta); ta.select();
  document.execCommand('copy'); ta.remove(); toast(t('common.copied'));
}
function waLink(phone, text) {
  let p = normPhone(phone);
  if (p.startsWith('0')) p = '972' + p.slice(1);
  p = p.replace('+', '');
  return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
}
function smsLink(phone, text) { return 'sms:' + normPhone(phone) + '?body=' + encodeURIComponent(text); }
