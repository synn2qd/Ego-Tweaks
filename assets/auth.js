/* Ego Tweaks — accounts.
 *
 * Accounts are saved in the visitor's browser (localStorage), so the site works on any
 * static host (GitHub Pages, Netlify, a plain folder) with no server. Passwords are never
 * stored — only a salted PBKDF2-SHA256 hash.
 *
 * Everything the site needs goes through window.EgoAuth, so moving to a hosted backend
 * (Supabase, Firebase, your own API) later means rewriting this one file and nothing else:
 *
 *   current()                                  → user | null           (sync)
 *   signUp({ username, email, password, remember })   → Promise<user>
 *   signIn({ login, password, remember })      → Promise<user>         login = username or email
 *   signOut()
 *   update({ prefs })                          → Promise<user>         saves account settings
 *   recordDownload({ file, version })          → Promise<user>         saves to download history
 *   onChange(fn)                               → called with user | null after any change
 *
 * A user looks like { username, email, created, prefs: { intro, autoDownload }, downloads: [{ at, file, version }] }.
 * Errors are thrown as Error objects with a .field ('username' | 'email' | 'password' | 'login').
 */
(function (root) {
  'use strict';

  const KEY_USERS = 'egoTweaks.accounts.v1';
  const KEY_SESSION = 'egoTweaks.session.v1';
  const ITER = 120000;
  const DEFAULT_PREFS = { intro: true, autoDownload: true };

  // ───────────── storage that never throws ─────────────
  const mem = {};
  const store = (kind) => ({
    get(k) { try { const v = root[kind].getItem(k); return v == null ? (mem[kind + k] ?? null) : v; } catch (_) { return mem[kind + k] ?? null; } },
    set(k, v) { mem[kind + k] = v; try { root[kind].setItem(k, v); } catch (_) { /* private mode / blocked — memory only */ } },
    del(k) { delete mem[kind + k]; try { root[kind].removeItem(k); } catch (_) { /* ignore */ } },
  });
  const local = store('localStorage');
  const session = store('sessionStorage');

  const readUsers = () => { try { return JSON.parse(local.get(KEY_USERS) || '{}') || {}; } catch (_) { return {}; } };
  const writeUsers = (u) => local.set(KEY_USERS, JSON.stringify(u));

  // ───────────── hashing ─────────────
  const enc = new TextEncoder();
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const randomHex = (n) => { const a = new Uint8Array(n); (root.crypto || {}).getRandomValues ? root.crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = (Math.random() * 256) | 0)); return hex(a); };

  // Small SHA-256 used only when WebCrypto isn't available (pages served over plain http on a LAN).
  function sha256(bytes) {
    const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    const l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
    m.set(bytes); m[l] = 0x80;
    const dv = new DataView(m.buffer); dv.setUint32(nb - 4, (l * 8) >>> 0); dv.setUint32(nb - 8, Math.floor(l / 0x20000000));
    const W = new Uint32Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < nb; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const s0 = r(W[i-15],7) ^ r(W[i-15],18) ^ (W[i-15] >>> 3), s1 = r(W[i-2],17) ^ r(W[i-2],19) ^ (W[i-2] >>> 10); W[i] = (W[i-16] + s0 + W[i-7] + s1) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e,6) ^ r(e,11) ^ r(e,25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const t2 = ((r(a,2) ^ r(a,13) ^ r(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32); const ov = new DataView(out.buffer); H.forEach((v, i) => ov.setUint32(i * 4, v)); return out;
  }

  async function hashPassword(password, salt, iter) {
    const subtle = root.crypto && root.crypto.subtle;
    if (subtle && iter) {
      const key = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: iter }, key, 256);
      return { algo: 'pbkdf2', iter, hash: hex(bits) };
    }
    let h = sha256(enc.encode(salt + ':' + password));
    for (let i = 0; i < 2000; i++) h = sha256(h);
    return { algo: 'sha256x2000', iter: 0, hash: hex(h) };
  }
  const canPbkdf2 = () => !!(root.crypto && root.crypto.subtle);

  // ───────────── helpers ─────────────
  const norm = (s) => String(s || '').trim();
  const lower = (s) => norm(s).toLowerCase();
  const fail = (field, message) => { const e = new Error(message); e.field = field; throw e; };
  const pub = (u) => u && ({
    username: u.username, email: u.email, created: u.created,
    prefs: Object.assign({}, DEFAULT_PREFS, u.prefs || {}),
    downloads: (u.downloads || []).slice(),
  });

  const listeners = new Set();
  const emit = () => { const u = api.current(); listeners.forEach((fn) => { try { fn(u); } catch (_) { /* ignore */ } }); };

  function sessionId() { return session.get(KEY_SESSION) || local.get(KEY_SESSION); }
  function startSession(id, remember) {
    local.del(KEY_SESSION); session.del(KEY_SESSION);
    (remember === false ? session : local).set(KEY_SESSION, id);
  }

  function mutate(fn) {
    const id = sessionId();
    const users = readUsers();
    const u = id && users[id];
    if (!u) fail('login', 'You’re signed out. Sign in again to save changes.');
    fn(u);
    writeUsers(users);
    emit();
    return pub(u);
  }

  // ───────────── public API ─────────────
  const api = {
    provider: 'local',

    current() {
      const id = sessionId();
      if (!id) return null;
      return pub(readUsers()[id]) || null;
    },

    async signUp({ username, email, password, remember = true }) {
      username = norm(username); email = norm(email); password = String(password || '');
      if (!/^[A-Za-z0-9_.-]{3,20}$/.test(username)) fail('username', 'Pick a username of 3–20 letters, numbers, dots, dashes or underscores.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail('email', 'That email address doesn’t look right.');
      if (password.length < 8) fail('password', 'Use at least 8 characters for your password.');
      const users = readUsers();
      const id = username.toLowerCase();
      if (users[id]) fail('username', 'That username is taken. Try another, or sign in.');
      if (Object.values(users).some((u) => lower(u.email) === email.toLowerCase())) fail('email', 'There’s already an account with that email. Sign in instead.');
      const salt = randomHex(16);
      const h = await hashPassword(password, salt, canPbkdf2() ? ITER : 0);
      users[id] = { username, email, salt, algo: h.algo, iter: h.iter, hash: h.hash, created: new Date().toISOString(), prefs: Object.assign({}, DEFAULT_PREFS), downloads: [] };
      writeUsers(users);
      startSession(id, remember);
      emit();
      return pub(users[id]);
    },

    async signIn({ login, password, remember = true }) {
      const key = lower(login);
      if (!key) fail('login', 'Enter your username or email.');
      if (!password) fail('password', 'Enter your password.');
      const users = readUsers();
      const id = users[key] ? key : Object.keys(users).find((k) => lower(users[k].email) === key);
      if (!id) fail('login', 'We couldn’t find that account. Check the spelling, or create one.');
      const u = users[id];
      const h = await hashPassword(String(password), u.salt, u.algo === 'pbkdf2' ? u.iter : 0);
      if (u.algo === 'pbkdf2' && !canPbkdf2()) fail('password', 'Open this page over https to sign in to this account.');
      if (h.hash !== u.hash) fail('password', 'That password isn’t right.');
      startSession(id, remember);
      emit();
      return pub(u);
    },

    signOut() { local.del(KEY_SESSION); session.del(KEY_SESSION); emit(); },

    async update({ prefs } = {}) {
      return mutate((u) => { if (prefs) u.prefs = Object.assign({}, DEFAULT_PREFS, u.prefs || {}, prefs); });
    },

    async recordDownload({ file, version }) {
      return mutate((u) => {
        u.downloads = (u.downloads || []);
        u.downloads.unshift({ at: new Date().toISOString(), file, version });
        u.downloads = u.downloads.slice(0, 50);
      });
    },

    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };

  // keep tabs in sync
  root.addEventListener && root.addEventListener('storage', (e) => { if (e.key === KEY_USERS || e.key === KEY_SESSION) emit(); });

  root.EgoAuth = api;
})(window);
