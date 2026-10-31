/* vcard.js - contact-file parser for the import dialog. No dependencies, plain ES2020 (no lookbehind:
   older iOS Safari chokes on it at parse time).
     VCard.parse(text)            vCard 2.1 / 3.0 / 4.0 text, one or many cards
     VCard.parseCSV(text)         Google Contacts / Outlook / generic CSV
     VCard.parseFile(name, text)  picks by extension, else sniffs for BEGIN:VCARD
   All return [{ name, phone, phones, email }]; cards without a phone are dropped; never throws. */
const VCard = (() => {
  const MOBILE = /cell|mobile|iphone|main|נייד/i;
  const digits = p => (p || '').replace(/\D/g, '');

  /* "tel:+972..." (vCard 4) and ";ext=12" suffixes removed, nothing else touched */
  const cleanPhone = v => (v || '').trim().replace(/^tel:/i, '').replace(/;.*$/, '').trim();

  const unescape = v => v.replace(/\\([\\;,nN])/g, (m, c) => (c === 'n' || c === 'N') ? '\n' : c);

  /* split on a separator, honouring backslash escapes */
  function splitUnescaped(s, sep) {
    const out = []; let cur = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\' && i + 1 < s.length) { cur += c + s[++i]; continue; }
      if (c === sep) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  }

  function utf8(bytes) {
    if (typeof TextDecoder !== 'undefined') {
      try { return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); } catch (e) { /* fall through */ }
    }
    let out = '';
    for (let i = 0; i < bytes.length;) {
      const b = bytes[i];
      if (b < 0x80) { out += String.fromCharCode(b); i++; }
      else if (b < 0xe0) { out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f)); i += 2; }
      else if (b < 0xf0) { out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)); i += 3; }
      else { out += String.fromCodePoint(((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f)); i += 4; }
    }
    return out;
  }

  /* QUOTED-PRINTABLE (Android 2.1 exports write Hebrew names this way) */
  function decodeQP(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else bytes.push(c.charCodeAt(0) & 0xff);
    }
    return utf8(bytes);
  }

  /* BOM, CRLF and line folding (a line starting with space/tab continues the previous one) */
  function unfold(text) {
    const lines = [];
    for (const raw of text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')) {
      if ((raw[0] === ' ' || raw[0] === '\t') && lines.length) lines[lines.length - 1] += raw.slice(1);
      else lines.push(raw);
    }
    return lines;
  }

  /* "[group.]NAME;param;param=value:value" */
  function parseProp(line) {
    let colon = -1, inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQ = !inQ;
      else if (c === ':' && !inQ) { colon = i; break; }
    }
    if (colon < 0) return null;
    const parts = line.slice(0, colon).split(';');
    let name = parts[0], group = '';
    const dot = name.indexOf('.');
    if (dot > 0) { group = name.slice(0, dot).trim().toLowerCase(); name = name.slice(dot + 1); }
    name = name.trim().toUpperCase();
    const params = { types: [], encoding: '' };
    for (const p of parts.slice(1)) {
      const eq = p.indexOf('=');
      const k = (eq < 0 ? p : p.slice(0, eq)).trim().toUpperCase();
      const v = eq < 0 ? '' : p.slice(eq + 1).replace(/"/g, '').trim().toUpperCase();
      if (eq < 0) params.types.push(k);                    /* vCard 2.1 bare params: CELL, PREF, QUOTED-PRINTABLE */
      else if (k === 'TYPE') params.types.push(...v.split(','));
      else if (k === 'ENCODING') params.encoding = v;
    }
    if (params.types.includes('QUOTED-PRINTABLE')) params.encoding = 'QUOTED-PRINTABLE';
    return { group, name, params, value: line.slice(colon + 1) };
  }

  const newCard = () => ({ fn: '', n: '', org: '', nick: '', phones: [], labels: {}, emails: [] });

  function handle(card, prop, value) {
    const v = unescape(value).trim();
    switch (prop.name) {
      case 'FN': if (!card.fn) card.fn = v; break;
      case 'N': if (!card.n) {
        const p = splitUnescaped(value, ';').map(x => unescape(x).trim());   /* family;given;additional;prefix;suffix */
        card.n = [p[1], p[2], p[0]].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      } break;
      case 'ORG': if (!card.org) card.org = splitUnescaped(value, ';').map(x => unescape(x).trim()).filter(Boolean).join(' '); break;
      case 'NICKNAME': if (!card.nick) card.nick = v; break;
      case 'TEL': {
        const phone = cleanPhone(v);
        if (digits(phone)) card.phones.push({ phone, types: prop.params.types, group: prop.group });
        break;
      }
      case 'EMAIL': if (v) card.emails.push(v); break;
      case 'X-ABLABEL': if (prop.group) card.labels[prop.group] = v; break;   /* iOS: item1.TEL + item1.X-ABLabel */
      default: break;
    }
  }

  function finish(card) {
    const seen = new Set(), list = [];
    for (const p of card.phones) {
      const d = digits(p.phone);
      if (seen.has(d)) continue;
      seen.add(d);
      const label = (p.group && card.labels[p.group]) || '';
      list.push({ phone: p.phone, mobile: p.types.some(t => MOBILE.test(t)) || MOBILE.test(label) });
    }
    if (!list.length) return null;
    const first = list.find(p => p.mobile) || list[0];
    const phones = [first.phone].concat(list.filter(p => p !== first).map(p => p.phone));
    return {
      name: card.fn || card.n || card.org || card.nick || phones[0],
      phone: phones[0], phones, email: card.emails[0] || ''
    };
  }

  function parseVCard(text) {
    const out = [];
    const lines = unfold(String(text || ''));
    let card = null, depth = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const up = line.trim().toUpperCase();
      if (up === 'BEGIN:VCARD') { depth++; if (depth === 1) card = newCard(); continue; }
      if (up === 'END:VCARD') {
        if (depth === 1 && card) { const c = finish(card); if (c) out.push(c); card = null; }
        depth = Math.max(0, depth - 1);
        continue;
      }
      if (!card || depth !== 1) continue;                   /* junk between cards, nested AGENT cards */
      const prop = parseProp(line);
      if (!prop) continue;
      if (prop.name === 'PHOTO' || prop.name === 'LOGO' || prop.name === 'SOUND' || prop.name === 'KEY') continue;
      let value = prop.value;
      if (prop.params.encoding === 'QUOTED-PRINTABLE') {
        while (value.endsWith('=') && i + 1 < lines.length) value = value.slice(0, -1) + lines[++i];   /* soft breaks */
        value = decodeQP(value);
      } else if (prop.params.encoding === 'BASE64' || prop.params.encoding === 'B') continue;
      handle(card, prop, value);
    }
    return out;
  }

  /* ---------------- CSV ---------------- */
  function csvRows(text, sep) {
    const rows = []; let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      }
      else if (c === '"') inQ = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); rows.push(row); row = []; cur = '';
      }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }

  function parseCSVText(text) {
    text = String(text || '').replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = (!firstLine.includes(',') && firstLine.includes(';')) ? ';' : ',';
    const rows = csvRows(text, sep);
    if (rows.length < 2) return [];
    const hdr = rows[0].map(x => x.trim().toLowerCase());
    const find = names => hdr.findIndex(x => names.includes(x));
    const findAll = re => hdr.map((x, i) => (re.test(x) && !/label|type/.test(x)) ? i : -1).filter(i => i >= 0);
    const iName = find(['name', 'full name', 'display name', 'שם', 'שם מלא']);
    const iFirst = find(['first name', 'given name', 'שם פרטי']);
    const iMid = find(['middle name', 'additional name']);
    const iLast = find(['last name', 'family name', 'שם משפחה']);
    const iOrg = find(['company', 'organization', 'organization name', 'organization 1 - name', 'חברה']);
    const phoneCols = findAll(/phone|mobile|tel|טלפון|נייד/);
    const mobileCols = phoneCols.filter(i => /mobile|cell|נייד/.test(hdr[i]));
    const cols = mobileCols.concat(phoneCols.filter(i => !mobileCols.includes(i)));
    const emailCols = findAll(/e-?mail|אימייל|דוא/);
    const out = [];
    for (const r of rows.slice(1)) {
      const get = i => (i >= 0 && r[i] != null) ? String(r[i]).trim() : '';
      const phones = [], seen = new Set();
      for (const i of cols) {
        for (const p of get(i).split(':::')) {          /* Google puts several numbers in one cell as "a ::: b" */
          const ph = cleanPhone(p), d = digits(ph);
          if (!d || seen.has(d)) continue;
          seen.add(d); phones.push(ph);
        }
      }
      if (!phones.length) continue;
      const name = get(iName) || [get(iFirst), get(iMid), get(iLast)].filter(Boolean).join(' ') || get(iOrg) || phones[0];
      out.push({ name, phone: phones[0], phones, email: emailCols.map(get).find(Boolean) || '' });
    }
    return out;
  }

  const safe = fn => (...a) => { try { return fn(...a) || []; } catch (e) { return []; } };
  const parse = safe(parseVCard), parseCSV = safe(parseCSVText);
  function parseFile(name, text) {
    const ext = String(name || '').toLowerCase().split('.').pop();
    text = String(text || '');
    if (ext === 'csv') return parseCSV(text);
    if (ext === 'vcf' || ext === 'vcard' || /BEGIN:VCARD/i.test(text)) return parse(text);
    return parseCSV(text);
  }
  return { parse, parseCSV, parseFile };
})();
if (typeof window !== 'undefined') window.VCard = VCard;
if (typeof module !== 'undefined' && module.exports) module.exports = VCard;
