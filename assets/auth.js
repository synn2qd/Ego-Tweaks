/* Ego Tweaks — Supabase-backed shared accounts and download tracking.
 * Only the Supabase publishable key belongs in browser code. Never add service_role/secret keys here.
 */
(function (root) {
  'use strict';
  const SUPABASE_URL = 'https://enznuoktltulysdirgzb.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Tvo-plmyacRrYo3Gy8q1dw_ildX7iEC';
  const client = root.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const DEFAULT_PREFS = { intro: true, autoDownload: true };
  const listeners = new Set();
  let cachedUser = null;
  let ready = false;
  const norm = (s) => String(s || '').trim();
  const lower = (s) => norm(s).toLowerCase();
  const fail = (field, message) => { const e = new Error(message); e.field = field; throw e; };
  function emit() { listeners.forEach((fn) => { try { fn(cachedUser); } catch (_) {} }); }
  async function mapUser(user) {
    if (!user) return null;
    let profile = null;
    try {
      const { data } = await client.from('ego_profiles').select('username,created_at').eq('id', user.id).maybeSingle();
      profile = data;
    } catch (_) {}
    const username = profile?.username || user.user_metadata?.username || (user.email || 'user').split('@')[0];
    return { id: user.id, username, email: user.email || '', isAdmin: user.app_metadata?.role === 'admin', created: profile?.created_at || user.created_at, prefs: Object.assign({}, DEFAULT_PREFS, user.user_metadata?.prefs || {}), downloads: [] };
  }
  async function syncUser(user) { cachedUser = await mapUser(user); ready = true; emit(); return cachedUser; }
  client.auth.getSession().then(({ data }) => syncUser(data?.session?.user || null)).catch(() => { ready = true; cachedUser = null; emit(); });
  client.auth.onAuthStateChange((_event, session) => {
    // Defer profile queries outside Supabase's auth callback lock.
    Promise.resolve().then(() => syncUser(session?.user || null));
  });
  const api = {
    provider: 'supabase', client,
    current() { return cachedUser; },
    whenReady() { return ready ? Promise.resolve(cachedUser) : new Promise((resolve) => { const off = api.onChange((u) => { if (ready) { off(); resolve(u); } }); }); },
    async signUp({ username, email, password }) {
      username = norm(username); email = norm(email);
      if (!/^[A-Za-z0-9_.-]{3,20}$/.test(username)) fail('username', 'Pick a username of 3–20 letters, numbers, dots, dashes or underscores.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail('email', 'That email address doesn’t look right.');
      if (String(password || '').length < 8) fail('password', 'Use at least 8 characters for your password.');
      const { data, error } = await client.auth.signUp({ email: lower(email), password, options: { data: { username } } });
      if (error) fail(error.status === 422 ? 'email' : 'password', error.message);
      if (!data.session) fail('email', 'Account created. Check your email to confirm it, then sign in. If you want immediate sign-in, disable email confirmations in Supabase Authentication settings.');
      return syncUser(data.user);
    },
    async signIn({ login, password }) {
      const email = lower(login);
      if (!email || !email.includes('@')) fail('login', 'Enter the email address you registered with.');
      if (!password) fail('password', 'Enter your password.');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) fail('password', error.message);
      return syncUser(data.user);
    },
    async signOut() { const { error } = await client.auth.signOut(); if (error) throw error; cachedUser = null; emit(); },
    async update({ prefs } = {}) {
      const { data: { user }, error: getErr } = await client.auth.getUser();
      if (getErr || !user) fail('login', 'You’re signed out. Sign in again to save changes.');
      const next = Object.assign({}, DEFAULT_PREFS, user.user_metadata?.prefs || {}, prefs || {});
      const { data, error } = await client.auth.updateUser({ data: { prefs: next } });
      if (error) throw error;
      return syncUser(data.user);
    },
    async recordDownload({ file, version }) {
      const { data: { user } } = await client.auth.getUser().catch(() => ({ data: { user: null } }));
      const { error } = await client.from('ego_download_events').insert({ user_id: user?.id || null, file_name: String(file || 'EgoTweaks.exe').slice(0,180), version: String(version || 'unknown').slice(0,40) });
      if (error) throw error;
      if (cachedUser) return cachedUser;
      return null;
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  root.EgoAuth = api;
})(window);
