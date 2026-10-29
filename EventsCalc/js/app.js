/* Router / shell. Views register themselves: VIEWS[name] = (root, params) => void */
/* VIEWS registry lives in ui.js (loaded first) */
const TAB_VIEWS = ['home', 'contacts', 'events', 'settings'];
let HISTORY = [];            // [{name, params}]
let CURRENT = null;

function setTitle(text) { document.getElementById('title').textContent = text || t('app'); }

function renderCurrent() {
  if (!CURRENT) return;
  const root = document.getElementById('view');
  root.innerHTML = '';
  window.scrollTo(0, 0);
  const fn = VIEWS[CURRENT.name];
  setTitle(t('app'));
  if (fn) fn(root, CURRENT.params || {});
  else root.append(emptyState('question', CURRENT.name));
  const isTab = TAB_VIEWS.includes(CURRENT.name);
  document.getElementById('btn-back').hidden = isTab;
  document.querySelectorAll('#tabbar button').forEach(b => {
    const active = b.dataset.view === CURRENT.name || (!isTab && b.dataset.view === (CURRENT.tab || 'home'));
    b.classList.toggle('active', active);
  });
}

/* go(name, params): navigate forward. Tab views reset the history stack. */
function go(name, params, tab) {
  if (TAB_VIEWS.includes(name)) { HISTORY = []; CURRENT = { name, params }; }
  else {
    if (CURRENT) HISTORY.push(CURRENT);
    CURRENT = { name, params, tab: tab || (CURRENT && (CURRENT.tab || (TAB_VIEWS.includes(CURRENT.name) ? CURRENT.name : 'home'))) };
  }
  renderCurrent();
}
function back() {
  if (HISTORY.length) { CURRENT = HISTORY.pop(); renderCurrent(); }
  else go('home');
}
/* rerender(): redraw the current view after data changes */
function rerender() { renderCurrent(); }

document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  setLang(LANG);
  document.getElementById('btn-back').addEventListener('click', back);
  document.getElementById('btn-lang').addEventListener('click', () => { setLang(LANG === 'he' ? 'en' : 'he'); rerender(); });
  document.querySelectorAll('#tabbar button').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
  if (window.Auth) Auth.init();
  if (window.Sync) Sync.init();
  go('home');
});
