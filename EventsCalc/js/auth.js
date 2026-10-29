/* Google sign-in (Google Identity Services, OAuth 2.0 token flow, browser only, no backend).
   Storage: localStorage 'el.google.clientId' / 'el.google.profile'; sessionStorage 'el.google.token'
   (the access token never touches localStorage and is never logged).
   Rejections are Errors with .code in: not_configured, gis_unavailable, popup_closed, access_denied,
   interaction_required, busy, network  (UI text: t('auth.errors.' + code)). */
(function () {
  'use strict';
  const BASE_SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.appdata';
  const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';
  const KEY_CLIENT = 'el.google.clientId', KEY_PROFILE = 'el.google.profile', KEY_TOKEN = 'el.google.token';
  const INTERACTION = ['interaction_required', 'login_required', 'consent_required', 'immediate_failed'];

  let client = null, clientFor = '';   // GIS token client and the client id it was built for
  let pending = null;                  // {resolve, reject} fulfilled by the token client callbacks
  let gisWait = null, inited = false, chain = Promise.resolve();
  const listeners = [];

  /* ---- small helpers ---- */
  function mkErr(code, detail) { const e = new Error(code); e.code = code; if (detail) e.detail = detail; return e; }
  function jget(area, key) { try { return JSON.parse(area.getItem(key)); } catch (e) { return null; } }
  function jset(area, key, v) { try { if (v == null) area.removeItem(key); else area.setItem(key, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  const readProfile = () => { const p = jget(localStorage, KEY_PROFILE); return p && typeof p === 'object' ? p : null; };
  const readToken = () => { const k = jget(sessionStorage, KEY_TOKEN); return k && k.access_token ? k : null; };
  /* Google reports 'email' / 'profile' as full userinfo URLs, so normalise before comparing scopes. */
  const normScope = s => (s === 'email' || s === 'profile') ? 'https://www.googleapis.com/auth/userinfo.' + s : s;
  const splitScopes = s => String(s || '').split(/\s+/).filter(Boolean);
  const gisReady = () => !!(window.google && google.accounts && google.accounts.oauth2);

  function notify() {
    const state = { signedIn: Auth.isSignedIn(), profile: Auth.getProfile(), configured: Auth.isConfigured() };
    listeners.slice().forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  }

  function updateButton() {
    const b = document.getElementById('btn-account');
    if (!b) return;
    const p = readProfile();
    b.hidden = !p;
    b.textContent = '';                       // a re-render always replaces the previous content
    if (!p) { b.removeAttribute('title'); return; }
    const name = String(p.name || '').trim(), email = String(p.email || '').trim();
    const first = name.split(/\s+/)[0] || email.split('@')[0] || '';
    b.title = [name || first, email].filter(Boolean).join(' · ');
    b.setAttribute('aria-label', t('auth.account'));
    /* Colored initials circle (ui.js avatar) when there is no picture or it fails to load. */
    const initials = () => (typeof avatar === 'function') ? avatar(first || '?') : icon('users');
    if (p.picture) {
      const img = h('img', {
        src: p.picture, alt: '', width: 28, height: 28, referrerPolicy: 'no-referrer',
        style: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', display: 'block', flex: 'none' }
      });
      img.addEventListener('error', () => { if (img.parentNode === b) img.replaceWith(initials()); }, { once: true });
      b.append(img);
    } else {
      b.append(initials());
    }
    if (first) b.append(h('span', { class: 'acct-name' }, first));
  }

  /* ---- Google Identity Services plumbing ---- */
  function waitGis() {
    if (gisReady()) return Promise.resolve();
    if (!gisWait) gisWait = new Promise((resolve, reject) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (gisReady()) { clearInterval(iv); resolve(); }
        else if (Date.now() - t0 > 10000) { clearInterval(iv); gisWait = null; reject(mkErr('gis_unavailable')); }
      }, 100);
    });
    return gisWait;
  }

  /* kind = resp.error from the callback, or the error_callback type */
  function failure(kind) {
    kind = String(kind || 'unknown');
    const code = (INTERACTION.indexOf(kind) >= 0 || kind === 'unknown') ? 'interaction_required'
      : /^popup_/.test(kind) ? 'popup_closed' : 'access_denied';
    return mkErr(code, kind);
  }
  function settle(fn, arg) { const p = pending; pending = null; if (p) p[fn](arg); }

  function ensureClient() {
    if (!Auth.getClientId()) return Promise.reject(mkErr('not_configured'));
    return waitGis().then(() => {
      const id = Auth.getClientId();
      if (!id) throw mkErr('not_configured');
      if (!client || clientFor !== id) {
        client = google.accounts.oauth2.initTokenClient({
          client_id: id, scope: BASE_SCOPES,
          callback: resp => (resp && !resp.error && resp.access_token) ? settle('resolve', resp) : settle('reject', failure(resp && resp.error)),
          error_callback: err => settle('reject', failure(err && err.type))
        });
        clientFor = id;
      }
      return client;
    });
  }

  /* One token request at a time; a second concurrent one is rejected with 'busy'. */
  function request(params) {
    return ensureClient().then(c => new Promise((resolve, reject) => {
      if (pending) return reject(mkErr('busy'));
      const timer = setTimeout(() => settle('reject', mkErr('popup_closed', 'popup_closed')), 120000);  // never stay stuck
      pending = { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } };
      try { c.requestAccessToken(params); } catch (e) { settle('reject', mkErr('gis_unavailable', 'request')); }
    }));
  }

  function saveToken(resp, fallbackScope, merge) {
    const old = merge ? readToken() : null;
    const scopes = new Set(splitScopes(((old && old.scope) || '') + ' ' + (resp.scope || fallbackScope)));
    const tok = {
      access_token: resp.access_token,
      expires_at: Date.now() + (+resp.expires_in || 3600) * 1000 - 60000,
      scope: Array.from(scopes).join(' ')
    };
    jset(sessionStorage, KEY_TOKEN, tok);
    return tok;
  }

  async function fetchToken(extraScopes, opts) {
    const need = splitScopes(BASE_SCOPES).concat(extraScopes || []);
    const tok = readToken();
    if (!opts.force && tok && tok.expires_at > Date.now()) {
      const have = splitScopes(tok.scope).map(normScope);
      if (need.every(s => have.indexOf(normScope(s)) >= 0)) return tok.access_token;
    }
    const profile = readProfile();
    const base = { scope: need.join(' '), include_granted_scopes: true };
    if (profile && profile.email) base.hint = profile.email;
    let resp;
    try {
      resp = await request(Object.assign({ prompt: '' }, base));   // silent first
    } catch (e) {
      if (opts.interactive === false) {
        throw (['not_configured', 'gis_unavailable', 'busy'].indexOf(e.code) >= 0) ? e : mkErr('interaction_required', e.code);
      }
      /* Don't re-prompt after an explicit cancel/deny, or when the library itself is unusable. */
      if (['not_configured', 'gis_unavailable', 'busy', 'access_denied'].indexOf(e.code) >= 0 || e.detail === 'popup_closed') throw e;
      resp = await request(Object.assign({ prompt: 'consent' }, base));
    }
    return saveToken(resp, need.join(' '), true).access_token;
  }

  /* ---- public API ---- */
  const Auth = {
    init() {
      if (!inited) {
        inited = true;
        const b = document.getElementById('btn-account');
        if (b) b.addEventListener('click', () => go('settings'));
        window.addEventListener('storage', e => { if (e.key === KEY_PROFILE) { updateButton(); notify(); } });
      }
      updateButton();
      return Auth.isConfigured() ? ensureClient().then(() => {}, () => {}) : Promise.resolve();
    },
    getClientId() {
      let local = '';
      try { local = localStorage.getItem(KEY_CLIENT) || ''; } catch (e) { /* storage blocked */ }
      return String((window.APP_CONFIG && APP_CONFIG.googleClientId) || local || '').trim();
    },
    setClientId(id) {
      id = String(id || '').trim();
      try { if (id) localStorage.setItem(KEY_CLIENT, id); else localStorage.removeItem(KEY_CLIENT); } catch (e) { /* storage blocked */ }
      client = null; clientFor = '';
      notify();
      if (Auth.isConfigured()) ensureClient().catch(() => {});
    },
    isConfigured() { return !!Auth.getClientId(); },
    isSignedIn() { return !!readProfile(); },
    getProfile() { return readProfile(); },

    async signIn() {
      const resp = await request({ scope: BASE_SCOPES, prompt: 'select_account', include_granted_scopes: true });
      let info;
      try {
        const r = await fetch(USERINFO, { headers: { Authorization: 'Bearer ' + resp.access_token } });
        if (!r.ok) throw new Error('userinfo ' + r.status);
        info = await r.json();
      } catch (e) { throw mkErr('network'); }
      const profile = { name: info.name || info.email || '', email: info.email || '', picture: info.picture || '', sub: info.sub || '' };
      saveToken(resp, BASE_SCOPES, false);
      jset(localStorage, KEY_PROFILE, profile);
      updateButton();
      notify();
      return profile;
    },

    signOut() {
      const tok = readToken();
      jset(sessionStorage, KEY_TOKEN, null);
      jset(localStorage, KEY_PROFILE, null);
      updateButton();
      notify();
      return new Promise(resolve => {   // best-effort revoke; never blocks or fails sign-out
        try {
          if (tok && gisReady()) { google.accounts.oauth2.revoke(tok.access_token, () => resolve()); setTimeout(resolve, 3000); }
          else resolve();
        } catch (e) { resolve(); }
      });
    },

    /* Resolves a valid access token covering BASE_SCOPES + extraScopes.
       opts: {force} skip the cached token; {interactive:false} never fall back to a consent prompt. */
    getAccessToken(extraScopes, opts) {
      const run = () => fetchToken(extraScopes || [], opts || {});
      const p = chain.then(run, run);      // overlapping callers are queued, so later ones reuse the fresh token
      chain = p.catch(() => {});
      return p;
    },

    onChange(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.push(fn);
      return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
    }
  };

  window.Auth = Auth;
})();
