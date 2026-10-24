/* Ego Tweaks — website 5.0 (Ego Tweaks 3.0: four one-time plans, sign in with Discord) */
(() => {
  'use strict';

  // ───────────── settings you may want to change ─────────────
  // The free download on the Download page: Ego Tweaks 3.0 itself. It runs the Free plan until the user signs in
  // with Discord, and every plan unlocks in this same app. After that it updates itself, so only swap these when
  // you want the site's download to be a newer build (the same file as the bot's updates/EgoTweaks.exe).
  const BUILD = {
    name: 'Ego Tweaks',
    file: 'EgoTweaks.exe',
    href: 'downloads/EgoTweaks.exe',
    version: '3.0.3',
    bytes: 2247168,
    sha256: '885ca8a2a8cea93fd17ff84df3109cd87708db842fb92a0022a6b2abcd8dec58',
  };
  // What the Free plan includes (the app's own list).
  const FREE = ['17 free tweaks: Game Mode, GPU scheduling, mouse acceleration off, no Start ads and more', 'Overview with live CPU, GPU, RAM and storage', 'Live monitor and benchmarks', 'Network diagnostics: ping, regions, speed and route', 'Recovery: undo everything, restore points', 'Automatic updates when you sign in'];
  // The current app, shown in the hero and the footer.
  const APP = { version: '3.0.3' };
  // Paste your links here and they show up in the nav, footer and menu. Leave '' to hide.
  const LINKS = { discord: 'https://discord.gg/gtPggZ9zpz', x: '' };
  // The four plans. Every one is a one-time payment: nothing renews and it never expires.
  //   payhip: the Payhip product key (payhip.com/b/AbC12 → 'AbC12'). '' = that plan's Buy button says
  //           "Coming soon" and points to the Discord instead. Each plan needs its own Payhip product.
  //   The bot reads the plan from the product (PAYHIP_TIERS on Railway) or, failing that, from the price.
  const PLANS = [
    { n: 1, id: 'starter', name: 'Starter', price: 5, payhip: 'YlFT0', sub: 'Clean, quiet Windows and a crosshair for every game.',
      perks: ['216 Windows tweaks: Explorer, visuals, audio, storage, updates, privacy', 'Crosshair and FPS overlay', 'Quick Optimize and Profiles', 'Startup apps and temp-file clean-up', 'Mouse and keyboard tests'] },
    { n: 2, id: 'premium', name: 'Premium', price: 10, payhip: 'PAIZv', flag: 'Most popular', sub: 'The performance plan: higher, steadier FPS.',
      perks: ['250 performance tweaks: CPU scheduling, stutter, GPU, input, services', 'Game Booster (pauses update downloads while you play)', 'Process killer and per-game settings', 'Stutter checklist, deep clean, memory clearing', 'BIOS guide'] },
    { n: 3, id: 'pro', name: 'Pro', price: 20, payhip: '20cFf', sub: 'Lower, steadier ping on top of everything in Premium.',
      perks: ['63 network and power-plan tweaks', 'Ping Booster', 'DNS switching', 'Automatic memory clearing', 'Session reports and setup codes'] },
    { n: 4, id: 'ultimate', name: 'Ultimate', price: 50, payhip: 'Ayl9C', flag: 'Everything', sub: 'Every tweak and Max FPS mode: the whole thing in one click.',
      perks: ['20 CPU and GPU clock tweaks', 'Max FPS mode: every FPS tweak plus Game Booster in one click', 'Full CPU speed', 'Keyboard overclock'] },
  ];
  // "Continue with Discord": visitors log in with Discord to download and to buy (so the purchase is tied to
  // their Discord account and the bot can DM them). The bot then adds them to the Discord server.
  //   clientId: Discord Developer Portal → your app → OAuth2 → Client ID. '' = no Discord login (email accounts).
  //   guildId:  your server's ID.
  //   botUrl:   your bot's Railway address. It adds people to the server and serves the live reviews.
  // This site's address (https://egotweaks.com/) must be listed under OAuth2 → Redirects.
  const DISCORD_LOGIN = { clientId: '1560070865599598804', guildId: '1560058897329426573', botUrl: 'https://ego-tweaks-bot-production.up.railway.app' };
  // Live reviews: every message in the Discord's #reviews channel, served by the bot at botUrl + '/reviews'.
  // REVIEWS_CHANNEL is where the "Post a review" buttons go; '' turns live reviews off.
  const REVIEWS_CHANNEL = 'https://discord.com/channels/1560058897329426573/1561107128780070952';
  // Download counter for the hidden admin panel: put EgoTweaks.exe in a GitHub Release on the site's repo and
  // set this to 'your-username/your-repo'. '' = hand out downloads/EgoTweaks.exe (counted in Supabase).
  const GITHUB_REPO = '';
  if (GITHUB_REPO) BUILD.href = `https://github.com/${GITHUB_REPO}/releases/latest/download/${BUILD.file}`;
  // The admin panel uses Supabase Auth and a server-assigned app_metadata.role=admin.
  // Never put an admin password or a service-role key in this file.

  // ───────────── helpers ─────────────
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) document.documentElement.classList.add('no-motion');
  const { categories: CATEGORIES, tweaks: TWEAKS } = window.EGO_SITE_CATALOG;
  const perCat = (id) => TWEAKS.filter((t) => t.cat === id).length;
  const upTo = (n) => TWEAKS.filter((t) => t.tier <= n).length;
  const planOf = (n) => PLANS.find((p) => p.n === n) || PLANS[0];
  // auth.js needs the Supabase script. If that was blocked, accounts are off but the rest of the site keeps working.
  const AUTH = window.EgoAuth || (() => { const no = () => Promise.reject(new Error('Accounts are unavailable right now — try again in a minute.'));
    return { current: () => null, onChange() {}, signUp: no, signIn: no, update: no, signOut: () => Promise.resolve(),
      recordDownload: () => Promise.resolve(null), whenReady: () => Promise.resolve(), client: null }; })();
  const fmtMB = (b) => (b / 1048576).toFixed(1) + ' MB';
  const fmtDate = (iso, time = true) => { try { return new Date(iso).toLocaleString(undefined, Object.assign({ month: 'short', day: 'numeric', year: 'numeric' }, time ? { hour: 'numeric', minute: '2-digit' } : {})); } catch (_) { return iso; } };
  const YEAR = new Date().getFullYear();
  const DISCORD = LINKS.discord;
  const avPlaceholder = (name) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#5865f2"/><text x="32" y="42" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${esc(String(name || '?').trim().charAt(0).toUpperCase() || '?')}</text></svg>`);
  // Images that fail to load step through their fallbacks (data-fb, then data-fb2).
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const next = img.dataset.fb || img.dataset.fb2;
    if (!next) return;
    if (img.dataset.fb) img.dataset.fb = ''; else img.dataset.fb2 = '';
    // their saved Discord picture is gone: stop asking for it until they log in again
    if ('dcOwn' in img.dataset && S.dc && S.dc.avatar) { S.dc.avatar = null; keep.set('ego-discord', S.dc); }
    img.src = next;
  }, true);
  const payhipKey = (p) => (String(p.payhip || '').trim().match(/([A-Za-z0-9]+)\/?$/) || [])[1] || '';

  const ICON = {
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z"/>',
    rocket: '<path d="M12 15l-3-3a12 12 0 0 1 9-8 12 12 0 0 1-8 9z"/><path d="M9 12H5l2.5-3.5H11M12 15v4l3.5-2.5V13"/><path d="M6.5 16.5c-1.2.6-1.8 2.2-2 3.5 1.3-.2 2.9-.8 3.5-2"/>',
    signal: '<path d="M5 19v-3M10 19v-7M15 19V9M20 19V5"/>',
    cross: '<circle cx="12" cy="12" r="7.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4.2-4.8"/><circle cx="12" cy="17" r="1.2"/>',
    shield: '<path d="M12 3.2l7 2.9v5.6c0 4.3-2.9 7.9-7 9.3-4.1-1.4-7-5-7-9.3V6.1z"/><path d="M9 12.2l2.1 2.1 3.9-4"/>',
    undo: '<path d="M9 14.5L4 9.5l5-5"/><path d="M4 9.5h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    alert: '<path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
    menu: '<path d="M4 8h16M4 16h16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    star: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
    chat: '<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-8.5L6 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6.5A1.5 1.5 0 0 1 5 5z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    crown: '<path d="M4 18h16M5 15L4 7l5 4 3-6 3 6 5-4-1 8z"/>',
    home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/>',
    layers: '<path d="M12 4l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    windows: '<path d="M4 5.5l7-1v7H4zM13 4.2l7-1v8.3h-7zM4 12.5h7v7l-7-1zM13 12.5h7v8.3l-7-1z"/>',
  };
  const svg = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ''}</svg>`;
  const DISCORD_SVG = '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.85a.07.07 0 0 0-.08.04c-.21.38-.44.86-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1 0 .13 12.3 12.3 0 0 1-1.88.89.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"/></svg>';
  const X_SVG = '<svg class="b" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z"/></svg>';

  const S = { page: 'home', user: AUTH.current(), busy: false, tour: 'overview', xcat: 'all', xq: '', xtier: 0, xshow: 60 };

  // ───────────── visit counts (only used if the site runs on the Cloudflare setup) ─────────────
  function track(path, data) {
    if (!/^https?:$/.test(location.protocol)) return;
    try {
      const body = JSON.stringify(data || {});
      if (navigator.sendBeacon && navigator.sendBeacon(path, new Blob([body], { type: 'text/plain' }))) return;
      fetch(path, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
    } catch (_) { /* never let counting break the page */ }
  }
  track('/api/hit', { r: document.referrer });

  // ───────────── nav, menu, footer, dock ─────────────
  const NAV = [['features', 'Features'], ['tweaks', 'Tweaks'], ['plans', 'Plans'], ['download', 'Download'], ['reviews', 'Reviews'], ['faq', 'FAQ']];
  const meBtn = () => (S.dc
    ? `<button type="button" class="me" data-act="discord-me">${dcImg(S.dc, 30)}${esc(dcName())}</button>`
    : DC_LOGIN ? `<button type="button" class="btn btn-line btn-sm" data-act="discord-me">${DISCORD_SVG}Log in</button>` : '');
  function renderNav() {
    $('#nav-links').innerHTML = NAV.map(([id, n]) => `<button type="button" data-nav="${id}"${navOn(id) ? ' aria-current="page"' : ''}>${n}</button>`).join('');
    $('#nav-cta').innerHTML = `${meBtn()}<button type="button" class="btn btn-primary btn-sm" data-nav="plans">Get Ego Tweaks</button>`;
  }
  const navOn = (id) => id === S.page || (id === 'plans' && S.page === 'thanks');
  function openMenu() {
    const m = $('#menu');
    m.innerHTML = `<div class="menu-top"><a class="brand" href="#/" data-nav="home"><b>EGO</b><span>TWEAKS</span></a>
        <button type="button" class="burger" style="display:grid" data-act="menu-close" aria-label="Close menu">${svg('x')}</button></div>
      <nav aria-label="Pages">${[['home', 'Home']].concat(NAV).map(([id, n]) => `<button type="button" data-nav="${id}">${n}${svg('arrow')}</button>`).join('')}</nav>
      <div class="acts">
        <button type="button" class="btn btn-primary btn-lg" data-nav="plans">Get Ego Tweaks — from $${PLANS[0].price}</button>
        ${DC_LOGIN ? `<button type="button" class="btn btn-line btn-lg" data-act="discord-me">${DISCORD_SVG}${S.dc ? '@' + esc(S.dc.username) : 'Log in with Discord'}</button>` : ''}
        ${DISCORD ? `<a class="btn btn-discord btn-lg" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG}Join the Discord</a>` : ''}
      </div>`;
    m.hidden = false;
    document.body.classList.add('menu-open');
    $('#burger').setAttribute('aria-expanded', 'true');
    setTimeout(() => { const b = $('button', m); b && b.focus(); }, 30);
  }
  function closeMenu() {
    const m = $('#menu');
    if (!m || m.hidden) return;
    m.hidden = true;
    document.body.classList.remove('menu-open');
    $('#burger').setAttribute('aria-expanded', 'false');
  }
  function renderFooter() {
    const community = [DISCORD && `<li><a href="${esc(DISCORD)}" target="_blank" rel="noopener">Discord</a></li>`,
      REVIEWS_CHANNEL && `<li><a href="${esc(REVIEWS_CHANNEL)}" target="_blank" rel="noopener">Post a review</a></li>`,
      LINKS.x && `<li><a href="${esc(LINKS.x)}" target="_blank" rel="noopener">X (Twitter)</a></li>`].filter(Boolean).join('');
    $('#foot').innerHTML = `<div class="wrap">
      <div class="foot-in">
        <div><a class="brand" href="#/" data-nav="home"><b>EGO</b><span>TWEAKS</span></a>
          <p>A Windows tweaking utility for gamers. ${TWEAKS.length} tweaks for FPS, input delay and ping, and every one can be undone. One-time plans from $${PLANS[0].price}.</p></div>
        <div><h4>Product</h4><ul><li><button type="button" data-nav="features">Features</button></li><li><button type="button" data-nav="tweaks">All tweaks</button></li><li><button type="button" data-nav="plans">Plans</button></li><li><button type="button" data-nav="download">Free download</button></li></ul></div>
        <div><h4>Help</h4><ul><li><button type="button" data-nav="faq">FAQ</button></li><li><button type="button" data-nav="reviews">Reviews</button></li>${DC_LOGIN ? `<li><button type="button" data-act="discord-me">${S.dc ? '@' + esc(S.dc.username) : 'Log in with Discord'}</button></li>` : ''}</ul></div>
        <div><h4>Community</h4><ul>${community}</ul></div>
        <div><h4>Legal</h4><ul><li><a href="privacy.html">Privacy</a></li><li><a href="terms.html">Terms</a></li></ul></div>
      </div>
      <div class="foot-bot">
        <span><button type="button" class="hush" data-act="admin" tabindex="-1" aria-hidden="true">©</button> ${YEAR} Ego Tweaks · app v${esc(APP.version)}</span>
        <span>Not affiliated with Microsoft, Discord or any game publisher.</span>
      </div>
    </div>`;
  }
  function renderDock() {
    $('#dock').innerHTML = `<button type="button" class="btn btn-primary" data-nav="plans">${svg('crown')}See plans</button>${DISCORD ? `<a class="btn btn-discord" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG}Discord</a>` : ''}`;
  }

  // ───────────── routing ─────────────
  const ALIAS = { premium: 'plans', pricing: 'plans', features: 'home', app: 'home', safety: 'home' };
  const SCROLL = { features: 'features', app: 'tour', safety: 'safety' };
  const PAGES = ['home', 'tweaks', 'plans', 'thanks', 'download', 'reviews', 'faq'];
  const routeFromHash = () => {
    const h = location.hash;
    if (/^#\/?(premium|plans)\/thanks/.test(h)) return 'thanks';
    const m = h.match(/^#\/?([a-z]+)/);
    const id = m ? ALIAS[m[1]] || m[1] : 'home';
    return PAGES.includes(id) ? id : 'home';
  };
  const TITLES = { home: 'Ego Tweaks 3.0 — more FPS, less lag, undo anything', tweaks: `All ${TWEAKS.length} tweaks · Ego Tweaks`, plans: 'Plans · Ego Tweaks', thanks: 'Thanks for buying · Ego Tweaks',
    download: 'Free download · Ego Tweaks', reviews: 'Reviews · Ego Tweaks', faq: 'FAQ · Ego Tweaks' };
  function go(target) {
    const page = ALIAS[target] || target;
    const sec = SCROLL[target];
    if (sec && S.page === 'home') return scrollToId(sec);
    const hash = page === 'home' ? (sec ? `#/${target}` : '#/') : page === 'thanks' ? '#/plans/thanks' : `#/${page}`;
    if (location.hash !== hash) location.hash = hash; else route(true);
  }
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }
  function route(force = false) {
    const page = routeFromHash();
    const m = location.hash.match(/^#\/?([a-z]+)/);
    const sec = m && SCROLL[m[1]];
    closeMenu();
    if (page !== S.page || force) {
      closeModal();
      S.page = page;
      renderPage();
      window.scrollTo(0, 0);
    }
    if (sec) requestAnimationFrame(() => scrollToId(sec));
  }
  function renderPage() {
    document.title = TITLES[S.page] || TITLES.home;
    const view = $('#view');
    view.innerHTML = ({ home: pageHome, tweaks: pageTweaks, plans: pagePlans, thanks: pageThanks, download: pageDownload, reviews: pageReviews, faq: pageFaq }[S.page] || pageHome)();
    renderNav();
    setupReveal(view);
    if (S.page === 'tweaks') filterXp();
    if (S.page === 'home' || S.page === 'reviews') loadReviews();
    loadDiscord();
  }
  let io = null;
  function setupReveal(view) {
    const els = $$('.reveal', view);
    if (REDUCED || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    io && io.disconnect();
    io = new IntersectionObserver((list) => list.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
  }

  // ───────────── shared blocks ─────────────
  const secHd = (k, h, p, center = false) => `<header class="sec-hd${center ? ' center' : ''} reveal"><span class="eyebrow">${k}</span><h2>${h}</h2>${p ? `<p>${p}</p>` : ''}</header>`;
  const tierTag = (n) => (n ? `<span class="tier t${n}">${esc(planOf(n).name)}</span>` : '<span class="tier t0">Free</span>');
  const faq = (q, a) => `<details><summary>${q}${svg('plus')}</summary><div class="a">${a.split('\n').map((x) => `<p>${x}</p>`).join('')}</div></details>`;
  const dcLiveBadge = () => (DISCORD ? `<a class="dc-live" href="${esc(DISCORD)}" target="_blank" rel="noopener" data-dc-wrap hidden>${DISCORD_SVG}<span><i class="dot green live"></i><b data-dc="online">—</b> online</span><span><b data-dc="members">—</b> members</span></a>` : '');
  const dialSvg = () => {
    let s = '';
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 - Math.PI / 2, r1 = 47, r2 = i % 4 ? 49 : 50.5;
      s += `<line x1="${(50 + Math.cos(a) * r1).toFixed(2)}" y1="${(50 + Math.sin(a) * r1).toFixed(2)}" x2="${(50 + Math.cos(a) * r2).toFixed(2)}" y2="${(50 + Math.sin(a) * r2).toFixed(2)}"${i < 22 ? ' class="on"' : ''} vector-effect="non-scaling-stroke"/>`;
    }
    return `<svg class="dial" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`;
  };

  // ───────────── home ─────────────
  const FEATURES = [
    { ic: 'rocket', t: 'Game Booster', n: 2, p: 'Starts when your game does: the game runs at high priority, background apps calm down, update downloads pause and the 0.5 ms timer is held. It all goes back when the game closes.' },
    { ic: 'signal', t: 'Ping Booster', n: 3, p: 'Sends your game’s traffic first and caps background uploads while you play, with live ping, jitter and spike numbers.' },
    { ic: 'cross', t: 'Crosshair & overlay', n: 1, p: 'A crosshair and an FPS counter on top of any game. It’s a separate window, so it never touches the game itself.' },
    { ic: 'sliders', t: 'Quick Optimize', n: 1, p: 'Scans your PC, shows every setting it would change, and applies what’s recommended for your hardware in one click.' },
    { ic: 'user', t: 'Sign in with Discord', n: 0, p: 'No license keys. Your plan is tied to your Discord account and unlocks on any PC you sign in on.' },
    { ic: 'undo', t: 'Undo anything', n: 0, p: 'Every change is backed up before it’s made. Switch a tweak off, or undo everything at once from Recovery.' },
    { ic: 'refresh', t: 'Updates itself', n: 0, p: 'New versions install with one click. Every update is checked to be a genuine Ego Tweaks build before it runs.' },
  ];
  const TOUR = [
    { id: 'overview', ic: 'home', t: 'Overview', p: 'Your PC at a glance: health, live CPU, GPU, RAM and storage, and one-click places to start.' },
    { id: 'quick', ic: 'bolt', t: 'Quick Optimize', p: 'Preview every setting it will change, then apply what’s recommended for your hardware.' },
    { id: 'tweaks', ic: 'sliders', t: 'All tweaks', p: `${TWEAKS.length} tweaks in ${CATEGORIES.length} sections, each with a plain-English description and a Safe or Advanced label.` },
    { id: 'booster', ic: 'rocket', t: 'Game Booster & Max FPS', p: 'Max FPS mode and Game Booster: start a game and Ego Tweaks takes over, then puts everything back when it closes.' },
    { id: 'ping', ic: 'signal', t: 'Ping Booster', p: 'Live ping, jitter and spikes. Game traffic first, background uploads capped.' },
    { id: 'overlay', ic: 'cross', t: 'Crosshair & overlay', p: 'Pick a crosshair, its size and colour, and add an FPS counter. Included from Starter.' },
    { id: 'recovery', ic: 'undo', t: 'Recovery', p: 'Undo one tweak or all of them, and make a Windows restore point in one click.' },
  ];
  const shot = (id) => `assets/shots/v3/${id}.webp`;

  function pageHome() {
    const t = TOUR.find((x) => x.id === S.tour) || TOUR[0];
    return `
    <section class="wrap hero">
      <div>
        <span class="chip red reveal"><i class="dot live"></i>New · Ego Tweaks 3.0</span>
        <h1 class="h1 reveal" style="--d:1">More FPS. Less lag. <em>Undo anything.</em></h1>
        <p class="lede reveal" style="--d:2">Ego Tweaks tunes Windows for gaming: <b>${TWEAKS.length} tweaks</b> matched to your PC, <b>Max FPS mode</b>, <b>Game Booster</b> and <b>Ping Booster</b>. Sign in with Discord, no keys. Every change can be undone.</p>
        <div class="hero-cta reveal" style="--d:3">
          <button type="button" class="btn btn-primary btn-lg" data-nav="plans">See plans — from $${PLANS[0].price}${svg('arrow')}</button>
          <button type="button" class="btn btn-line btn-lg" data-nav="download">${svg('download')}Download free</button>
        </div>
        <div class="hero-note reveal" style="--d:4"><span>${svg('card')}One-time payment</span><span>${svg('ban')}No subscription</span><span>${svg('windows')}Windows 10 &amp; 11</span></div>
        <div class="reveal" style="--d:5">${dcLiveBadge()}</div>
      </div>
      <div class="stage reveal" style="--d:2">
        ${dialSvg()}
        <img class="shot" src="${shot('overview')}" width="1600" height="1000" alt="The Ego Tweaks 3.0 app: the Overview page" fetchpriority="high">
        <div class="tag b"><span class="ic">${svg('bolt')}</span><span><b>Max FPS mode</b><br>one click</span></div>
        <div class="tag a"><span class="ic">${svg('undo')}</span><span><b>Undo anything</b><br>every change is backed up</span></div>
      </div>
    </section>

    <section class="wrap reveal" aria-label="Ego Tweaks in numbers">
      <div class="stats">
        <div><b>${TWEAKS.length}</b><span>tweaks in ${CATEGORIES.length} sections</span></div>
        <div><b>4</b><span>one-time plans, from $${PLANS[0].price}</span></div>
        <div><b>1<em>×</em></b><span>pay once, keep it for good</span></div>
        <div><b>0</b><span>tweaks that can lower your FPS</span></div>
      </div>
    </section>

    <section class="sec" id="features">
      <div class="wrap">
        ${secHd('What’s new in 3.0', 'Built for <em>frames</em>, not fluff.', 'A brand-new app with everything aimed at higher, steadier FPS and lower ping, and nothing that could make a PC slower. Tweaks that could lower FPS or add stutter on some PCs were taken out.')}
        <div class="grid g3">
          <article class="card feat big reveal">
            <div><span class="ic">${svg('bolt')}</span><h3>Max FPS mode</h3><p>One click: every FPS tweak for this PC, full CPU speed, and Game Booster with every option. Undo it any time from Recovery.</p><p style="margin-top:14px">${tierTag(4)}</p></div>
            <img src="${shot('booster')}" width="1600" height="1000" alt="Max FPS mode and Game Booster in the app" loading="lazy">
          </article>
          ${FEATURES.map((f, i) => `<article class="card feat reveal" style="--d:${(i % 3) + 1}"><span class="ic">${svg(f.ic)}</span><h3>${f.t}${f.n ? tierTag(f.n) : '<span class="tier t1" style="--pc:#3ddc84">Every plan</span>'}</h3><p>${f.p}</p></article>`).join('')}
        </div>
      </div>
    </section>

    <section class="sec tint" id="tour">
      <div class="wrap">
        ${secHd('The app', 'Easy to use. <em>Hard to beat.</em>', 'Bigger text, plain-English descriptions, and a Start here card that walks you through your first run.')}
        <div class="tour reveal">
          <div class="tour-tabs" role="tablist" aria-label="App pages">
            ${TOUR.map((x) => `<button type="button" role="tab" data-tour="${x.id}" aria-selected="${x.id === t.id}"><b>${svg(x.ic)}${x.t}</b><small>${x.p}</small></button>`).join('')}
          </div>
          <div class="tour-view" id="tour-view"><img src="${shot(t.id)}" width="1600" height="1000" alt="${esc(t.t)} in the Ego Tweaks app" loading="lazy"><p class="cap">${esc(t.p)}</p></div>
        </div>
      </div>
    </section>

    <section class="sec" id="plans">
      <div class="wrap">
        ${secHd('Plans', 'Pay once. <em>Keep it.</em>', 'Four one-time plans. Each one includes everything in the plans before it. No subscription: it never expires and nothing renews.', true)}
        ${plansGrid()}
        ${plansNote()}
      </div>
    </section>

    <section class="sec tint">
      <div class="wrap">
        ${secHd('How it works', 'Three steps. <em>No keys.</em>', '', true)}
        ${howSteps()}
      </div>
    </section>

    <section class="sec" id="safety">
      <div class="wrap safe">
        <div>${secHd('Safety', 'Every change can be <em>undone.</em>', 'Ego Tweaks saves what it changes before it changes it. Switch a tweak off and the old value goes back.')}
          <div class="reveal"><img class="shot" src="${shot('recovery')}" width="1600" height="1000" alt="The Recovery page in the app" loading="lazy"></div></div>
        <ul class="safe-list">
          <li class="reveal"><span class="ic">${svg('save')}</span><div><b>Backed up first</b><p>Before any tweak changes a setting, the value it replaces is saved.</p></div></li>
          <li class="reveal" style="--d:1"><span class="ic">${svg('undo')}</span><div><b>Undo one, or all</b><p>Switch a tweak off to undo it, or press Undo all changes in Recovery. Undo works even when you’re signed out.</p></div></li>
          <li class="reveal" style="--d:2"><span class="ic">${svg('shield')}</span><div><b>Your protection stays on</b><p>Ego Tweaks never turns off Windows Defender, the firewall, UAC, Windows Update or CPU security protections.</p></div></li>
          <li class="reveal" style="--d:3"><span class="ic">${svg('alert')}</span><div><b>Clear labels</b><p>Every tweak says whether it’s Safe or Advanced, and Advanced ones say what feature they turn off.</p></div></li>
          <li class="reveal" style="--d:4"><span class="ic">${svg('ban')}</span><div><b>Hands off your games</b><p>It changes Windows settings only. It doesn’t inject into games or change game files.</p></div></li>
        </ul>
      </div>
    </section>

    ${reviewSection()}

    <section class="sec">
      <div class="wrap">${discordBand()}</div>
    </section>

    <section class="sec tint">
      <div class="wrap">
        ${secHd('FAQ', 'Questions, <em>answered.</em>', '', true)}
        <div class="faq center reveal">${FAQ.slice(0, 6).map(([q, a]) => faq(q, a)).join('')}</div>
        <div class="center-row reveal"><button type="button" class="btn btn-line" data-nav="faq">All questions${svg('arrow')}</button></div>
      </div>
    </section>

    <section class="sec">
      <div class="wrap">
        <div class="finale reveal">
          <span class="eyebrow">Ego Tweaks 3.0</span>
          <h2>Your PC, at its <em style="font-style:normal;color:var(--accent)">fastest.</em></h2>
          <p>Pick a plan, sign in with Discord, and Ego Tweaks does the rest. Pay once and it’s yours.</p>
          <div class="hero-cta"><button type="button" class="btn btn-primary btn-lg" data-nav="plans">See plans${svg('arrow')}</button><button type="button" class="btn btn-line btn-lg" data-nav="download">${svg('download')}Free download</button></div>
        </div>
      </div>
    </section>`;
  }
  function setTour(id) {
    const t = TOUR.find((x) => x.id === id);
    if (!t) return;
    S.tour = id;
    $$('[data-tour]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tour === id)));
    const v = $('#tour-view');
    if (v) v.innerHTML = `<img src="${shot(id)}" width="1600" height="1000" alt="${esc(t.t)} in the Ego Tweaks app"><p class="cap">${esc(t.p)}</p>`;
  }
  // warm the tour images once the page is idle so switching tabs is instant
  const warmTour = () => TOUR.forEach((t) => { const i = new Image(); i.src = shot(t.id); });

  function howSteps() {
    return `<div class="steps">
      <div class="card step reveal"><span class="n">1</span><h3>Pick a plan</h3><p>Continue with Discord, then pay once through Payhip’s secure checkout. Your card details never touch this site.</p></div>
      <div class="card step reveal" style="--d:1"><span class="n">2</span><h3>Download the app</h3><p>Payhip gives you the download straight away and emails it to you, or get it from the Download page here. It’s the same app. Open EgoTweaks.exe. Nothing to install.</p></div>
      <div class="card step reveal" style="--d:2"><span class="n">3</span><h3>Sign in with Discord</h3><p>Use the same Discord account you bought with and your plan unlocks. It also unlocks on any other PC you sign in on.</p></div>
    </div>`;
  }

  // ───────────── plans ─────────────
  function plansGrid() {
    return `${DC_LOGIN ? `<div class="who-wrap reveal">${whoBar()}</div>` : ''}
      <div class="plans">${PLANS.map((p, i) => `
      <article class="card plan t${p.n}${p.flag === 'Most popular' ? ' hot' : ''} reveal" style="--d:${i}" id="plan-${p.id}">
        <div class="top"><span class="nm">${esc(p.name)}</span>${p.flag ? `<span class="flag">${esc(p.flag)}</span>` : ''}</div>
        <div class="pr">$${p.price}<small>one-time</small></div>
        <p class="sub">${esc(p.sub)}</p>
        <div class="count"><b>${upTo(p.n)}</b> tweaks${p.n > 1 ? ' in total' : ''}</div>
        <ul>${p.n > 1 ? `<li class="inc">${svg('check')}Everything in ${esc(planOf(p.n - 1).name)}, plus:</li>` : ''}${p.perks.map((x) => `<li>${svg('check')}${esc(x)}</li>`).join('')}</ul>
        <div class="buy" data-plan="${p.n}">${buyArea(p)}</div>
      </article>`).join('')}
      </div>`;
  }
  const plansNote = () => `<div class="plans-note reveal"><span>${svg('card')}One-time payment</span><span>${svg('ban')}Never expires, nothing renews</span><span>${svg('user')}Tied to your Discord, works on any PC</span><span>${svg('crown')}Upgrade any time: your highest plan counts</span></div>
    <div class="card free-strip reveal"><div><b>Not ready to buy? Start free.</b><p>Download Ego Tweaks 3.0 free: 17 free tweaks, plus Overview, live monitor, benchmarks, network tests and Recovery. Upgrade later in the same app.</p></div><button type="button" class="btn btn-line btn-sm" data-nav="download">${svg('download')}Download free</button></div>
    <div class="card free-strip reveal" style="margin-top:10px"><div><b>Already bought Premium before 3.0?</b><p>You keep it for good. Sign in to Ego Tweaks 3.0 with the same Discord account and Premium unlocks.</p></div>${DISCORD ? `<a class="btn btn-line btn-sm" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG}Ask in the Discord</a>` : ''}</div>`;

  // Who's buying: everyone continues with Discord first, so the purchase is tied to their Discord account.
  function whoBar() {
    if (!DC_LOGIN) return '';
    if (S.dcBusy) return `<div class="who"><span>Connecting to Discord…</span></div>`;
    if (!S.dc) return `<div class="who need"><span>${S.dcNote ? esc(S.dcNote) : 'Continue with Discord first, so your plan is tied to your account.'}</span><button type="button" class="btn btn-discord btn-sm" data-act="discord-connect" style="text-decoration:none;margin:0;color:#fff">${DISCORD_SVG}Continue with Discord</button></div>`;
    return `<div class="who">${dcImg(S.dc, 34)}<span>Buying as <b>${esc(dcName())}</b> <span class="muted">@${esc(S.dc.username)}</span></span><button type="button" data-act="discord-forget">Not you?</button></div>`;
  }
  // checkout link: carries the buyer's Discord ID as Payhip metadata, which Payhip passes to the bot's webhook
  const checkoutUrl = (p) => {
    const q = new URLSearchParams({ link: payhipKey(p) });
    if (DC_LOGIN && S.dc) { q.set('metadata[discord_id]', S.dc.id); q.set('metadata[discord_name]', S.dc.username); }
    return 'https://payhip.com/buy?' + q;
  };
  function buyArea(p) {
    const cls = `btn ${p.n === 4 || p.flag === 'Most popular' ? 'btn-primary' : 'btn-line'} btn-block`;
    if (!payhipKey(p)) return `<a class="btn soon btn-block" href="${esc(DISCORD || '#/plans')}" target="_blank" rel="noopener" data-act="buy-soon" data-plan="${p.n}">Coming soon</a><p class="why">Ask in the Discord to get ${esc(p.name)} now.</p>`;
    if (!DC_LOGIN) return `<a class="${cls}" href="${esc(checkoutUrl(p))}" target="_blank" rel="noopener" data-act="buy" data-plan="${p.n}">Buy ${esc(p.name)} — $${p.price}</a>`;
    if (S.dcBusy) return `<button class="${cls} busy" disabled>Connecting</button>`;
    if (!S.dc) return `<button type="button" class="${cls}" data-act="discord-connect" data-plan="${p.n}">${DISCORD_SVG}Continue to buy</button>`;
    if (DISCORD_LOGIN.guildId && !S.dc.inGuild) {
      return `<a class="btn btn-discord btn-block" href="${esc(DISCORD)}" target="_blank" rel="noopener" data-act="discord-join">${DISCORD_SVG}Join the Discord first</a><button type="button" class="btn btn-ghost btn-sm btn-block" data-act="discord-recheck">I’ve joined — continue</button>`;
    }
    return `<a class="${cls}" href="${esc(checkoutUrl(p))}" target="_blank" rel="noopener" data-act="buy" data-plan="${p.n}">Buy ${esc(p.name)} — $${p.price}</a>`;
  }
  const refreshBuy = () => {
    $$('.buy[data-plan]').forEach((el) => { el.innerHTML = buyArea(planOf(Number(el.dataset.plan))); });
    $$('.who-wrap').forEach((el) => { el.innerHTML = whoBar(); });
  };
  const thanksUrl = () => location.href.split(/[?#]/)[0] + '?premium=thanks#/plans/thanks';

  function buyPlan(e, el) {
    closeMenu();
    const p = planOf(Number(el.dataset.plan));
    if (!payhipKey(p)) { e.preventDefault(); return; }
    track('/api/event', { t: 'buy', plan: p.id });
    if (DC_LOGIN && S.dc) {
      // the link opens Payhip in a new tab (it carries the Discord ID); this tab says what happens next
      openModal(`
        <div class="mark dc">${DISCORD_SVG}</div>
        <h2 class="h2">Finish paying in the new tab</h2>
        <p>Payhip’s checkout opened in a new tab for <b>${esc(p.name)} — $${p.price}</b>. Once you’ve paid, Payhip shows your download and emails it to you.</p>
        <p>Open Ego Tweaks, press <b>Sign in with Discord</b> as <b>@${esc(S.dc.username)}</b>, and ${esc(p.name)} unlocks. The Ego Tweaks bot also DMs you on Discord.</p>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-nav="thanks">What happens next</button><button type="button" class="btn btn-primary" data-act="close">Got it</button></div>`);
      return;
    }
    const checkout = window.Payhip && window.Payhip.Checkout;
    if (checkout && typeof checkout.open === 'function') {
      try { checkout.open({ product: payhipKey(p), successUrl: thanksUrl() }); e.preventDefault(); return; } catch (_) { /* fall back to the new tab */ }
    }
    openModal(`
      <div class="mark">${svg('card')}</div>
      <h2 class="h2">Finish paying in the new tab</h2>
      <p>Payhip’s checkout opened in a new tab. Once you’ve paid, open Ego Tweaks and sign in with Discord to unlock your plan.</p>
      <div class="modal-actions"><button type="button" class="btn btn-primary" data-act="close">Got it</button></div>`);
  }

  function compareTable() {
    const rows = [
      ['Tweaks'],
      ['Windows, privacy and clean-up tweaks (216)', 1], ['Performance tweaks: CPU, stutter, GPU, input, services (250)', 2], ['Network and power-plan tweaks (63)', 3], ['CPU and GPU clock tweaks (20)', 4],
      ['Tools'],
      ['Quick Optimize and Profiles', 1], ['Crosshair and FPS overlay', 1], ['Startup apps and temp-file clean-up', 1], ['Mouse and keyboard tests', 1],
      ['Game Booster', 2], ['Process killer and per-game settings', 2], ['Stutter checklist, deep clean, memory clearing', 2], ['BIOS guide', 2],
      ['Ping Booster', 3], ['DNS switching', 3], ['Automatic memory clearing', 3], ['Session reports and setup codes', 3],
      ['Max FPS mode', 4], ['Full CPU speed', 4], ['Keyboard overclock', 4],
      ['Every plan'],
      ['17 free tweaks: Game Mode, GPU scheduling, mouse acceleration off and more', 1], ['Undo and Recovery', 1], ['Automatic updates', 1], ['Sign in with Discord, on any PC', 1], ['Benchmarks and live monitor', 1],
    ];
    return `<div class="cmp-wrap reveal"><table class="cmp">
      <thead><tr><th scope="col">What you get</th>${PLANS.map((p) => `<th scope="col" class="t${p.n}" style="color:var(--pc)">${esc(p.name)}<span>$${p.price} once</span></th>`).join('')}</tr></thead>
      <tbody>${rows.map(([name, n]) => (n === undefined
        ? `<tr class="grp"><td colspan="5">${esc(name)}</td></tr>`
        : `<tr><td>${esc(name)}</td>${PLANS.map((p) => (p.n >= n ? `<td aria-label="Included">${svg('check')}</td>` : '<td class="no" aria-label="Not included">—</td>')).join('')}</tr>`)).join('')}</tbody>
    </table></div>`;
  }

  function pagePlans() {
    return `<div class="wrap page">
      <header class="page-hd reveal"><span class="eyebrow">Plans</span><h1 class="h1">Pay once. <em>Keep it.</em></h1>
        <p>Four one-time plans, each including everything before it. No subscription: your plan never expires and nothing renews. It’s tied to your Discord account, so it works on any PC you sign in on.</p></header>
      ${plansGrid()}
      ${plansNote()}
      <section class="sec" style="padding-bottom:0">
        ${secHd('Compare', 'Everything, <em>side by side.</em>')}
        ${compareTable()}
      </section>
      <section class="sec" style="padding-bottom:0">
        ${secHd('After you pay', 'Three steps. <em>No keys.</em>')}
        ${howSteps()}
      </section>
      <section class="sec" style="padding-bottom:0">
        ${secHd('Buying', 'Questions about <em>plans.</em>')}
        <div class="faq reveal">${FAQ.filter((x) => x[2] === 'plans').map(([q, a]) => faq(q, a)).join('')}</div>
      </section>
    </div>`;
  }

  function pageThanks() {
    return `<div class="wrap page">
      <div class="card thanks reveal">
        <div class="ok">${svg('check')}</div>
        <h1>Thanks for buying Ego Tweaks</h1>
        <p>Your plan is yours for good: it never expires and nothing renews. Payhip is emailing you a receipt with your download${S.dc ? `, and the Ego Tweaks bot is messaging <b>@${esc(S.dc.username)}</b> on Discord` : ''}.</p>
        <div class="steps">
          <div class="card step"><span class="n">1</span><h3>Download</h3><p>Use the download Payhip showed you, the link in your receipt email, or the Download page here. Already have Ego Tweaks 3.0? Skip this.</p></div>
          <div class="card step"><span class="n">2</span><h3>Open EgoTweaks.exe</h3><p>Windows asks for administrator access. If SmartScreen appears, choose More info → Run anyway.</p></div>
          <div class="card step"><span class="n">3</span><h3>Sign in with Discord</h3><p>Use the Discord account you bought with. Your plan unlocks straight away. Already signed in? Go to Plans and press Refresh.</p></div>
        </div>
        <div class="hero-cta" style="justify-content:center">${DISCORD ? `<a class="btn btn-discord btn-lg" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG}Open the Discord</a>` : ''}<button type="button" class="btn btn-line btn-lg" data-nav="faq">Help &amp; FAQ</button></div>
      </div>
    </div>`;
  }

  // ───────────── tweaks explorer ─────────────
  function pageTweaks() {
    return `<div class="wrap page">
      <header class="page-hd reveal"><span class="eyebrow">Tweaks</span><h1 class="h1">All ${TWEAKS.length} <em>tweaks.</em></h1>
        <p>Every tweak in Ego Tweaks 3.0, what it does, and which plan it comes with. Each one is backed up before it changes anything and can be switched off again.</p></header>
      <div class="xp-bar">
        <div class="xp-row">
          <label class="search">${svg('search')}<input id="xp-q" type="search" placeholder="Search tweaks — try “mouse”, “ping” or “telemetry”" value="${esc(S.xq)}" autocomplete="off" spellcheck="false" aria-label="Search tweaks"></label>
          <div class="seg" role="group" aria-label="Plan">${[{ n: 0, name: 'All plans' }, { n: -1, name: 'Free' }].concat(PLANS).map((p) => `<button type="button" data-xtier="${p.n}" aria-pressed="${S.xtier === p.n}">${esc(p.name)}</button>`).join('')}</div>
        </div>
        <div class="cats" role="group" aria-label="Section">${[{ id: 'all', name: 'All' }].concat(CATEGORIES).map((c) => `<button type="button" data-xcat="${c.id}" aria-pressed="${S.xcat === c.id}">${esc(c.short || c.name)}<small>${c.id === 'all' ? TWEAKS.length : perCat(c.id)}</small></button>`).join('')}</div>
      </div>
      <p class="xp-sum" id="xp-sum" aria-live="polite"></p>
      <div class="xp-list" id="xp-list"></div>
      <div class="center-row" id="xp-more"></div>
    </div>`;
  }
  const mark = (text, q) => {
    const s = esc(text);
    if (!q) return s;
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&amp;') + ')', 'ig');
    return s.replace(re, '<mark>$1</mark>');
  };
  function filterXp() {
    const list = $('#xp-list');
    if (!list) return;
    const q = S.xq.trim().toLowerCase();
    const hits = TWEAKS.filter((t) => (S.xcat === 'all' || t.cat === S.xcat) && (S.xtier === -1 ? !t.tier : !S.xtier || t.tier <= S.xtier)
      && (!q || t.name.toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q)));
    const shown = hits.slice(0, S.xshow);
    const cat = CATEGORIES.find((c) => c.id === S.xcat);
    $('#xp-sum').innerHTML = `<b>${hits.length}</b> tweak${hits.length === 1 ? '' : 's'}${cat ? ` in ${esc(cat.name)} <span class="muted">— ${esc(cat.blurb)}</span>` : ''}${S.xtier === -1 ? ' free, no plan needed' : S.xtier ? ` included with ${esc(planOf(S.xtier).name)}` : ''}`;
    list.innerHTML = shown.length ? shown.map((t) => `<article class="xp-item">
        <div class="t"><b>${mark(t.name, q)}</b>${tierTag(t.tier)}</div>
        ${t.desc ? `<p>${mark(t.desc, q)}</p>` : ''}
        <span class="meta">${esc((CATEGORIES.find((c) => c.id === t.cat) || {}).name || t.cat)}</span>
      </article>`).join('') : '<div class="card rv-empty" style="grid-column:1/-1">No tweaks match that. Try another word, or pick All.</div>';
    $('#xp-more').innerHTML = hits.length > shown.length ? `<button type="button" class="btn btn-line" data-act="xp-more">Show more <span class="muted">(${hits.length - shown.length} more)</span></button>` : '';
  }

  // ───────────── download (free classic build) ─────────────
  function pageDownload() {
    const u = S.user;
    const ready = DC_LOGIN ? !!S.dc : !!u;
    const step = (n, title, text, done = false) => `<li${done ? ' class="done"' : ''}><span class="n">${done ? svg('check') : n}</span><div><b>${title}</b><p>${text}</p></div></li>`;
    const flow = DC_LOGIN
      ? step(1, S.dc ? `Logged in as @${esc(S.dc.username)}` : 'Log in with Discord', 'One click on Discord’s own page, no password on this site.', !!S.dc)
        + step(2, S.dc && S.dc.inGuild ? 'You’re in the server' : 'Join the Discord', DC_JOIN ? 'You’re added to the Ego Tweaks Discord automatically. Updates and help happen there.' : 'Updates and help happen in the Ego Tweaks Discord.', !!(S.dc && S.dc.inGuild))
        + step(3, 'The download starts', `${esc(BUILD.file)}, ${fmtMB(BUILD.bytes)}. Nothing to install.`)
      : step(1, u ? `Signed in as @${esc(u.username)}` : 'Make a free account', 'Username, email and password. It takes a few seconds.', !!u)
        + step(2, 'The download starts', `${esc(BUILD.file)}, ${fmtMB(BUILD.bytes)}.`);
    return `<div class="wrap page">
      <header class="page-hd reveal"><span class="eyebrow">Download</span><h1 class="h1">Download <em>free.</em></h1>
        <p>Get Ego Tweaks 3.0 free for Windows 10 and 11. The Free plan checks your PC, ping and performance, and every paid plan unlocks in this same app: just sign in with Discord.</p></header>
      <div class="dl">
        <div class="card dl-card main reveal">
          <span class="chip red">Free · v${esc(BUILD.version)}</span>
          <h2>${esc(BUILD.name)} 3.0</h2>
          <div class="dl-file"><span class="logo">EGO</span><div><b>${esc(BUILD.file)}</b><small>v${esc(BUILD.version)} · ${fmtMB(BUILD.bytes)} · Windows 10 &amp; 11</small></div></div>
          <button type="button" class="btn ${ready || !DC_LOGIN ? 'btn-primary' : 'btn-discord'} btn-lg btn-block" data-act="get">${ready ? `${svg('download')}Download free` : DC_LOGIN ? `${DISCORD_SVG}Continue with Discord to download` : `${svg('download')}Get it free`}</button>
          <ol class="flow">${flow}</ol>
        </div>
        <div class="card dl-card reveal" style="--d:1">
          <span class="chip">Free plan</span>
          <h2>What’s free</h2>
          <ul class="free-list">${FREE.map((x) => `<li>${svg('check')}${esc(x)}</li>`).join('')}</ul>
          <p>Want the rest? All ${TWEAKS.length} tweaks, Max FPS mode, Game Booster, Ping Booster and the crosshair come with a plan, from $${PLANS[0].price} once. It unlocks in the app you download here.</p>
          <button type="button" class="btn btn-line btn-block" data-nav="plans">See plans${svg('arrow')}</button>
        </div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div class="card dl-card reveal"><h3 style="margin:0">The file</h3>
          <dl class="kv"><dt>File</dt><dd>${esc(BUILD.file)}</dd><dt>Version</dt><dd>${esc(BUILD.version)}</dd><dt>Size</dt><dd>${fmtMB(BUILD.bytes)} (${BUILD.bytes.toLocaleString()} bytes)</dd>
            <dt>SHA-256</dt><dd><span class="hash">${esc(BUILD.sha256)}</span><button type="button" class="copy" data-act="copy-hash">Copy</button></dd></dl>
          <p style="font-size:14.5px">In PowerShell, <code>Get-FileHash .\\${esc(BUILD.file)}</code> should show the same hash.</p></div>
        <div class="card dl-card reveal" style="--d:1"><h3 style="margin:0">What you need</h3>
          <dl class="kv"><dt>Windows</dt><dd>Windows 10 or 11, 64-bit</dd><dt>Runtime</dt><dd>Microsoft Edge WebView2, already on nearly every PC (<a href="https://developer.microsoft.com/microsoft-edge/webview2/" target="_blank" rel="noopener">get it</a>)</dd>
            <dt>.NET</dt><dd>.NET Framework 4.7.2 or later, built into Windows 10 (1803+) and 11</dd><dt>Access</dt><dd>Administrator: Windows asks when it opens</dd></dl>
          <p style="font-size:14.5px">If SmartScreen appears, choose <b>More info → Run anyway</b>. It shows for apps Windows hasn’t seen much yet.</p></div>
      </div>
    </div>`;
  }
  function copyHash(el) {
    const done = () => { toast('SHA-256 copied'); el.textContent = 'Copied'; setTimeout(() => (el.textContent = 'Copy'), 1600); };
    try { navigator.clipboard.writeText(BUILD.sha256).then(done).catch(() => toast('Select the hash and copy it', { bad: true })); } catch (_) { toast('Select the hash and copy it', { bad: true }); }
  }

  // ───────────── reviews ─────────────
  const reviewList = () => S.reviews || [];
  const reviewDate = (r) => { try { return new Date(r.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (_) { return ''; } };
  const stars = (n) => (n >= 1 && n <= 5 ? `<span class="stars" aria-label="${n} out of 5 stars">${svg('star').repeat(n)}</span>` : '');
  const reviewAv = (r) => (r.avatar ? `<img src="${esc(r.avatar)}" data-fb="${esc(avPlaceholder(r.name))}" alt="" width="32" height="32" loading="lazy" referrerpolicy="no-referrer">` : `<span class="av">${esc((r.name || '?')[0].toUpperCase())}</span>`);
  const reviewCard = (r, hidden = false) => `<figure class="card rv-card"${hidden ? ' aria-hidden="true"' : ''}>
      ${stars(Number(r.stars))}<blockquote>${esc(r.text)}</blockquote>
      <figcaption>${reviewAv(r)}<b>${esc(r.name)}</b>${r.at ? `<time datetime="${new Date(r.at).toISOString()}">${esc(reviewDate(r))}</time>` : ''}</figcaption>
    </figure>`;
  function reviewTrack() {
    const list = reviewList().slice(0, 24), loop = [];
    if (!list.length) return '';
    while (loop.length < 6) loop.push(...list);
    return loop.map((r, i) => reviewCard(r, i >= list.length)).join('') + loop.map((r) => reviewCard(r, true)).join('');
  }
  function reviewSection() {
    if (!REVIEWS_CHANNEL) return '';
    return `<section class="sec tint" id="reviews"${reviewList().length ? '' : ' hidden'}>
      <div class="wrap">${secHd('Reviews', 'Straight from <em>the Discord.</em>', 'Every message in our #reviews channel, live.')}</div>
      <div class="marquee reveal"><div class="marquee-track" id="rv-track" style="--dur:${Math.max(40, reviewList().slice(0, 24).length * 8)}s">${reviewTrack()}</div></div>
      <div class="center-row reveal"><button type="button" class="btn btn-line" data-nav="reviews">All <span data-rv-n>${reviewList().length}</span> reviews${svg('arrow')}</button></div>
    </section>`;
  }
  const REVIEWS_PAGE = 30;
  function reviewGrid() {
    const list = reviewList(), shown = list.slice(0, S.rvShow || REVIEWS_PAGE);
    if (!list.length) return `<div class="card rv-empty">${S.reviews == null ? 'Loading reviews from the Discord…' : 'No reviews yet. Be the first.'}</div>`;
    return `<div class="rv-grid">${shown.map((r) => reviewCard(r)).join('')}</div>
      ${list.length > shown.length ? `<div class="center-row"><button type="button" class="btn btn-line" data-act="reviews-more">Show more <span class="muted">(${list.length - shown.length} left)</span></button></div>` : ''}`;
  }
  function reviewStats() {
    const list = reviewList(), st = list.map((r) => Number(r.stars)).filter((x) => x >= 1 && x <= 5);
    return `<span><b>${S.reviews ? list.length : '—'}</b> reviews</span>${st.length ? `<span><b>${(st.reduce((a, b) => a + b, 0) / st.length).toFixed(1)}</b> average of ${st.length} star rating${st.length === 1 ? '' : 's'}</span>` : ''}<span><i class="dot green live"></i>Live from Discord</span>`;
  }
  function pageReviews() {
    const post = REVIEWS_CHANNEL ? `<a href="${esc(REVIEWS_CHANNEL)}" target="_blank" rel="noopener">post yours in #reviews</a>` : 'post yours in our Discord';
    return `<div class="wrap page">
      <header class="page-hd reveal"><span class="eyebrow">Reviews</span><h1 class="h1">Straight from <em>the Discord.</em></h1>
        <p>Every message in our Discord’s #reviews channel, live. Bought a plan? ${post} and it shows up here in a couple of minutes.</p></header>
      <div class="rv-stats reveal" id="rv-stats">${reviewStats()}</div>
      <div id="rv-list" class="reveal">${reviewGrid()}</div>
      ${REVIEWS_CHANNEL ? `<div class="center-row"><a class="btn btn-discord" href="${esc(REVIEWS_CHANNEL)}" target="_blank" rel="noopener">${DISCORD_SVG}Post a review</a></div>` : ''}
    </div>`;
  }
  // fetch the reviews channel from the bot; repaint only what changed
  let rvSig = '';
  async function loadReviews() {
    if (!REVIEWS_CHANNEL || !DISCORD_LOGIN.botUrl) { S.reviews = []; return; }
    if (S.reviews === undefined) {
      try { const c = JSON.parse(sessionStorage.getItem('ego-reviews') || 'null'); S.reviews = Array.isArray(c) ? c : null; } catch (_) { S.reviews = null; }
      rvSig = (S.reviews || []).map((r) => r.id + (r.edited ? 'e' : '')).join(',');
      if (S.reviews && S.reviews.length) paintReviews();
    }
    try {
      const res = await fetch(DISCORD_LOGIN.botUrl.replace(/\/+$/, '') + '/reviews', { cache: 'no-store' });
      const j = await res.json();
      if (!j || !j.ok || !Array.isArray(j.reviews)) throw new Error('not ready');
      const list = j.reviews.filter((r) => r && r.text && r.name).map((r) => ({ id: r.id, name: String(r.name), text: String(r.text), avatar: /^https:\/\/cdn\.discordapp\.com\//.test(r.avatar || '') ? r.avatar : '', stars: r.stars, at: Number(r.at) || 0, edited: !!r.edited }));
      const sig = list.map((r) => r.id + (r.edited ? 'e' : '') + r.text.length).join(',');
      const first = S.reviews === null;
      S.reviews = list;
      try { sessionStorage.setItem('ego-reviews', JSON.stringify(list)); } catch (_) { /* full or blocked */ }
      if (sig !== rvSig || first) { rvSig = sig; paintReviews(); }
    } catch (_) {
      if (S.reviews === null) { S.reviews = []; paintReviews(); }
    }
  }
  function paintReviews() {
    $$('[data-rv-n]').forEach((el) => (el.textContent = String(reviewList().length)));
    if (S.page === 'reviews') {
      const stats = $('#rv-stats'), box = $('#rv-list');
      if (stats) stats.innerHTML = reviewStats();
      if (box) box.innerHTML = reviewGrid();
    }
    if (S.page === 'home') {
      const sec = $('#reviews'), track = $('#rv-track');
      if (sec) sec.hidden = !reviewList().length;
      if (track) { track.innerHTML = reviewTrack(); track.style.setProperty('--dur', Math.max(40, reviewList().slice(0, 24).length * 8) + 's'); }
      if (sec) $$('.reveal', sec).forEach((e) => e.classList.add('in'));
    }
  }
  if (REVIEWS_CHANNEL) setInterval(() => { if (!document.hidden) loadReviews(); }, 120000);

  function discordBand() {
    return `<div class="dc-band reveal" id="community">
      <div>
        <span class="eyebrow">Community</span>
        <h2>Join the Ego Tweaks Discord.</h2>
        <p>Help with a tweak or a game, launch news, giveaways and the first look at every update.</p>
        <div class="dc-nums" data-dc-wrap hidden><div><b data-dc="members">—</b><span>members</span></div><div><b data-dc="online">—</b><span><i class="dot green live"></i>online now</span></div></div>
        ${DISCORD ? `<a class="btn btn-discord btn-lg" href="${esc(DISCORD)}" target="_blank" rel="noopener">${DISCORD_SVG}Join the Discord</a>` : ''}
      </div>
      <ul class="dc-list">
        <li><span class="ic">${svg('user')}</span><div><b>Your plan, your role</b><small>Signing in to the app gives you your plan’s role in the server.</small></div></li>
        <li><span class="ic">${svg('chat')}</span><div><b>Help when you need it</b><small>Stuck on a tweak, a game or a BIOS step? Open a ticket.</small></div></li>
        <li><span class="ic">${svg('spark')}</span><div><b>Updates first</b><small>New versions and new tweaks, as they land.</small></div></li>
      </ul>
    </div>`;
  }

  // ───────────── FAQ ─────────────
  const FAQ = [
    ['What is Ego Tweaks?', `A Windows app that tunes your PC for gaming. It changes Windows settings (power, scheduling, services, network, input and more) for higher, steadier FPS, lower input delay and steadier ping. There are ${TWEAKS.length} tweaks, and every one can be undone.`, 'about'],
    ['Is it a subscription?', 'No. Every plan is a one-time payment. It never expires and nothing renews or charges you again.', 'plans'],
    ['How do I get my plan after paying?', 'Payhip gives you the download straight away and emails it to you. Open Ego Tweaks, press Sign in with Discord, and use the same Discord account you bought with. Your plan unlocks right there. There’s no key to copy.\nAlready signed in when you bought? Go to Plans in the app and press Refresh.', 'plans'],
    ['I bought Premium before 3.0. Do I keep it?', 'Yes, for good. Sign in to Ego Tweaks 3.0 with the Discord account you bought with and Premium unlocks. If it doesn’t, open a ticket in the Discord.', 'plans'],
    ['Is it safe? Can I undo everything?', 'Yes. Before any tweak changes a setting, Ego Tweaks saves the value it replaces. Switch a tweak off to undo it, or press Undo all changes in Recovery. Undo works even when you’re signed out. Ego Tweaks never turns off Windows Defender, the firewall, UAC, Windows Update or CPU security protections.', 'about'],
    ['Can I get banned for using it?', 'Ego Tweaks changes Windows settings only. It doesn’t inject into games, read their memory or change their files, and the crosshair overlay is a separate window. You’re still responsible for following each game’s rules.', 'about'],
    ['Can I upgrade later?', 'Yes. Buy the bigger plan whenever you like. The highest plan you’ve bought is the one that counts.', 'plans'],
    ['Does it work on more than one PC?', 'Your plan is tied to your Discord account, so it unlocks on any PC you sign in on.', 'plans'],
    ['Why do I need to continue with Discord to buy?', 'So your purchase is tied to your Discord account. That’s how the app knows what you bought when you sign in, and how the bot gives you your role. Continuing with Discord also adds you to the server if you’re not in it yet.', 'plans'],
    ['How do updates work?', 'Ego Tweaks checks for updates when it starts and every 6 hours. When there’s a new version, an Update button appears at the top. Press it and it downloads, checks it’s a genuine Ego Tweaks build, and restarts on the new version. Your tweaks and settings stay as they are.', 'about'],
    ['What do I need to run it?', 'Windows 10 or 11 (64-bit). The window uses Microsoft Edge WebView2, which nearly every PC already has. Ego Tweaks asks for administrator access because it changes system settings.', 'about'],
    ['Windows says “Windows protected your PC”. What do I do?', 'Click More info, then Run anyway. SmartScreen shows this for apps Windows hasn’t seen much yet.', 'about'],
    ['Does it work offline?', 'Yes, for up to 3 days at a time. Then it checks in again by itself the next time you’re online.', 'about'],
    ['Is there a free version?', `Yes. Download Ego Tweaks 3.0 free from the Download page. The Free plan includes ${TWEAKS.filter((t) => !t.tier).length} tweaks (Game Mode, GPU scheduling, mouse acceleration off, no Start ads and more), the Overview, live monitor, benchmarks, network diagnostics and Recovery. The rest of the ${TWEAKS.length} tweaks, Max FPS mode and the boosters come with a plan, and they unlock in the same app when you sign in with Discord.`, 'about'],
  ];
  function pageFaq() {
    return `<div class="wrap page">
      <header class="page-hd reveal"><span class="eyebrow">FAQ</span><h1 class="h1">Questions, <em>answered.</em></h1>
        <p>Can’t find yours? Ask in the ${DISCORD ? `<a href="${esc(DISCORD)}" target="_blank" rel="noopener">Discord</a>` : 'Discord'}.</p></header>
      <div class="faq reveal">${FAQ.map(([q, a]) => faq(q, a)).join('')}</div>
    </div>`;
  }

  // ───────────── Continue with Discord (downloads and buying) ─────────────
  // Discord's OAuth "implicit grant": Discord sends the visitor back here with a short-lived token in the
  // address bar. The browser uses it to read their Discord ID and check they're in the server; if they
  // aren't, the token goes to the bot (botUrl), which adds them. When buying, the ID goes into the
  // Payhip checkout link so the bot can match the purchase to them.
  const DC_LOGIN = !!DISCORD_LOGIN.clientId;
  const DC_JOIN = !!(DISCORD_LOGIN.botUrl && DISCORD_LOGIN.guildId);
  const keep = {
    get(k, area = localStorage) { try { return JSON.parse(area.getItem(k) || 'null'); } catch (_) { return null; } },
    set(k, v, area = localStorage) { try { if (v === null) area.removeItem(k); else area.setItem(k, JSON.stringify(v)); } catch (_) { /* storage blocked */ } },
  };
  S.dc = DC_LOGIN ? keep.get('ego-discord') : null;
  const dcDefault = (d) => { let n = 0; try { n = Number((BigInt(d.id) >> 22n) % 6n); } catch (_) { /* odd id */ } return `https://cdn.discordapp.com/embed/avatars/${n}.png`; };
  const dcAvatar = (d) => (d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=128` : dcDefault(d));
  // A Discord picture with fallbacks: the saved picture can be gone (changed since they logged in) or blocked,
  // so it drops to their default Discord avatar, then to a drawn initial. Never a broken image.
  const dcImg = (d, size) => `<img src="${esc(dcAvatar(d))}" data-fb="${esc(d.avatar ? dcDefault(d) : avPlaceholder(d.name || d.username))}" data-fb2="${esc(avPlaceholder(d.name || d.username))}"${d.avatar ? ' data-dc-own' : ''} alt="" width="${size}" height="${size}" referrerpolicy="no-referrer">`;
  const dcName = () => (S.dc ? S.dc.name || S.dc.username : '');

  // page: where to come back to. then: 'download' starts the download once they're back.
  function discordConnect(page = 'plans', then = '') {
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    keep.set('ego-oauth-state', state, sessionStorage);
    keep.set('ego-oauth-after', { page, then }, sessionStorage);
    location.href = 'https://discord.com/oauth2/authorize?' + new URLSearchParams({
      client_id: DISCORD_LOGIN.clientId, response_type: 'token', redirect_uri: location.origin + '/',
      scope: ['identify', DISCORD_LOGIN.guildId && 'guilds', DC_JOIN && 'guilds.join'].filter(Boolean).join(' '), state, prompt: 'none',
    });
  }
  // Ask the bot to add this visitor to the Discord server.
  async function dcJoin(token) {
    if (!DC_JOIN) return false;
    try {
      const r = await fetch(DISCORD_LOGIN.botUrl.replace(/\/+$/, '') + '/join', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ access_token: token }) });
      const j = await r.json().catch(() => ({}));
      return Boolean(r.ok && j.ok);
    } catch (_) { return false; }
  }
  function dcChanged() {
    refreshBuy();
    renderNav(); renderFooter();
    if (S.page === 'download') renderPage();
  }
  async function dcFetch(path, token) {
    const r = await fetch('https://discord.com/api/v10' + path, { headers: { authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error('Discord said ' + r.status);
    return r.json();
  }
  async function dcInGuild(token) {
    if (!DISCORD_LOGIN.guildId) return true;
    return (await dcFetch('/users/@me/guilds', token)).some((g) => g.id === DISCORD_LOGIN.guildId);
  }
  // Back from Discord: the address bar holds #access_token=…&state=… (or #error=…).
  async function finishDiscordLogin(params) {
    const expected = keep.get('ego-oauth-state', sessionStorage);
    const after = keep.get('ego-oauth-after', sessionStorage) || { page: 'plans' };
    keep.set('ego-oauth-state', null, sessionStorage);
    keep.set('ego-oauth-after', null, sessionStorage);
    const page = ['home', 'download', 'plans'].includes(after.page) ? after.page : 'plans';
    const hash = page === 'home' ? '#/' : `#/${page}`;
    try { history.replaceState(null, '', location.pathname + hash); } catch (_) { location.hash = hash; }
    const token = params.get('access_token');
    if (!token || params.get('state') !== expected) {
      S.dcNote = params.get('error') === 'access_denied' ? 'Discord login was cancelled. Press the button to try again.' : 'Discord login didn’t finish. Press the button to try again.';
      return;
    }
    S.dcBusy = true;
    try {
      const me = await dcFetch('/users/@me', token);
      let inGuild = await dcInGuild(token).catch(() => true);
      const joinedNow = !inGuild && (await dcJoin(token));
      if (joinedNow) inGuild = true;
      S.dc = { id: me.id, username: me.username, name: me.global_name || me.username, avatar: me.avatar, inGuild };
      keep.set('ego-discord', S.dc);
      keep.set('ego-discord-token', { token, exp: Date.now() + (Number(params.get('expires_in')) || 3600) * 1000 }, sessionStorage);
      S.dcNote = '';
      toast(joinedNow ? `Logged in as @${me.username}. You’re in our Discord now.` : `Logged in as @${me.username}`);
    } catch (_) {
      S.dcNote = 'Couldn’t reach Discord. Press the button to try again.';
    }
    S.dcBusy = false;
    dcChanged();
    if (after.then === 'download' && S.dc) startDownload();
  }
  async function discordRecheck(quiet = false) {
    const t = keep.get('ego-discord-token', sessionStorage);
    if (!S.dc || !t || t.exp < Date.now()) return discordConnect(S.page === 'download' ? 'download' : 'plans');
    try { S.dc.inGuild = (await dcInGuild(t.token)) || (await dcJoin(t.token)); } catch (_) { return discordConnect(S.page === 'download' ? 'download' : 'plans'); }
    keep.set('ego-discord', S.dc);
    if (S.dc.inGuild) S.dcAwaitJoin = false;
    else if (!quiet) toast('You’re not in the server yet. Join it, then press continue.', { bad: true });
    refreshBuy();
  }
  function discordLogout() {
    S.dc = null;
    keep.set('ego-discord', null);
    keep.set('ego-discord-token', null, sessionStorage);
    closeModal(); closeMenu();
    dcChanged();
    toast('Logged out');
  }
  function openDiscordMe() {
    closeMenu();
    if (!S.dc) return discordConnect(['home', 'download', 'plans'].includes(S.page) ? S.page : 'plans');
    openModal(`
      <button type="button" class="x" data-act="close" aria-label="Close">${svg('x')}</button>
      <div class="acct">${dcImg(S.dc, 52)}<div><b>${esc(dcName())}</b><small>@${esc(S.dc.username)} · logged in with Discord</small></div></div>
      <p>${S.dc.inGuild ? 'You’re in the Ego Tweaks Discord. Updates, help and your plan’s role all happen there.' : 'Join the Ego Tweaks Discord for updates, help and your plan’s role.'}</p>
      <p class="muted" style="font-size:14px">This login is only for this website. To use your plan, sign in with Discord inside the Ego Tweaks app.</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="discord-forget">Log out</button><span class="sp"></span>
        ${DISCORD ? `<a class="btn btn-line" href="${esc(DISCORD)}" target="_blank" rel="noopener">Open Discord</a>` : ''}
        <button type="button" class="btn btn-primary" data-act="close">Done</button>
      </div>`);
  }
  // After "Join the Discord first", check again as soon as they come back to this tab.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.dcAwaitJoin) discordRecheck(true); });

  // ───────────── live Discord numbers (from the public invite link) ─────────────
  const DC = { data: null, tried: false };
  const inviteCode = (url) => (String(url || '').match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]+)/i) || [])[1] || '';
  async function loadDiscord() {
    if (DC.tried) return fillDiscord();
    DC.tried = true;
    const code = inviteCode(DISCORD);
    if (!code) return;
    try {
      const c = JSON.parse(sessionStorage.getItem('ego-dc') || 'null');
      if (c && c.code === code && Date.now() - c.at < 600000) { DC.data = c; return fillDiscord(); }
    } catch (_) { /* storage blocked */ }
    try {
      const r = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`);
      if (!r.ok) return;
      const j = await r.json();
      const members = Number(j.approximate_member_count) || 0, online = Number(j.approximate_presence_count) || 0;
      if (!members) return;
      DC.data = { code, members, online, at: Date.now() };
      try { sessionStorage.setItem('ego-dc', JSON.stringify(DC.data)); } catch (_) { /* storage blocked */ }
      fillDiscord();
    } catch (_) { /* Discord unreachable: the numbers just stay hidden */ }
  }
  function fillDiscord() {
    const d = DC.data;
    if (!d) return;
    $$('[data-dc]').forEach((el) => { el.textContent = Number(d[el.dataset.dc] || 0).toLocaleString(); });
    $$('[data-dc-wrap]').forEach((el) => (el.hidden = false));
  }

  // ───────────── toasts ─────────────
  function toast(msg, { bad = false, icon = '', ms = 3600 } = {}) {
    const el = document.createElement('div');
    el.className = 'toast' + (bad ? ' bad' : '');
    el.innerHTML = `${svg(icon || (bad ? 'alert' : 'check'))}<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
  }

  // ───────────── modals ─────────────
  let lastFocus = null;
  function openModal(html) {
    const host = $('#modal');
    if (!host.firstElementChild) lastFocus = document.activeElement;
    host.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    labelModal();
    document.body.classList.add('modal-open');
    const f = $('[autofocus]', host) || $('input, .btn-primary, button', host);
    if (f) setTimeout(() => f.focus(), 30);
  }
  function setModal(html) {
    const m = $('#modal .modal');
    if (!m) return openModal(html);
    m.innerHTML = html;
    labelModal();
    const f = $('[autofocus]', m) || $('.btn-primary, input', m);
    if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() {
    if (S.busy) return;
    clearInterval(ADM.timer);
    const wasOpen = !!$('#modal').firstElementChild;
    $('#modal').innerHTML = '';
    document.body.classList.remove('modal-open');
    if (wasOpen && lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
  }
  $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
  function labelModal() {
    const m = $('#modal').firstElementChild;
    if (!m) return;
    const h = $('.h2, .adm-h', m);
    if (h) { h.id = 'modal-title'; m.setAttribute('aria-labelledby', 'modal-title'); } else m.removeAttribute('aria-labelledby');
  }

  // ── account form (only used when Discord login is off) ──
  const field = (id, label, icon, type, attrs = '', hint = '') => `
    <div class="field" data-field="${id}">
      <label for="f-${id}">${label}</label>
      <div class="inp">${svg(icon)}<input id="f-${id}" name="${id}" type="${type}" ${attrs}>${type === 'password' ? '<button type="button" class="peek" data-act="peek" aria-label="Show password">SHOW</button>' : ''}</div>
      ${hint ? `<span class="hint">${hint}</span>` : ''}
    </div>`;
  function openAuth({ mode = 'signup', then = null } = {}) {
    closeMenu();
    const create = mode === 'signup';
    const html = `
      <button type="button" class="x" data-act="close" aria-label="Close">${svg('x')}</button>
      <div class="mark">${svg('user')}</div>
      <h2 class="h2">${create ? 'Create your account' : 'Welcome back'}</h2>
      <p>${then === 'download' ? 'The download starts as soon as you’re in.' : 'Your account saves your downloads.'}</p>
      <div class="seg" role="tablist" style="margin-bottom:16px">
        <button type="button" role="tab" aria-pressed="${create}" data-act="auth-mode" data-mode="signup" data-then="${then || ''}">Create account</button>
        <button type="button" role="tab" aria-pressed="${!create}" data-act="auth-mode" data-mode="signin" data-then="${then || ''}">Sign in</button>
      </div>
      <form class="form" id="auth-form" data-mode="${mode}" data-then="${then || ''}" novalidate>
        ${create
          ? field('username', 'Username', 'user', 'text', 'autocomplete="username" maxlength="20" spellcheck="false" autocapitalize="off" autofocus', '3–20 letters, numbers, dots, dashes or underscores')
            + field('email', 'Email', 'chat', 'email', 'autocomplete="email" spellcheck="false" autocapitalize="off"')
            + field('password', 'Password', 'lock', 'password', 'autocomplete="new-password" minlength="8"', 'At least 8 characters')
          : field('login', 'Email address', 'user', 'email', 'autocomplete="email" spellcheck="false" autocapitalize="off" autofocus')
            + field('password', 'Password', 'lock', 'password', 'autocomplete="current-password"')}
        <div class="form-err" id="form-err" role="alert"></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button type="submit" class="btn btn-primary">${create ? 'Create account' : 'Sign in'}${then === 'download' ? ' &amp; download' : ''}</button></div>
      </form>`;
    $('#modal').firstElementChild ? setModal(html) : openModal(html);
  }
  async function submitAuth(form) {
    const mode = form.dataset.mode, then = form.dataset.then;
    const btn = $('button[type="submit"]', form), err = $('#form-err', form);
    const data = Object.fromEntries(new FormData(form).entries());
    $$('.field', form).forEach((f) => f.classList.remove('bad'));
    err.textContent = '';
    btn.classList.add('busy');
    S.busy = true;
    try {
      const user = mode === 'signup'
        ? await AUTH.signUp({ username: data.username, email: data.email, password: data.password, remember: true })
        : await AUTH.signIn({ login: data.login, password: data.password, remember: true });
      S.busy = false;
      S.user = user;
      if (mode === 'signup') track('/api/event', { t: 'signup' });
      if (then === 'download') return prepareDownload();
      closeModal(); refresh();
      toast(mode === 'signup' ? `Account created. Welcome, @${user.username}` : `Signed in as @${user.username}`);
    } catch (e) {
      S.busy = false;
      btn.classList.remove('busy');
      err.textContent = (e && e.message) || 'Something went wrong. Try again.';
      const f = e && e.field && $(`.field[data-field="${e.field}"]`, form);
      if (f) { f.classList.add('bad'); const i = $('input', f); i && i.focus(); }
    }
  }

  // ── preparing → download ──
  // With Discord login on, downloading needs a Discord login (which also puts them in the server);
  // otherwise it needs a free account on this site. Every download click is recorded in Supabase.
  function startDownload() {
    if (DC_LOGIN) { if (!S.dc) return discordConnect('download', 'download'); }
    else if (!S.user) return openAuth({ mode: 'signup', then: 'download' });
    openModal('<div></div>');
    prepareDownload();
  }
  async function prepareDownload() {
    S.busy = true;
    setModal(`<h2 class="h2">Preparing your download</h2><p>Getting ${esc(BUILD.name)} ready for you.</p><div class="mini-log" id="mini-log"></div><div class="prog" id="mini-prog"><i></i></div>`);
    const log = $('#mini-log');
    const rows = [
      DC_LOGIN && S.dc ? ['Discord', `@${S.dc.username}${S.dc.inGuild ? ' · in the server' : ''}`] : ['Account', S.user ? `@${S.user.username}` : 'Guest'],
      ['Build', `v${BUILD.version}`], ['File', `${BUILD.file} · ${fmtMB(BUILD.bytes)}`], ['SHA-256', BUILD.sha256.slice(0, 16) + '…'],
    ];
    for (const [k, v] of rows) { if (log) log.insertAdjacentHTML('beforeend', `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`); await sleep(REDUCED ? 0 : 160); }
    const prog = $('#mini-prog');
    if (prog) prog.classList.add('full');
    await sleep(REDUCED ? 0 : 300);
    let user = S.user;
    try { user = await AUTH.recordDownload({ file: BUILD.file, version: BUILD.version }); } catch (_) { /* still give them the file */ }
    S.user = user || S.user;
    triggerDownload();
    S.busy = false;
    setModal(`
      <button type="button" class="x" data-act="close" aria-label="Close">${svg('x')}</button>
      <div class="mark ok">${svg('check')}</div>
      <h2 class="h2">Your download has started</h2>
      <p>Look for <b>${esc(BUILD.file)}</b> in your downloads. If it didn’t start, use the button below.</p>
      <p class="muted" style="font-size:14px">If Windows SmartScreen appears, choose <b>More info → Run anyway</b>.</p>
      <div class="note">${svg('crown')}<span>Open it and press <b>Sign in with Discord</b>, or <b>Continue with the free tools</b>. Want ${TWEAKS.length} tweaks, Max FPS mode and the boosters? Get a plan from $${PLANS[0].price} once and it unlocks right in the app.</span></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-nav="plans">See plans</button>
        <a class="btn btn-primary" href="${BUILD.href}" download="${BUILD.file}" data-act="manual-dl">${svg('download')}Download again</a>
      </div>`);
    toast(`Downloading ${BUILD.file}`, { icon: 'download' });
    refresh();
  }
  function triggerDownload() {
    const a = document.createElement('a');
    a.href = BUILD.href; a.download = BUILD.file; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function refresh() {
    S.user = AUTH.current();
    renderNav(); renderFooter();
    if (S.page === 'download' && !$('#modal').firstElementChild) renderPage();
  }
  AUTH.onChange(() => { if (!S.busy) refresh(); });

  // ───────────── hidden admin panel (Supabase registrations + downloads) ─────────────
  const ADM = { timer: 0, data: null };
  function openAdmin() {
    closeMenu();
    const user = AUTH.current();
    if (user && user.isAdmin) { openModal('<div></div>'); return showAdmin(); }
    openModal(`
      <button type="button" class="x" data-act="close" aria-label="Close">${svg('x')}</button>
      <div class="mark">${svg('lock')}</div>
      <h2 class="h2">Admin</h2>
      <p>Sign in with your admin email and Supabase Auth password.</p>
      <form class="form" id="admin-form" novalidate>
        ${field('adminuser', 'Admin email', 'user', 'email', 'autocomplete="username" autofocus')}
        ${field('adminpass', 'Password', 'lock', 'password', 'autocomplete="current-password"')}
        <div class="form-err" id="adm-err" role="alert"></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button type="submit" class="btn btn-primary">Sign in</button></div>
      </form>`);
  }
  async function submitAdmin(form) {
    const btn = $('button[type="submit"]', form), err = $('#adm-err');
    const email = String(form.adminuser.value || '').trim();
    const password = form.adminpass.value;
    err.textContent = '';
    if (!email || !password) { err.textContent = 'Enter your admin email and password.'; return; }
    if (!AUTH.client) { err.textContent = 'Accounts are unavailable right now. Try again in a minute.'; return; }
    btn.classList.add('busy');
    try {
      const { data, error } = await AUTH.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user?.app_metadata?.role !== 'admin') {
        await AUTH.signOut();
        throw new Error('This account is not marked as an admin. Run the admin-role SQL in Supabase, then sign in again.');
      }
      await AUTH.whenReady();
      showAdmin();
    } catch (e) {
      btn.classList.remove('busy');
      err.textContent = e.message || 'Could not sign in.';
      form.adminpass.value = ''; form.adminpass.focus();
    }
  }
  function showAdmin() {
    setModal('<div id="adm"></div>');
    $('#modal .modal').classList.add('wide');
    renderAdmin(null, true);
    loadAdmin();
    clearInterval(ADM.timer);
    ADM.timer = setInterval(() => { if ($('#adm') && !document.hidden) loadAdmin(); else if (!$('#adm')) clearInterval(ADM.timer); }, 60000);
  }
  async function loadAdmin() {
    const host = $('#adm'); if (!host) return;
    host.classList.add('loading');
    try {
      const { data: { user } } = await AUTH.client.auth.getUser();
      if (!user || user.app_metadata?.role !== 'admin') throw new Error('Admin access required. Sign in with the admin account.');
      const { data, error } = await AUTH.client.rpc('ego_get_admin_stats');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('No statistics returned. Run the latest supabase-setup.sql in the Supabase SQL Editor.');
      ADM.data = { accounts: Number(row.registered_accounts || 0), total: Number(row.tracked_download_clicks || 0), recent: Number(row.downloads_last_30_days || 0), at: new Date() };
      renderAdmin(ADM.data);
    } catch (e) { renderAdmin(null, false, e.message || 'Could not load statistics.'); }
  }
  function renderAdmin(d, loading = false, err = '') {
    const host = $('#adm'); if (!host) return;
    const n = (v) => Number(v || 0).toLocaleString();
    host.innerHTML = `<div class="adm-top"><div><span class="eyebrow">Ego Tweaks · Admin</span><h2 class="adm-h">Site statistics</h2><p class="adm-sub">${d ? `Updated ${esc(d.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}` : 'Registrations and download clicks from Supabase'}</p></div><button type="button" class="x" style="position:static" data-act="close" aria-label="Close">${svg('x')}</button></div>
      ${err ? `<div class="form-err" style="margin:12px 0">${esc(err)}</div>` : ''}
      <div class="adm-big"><span class="num">${loading ? '—' : n(d?.total)}</span><span class="lbl">free downloads (all time)</span></div>
      <div class="adm-tiles">
        <div><span>Last 30 days</span><b>${loading ? '—' : n(d?.recent)}</b><small>Download clicks</small></div>
        <div><span>Site accounts</span><b>${loading ? '—' : n(d?.accounts)}</b><small>Email accounts</small></div>
        <div><span>Data source</span><b>Supabase</b><small>Shared database</small></div>
      </div>
      <p class="adm-note">These count clicks on this website’s free download, not finished downloads or unique people. Sign-ins, sales and app update downloads for 3.0 are on the Admin page inside the app.</p>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="admin-lock">Lock</button><span class="sp"></span><button type="button" class="btn btn-line" data-act="admin-refresh">Refresh</button><button type="button" class="btn btn-primary" data-act="close">Done</button></div>`;
    host.classList.remove('loading');
  }

  // ───────────── scroll ─────────────
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      $('#nav').classList.toggle('scrolled', y > 20);
      $('#dock').classList.toggle('on', y > 560 && S.page !== 'plans' && S.page !== 'thanks');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ───────────── events ─────────────
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'auth-form') { e.preventDefault(); if (!S.busy) submitAuth(e.target); }
    if (e.target.id === 'admin-form') { e.preventDefault(); submitAdmin(e.target); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'xp-q') { S.xq = e.target.value; S.xshow = 60; filterXp(); }
  });
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); closeModal(); closeMenu(); go(nav.dataset.nav); return; }
    const tab = e.target.closest('[data-tour]');
    if (tab) { setTour(tab.dataset.tour); return; }
    const xc = e.target.closest('[data-xcat]');
    if (xc) { S.xcat = xc.dataset.xcat; S.xshow = 60; $$('[data-xcat]').forEach((b) => b.setAttribute('aria-pressed', String(b === xc))); filterXp(); return; }
    const xt = e.target.closest('[data-xtier]');
    if (xt) { S.xtier = Number(xt.dataset.xtier); S.xshow = 60; $$('[data-xtier]').forEach((b) => b.setAttribute('aria-pressed', String(b === xt))); filterXp(); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'get': startDownload(); break;
      case 'auth-mode': openAuth({ mode: el.dataset.mode, then: el.dataset.then || null }); break;
      case 'close': closeModal(); break;
      case 'menu': openMenu(); break;
      case 'menu-close': closeMenu(); break;
      case 'peek': {
        const i = $('input', el.parentElement), show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        el.textContent = show ? 'HIDE' : 'SHOW';
        el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        break;
      }
      case 'manual-dl': AUTH.recordDownload({ file: BUILD.file, version: BUILD.version }).catch(() => {}); break;
      case 'buy': buyPlan(e, el); break;
      case 'buy-soon': track('/api/event', { t: 'buy-soon', plan: el.dataset.plan }); break;
      case 'discord-connect': discordConnect(S.page === 'home' ? 'home' : S.page === 'download' ? 'download' : 'plans'); break;
      case 'discord-me': openDiscordMe(); break;
      case 'discord-forget': discordLogout(); break;
      case 'discord-join': S.dcAwaitJoin = true; break;
      case 'discord-recheck': discordRecheck(); break;
      case 'reviews-more': S.rvShow = (S.rvShow || REVIEWS_PAGE) + REVIEWS_PAGE; paintReviews(); break;
      case 'xp-more': S.xshow += 60; filterXp(); break;
      case 'copy-hash': copyHash(el); break;
      case 'admin': openAdmin(); break;
      case 'admin-refresh': loadAdmin(); break;
      case 'admin-lock': clearInterval(ADM.timer); AUTH.signOut().catch(() => {}); closeModal(); toast('Admin signed out'); break;
    }
  });
  // Keep Tab inside an open modal or menu; Escape closes them.
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapTab(e, box) {
    const els = $$(FOCUSABLE, box).filter((x) => x.getClientRects().length);
    if (!els.length) { e.preventDefault(); return; }
    const first = els[0], last = els[els.length - 1], a = document.activeElement;
    if (!box.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if ($('#modal').firstElementChild) closeModal(); else closeMenu(); return; }
    if (e.key === 'Tab') {
      const modal = $('#modal .modal'), menu = $('#menu');
      if (modal) trapTab(e, modal); else if (menu && !menu.hidden) trapTab(e, menu);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tab = e.target instanceof Element && e.target.closest('.tour-tabs [role="tab"]');
    if (!tab) return;
    const tabs = $$('[role="tab"]', tab.parentElement), i = tabs.indexOf(tab);
    const j = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault(); tabs[j].focus(); tabs[j].click();
  });
  window.addEventListener('hashchange', () => {
    // Discord's redirect lands on the hash too; finishDiscordLogin tidies it before routing
    if (/access_token=|error=/.test(location.hash)) return;
    route();
  });

  // ───────────── start ─────────────
  // Back from a Payhip purchase (see thanksUrl): show the thanks page and tidy the address bar.
  if (/[?&]premium=thanks\b/.test(location.search)) {
    try { history.replaceState(null, '', location.pathname + '#/plans/thanks'); } catch (_) { location.hash = '#/plans/thanks'; }
  }
  // Back from "Continue with Discord"?
  const oauthReturn = new URLSearchParams(location.hash.slice(1));
  const backFromDiscord = DC_LOGIN && oauthReturn.has('state') && (oauthReturn.has('access_token') || oauthReturn.has('error'));
  if (backFromDiscord) finishDiscordLogin(oauthReturn);
  $('#burger').addEventListener('click', openMenu);
  S.page = routeFromHash();
  renderNav(); renderFooter(); renderDock();
  renderPage();
  const firstSec = location.hash.match(/^#\/?([a-z]+)/);
  if (firstSec && SCROLL[firstSec[1]]) setTimeout(() => scrollToId(SCROLL[firstSec[1]]), 60);
  onScroll();
  setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(warmTour) : warmTour()), 2500);
})();
