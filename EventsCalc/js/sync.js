/* Cloud sync: the database lives in the user's Google Drive appDataFolder (hidden app-data space),
   plus a Google Contacts import via the People API. Depends on config.js, i18n.js, store.js, ui.js, auth.js, app.js (rerender). */
(function () {
  const DRIVE = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  const PEOPLE = 'https://people.googleapis.com/v1/people/me/connections';
  const CONTACTS_SCOPE = 'https://www.googleapis.com/auth/contacts.readonly';
  const DEBOUNCE_MS = 3000;
  const fileName = () => (window.APP_CONFIG && APP_CONFIG.syncFileName) || 'eventledger.json';

  /* Fallback strings, merged only where the UI's i18n.js does not already define them. */
  function fillMissing(dst, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object') {
        if (dst[k] === undefined) dst[k] = {};
        if (dst[k] && typeof dst[k] === 'object') fillMissing(dst[k], src[k]);
      } else if (dst[k] === undefined) dst[k] = src[k];
    }
  }
  fillMissing(I18N.he, { sync: { restoredFromCloud: 'הנתונים שוחזרו מהענן', pushed: 'הנתונים נשמרו בענן',
    status: { off: 'לא מחובר', needsAuth: 'נדרשת התחברות מחדש', idle: 'מחובר', syncing: 'מסנכרן…', synced: 'מסונכרן', error: 'שגיאת סנכרון' } } });
  fillMissing(I18N.en, { sync: { restoredFromCloud: 'Data restored from the cloud', pushed: 'Saved to the cloud',
    status: { off: 'Not signed in', needsAuth: 'Sign in again', idle: 'Connected', syncing: 'Syncing…', synced: 'Synced', error: 'Sync error' } } });

  /* ---- state ---- */
  const state = { status: 'off', lastSync: null, error: null, remoteUpdatedAt: null };
  const subs = [];
  let fileId = null, timer = null, queue = Promise.resolve(), reconcileP = null, reconcileInteractive = true, inited = false;
  function setState(patch) {
    Object.assign(state, patch);
    subs.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  }
  const signedIn = () => !!(window.Auth && Auth.isSignedIn());
  const authOpts = opts => (opts && opts.interactive === false ? { interactive: false } : {});

  /* Runs fn serially (one Drive operation at a time) and maintains the status. Rethrows errors after recording them. */
  function track(fn) {
    setState({ status: 'syncing', error: null });
    const run = queue.then(async () => {
      try {
        const r = await fn();
        if (!signedIn()) setState({ status: 'off', error: null });
        else setState({ status: 'synced', lastSync: Date.now(), error: null });
        return r;
      } catch (e) {
        if (!signedIn()) setState({ status: 'off', error: null });
        else if (e && e.code === 'interaction_required') setState({ status: 'needsAuth', error: null });
        else setState({ status: 'error', error: (e && e.message) || String(e) });
        throw e;
      }
    });
    queue = run.catch(() => {});
    return run;
  }

  /* ---- HTTP with bearer token; one retry with a fresh token on 401 ---- */
  async function api(url, init, opts, scopes) {
    let token = await Auth.getAccessToken(scopes || [], authOpts(opts));
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(url, Object.assign({}, init, { headers: Object.assign({}, init && init.headers, { Authorization: 'Bearer ' + token }) }));
      } catch (e) {
        const err = new Error((e && e.message) || 'Network error'); err.code = 'network'; throw err;
      }
      if (res.status === 401 && attempt === 0) {
        token = await Auth.getAccessToken(scopes || [], Object.assign(authOpts(opts), { force: true }));
        continue;
      }
      if (res.ok) return res;
      let msg = '';
      try { const j = await res.json(); msg = (j && j.error && j.error.message) || ''; } catch (e) { /* no JSON body */ }
      const err = new Error('HTTP ' + res.status + (msg ? ': ' + msg : '')); err.status = res.status; throw err;
    }
  }

  /* ---- Drive file ---- */
  async function findFileId(opts) {
    if (fileId) return fileId;
    const q = encodeURIComponent("name='" + fileName().replace(/'/g, "\\'") + "'");
    const res = await api(DRIVE + '/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&q=' + q, {}, opts);
    const j = await res.json();
    fileId = (j.files && j.files[0] && j.files[0].id) || null;
    return fileId;
  }
  /* Returns the parsed remote database, or null when there is none yet. */
  async function fetchRemote(opts) {
    const id = await findFileId(opts);
    if (!id) return null;
    let res;
    try { res = await api(DRIVE + '/files/' + id + '?alt=media', {}, opts); }
    catch (e) { if (e.status === 404) { fileId = null; return null; } throw e; }
    const data = await res.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Unexpected cloud data');
    data.updatedAt = +data.updatedAt || 0;
    return data;
  }
  async function upload(opts) {
    clearTimeout(timer); timer = null;              // this upload covers everything saved so far
    const body = JSON.stringify(DB), stamp = DB.updatedAt;
    let id = await findFileId(opts);
    if (id) {
      try {
        await api(UPLOAD + '/files/' + id + '?uploadType=media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }, opts);
      } catch (e) { if (e.status !== 404) throw e; fileId = id = null; }   // file was deleted remotely: recreate
    }
    if (!id) {
      const b = 'el_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      const meta = JSON.stringify({ name: fileName(), parents: ['appDataFolder'] });
      const multipart = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta +
        '\r\n--' + b + '\r\nContent-Type: application/json\r\n\r\n' + body + '\r\n--' + b + '--';
      const res = await api(UPLOAD + '/files?uploadType=multipart', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: multipart }, opts);
      fileId = (await res.json()).id;
    }
    setState({ remoteUpdatedAt: stamp });
  }
  function applyRemote(remote) {
    replaceDB(remote);                               // save hook gets fromSync:true, so it is not pushed back
    setState({ remoteUpdatedAt: remote.updatedAt });
    if (typeof rerender === 'function') rerender();
  }

  function schedulePush() {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; Sync.push({ interactive: false }).catch(() => {}); }, DEBOUNCE_MS);
  }

  /* ---- public API ---- */
  const Sync = {
    state,
    onChange(fn) { subs.push(fn); },

    init() {
      if (inited) return; inited = true;
      onDBSaved(opts => {
        try {
          if (opts && opts.fromSync) return;
          if (signedIn() && state.status !== 'off' && state.status !== 'needsAuth') schedulePush();
        } catch (e) { setState({ status: 'error', error: (e && e.message) || String(e) }); }
      });
      document.addEventListener('visibilitychange', () => {   // best-effort flush before the tab goes away
        if (document.visibilityState === 'hidden' && timer) Sync.push({ interactive: false }).catch(() => {});
      });
      if (!window.Auth) return;
      Auth.onChange(info => {
        if (info && info.signedIn) Sync.reconcile().catch(() => {});
        else { clearTimeout(timer); timer = null; fileId = null; setState({ status: 'off', error: null, lastSync: null, remoteUpdatedAt: null }); }
      });
      if (Auth.isSignedIn()) {
        setState({ status: 'idle' });
        Sync.reconcile({ interactive: false }).catch(() => {});   // interaction_required -> status 'needsAuth' (set by track)
      }
    },

    push(opts = {}) { return track(() => upload(opts)); },

    pull(opts = {}) {
      return track(async () => {
        const remote = await fetchRemote(opts);
        if (!remote) return { applied: false };
        if (opts.force || remote.updatedAt > DB.updatedAt) { applyRemote(remote); return { applied: true }; }
        return { applied: false };
      });
    },

    reconcile(opts = {}) {
      const interactive = opts.interactive !== false;
      if (reconcileP && reconcileInteractive === interactive) return reconcileP;   // already in flight
      reconcileInteractive = interactive;
      const p = reconcileP = track(async () => {
        const remote = await fetchRemote(opts);
        if (!remote) return upload(opts);
        if (remote.updatedAt > DB.updatedAt) { applyRemote(remote); toast(t('sync.restoredFromCloud')); }
        else if (remote.updatedAt < DB.updatedAt) await upload(opts);
        else setState({ remoteUpdatedAt: remote.updatedAt });
      });
      const clear = () => { if (reconcileP === p) reconcileP = null; };
      p.then(clear, clear);
      return p;
    },

    /* Fetch all Google contacts that have a phone number, without importing.
       Returns [{name, phone, exists}] where exists = a contact with that phone already exists locally. */
    async fetchGoogleContacts() {
      const out = [];
      let pageToken = '';
      do {
        const url = PEOPLE + '?personFields=names,phoneNumbers&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING' +
          (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
        const j = await (await api(url, {}, {}, [CONTACTS_SCOPE])).json();
        for (const p of j.connections || []) {
          const ph = p.phoneNumbers && p.phoneNumbers[0];
          if (!ph) continue;
          const name = p.names && p.names[0] && p.names[0].displayName;
          const phone = ph.canonicalForm || ph.value;
          if (!name || !normPhone(phone)) continue;
          out.push({ name, phone, exists: !!findContactByPhone(phone) });
        }
        pageToken = j.nextPageToken || '';
      } while (pageToken);
      return out;
    },
    /* Import a list of {name, phone} into the local contacts under category `cat` (default 'other').
       Skips phones that already exist. Returns {imported, skipped, total}. */
    importContacts(list, cat) {
      let imported = 0, skipped = 0;
      for (const c of list || []) {
        if (!c.name || !normPhone(c.phone) || findContactByPhone(c.phone)) { skipped++; continue; }
        upsertContact({ name: c.name, phone: c.phone, cat: cat || 'other', notes: '' });   // each save re-arms the debounced push
        imported++;
      }
      return { imported, skipped, total: imported + skipped };
    },
    /* Fetch and import everything (kept for callers that do not show a picker). */
    async importGoogleContacts(cat) {
      return this.importContacts(await this.fetchGoogleContacts(), cat);
    }
  };

  window.Sync = Sync;
})();
