/* Ego Tweaks — website (v4 · monochrome) */
(() => {
  'use strict';

  // ───────────── settings you may want to change ─────────────
  // The build offered on the Download page. Swap these when you ship a new version.
  const BUILD = {
    name: 'Ego Tweaking Utility',
    file: 'EgoTweaks.exe',
    href: 'downloads/EgoTweaks.exe',
    version: '1.7.0',
    bytes: 1899008,
    sha256: '92f6fb05f524878506014da2c86f45a0de5794ac6e3c20d471caa47b2abd9f07',
  };
  // Paste your links here and they show up in the nav, footer and menu. Leave '' to hide.
  // If discord is '', the site uses PREMIUM.discord below instead.
  const LINKS = { discord: '', x: '' };
  // Ego Tweaks Premium — a one-month key, paid through a Payhip checkout that opens on this site; buyers
  // then open a ticket in your Discord to get their key, and buy again for another month.
  // In Payhip, make Premium a normal digital product priced $10 — NOT a membership (Payhip's on-site
  // checkout doesn't work for memberships, and this site tells buyers nothing renews automatically).
  //   payhip:  your Payhip product link or just its key (payhip.com/b/AbC12 → 'AbC12'). '' = Buy is switched off.
  //   discord: where buyers open a ticket — your invite, or a link to the tickets channel. '' = uses LINKS.discord.
  //   price:   price of one month, only shown on this site (Payhip charges what you set there). '' hides it.
  //   perks:   the list on the Premium card. Make it say what your key unlocks.
  const PREMIUM = {
    payhip: 'https://payhip.com/buy?s=1&qty%5BPAIZv%5D=1&cart_links%5B%5D=PAIZv',
    discord: 'https://discord.gg/gtPggZ9zpz',
    price: '$10',
    perks: ['Everything in the free version, plus 200 tweaks', 'Your own Ego Tweaks Premium key', 'Each key lasts one month', 'No auto-charge — renew when you want', 'Key sent straight to your Discord DMs', 'Secure checkout by Payhip'],
  };
  // "Continue with Discord": visitors log in with Discord to download (and to buy Premium, so the bot can
  // DM them the moment they pay). The bot then adds them to your Discord server.
  //   clientId: Discord Developer Portal → your app → OAuth2 → Client ID. '' = no Discord login (email accounts).
  //   guildId:  your server's ID.
  //   botUrl:   your bot's Railway address (Railway → the bot → Settings → Networking), e.g.
  //             'https://ego-tweaks-bot-production.up.railway.app'. It adds people to the server. '' = they get
  //             a "Join our Discord" button instead. The bot needs the "Create Invite" permission for this.
  // Also add this site's address (https://egotweaks.com/) under OAuth2 → Redirects in the Developer Portal.
  const DISCORD_LOGIN = { clientId: '1560070865599598804', guildId: '1560058897329426573', botUrl: 'https://ego-tweaks-bot-production.up.railway.app' };
  const PER_MONTH = PREMIUM.price ? `${PREMIUM.price} a month` : 'one month at a time';
  // Reviews from real customers (for example vouches posted in your Discord). They appear in a Reviews
  // section on the home page; leave the list empty and the section stays hidden. Only add real ones.
  //   { name: 'kai', text: 'Input feels instant now.', tag: 'VALORANT' }
  const REVIEWS = [];
  // Download counter for the hidden admin panel. Put EgoTweaks.exe in a GitHub Release on your site's
  // repo, then set this to 'your-username/your-repo'. The Download button then hands out the release
  // file and GitHub counts every download. Leave '' to hand out downloads/EgoTweaks.exe (not counted).
  const GITHUB_REPO = '';
  if (GITHUB_REPO) BUILD.href = `https://github.com/${GITHUB_REPO}/releases/latest/download/${BUILD.file}`;
  // Admin panel uses Supabase Auth and a server-assigned app_metadata.role=admin.
  // Never put an admin password or service-role key in this file.

  // ───────────── helpers ─────────────
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // Motion: the OS setting, or the footer's Motion toggle (kept in localStorage). fx.js reads the same key.
  const MOTION_OFF = (() => { try { return localStorage.getItem('ego-motion') === 'off'; } catch (_) { return false; } })();
  const OS_REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REDUCED = OS_REDUCED || MOTION_OFF;
  // The motion engine (assets/fx.js) is optional: every call goes through this guard.
  const fx = () => window.EgoFX || null;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const { categories: CATEGORIES, tweaks: TWEAKS } = window.EGO_SITE_CATALOG;
  const perCat = (id) => TWEAKS.filter((t) => t.cat === id).length;
  const catName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || id;
  // auth.js needs the Supabase script. If that was blocked, accounts are off but the rest of the site
  // (the boot, Discord login and downloads) keeps working.
  const AUTH = window.EgoAuth || (() => { const no = () => Promise.reject(new Error('Accounts are unavailable right now — try again in a minute.'));
    return { current: () => null, onChange() {}, signUp: no, signIn: no, update: no, signOut: () => Promise.resolve(),
      recordDownload: () => Promise.resolve(null), whenReady: () => Promise.resolve(), client: null }; })();
  const fmtMB = (b) => (b / 1048576).toFixed(1) + ' MB';
  const fmtDate = (iso, time = true) => { try { return new Date(iso).toLocaleString(undefined, Object.assign({ month: 'short', day: 'numeric', year: 'numeric' }, time ? { hour: 'numeric', minute: '2-digit' } : {})); } catch (_) { return iso; } };
  const YEAR = new Date().getFullYear();
  const PAYHIP_KEY = (String(PREMIUM.payhip).trim().match(/([A-Za-z0-9]+)\/?$/) || [])[1] || '';
  const TICKET = PREMIUM.discord || LINKS.discord;
  const DISCORD = LINKS.discord || PREMIUM.discord;

  const GAMES = ['Fortnite', 'VALORANT', 'Counter-Strike 2', 'Apex Legends', 'Overwatch 2', 'Call of Duty', 'Rainbow Six Siege', 'Marvel Rivals', 'Rust', 'PUBG: Battlegrounds', 'Rocket League', 'League of Legends', 'Dota 2', 'Grand Theft Auto V', 'FiveM', 'Roblox', 'Minecraft: Java Edition'];

  const ICON = {
    home: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4.2-4.8"/><circle cx="12" cy="17" r="1.2"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    alert: '<path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    at: '<circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.3a2.4 2.4 0 0 0 4.8 0V12a8.3 8.3 0 1 0-3.3 6.6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4.2-4.8"/><circle cx="12" cy="17" r="1.2"/>',
    mouse: '<rect x="6.5" y="3.5" width="11" height="17" rx="5.5"/><path d="M12 7.5v3"/>',
    signal: '<path d="M5 19v-3M10 19v-7M15 19V9M20 19V5"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z"/>',
    layers: '<path d="M12 4l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16"/>',
    menu: '<path d="M4 8h16M4 16h16"/>',
    key: '<circle cx="8" cy="15.5" r="4"/><path d="M11 12.5l8.5-8.5M16.5 7l2.5 2.5M14 9.5l2 2"/>',
    chat: '<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-8.5L6 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6.5A1.5 1.5 0 0 1 5 5z"/>',
    shield: '<path d="M12 3.2l7 2.9v5.6c0 4.3-2.9 7.9-7 9.3-4.1-1.4-7-5-7-9.3V6.1z"/><path d="M9 12.2l2.1 2.1 3.9-4"/>',
    undo: '<path d="M9 14.5L4 9.5l5-5"/><path d="M4 9.5h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    star: '<path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
    ext: '<path d="M8 16L16 8M9.5 8H16v6.5"/>',
    expand: '<path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15"/>',
  };
  const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
  const BRAND = {
    discord: '<svg class="brand-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.85a.07.07 0 0 0-.08.04c-.21.38-.44.86-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1 0 .13 12.3 12.3 0 0 1-1.88.89.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"/></svg>',
    x: '<svg class="brand-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z"/></svg>',
  };

  const S = { page: 'home', user: AUTH.current(), busy: false, tour: 'home', demoOn: false, demoBusy: false, xcat: 'all', xq: '', xpAll: false };

  // ───────────── visit + sign-up counts (only used if the site runs on the Cloudflare setup) ─────────────
  function track(path, data) {
    if (!/^https?:$/.test(location.protocol)) return;
    try {
      const body = JSON.stringify(data || {});
      if (navigator.sendBeacon && navigator.sendBeacon(path, new Blob([body], { type: 'text/plain' }))) return;
      fetch(path, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
    } catch (_) { /* never let counting break the page */ }
  }
  track('/api/hit', { r: document.referrer });

  // ───────────── boot sequence (same choreography as the app) ─────────────
  function buildBootTicks() {
    const n = TWEAKS.length;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      s += `<line x1="${(Math.sin(a) * 246).toFixed(1)}" y1="${(-Math.cos(a) * 246).toFixed(1)}" x2="${(Math.sin(a) * 262).toFixed(1)}" y2="${(-Math.cos(a) * 262).toFixed(1)}"></line>`;
    }
    $('#boot-ticks').innerHTML = s;
    const v = $('#boot-ver'); if (v) v.textContent = 'v' + BUILD.version;
  }

  const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/';
  function scrambleTo(el, text, dur = 380) {
    return new Promise((resolve) => {
      if (REDUCED) { el.textContent = text; return resolve(); }
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const n = Math.floor(p * text.length);
        let s = text.slice(0, n);
        for (let i = n; i < text.length; i++) s += text[i] === ' ' ? ' ' : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
        el.textContent = s;
        if (p < 1) requestAnimationFrame(step); else { el.textContent = text; resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  function setBootProgress(p, label) {
    const pct = Math.round(p * 100);
    $('#boot-bar').style.width = pct + '%';
    $('#boot-pct').textContent = pct + '%';
    if (label) $('#boot-step').textContent = label;
    const lines = $$('#boot-ticks line');
    const lit = Math.round(p * lines.length);
    lines.forEach((l, i) => l.classList.toggle('lit', i < lit));
  }

  // log lines shared by the boot screen and the "preparing your download" modal
  async function runLog(log, steps, { fast = () => false, onProgress, max = 8 } = {}) {
    const spin = '|/-\\';
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      const ln = document.createElement('div');
      ln.className = 'ln';
      ln.innerHTML = `<span class="k">${esc(st.k)}</span><span class="dots"></span><span class="v"></span>`;
      log.appendChild(ln);
      while (log.children.length > max) log.removeChild(log.firstChild);
      await sleep(16);
      ln.classList.add('wait');
      const v = $('.v', ln);
      const work = st.wait ? st.wait() : Promise.resolve();
      let done = false; work.then(() => (done = true), () => (done = true));
      const until = performance.now() + (fast() ? 50 : REDUCED ? 40 : (st.ms ?? 150) + Math.random() * 90);
      let f = 0;
      while (!done || performance.now() < until) {
        if (fast() && done) break;
        v.innerHTML = `<span class="spin">${spin[f++ % 4]}</span>`;
        onProgress && onProgress((i + 0.5) / steps.length);
        await sleep(90);
      }
      let text = '—';
      try { text = (typeof st.v === 'function' ? st.v() : st.v) || '—'; } catch (_) { /* keep dash */ }
      ln.classList.add('done');
      onProgress && onProgress((i + 1) / steps.length, st.k);
      const reveal = scrambleTo(v, text, fast() ? 140 : 280);
      if (i === steps.length - 1) await reveal;
    }
  }

  // A second visit in the same browser session gets the quick boot; Replay intro asks for the full one.
  async function runBoot(opts = {}) {
    const boot = $('#boot');
    const log = $('#boot-log');
    const quick = !opts.full && (() => { try { return sessionStorage.getItem('ego-booted') === '1'; } catch (_) { return false; } })();
    let skip = quick, tapped = false, skipNow = null;
    const fast = () => skip;
    // A tap/keypress skips straight to the exit: the log stops waiting and the exit holds shorten.
    const skipped = new Promise((r) => { skipNow = r; });
    const onSkip = () => { skip = true; if (!tapped) { tapped = true; boot.classList.add('skipped'); skipNow(); } };
    document.body.classList.add('booting');
    boot.hidden = false;
    boot.className = 'boot';
    if (quick) boot.classList.add('quick');
    fx() && fx().lock('boot');
    log.innerHTML = '';
    // runLog writes into its own (display:contents) sink, so a run left behind by a skip can't add lines to a later boot
    const sink = document.createElement('div');
    sink.style.display = 'contents';
    log.appendChild(sink);
    $('#boot-sub').textContent = 'TWEAKS';
    setBootProgress(0, 'Starting');
    void boot.offsetWidth;
    boot.classList.add('play');
    boot.addEventListener('pointerdown', onSkip);
    window.addEventListener('keydown', onSkip);

    const t0 = performance.now();
    while (performance.now() - t0 < (REDUCED ? 50 : 1250) && !skip) await sleep(30);
    scrambleTo($('#boot-sub'), 'TWEAKS', 520);
    await sleep(REDUCED || skip ? 0 : 180);

    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const steps = [
      { k: 'Starting engine', wait: () => fonts, v: `v${BUILD.version}` },
      { k: 'Loading catalog', v: `${TWEAKS.length} tweaks · ${CATEGORIES.length} categories` },
      ...CATEGORIES.map((c) => ({ k: c.name, ms: 110, v: `${perCat(c.id)} tweaks · ${c.blurb.toLowerCase()}` })),
      { k: 'Games', ms: 110, v: `${GAMES.length} recognised` },
      { k: 'Account', v: () => (DC_LOGIN ? (S.dc ? `Discord · @${S.dc.username}` : 'Guest') : S.user ? `Signed in · @${S.user.username}` : 'Guest') },
      { k: 'Latest build', v: `${BUILD.file} · ${fmtMB(BUILD.bytes)}` },
    ];
    // the quick (same-session) boot shows the short log: engine, account, build
    await Promise.race([runLog(sink, quick ? [steps[0], ...steps.slice(-2)] : steps, { fast, onProgress: (p, k) => tapped || setBootProgress(p, k) }), skipped.then(() => fonts)]);
    if (tapped) setBootProgress(1);
    $('#boot-step').textContent = 'Ready';
    await sleep(tapped ? 0 : fast() ? 150 : 380);

    boot.removeEventListener('pointerdown', onSkip);
    window.removeEventListener('keydown', onSkip);
    if ($('#site').hidden) showSite(); else renderPage();
    document.body.classList.remove('booting');
    fx() && fx().unlock('boot');
    document.dispatchEvent(new Event('ego:booted'));
    boot.classList.add('out');
    await sleep(REDUCED ? 50 : tapped ? 600 : 1100);
    boot.classList.add('gone');
    await sleep(REDUCED ? 50 : tapped ? 250 : 500);
    boot.hidden = true;
    try { sessionStorage.setItem('ego-booted', '1'); } catch (_) { /* storage blocked */ }
  }

  function showSite() {
    $('#site').hidden = false;
    renderNav(); renderFooter(); renderDock(); renderPage();
    loadDiscord();
  }

  // ───────────── nav, menu, footer, dock ─────────────
  // Every section has its own page. PAGES is the order of the nav, the menu and the "next page" links.
  const PAGES = [['features', 'Features'], ['tweaks', 'Tweaks'], ['app', 'The app'], ['safety', 'Safety'], ['pricing', 'Pricing'], ['faq', 'FAQ']];
  const SECTIONS = PAGES;
  const roll = (t) => `<span class="roll" data-t="${esc(t)}">${esc(t)}</span>`;

  function renderNav() {
    const pm = S.page === 'premium' || S.page === 'thanks';
    $('#nav-links').innerHTML = '<span class="nav-hl" aria-hidden="true"></span>'
      + PAGES.map(([id, n]) => `<button type="button" data-nav="${id}" class="${S.page === id ? 'on' : ''}"${S.page === id ? ' aria-current="page"' : ''}>${roll(n)}</button>`).join('')
      + `<button type="button" data-nav="premium" class="${pm ? 'on' : ''}"${pm ? ' aria-current="page"' : ''}>${roll('Premium')}</button>`;
    const dc = DISCORD ? `<a class="icon-btn nav-dc hide-sm" href="${esc(DISCORD)}" target="_blank" rel="noopener" aria-label="Join our Discord" title="Join our Discord">${BRAND.discord}<span class="nav-live" data-dc-wrap hidden><i class="pulse"></i><b data-dc="online">—</b></span></a>` : '';
    if (DC_LOGIN) {
      $('#nav-cta').innerHTML = S.dc
        ? `${dc}<button class="pill dc-pill hide-sm" data-act="discord-me" title="Logged in with Discord"><img src="${esc(dcAvatar(S.dc))}" alt="" width="20" height="20">${esc(dcName())}</button><button class="btn btn-primary btn-sm mag" data-nav="download">${svg('download')}Download</button>`
        : `${dc}<button class="btn btn-line btn-sm hide-sm" data-act="discord-me">Log in</button><button class="btn btn-primary btn-sm mag" data-nav="download">Get Ego Tweaks</button>`;
    } else {
      $('#nav-cta').innerHTML = S.user
        ? `${dc}<button class="pill hide-sm" data-act="account" title="Your account"><span class="dot"></span>@${esc(S.user.username)}</button><button class="btn btn-primary btn-sm mag" data-nav="download">${svg('download')}Download</button>`
        : `${dc}<button class="btn btn-line btn-sm hide-sm" data-act="signin">Sign in</button><button class="btn btn-primary btn-sm mag" data-nav="download">Get Ego Tweaks</button>`;
    }
    // the nav was just rebuilt: put the live Discord numbers back
    fillDiscord();
  }

  // Phone/tablet menu. It opens over the page (focus stays inside it) and closes with a short animation.
  let menuTimer = 0;
  function openMenu() {
    const m = $('#menu');
    clearTimeout(menuTimer);
    const item = (i, attr, label, on) => `<li style="--i:${i}"><button type="button" ${attr}${on ? ' class="on"' : ''}><span class="mi">${String(i + 1).padStart(2, '0')}</span>${esc(label)}</button></li>`;
    const community = DISCORD ? `<a class="btn btn-line btn-lg" href="${esc(DISCORD)}" target="_blank" rel="noopener">${BRAND.discord}Join the Discord</a>` : '';
    m.innerHTML = `
      <div class="menu-top"><a class="brand" href="#/" data-nav="home"><span class="brand-logo">EGO</span><span class="brand-name">Tweaks</span></a>
        <button class="icon-btn" data-act="menu-close" aria-label="Close menu">${svg('x')}</button></div>
      <ol class="menu-list">${item(0, 'data-nav="home"', 'Home', S.page === 'home')}${PAGES.map(([id, n], i) => item(i + 1, `data-nav="${id}"`, n, S.page === id)).join('')}${item(PAGES.length + 1, 'data-nav="download"', 'Download', S.page === 'download')}${item(PAGES.length + 2, 'data-nav="premium"', 'Premium', S.page === 'premium' || S.page === 'thanks')}</ol>
      ${DISCORD ? '<div class="menu-live" data-dc-wrap hidden><i class="pulse"></i><b data-dc="online">—</b> online · <b data-dc="members">—</b> members</div>' : ''}
      <div class="menu-cta">${community}
        ${DC_LOGIN
          ? (S.dc ? `<button class="btn btn-line btn-lg" data-act="discord-me">Logged in · @${esc(S.dc.username)}</button>` : `<button class="btn btn-line btn-lg" data-act="discord-me">${BRAND.discord}Log in with Discord</button>`)
          : S.user ? `<button class="btn btn-line btn-lg" data-act="account">Account · @${esc(S.user.username)}</button>` : '<button class="btn btn-line btn-lg" data-act="signin">Sign in</button>'}
        <button class="btn btn-primary btn-lg" data-nav="download">${svg('download')}Get Ego Tweaks — free</button></div>`;
    m.classList.remove('closing');
    m.hidden = false;
    const burger = $('#burger') || $('.nav-burger'); burger && burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    fillDiscord();
    fx() && fx().lock('menu');
    const close = $('[data-act="menu-close"]', m); close && close.focus();
  }
  function closeMenu() {
    const m = $('#menu');
    if (m.hidden || m.classList.contains('closing')) return;
    m.classList.add('closing');
    const burger = $('#burger') || $('.nav-burger'); burger && burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    fx() && fx().unlock('menu');
    clearTimeout(menuTimer);
    menuTimer = setTimeout(() => {
      const inside = m.contains(document.activeElement);
      m.hidden = true;
      m.classList.remove('closing');
      if (inside && burger) burger.focus({ preventScroll: true });
    }, REDUCED ? 0 : 420);
  }

  function renderFooter() {
    const community = [
      DISCORD && `<li><a href="${esc(DISCORD)}" target="_blank" rel="noopener">Discord</a></li>`,
      TICKET && `<li><a href="${esc(TICKET)}" target="_blank" rel="noopener">Open a ticket</a></li>`,
      LINKS.x && `<li><a href="${esc(LINKS.x)}" target="_blank" rel="noopener">X (Twitter)</a></li>`,
    ].filter(Boolean).join('');
    const socials = [DISCORD && `<a href="${esc(DISCORD)}" target="_blank" rel="noopener" aria-label="Discord">${BRAND.discord}</a>`, LINKS.x && `<a href="${esc(LINKS.x)}" target="_blank" rel="noopener" aria-label="X (Twitter)">${BRAND.x}</a>`].filter(Boolean).join('');
    const motion = OS_REDUCED
      ? '<button type="button" data-act="motion" aria-pressed="false" disabled>Motion: off (system setting)</button>'
      : `<button type="button" data-act="motion" aria-pressed="${!REDUCED}">Motion: ${REDUCED ? 'off' : 'on'}</button>`;
    $('#foot').innerHTML = `<div class="wrap">
      <div class="foot-in${community ? '' : ' no-com'}">
        <div class="foot-brand"><a class="brand" href="#/" data-nav="home"><span class="brand-logo">EGO</span><span class="brand-name">Tweaks</span></a>
          <p>A Windows tweaking utility. ${TWEAKS.length} tweaks for FPS, input delay and ping — every one reversible. Free to download, Premium if you want more.</p>
          ${socials ? `<div class="socials">${socials}</div>` : ''}</div>
        <div><h4>Product</h4><ul>${PAGES.map(([id, n]) => `<li><button type="button" data-nav="${id}">${n}</button></li>`).join('')}<li><button type="button" data-nav="download">Download</button></li><li><button type="button" data-nav="premium">Premium</button></li></ul></div>
        <div><h4>Account</h4><ul>${DC_LOGIN
          ? (S.dc
            ? `<li><button type="button" data-act="discord-me">@${esc(S.dc.username)}</button></li><li><button type="button" data-act="discord-forget">Log out</button></li>`
            : `<li><button type="button" data-act="discord-me">Log in with Discord</button></li><li><button type="button" data-nav="download">Download</button></li>`)
          : S.user
            ? `<li><button type="button" data-act="account">Your account</button></li><li><button type="button" data-nav="download">Your downloads</button></li>`
            : `<li><button type="button" data-act="signup">Create account</button></li><li><button type="button" data-act="signin">Sign in</button></li>`}</ul></div>
        ${community ? `<div><h4>Community</h4><ul>${community}</ul></div>` : ''}
        <div><h4>Legal</h4><ul><li><a href="privacy.html">Privacy</a></li><li><a href="terms.html">Terms</a></li></ul></div>
      </div>
      <div class="foot-mark" aria-hidden="true">EGO</div>
      <div class="foot-bot">
        <span><button type="button" class="hush" data-act="admin" tabindex="-1" aria-hidden="true">©</button> ${YEAR} Ego Tweaks · v${esc(BUILD.version)}</span>
        <span>Not affiliated with Microsoft or any game publisher.</span>
        <span class="foot-acts"><button type="button" data-act="replay">Replay intro</button>${motion}</span>
      </div>
    </div>`;
  }

  // Phone conversion bar. fx.js decides when it shows (#dock.is-on); without fx it never does.
  function renderDock() {
    const d = $('#dock');
    if (!d) return;
    d.innerHTML = `<button type="button" class="btn btn-primary" data-nav="download">${svg('download')}Get Ego Tweaks</button><button type="button" class="btn btn-line" data-nav="premium">${svg('key')}Premium${PREMIUM.price ? ' · ' + esc(PREMIUM.price) : ''}</button>`;
    d.hidden = false;
  }

  // ───────────── routing ─────────────
  const routeFromHash = () => {
    const h = location.hash;
    if (/^#\/?download/.test(h)) return 'download';
    if (/^#\/?premium\/thanks/.test(h)) return 'thanks';
    if (/^#\/?premium/.test(h)) return 'premium';
    const m = h.match(/^#\/?([a-z]+)/);
    if (m && PAGES.some(([id]) => id === m[1])) return m[1];
    return 'home';
  };
  const TITLES = { home: 'Ego Tweaks — free Windows tweaking utility', download: 'Download · Ego Tweaks', premium: 'Premium · Ego Tweaks', thanks: 'Thanks for buying Premium · Ego Tweaks',
    features: 'What it tunes · Ego Tweaks', tweaks: `All ${TWEAKS.length} tweaks · Ego Tweaks`, app: 'The app · Ego Tweaks', safety: 'Undo anything · Ego Tweaks', pricing: 'Pricing · Ego Tweaks', faq: 'FAQ · Ego Tweaks' };
  function go(page) {
    const hash = page === 'home' ? '#/' : page === 'thanks' ? '#/premium/thanks' : `#/${page}`;
    if (location.hash !== hash) location.hash = hash; else route(true);
  }
  const CURTAIN = { home: 'Ego Tweaks', download: 'Download', premium: 'Premium', thanks: 'Thank you', features: 'What it tunes', tweaks: 'Tweaks', app: 'The app', safety: 'Safety', pricing: 'Pricing', faq: 'FAQ' };
  const toTop = () => {
    try { if (fx()) return void fx().top(); } catch (e) { console.warn('[site] EgoFX.top failed', e); }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  // The page change plays behind fx's curtain. swap runs exactly once, whatever happens to the curtain.
  function curtain(swap, label) {
    let done = false;
    const once = () => { if (!done) { done = true; swap(); } };
    try { const p = fx().transition(once, label); if (p && p.catch) p.catch(once); } catch (e) { console.warn('[site] EgoFX.transition failed', e); once(); }
    setTimeout(once, 3200);
  }
  let routeGen = 0;
  function route(force = false) {
    const page = routeFromHash();
    const changed = page !== S.page;
    S.page = page;
    document.title = TITLES[page];
    if ($('#site').hidden) return;
    // Back/Forward don't pass through the [data-nav] handler: close whatever sits over the old page
    if (changed) { closeModal(); closeMenu(); }
    renderNav();
    if (changed || force || !$('#view').firstElementChild) {
      // a newer route() supersedes this one: its curtain may swap later than the newer render (and would
      // throw a pending section jump back to the top), so a stale swap does nothing
      const gen = ++routeGen;
      const swap = () => { if (gen !== routeGen) return; renderPage(); toTop(); if (changed) $('#view').focus({ preventScroll: true }); };
      if (changed && !REDUCED && fx()) curtain(swap, CURTAIN[page]);
      else if (changed && !REDUCED && document.startViewTransition) document.startViewTransition(swap);
      else swap();
    }
  }
  // Functions queued here run on the frame after the next renderPage() (e.g. "jump to #pricing once home is up").
  const afterRenderQueue = [];
  // old in-page links (data-to) still work: each section now lives on a page of its own
  const SECTION_PAGE = { features: 'features', how: 'features', tweaks: 'tweaks', app: 'app', tour: 'app', safety: 'safety', pricing: 'pricing', community: 'pricing', faq: 'faq', top: 'home' };
  function scrollToSection(id) {
    closeMenu();
    const pg = SECTION_PAGE[id];
    if (pg && (pg === id || pg !== S.page)) {
      if (pg !== id) afterRenderQueue.push(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ block: 'start' }); });
      return go(pg);
    }
    const off = () => -(($('#nav') && $('#nav').offsetHeight) || 64) - 16;
    const doIt = (instant) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (fx()) {
        try {
          // Lenis also applies CSS scroll-padding-top / scroll-margin-top; the nav offset already covers those
          const css = fx().lenis ? (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) : 0;
          fx().scrollTo(el, { offset: off() + css, immediate: !!instant });
          return;
        } catch (e) { console.warn('[site] EgoFX.scrollTo failed', e); }
      }
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + off(), behavior: REDUCED || instant ? 'instant' : 'smooth' });
    };
    if (S.page === 'home') return doIt(false);
    // From another page: render home, jump straight to the section, then re-check it once late layout
    // (fonts, fx measuring its scenes) has settled — unless the visitor has started scrolling by then.
    afterRenderQueue.push(() => {
      doIt(true);
      let moved = false;
      const stop = () => { moved = true; };
      const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
      evs.forEach((t) => window.addEventListener(t, stop, { passive: true }));
      [350, 900].forEach((ms) => setTimeout(() => {
        const el = document.getElementById(id);
        if (!moved && el && S.page === 'home' && Math.abs(el.getBoundingClientRect().top + off()) > 8) doIt(true);
      }, ms));
      setTimeout(() => evs.forEach((t) => window.removeEventListener(t, stop)), 1000);
    });
    go('home');
  }

  // Everything that runs per page (observers, timers) registers its cleanup here.
  let cleanups = [];
  const onCleanup = (fn) => cleanups.push(fn);

  function renderPage() {
    cleanups.forEach((fn) => { try { fn(); } catch (_) { /* ignore */ } });
    cleanups = [];
    const view = $('#view');
    document.title = TITLES[S.page]; // also right on a direct load or refresh, which skips route()
    const P = { download: pageDownload, premium: pagePremium, thanks: pagePremium, features: pageFeatures, tweaks: pageTweaks, app: pageApp, safety: pageSafety, pricing: pagePricing, faq: pageFaq };
    view.innerHTML = (P[S.page] || pageHome)();
    S.demoOn = false; S.demoBusy = false;
    setupReveal(view);
    setupCounters(view);
    if (S.page === 'home') initHome();
    if (S.page === 'features') initDial(view);
    if (S.page === 'app') initViewer(view);
    if (S.page === 'tweaks') filterXp();
    setupSpy();
    fillDiscord();
    geo = null; scrollFx();
    try { fx() && fx().afterRender(view, S.page); } catch (e) { console.warn('[site] EgoFX.afterRender failed', e); }
    const q = afterRenderQueue.splice(0); q.forEach((fn) => requestAnimationFrame(fn));
  }

  // reveal on scroll — waits for the intro to finish so the page animates in as the intro leaves
  function setupReveal(view) {
    const els = $$('.rv', view);
    if (REDUCED || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    const start = () => els.forEach((e) => io.observe(e));
    if (document.body.classList.contains('booting')) {
      document.addEventListener('ego:booted', start, { once: true });
      onCleanup(() => document.removeEventListener('ego:booted', start));
    } else start();
    onCleanup(() => io.disconnect());
  }

  function countUp(el) {
    const to = Number(el.dataset.to) || 0, suf = el.dataset.suf || '';
    if (REDUCED) { el.textContent = to + suf; return; }
    const t0 = performance.now(), d = 1600;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / d);
      el.textContent = Math.round(to * (1 - Math.pow(2, -10 * p))) + suf;
      if (p < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = to + suf;
    };
    requestAnimationFrame(step);
  }
  function setupCounters(view) {
    const els = $$('.count', view);
    if (REDUCED || !('IntersectionObserver' in window)) { els.forEach((e) => (e.textContent = e.dataset.to + (e.dataset.suf || ''))); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { countUp(en.target); io.unobserve(en.target); } }), { threshold: 0.4 });
    const start = () => els.forEach((e) => io.observe(e));
    if (document.body.classList.contains('booting')) { document.addEventListener('ego:booted', start, { once: true }); onCleanup(() => document.removeEventListener('ego:booted', start)); } else start();
    onCleanup(() => io.disconnect());
  }

  // ───────────── home ─────────────
  const FEAT = {
    performance: ['Higher, steadier FPS', 'gauge'],
    input: ['Lower input delay', 'mouse'],
    network: ['Steadier ping', 'signal'],
    power: ['Full-speed CPU', 'bolt'],
    background: ['Less background junk', 'layers'],
    visuals: ['A snappier Windows', 'spark'],
  };
  const TOUR = [
    { id: 'home', tab: 'Home', title: 'Your whole PC at a glance', text: 'One mark per tweak shows what’s on and what’s recommended. Your hardware, live CPU, memory and ping, and the scan’s biggest findings sit right underneath.', pts: ['Apply everything recommended in one click', 'Live CPU, memory and latency meters', 'Quick actions: restore point, clean temp files, flush DNS'], alt: 'Ego Tweaks Home: a dial of all 87 tweaks, the PC’s hardware and live meters' },
    { id: 'tweaks', tab: 'Tweaks', title: `${TWEAKS.length} tweaks, picked for your hardware`, text: 'Every tweak says what it changes, why it fits your PC and how much it matters. Show the ones picked for you, or browse all of them.', pts: ['Impact rating on every tweak', '“Why” notes based on your scan', 'Restart-needed flags up front'], alt: 'Ego Tweaks Tweaks page: categories on the left, tweaks with switches on the right' },
    { id: 'games', tab: 'Games', title: 'Settings for the games you play', text: 'Ego Tweaks finds the games on your PC and gives per-game Windows settings plus in-game advice tuned to your monitor.', pts: [`${GAMES.length} games recognised — add your own`, 'High-performance GPU per game', 'Recommended in-game settings'], alt: 'Ego Tweaks Games page showing Fortnite settings and advice' },
    { id: 'network', tab: 'Network', title: 'See where your ping comes from', text: 'Live latency, jitter and packet loss, plus how far you are from the cloud regions where game servers run.', pts: ['Live latency graph', 'Average, jitter, best and packet loss', 'Ping to game server regions'], alt: 'Ego Tweaks Network page with a live latency graph' },
    { id: 'bios', tab: 'BIOS', title: 'Guided BIOS steps for your board', text: 'Windows can’t change BIOS settings, so Ego Tweaks gives you step-by-step guides for your exact motherboard, in order of impact.', pts: ['Checks your RAM runs at its rated speed', 'Flags an outdated BIOS', 'Restart straight into BIOS'], alt: 'Ego Tweaks BIOS page with guided steps for the motherboard' },
  ];

  const tourCopy = (t) => `<div class="k">${String(TOUR.indexOf(t) + 1).padStart(2, '0')} / ${String(TOUR.length).padStart(2, '0')} · ${esc(t.tab)}</div><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p><ul>${t.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;

  const impact = (v) => `<span class="impact" data-v="${v}" title="Impact"><i></i><i></i><i></i></span>`;
  const words = (text, start = 0) => text.split(' ').map((w, i) => `<span class="w"><span style="--i:${start + i}">${esc(w)}</span></span>`).join(' ');
  const pad2 = (n) => String(n).padStart(2, '0');
  // HUD header row ([01] ──ruler── LABEL) and an uppercase headline whose 2nd line is scan type
  const KL = '<i class="key-light" aria-hidden="true"></i>', RULER = '<i class="ruler" aria-hidden="true"></i>';
  const secK = (n, label, cls = '') => `<div class="sec-k${cls}"><span class="sec-n">[${n}]</span>${RULER}<span class="hud-k">${label}</span></div>`;
  const hl = (l1, l2) => `<span class="hl" style="--l:0"><span>${l1}</span></span>${l2 ? ` <span class="hl scan" style="--l:1"><span>${l2}</span></span>` : ''}`;
  const secHead = (n, label, l1, l2 = '', sub = '') => `<div class="sec-hd rv">${secK(n, label)}
      <h2>${hl(l1, l2)}</h2>${sub ? `<p class="sec-sub">${sub}</p>` : ''}</div>`;
  const IMPACT_LABEL = { 1: 'Small', 2: 'Medium', 3: 'Big' };

  // ── the dial: one tick per tweak, the same object everywhere (hero, scan, reticles, rings) ──
  const num = (v) => String(Math.round(v * 100) / 100 || 0);
  const tick = (r0, r1, deg, attrs) => {
    const a = (deg * Math.PI) / 180, s = Math.sin(a), c = -Math.cos(a);
    return `<line ${attrs} x1="${num(s * r0)}" y1="${num(c * r0)}" x2="${num(s * r1)}" y2="${num(c * r1)}"/>`;
  };
  // the 270° app dial: tick i sits at -135° + i·270/86, clockwise from 12 o'clock
  const dialDeg = (i) => -135 + (i * 270) / (TWEAKS.length - 1);
  const catMid = (id) => TWEAKS.findIndex((t) => t.cat === id) + (perCat(id) - 1) / 2;
  const GAUGE = {};
  function gaugeSvg(kind) {
    if (GAUGE[kind]) return GAUGE[kind];
    const n = TWEAKS.length;
    const open = (vb) => `<svg class="gauge gauge-${kind}" viewBox="${vb}" aria-hidden="true" focusable="false">`;
    let out;
    if (kind === 'hero' || kind === 'scan') {
      const ticks = TWEAKS.map((t, i) => tick(228, 262, dialDeg(i), `data-i="${i}" data-c="${esc(t.cat)}"`)).join('');
      let extra = '';
      if (kind === 'scan') {
        const labels = CATEGORIES.map((c, k) => {
          const deg = dialDeg(catMid(c.id)), a = (deg * Math.PI) / 180;
          const anchor = deg < -15 ? 'end' : deg > 15 ? 'start' : 'middle';
          return `<text data-c="${esc(c.id)}"${k === 0 ? ' class="on"' : ''} x="${num(Math.sin(a) * 296)}" y="${num(-Math.cos(a) * 296)}" dy=".35em" text-anchor="${anchor}">${esc(c.name)}</text>`;
        }).join('');
        extra = `<g class="g-labels">${labels}</g><line class="g-needle" x1="0" y1="-150" x2="0" y2="-200"/>`;
      }
      out = `${open('-340 -340 680 680')}<path class="g-ring" d="M -145.66 145.66 A 206 206 0 1 1 145.66 145.66"/><g class="g-ticks">${ticks}</g>${extra}</svg>`;
    } else if (kind === 'reticle') {
      let ticks = '';
      for (let i = 0; i < n; i++) ticks += tick(246, 262, (i * 360) / n, `style="--i:${i}"`);
      out = `${open('-300 -300 600 600')}<circle class="g-outer" r="286"/><g class="g-ticks">${ticks}</g><circle class="g-seg" r="226"/><circle class="g-thin" r="206"/>`
        + '<g class="g-sweep"><path d="M 0 -206 A 206 206 0 0 1 145.66 -145.66"/></g>'
        + '<g class="g-cross"><line x1="-300" y1="0" x2="-246" y2="0"/><line x1="246" y1="0" x2="300" y2="0"/><line x1="0" y1="-300" x2="0" y2="-246"/><line x1="0" y1="246" x2="0" y2="300"/></g></svg>';
    } else {
      let ticks = '';
      for (let i = 0; i < n; i++) ticks += tick(48, 54, (i * 360) / n, `style="--i:${i}"`);
      out = `${open('-60 -60 120 120')}<g class="g-ticks">${ticks}</g></svg>`;
    }
    return (GAUGE[kind] = out);
  }

  // five real catalog tweaks for the Undo-all demo (any name missing from the catalog is dropped)
  const UNDO_ROWS = ['Ultimate Performance power plan', 'Turn off background game recording', 'Turn off network throttling', 'Turn off core parking', 'Instant menus'];

  // ── shared by the section pages: header, and the "next page" link at the bottom ──
  const pageIdx = (id) => PAGES.findIndex(([p]) => p === id);
  const NEXT_LINE = { features: 'Six areas, one dial.', tweaks: `Search all ${TWEAKS.length}.`, app: 'Every page of the app.', safety: 'Flip it. Flip it back.', pricing: 'Free, or Premium.', faq: 'Straight answers.' };
  const pageTop = (id, l1, l2, sub = '') => `<div class="page-fx" aria-hidden="true"><i class="key-light"></i>${gaugeSvg('reticle')}</div>
    <div class="wrap page sp-page sp-${id}">
      <header class="page-hd rv">${secK(pad2(pageIdx(id) + 1), esc(PAGES[pageIdx(id)][1]))}<h1>${hl(l1, l2)}</h1>${sub ? `<p>${sub}</p>` : ''}</header>`;
  function pager(id) {
    const i = pageIdx(id), prev = PAGES[i - 1] || ['home', 'Home'], next = PAGES[i + 1];
    const [to, k, title, line] = next ? [next[0], `[${pad2(i + 2)}] Next`, next[1], NEXT_LINE[next[0]]] : ['download', '[↓] Next', 'Download', 'Free for Windows 10 and 11.'];
    return `<nav class="wrap pager rv" aria-label="More pages">
      <button type="button" class="pager-prev" data-nav="${prev[0]}">${svg('arrow')}<span><small>Back</small>${esc(prev[1])}</span></button>
      <button type="button" class="card pager-next spot" data-nav="${to}" data-lock><span class="pager-k">${k}</span><span class="pager-t">${esc(title)}</span><span class="pager-s">${esc(line)}</span><span class="pager-go">${svg('arrow')}</span></button>
    </nav>`;
  }
  const subHead = (k, label, l1, l2, sub = '') => `<div class="sp-sub rv">${secK(k, label)}<h2>${hl(l1, l2)}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;

  // ── home: the hero, the numbers, the games, then one card per page ──
  const HUB = [
    ['features', 'What it tunes', `Six areas, ${TWEAKS.length} tweaks. Spin the dial.`],
    ['tweaks', 'Every tweak', 'Search the whole catalog before you download.'],
    ['app', 'The app', 'Five pages, one scan. Take the tour.'],
    ['safety', 'Undo anything', 'Every change is saved first, and can go back.'],
    ['pricing', 'Pricing', PREMIUM.price ? `Free — or Premium at ${PREMIUM.price} a month.` : 'Free — Premium if you want it.'],
    ['faq', 'FAQ', 'Straight answers before you download.'],
  ];
  function hubViz(id) {
    if (id === 'features') return `<div class="hv hv-dial">${gaugeSvg('mini')}<b>${TWEAKS.length}</b></div>`;
    if (id === 'tweaks') {
      const names = TWEAKS.filter((x, i) => i % 7 === 0).slice(0, 10);
      const row = (hide) => names.map((x) => `<span${hide ? ' aria-hidden="true"' : ''}>${impact(x.impact)}${esc(x.name)}</span>`).join('');
      return `<div class="hv hv-list"><div>${row()}${row(true)}</div></div>`;
    }
    if (id === 'app') return '<div class="hv hv-shot"><img src="assets/shots/tweaks.webp" width="1920" height="1200" alt="" loading="lazy" decoding="async"></div>';
    if (id === 'safety') return '<div class="hv hv-switch"><i class="hv-sw"><b></b></i><span class="hv-a">Value saved</span><span class="hv-b">Put back</span></div>';
    if (id === 'pricing') return `<div class="hv hv-price"><b>$0</b>${PREMIUM.price ? `<b>${esc(PREMIUM.price)}</b>` : ''}</div>`;
    return '<div class="hv hv-faq"><span>Is it really free?</span><span>Can I undo changes?</span><span>Does it touch my games?</span></div>';
  }

  function pageHome() {
    const reviews = REVIEWS.length ? reviewSection() : '';
    const gameRow = (list, hide = false) => list.map((g) => `<span${hide ? ' aria-hidden="true"' : ''}>${esc(g)}</span>`).join('');
    const half = Math.ceil(GAMES.length / 2), rowA = GAMES.slice(0, half), rowB = GAMES.slice(half);
    const cards = HUB.map(([id, title, sub], i) => `<a class="card hub-card spot rv" href="#/${id}" data-nav="${id}" data-lock style="--d:${i % 3}">
        <span class="hub-k">[${pad2(i + 1)}]</span>${hubViz(id)}
        <h3>${esc(title)}</h3><p>${esc(sub)}</p><span class="hub-go">Open ${svg('arrow')}</span></a>`).join('');
    return `
    <section class="hero" id="top" data-scene="hero">
      <div class="hero-pin" data-pin>
        <i class="hero-haze" aria-hidden="true"></i>
        <canvas class="hero-gl" id="hero-gl" aria-hidden="true"></canvas>
        <div class="hero-svg" aria-hidden="true">${gaugeSvg('hero')}</div>
        <div class="hero-readout" aria-hidden="true"><b>${TWEAKS.length}</b><span>Tweaks · ${CATEGORIES.length} areas</span></div>
        <div class="hero-copy">
          <a class="badge rv" href="#/download" data-nav="download"><b>New</b>v1.2 adds Games and BIOS guides ${svg('arrow')}</a>
          <h1 class="hero-h rv" style="--d:1" aria-label="More frames. Less lag.">
            <span class="hl" style="--l:0">${words('More frames.')}</span> <span class="hl scan" style="--l:1">${words('Less lag.', 2)}</span></h1>
          <p class="hero-sub rv" style="--d:3">Ego Tweaks scans your PC and matches <b>${TWEAKS.length} Windows tweaks</b> to your hardware — frame pacing, input delay, network and power. Every change is backed up and can be undone in one click.</p>
          <div class="hero-cta rv" style="--d:4">
            <button class="btn btn-primary btn-lg mag" data-nav="download">${svg('download')}Get Ego Tweaks — free</button>
            <button class="btn btn-line btn-lg mag" data-nav="premium">${svg('key')}Premium${PREMIUM.price ? ` · ${esc(PREMIUM.price)}/mo` : ''}</button>
          </div>
          <div class="hero-proof rv" style="--d:5">
            <span class="dc-live" data-dc-wrap hidden><i class="pulse"></i><b data-dc="online">—</b>&nbsp;online in our Discord</span>
            <span class="hero-game">Game settings for <b id="hero-game">${esc(GAMES[0])}</b></span>
            <span>v${esc(BUILD.version)} · ${fmtMB(BUILD.bytes)}</span>
          </div>
        </div>
        <div class="hero-window" id="stage">
          <i class="lightbar" aria-hidden="true"></i>
          <div class="stage-in">
            <img src="assets/shots/home.webp" width="1920" height="1200" fetchpriority="high" data-dial="0.2583 0.3428 0.1443 0.783"
                 alt="The Ego Tweaks app: a dial of all ${TWEAKS.length} tweaks, the PC’s hardware and live CPU, memory and ping meters">
            <div class="stage-marks" aria-hidden="true">
              <i class="mk" data-mk="1" style="--x:36.5%;--y:14%"><b>01</b></i>
              <i class="mk" data-mk="2" style="--x:44.4%;--y:38.4%"><b>02</b></i>
              <i class="mk" data-mk="3" style="--x:9.6%;--y:57.6%"><b>03</b></i>
              <i class="mk" data-mk="4" style="--x:9.6%;--y:89.6%"><b>04</b></i>
            </div>
          </div>
        </div>
        <div class="stage-after">
          <ol class="stage-legend">
            <li data-mk="1"><b>01</b>${TWEAKS.length}-tweak dial — what’s on and what’s recommended</li>
            <li data-mk="2"><b>02</b>One click applies everything recommended</li>
            <li data-mk="3"><b>03</b>Hardware scan — CPU, GPU, memory, drives, display, network</li>
            <li data-mk="4"><b>04</b>Live CPU, memory and latency meters</li>
          </ol>
          <p class="shot-cap">The Ego Tweaks app, shown with demo data.</p>
        </div>
        <div class="hero-foot" aria-hidden="true"><span class="scroll-cue"><i></i>Scroll</span><span>${esc(BUILD.file)} · v${esc(BUILD.version)} · ${fmtMB(BUILD.bytes)}</span></div>
      </div>
    </section>

    <section class="ledger" aria-label="Ego Tweaks in numbers">
      <div class="wrap ledger-in">
        <div class="ledger-cell rv"><b class="count" data-to="${TWEAKS.length}">0</b><span>Tweaks, matched to your hardware</span></div>
        <div class="ledger-cell rv" style="--d:1"><b class="count" data-to="${CATEGORIES.length}">0</b><span>Areas tuned, from FPS to ping</span></div>
        <div class="ledger-cell rv" style="--d:2"><b class="count" data-to="${GAMES.length}">0</b><span>Games with built-in settings</span></div>
        <div class="ledger-cell rv" style="--d:3"><b><span class="count" data-to="${TWEAKS.length}">0</span><small>/${TWEAKS.length}</small></b><span>Reversible — every single change</span></div>
      </div>
      <p class="ledger-slate">${esc(BUILD.file)} · v${esc(BUILD.version)} · ${fmtMB(BUILD.bytes)} · Windows 10 &amp; 11 · Free</p>
    </section>

    <section class="games" data-velocity data-live aria-label="Games with built-in settings">
      <div class="wrap games-hd"><span class="hud-k">Built-in settings for</span>${RULER}<span class="hud-k">${GAMES.length} games — add your own</span></div>
      <div class="marquee" data-dir="-1"><div class="marquee-track">${gameRow(rowA)}${gameRow(rowA, true)}</div></div>
      <div class="marquee rev" data-dir="1" aria-hidden="true"><div class="marquee-track">${gameRow(rowB)}${gameRow(rowB)}</div></div>
    </section>

    <section class="sec hub-sec" id="explore">${KL}<div class="wrap">
      ${secHead('→', 'Explore', 'Pick a page.', 'Dive in.', 'Every part of Ego Tweaks has a page of its own — with something to play with on each one.')}
      <div class="hub" data-live>${cards}</div>
    </div></section>
    ${reviews}

    <section class="finale" data-scene="finale" data-live>
      <div class="finale-rings" aria-hidden="true"><div class="finale-ring">${gaugeSvg('reticle')}</div></div>
      <div class="wrap finale-in rv">
        ${secK('GO', 'Ready when you are', ' sec-k--center')}
        <h2>${hl('Tune your PC.', 'Undo anything.')}</h2>
        <p>${DC_LOGIN ? 'Log in with Discord' : 'Free account'}, ${fmtMB(BUILD.bytes)} download, every tweak reversible.</p>
        <div class="hero-cta"><button class="btn btn-primary btn-lg mag" data-nav="download">${svg('download')}Get Ego Tweaks</button><button class="btn btn-line btn-lg mag" data-nav="features">See what it tunes</button></div>
        <div class="fine">Free · v${esc(BUILD.version)} · Windows 10 &amp; 11 · ${fmtMB(BUILD.bytes)}</div>
      </div>
    </section>`;
  }

  // ── Features: the dial you can spin ──
  function dxPanel(k) {
    const c = CATEGORIES[k], all = TWEAKS.filter((x) => x.cat === c.id).sort((p, q) => q.impact - p.impact);
    return `<div class="dx-ch" data-c="${esc(c.id)}">
        <span class="scan-k"><b>${pad2(k + 1)}</b> / ${pad2(CATEGORIES.length)} · ${esc(c.name)}</span>
        <h3>${words((FEAT[c.id] || [c.name])[0])}</h3>
        <p>${esc(c.blurb)}.</p>
        <ul class="dx-list">${all.slice(0, 5).map((x) => `<li data-i="${TWEAKS.indexOf(x)}">${impact(x.impact)}<span>${esc(x.name)}</span></li>`).join('')}</ul>
        <button type="button" class="btn btn-ghost btn-sm dx-all" data-act="xp-go" data-cat="${esc(c.id)}">See all ${all.length} ${esc(c.name.toLowerCase())} tweaks ${svg('arrow')}</button>
      </div>`;
  }
  function pageFeatures() {
    const first = CATEGORIES[0];
    const rail = CATEGORIES.map((c, k) => `<button type="button" role="tab" data-dk="${k}" class="${k === 0 ? 'on' : ''}" aria-selected="${k === 0}" tabindex="${k === 0 ? 0 : -1}" data-lock><span class="bar"><i></i></span><span class="num">${pad2(k + 1)}</span><span class="nm">${esc(c.name)}</span><small>${perCat(c.id)}</small></button>`).join('');
    return `${pageTop('features', 'Built for what', 'slows you down.', `Six areas, ${TWEAKS.length} tweaks. Each one says exactly what it changes — and the scan only recommends the ones that fit your PC.`)}
      <div class="dx rv" data-k="0" style="--needle:${num(dialDeg(catMid(first.id)))}deg">
        <div class="dx-dial">
          ${gaugeSvg('scan')}
          <div class="dx-read" aria-hidden="true"><span class="dx-n">${perCat(first.id)}</span><span class="dx-unit">Tweaks · ${esc(first.name)}</span></div>
          <div class="dx-probe" aria-hidden="true"></div>
          <span class="dx-hint" aria-hidden="true">${FINE ? 'Hover a tick · drag to spin' : 'Tap the dial to pick an area'}</span>
        </div>
        <div class="dx-side">
          <div class="dx-rail" role="tablist" aria-label="Areas">${rail}</div>
          <div class="dx-panel" aria-live="polite">${dxPanel(0)}</div>
        </div>
      </div>
      ${subHead('→', 'How it works', 'Three steps.', 'Nothing to install.')}
      <div class="how" data-scene="how">
        <i class="how-line" aria-hidden="true"><i></i></i>
        <div class="how-step rv"><span class="how-n" aria-hidden="true">01</span><span class="ico">${svg('download')}</span><h3>Get it</h3>
          <p>${DC_LOGIN ? 'Log in with Discord' : 'Make a free account here'} and download the ${fmtMB(BUILD.bytes)} app. Nothing to install.</p></div>
        <div class="how-step rv" style="--d:1"><span class="how-n" aria-hidden="true">02</span><span class="ico">${svg('scan')}</span><h3>Scan</h3>
          <p>It reads your CPU, GPU, memory, drives, display and network, then matches the tweaks that fit.</p></div>
        <div class="how-step rv" style="--d:2"><span class="how-n" aria-hidden="true">03</span><span class="ico">${svg('check')}</span><h3>Apply</h3>
          <p>Apply everything recommended in one click, or pick tweaks one by one. Turn any of them off later.</p></div>
      </div>
    </div>
    ${pager('features')}`;
  }

  // the dial: pick an area with the rail, a click or a drag on the dial; it also steps through on its own
  function initDial(view) {
    const dx = $('.dx', view);
    if (!dx) return;
    const dial = $('.dx-dial', dx), svgEl = $('svg', dial), ticks = $$('.g-ticks line', dial), labels = $$('text[data-c]', dial), rail = $$('[data-dk]', dx), probe = $('.dx-probe', dx);
    const N = CATEGORIES.length;
    let k = -1, hot = -1, drag = false, seen = false, held = false, holdT = 0;
    const sync = () => dx.classList.toggle('auto', !REDUCED && seen && !held && !document.hidden);
    const hold = () => { held = true; sync(); clearTimeout(holdT); holdT = setTimeout(() => { held = false; sync(); }, 9000); };
    const set = (nk, user) => {
      if (user) hold();
      nk = (nk + N) % N;
      if (nk === k) return;
      const prev = k, c = CATEGORIES[(k = nk)];
      dx.dataset.k = k;
      dx.style.setProperty('--needle', num(dialDeg(catMid(c.id))) + 'deg');
      labels.forEach((t) => t.classList.toggle('on', t.dataset.c === c.id));
      let j = 0;
      ticks.forEach((l) => { const on = l.dataset.c === c.id; if (on) l.style.setProperty('--j', j++); l.classList.toggle('on', on); });
      rail.forEach((b, i) => { const on = i === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      const n = $('.dx-n', dx), unit = $('.dx-unit', dx);
      if (n) { if (prev < 0 || REDUCED) n.textContent = perCat(c.id); else scrambleTo(n, String(perCat(c.id)), 300); }
      if (unit) unit.textContent = 'Tweaks · ' + c.name;
      const panel = $('.dx-panel', dx);
      if (panel && prev >= 0) {
        panel.classList.add('out');
        clearTimeout(panel.__t);
        panel.__t = setTimeout(() => { panel.innerHTML = dxPanel(k); panel.classList.remove('out'); markHot(); }, REDUCED ? 0 : 170);
      }
    };
    // which tick is under the pointer (the dial is 270°, ticks clockwise from -135°)
    const at = (e) => {
      const r = svgEl.getBoundingClientRect(), sc = r.width / 680;
      const x = (e.clientX - r.left - r.width / 2) / sc, y = (e.clientY - r.top - r.height / 2) / sc;
      const d = Math.hypot(x, y), deg = (Math.atan2(x, -y) * 180) / Math.PI;
      if (d < 130 || d > 335 || Math.abs(deg) > 143) return -1;
      return clamp(Math.round(((deg + 135) / 270) * (TWEAKS.length - 1)), 0, TWEAKS.length - 1);
    };
    const markHot = () => $$('.dx-list li', dx).forEach((li) => li.classList.toggle('hot', +li.dataset.i === hot));
    const probeAt = (i) => {
      if (i === hot) return;
      if (hot >= 0 && ticks[hot]) ticks[hot].classList.remove('hot');
      hot = i;
      if (i < 0) { dx.classList.remove('probing'); markHot(); return; }
      ticks[i].classList.add('hot');
      const t = TWEAKS[i];
      probe.innerHTML = `${impact(t.impact)}<b>${esc(t.name)}</b><small>${esc(catName(t.cat))} · ${esc(IMPACT_LABEL[t.impact] || '')} impact</small>`;
      dx.classList.add('probing');
      markHot();
    };
    const pick = (i) => { if (i >= 0) set(CATEGORIES.findIndex((c) => c.id === TWEAKS[i].cat), true); };
    dial.addEventListener('pointermove', (e) => { const i = at(e); probeAt(i); if (drag) pick(i); });
    dial.addEventListener('pointerdown', (e) => {
      const i = at(e);
      if (i < 0) return;
      drag = true; pick(i); probeAt(i);
      if (e.pointerType !== 'touch') try { dial.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    });
    const up = (e) => { drag = false; if (e.pointerType === 'touch') setTimeout(() => probeAt(-1), 1600); };
    dial.addEventListener('pointerup', up);
    dial.addEventListener('pointercancel', up);
    dial.addEventListener('pointerleave', () => { if (!drag) probeAt(-1); });
    dx.addEventListener('click', (e) => { const b = e.target.closest('[data-dk]'); if (b) set(+b.dataset.dk, true); });
    // the active rail bar fills up; when it's full the dial moves on (paused while you point at it)
    dx.addEventListener('animationend', (e) => { if (e.animationName === 'dxFill' && dx.classList.contains('auto')) set(k + 1); });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.35 });
      io.observe(dx); onCleanup(() => io.disconnect());
    }
    const vis = () => sync();
    document.addEventListener('visibilitychange', vis);
    onCleanup(() => { document.removeEventListener('visibilitychange', vis); clearTimeout(holdT); });
    set(0);
  }

  // ── Tweaks: the full list, plus the games ──
  function pageTweaks() {
    const xpRows = TWEAKS.map((x) => `<div class="xp-row" data-cat="${esc(x.cat)}" data-q="${esc(x.name.toLowerCase())}">${impact(x.impact)}<span class="nm">${esc(x.name)}</span><span class="ct">${esc(catName(x.cat))}</span></div>`).join('');
    // honest legend: only the impact levels the catalog actually uses
    const legend = [...new Set(TWEAKS.map((x) => x.impact))].sort((p, q) => p - q).map((v) => `${impact(v)} ${IMPACT_LABEL[v] || ''}`).join(' ');
    return `${pageTop('tweaks', 'Every tweak.', 'Nothing hidden.', 'Search the whole catalog before you download. Bars show expected impact — results vary by game and hardware.')}
      <div class="card xp rv">
        <div class="xp-bar">
          <label class="xp-search">${svg('search')}<input id="xp-q" type="search" placeholder="Search ${TWEAKS.length} tweaks…" autocomplete="off" spellcheck="false" aria-label="Search tweaks"></label>
          <div class="xp-cats" role="tablist" aria-label="Filter by category">
            <button type="button" role="tab" data-xcat="all" class="${S.xcat === 'all' ? 'on' : ''}" aria-selected="${S.xcat === 'all'}">All <span>${TWEAKS.length}</span></button>
            ${CATEGORIES.map((c) => `<button type="button" role="tab" data-xcat="${c.id}" class="${S.xcat === c.id ? 'on' : ''}" aria-selected="${S.xcat === c.id}">${esc(c.name)} <span>${perCat(c.id)}</span></button>`).join('')}
          </div>
        </div>
        <div class="xp-list" id="xp-list">${xpRows}<div class="xp-empty" id="xp-empty" hidden>No tweaks match that search.</div></div>
        <button type="button" class="btn btn-line xp-more" data-act="xp-more" hidden>Show all ${TWEAKS.length} tweaks</button>
        <div class="xp-foot"><span id="xp-count">Showing ${TWEAKS.length} of ${TWEAKS.length}</span><span class="xp-legend">${legend}</span></div>
      </div>
      ${subHead('G', 'Games', 'Settings for', 'your games.', `Ego Tweaks recognises ${GAMES.length} games and gives each one its own Windows settings and in-game advice. Add any other game yourself.`)}
      <div class="game-grid rv">${GAMES.map((g, i) => `<span style="--i:${i}">${esc(g)}</span>`).join('')}</div>
    </div>
    ${pager('tweaks')}`;
  }

  // ── The app: one window, five pages ──
  function pageApp() {
    const t = TOUR.find((x) => x.id === S.tour) || TOUR[0];
    S.tour = t.id;
    const tabs = TOUR.map((x, i) => `<button type="button" role="tab" class="tour-tab${x.id === t.id ? ' on' : ''}" aria-selected="${x.id === t.id}" tabindex="${x.id === t.id ? 0 : -1}" data-tour="${x.id}" style="--p:${x.id === t.id ? 1 : 0}"><span class="bar"><i></i></span><span class="num">${pad2(i + 1)}</span><span class="tt">${esc(x.tab)}</span></button>`).join('');
    const shots = TOUR.map((x) => `<img class="${x.id === t.id ? 'on' : ''}" data-shot="${x.id}" src="assets/shots/${x.id}.webp" width="1920" height="1200" alt="${esc(x.alt)}" loading="${x.id === t.id ? 'eager' : 'lazy'}" decoding="async">`).join('');
    return `${pageTop('app', 'Everything in', 'one window.', 'One scan powers every page. Click through them — or let the tour play.')}
      <div class="vw rv" id="tour">
        <div class="tour-tabs vw-tabs" role="tablist" aria-label="App pages">${tabs}</div>
        <div class="vw-grid">
          <div class="vw-win" data-tilt>
            <div class="vw-shots" id="tour-shots">${shots}</div>
            <i class="vw-lens" aria-hidden="true"></i>
            <button type="button" class="icon-btn vw-arrow vw-prev" data-act="vw-prev" aria-label="Previous page of the app">${svg('arrow')}</button>
            <button type="button" class="icon-btn vw-arrow vw-next" data-act="vw-next" aria-label="Next page of the app">${svg('arrow')}</button>
          </div>
          <div class="vw-side">
            <div class="vw-copy" id="tour-copy">${tourCopy(t)}</div>
            <button type="button" class="btn btn-line btn-sm vw-zoom" data-act="shot-zoom" data-src="assets/shots/${t.id}.webp" data-alt="${esc(t.alt)}">${svg('expand')}View full screenshot</button>
            <p class="shot-cap">Shown with demo data. ${FINE ? 'Hover the window to zoom in; drag it to flip pages.' : 'Swipe the window to flip pages.'}</p>
          </div>
        </div>
      </div>
    </div>
    ${pager('app')}`;
  }
  // the tour plays on its own while it's on screen; any click or swipe pauses it for a while
  let vwHold = () => {};
  const stepTour = (d) => { const i = Math.max(0, TOUR.findIndex((x) => x.id === S.tour)); setTour(TOUR[(i + d + TOUR.length) % TOUR.length].id); };
  function initViewer(view) {
    const vw = $('.vw', view);
    if (!vw) return;
    const win = $('.vw-win', vw), lens = $('.vw-lens', vw), shots = $('.vw-shots', vw);
    let seen = false, held = false, holdT = 0, x0 = null, dx = 0, moved = false;
    const sync = () => vw.classList.toggle('auto', !REDUCED && seen && !held && !document.hidden);
    vwHold = () => { held = true; sync(); clearTimeout(holdT); holdT = setTimeout(() => { held = false; sync(); }, 10000); };
    vw.addEventListener('animationend', (e) => { if (e.animationName === 'vwFill' && vw.classList.contains('auto')) stepTour(1); });
    $('.vw-tabs', vw).addEventListener('click', () => vwHold());
    // drag / swipe the window to flip pages; a plain click opens the full screenshot
    win.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; dx = 0; moved = false; win.classList.add('grab'); });
    win.addEventListener('pointermove', (e) => {
      if (FINE && lens) {
        const r = win.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, z = 2.4;
        const img = $('img.on', shots);
        lens.style.transform = `translate3d(${(x - 90).toFixed(0)}px, ${(y - 90).toFixed(0)}px, 0)`;
        if (img) { lens.style.backgroundImage = `url("${img.getAttribute('src')}")`; lens.style.backgroundSize = `${(r.width * z).toFixed(0)}px ${(r.height * z).toFixed(0)}px`; lens.style.backgroundPosition = `${(90 - x * z).toFixed(0)}px ${(90 - y * z).toFixed(0)}px`; }
        win.classList.toggle('lens-on', !e.target.closest('button') && x0 == null);
      }
      if (x0 == null) return;
      dx = e.clientX - x0;
      if (Math.abs(dx) > 6) { moved = true; shots.style.setProperty('--dx', dx.toFixed(0) + 'px'); }
    });
    const end = (e) => {
      if (x0 == null) return;
      win.classList.remove('grab'); shots.style.removeProperty('--dx');
      const d = dx; x0 = null;
      if (Math.abs(d) > 50) { vwHold(); stepTour(d < 0 ? 1 : -1); }
      else if (!moved && e.type === 'pointerup') { const t = TOUR.find((x) => x.id === S.tour); if (t) { vwHold(); openShot(`assets/shots/${t.id}.webp`, t.alt); } }
    };
    win.addEventListener('pointerup', end);
    win.addEventListener('pointercancel', end);
    win.addEventListener('pointerleave', (e) => { win.classList.remove('lens-on'); if (x0 != null && e.pointerType !== 'touch') end(e); });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.4 });
      io.observe(vw); onCleanup(() => io.disconnect());
    }
    const vis = () => sync();
    document.addEventListener('visibilitychange', vis);
    onCleanup(() => { document.removeEventListener('visibilitychange', vis); clearTimeout(holdT); vwHold = () => {}; });
  }
  function openShot(src, alt) {
    openModal(`<div class="shot-zoom"><img src="${esc(src)}" alt="${esc(alt)}" width="1920" height="1200"></div><div class="modal-actions"><button type="button" class="btn btn-primary" data-act="close">Done</button></div>`);
    $('#modal .modal').classList.add('wide');
  }

  // ── Safety: the real registry demo, restore points, undo all ──
  function pageSafety() {
    const mouse = TWEAKS.find((x) => x.id === 'mouse-accel') || { name: 'Turn off mouse acceleration', impact: 2 };
    const diffRows = MOUSE_OPS.map(([n, was]) => `<div class="diff-row" data-reg="${n}"><span class="diff-k">${n}</span><span class="diff-saved">—</span><span class="diff-now">${was}</span></div>`).join('');
    const undoRows = UNDO_ROWS.filter((n) => TWEAKS.some((x) => x.name === n)).map((n) => `<div class="undo-row"><span>${esc(n)}</span><i class="tg on"></i></div>`).join('');
    return `${pageTop('safety', 'Made to be', 'undone.', 'Try anything. Keep what you like. Everything else goes back exactly how it was.')}
      <p class="scrub-text" data-scrub>Before a tweak touches anything, Ego Tweaks saves the value it replaces. Turn it off and that value is written back — exactly as it was.</p>
      <div class="undo">
        <div class="card undo-demo spot rv" data-state="off">
          <div class="b-k"><span>Try it</span><span class="chip">Live demo</span></div>
          <h3>Flip a tweak. Flip it back.</h3>
          <p>This is the real mouse acceleration tweak, with the real registry values it saves and restores. Try the switch.</p>
          <div class="tw">${impact(mouse.impact)}<div><div class="tw-name">${esc(mouse.name)}</div><p class="tw-desc">Your cursor moves exactly as far as your hand does.</p>
            <div class="tw-meta"><span class="chip rec">For your PC</span><span class="chip">Input</span></div></div>
            <button type="button" class="tg" data-act="demo-tweak" role="switch" aria-checked="false" aria-label="${esc(mouse.name)}"></button></div>
          <div class="diff" aria-hidden="true">
            <div class="diff-hd"><span>Value</span><span>Saved</span><span>Now</span></div>
            ${diffRows}
          </div>
          <div class="term"><div class="term-bar"><i></i><i></i><i></i><span>registry · HKCU\\Control Panel\\Mouse</span></div>
            <div class="reglog" id="reglog" aria-live="polite"><div class="hint">› Nothing changed yet. Flip the switch.<span class="caret"></span></div></div></div>
        </div>
        <div class="card undo-restore spot rv" style="--d:1">
          <div class="b-k"><span>Restore points</span><span class="chip">Demo</span></div>
          <h3>A full snapshot, one click</h3>
          <p>Make a full Windows snapshot before big batches of changes. You can roll back from Windows Recovery even if the app is uninstalled.</p>
          <div class="row"><button type="button" class="btn btn-line btn-sm" data-act="demo-restore">Create restore point</button><div class="prog idle" id="rp-prog"><i></i></div><span class="state" id="rp-state"></span></div>
        </div>
        <div class="card undo-all spot rv" style="--d:2">
          <div class="b-k"><span>Undo all</span></div>
          <div class="big"><span class="count" data-to="${TWEAKS.length}">0</span><small>/${TWEAKS.length}</small></div>
          <p>Every tweak is reversible. Turn one off — or hit Undo all — and the saved values are written back. Every change is listed in a history you can read.</p>
          <div class="undo-stack" aria-hidden="true">${undoRows}</div>
          <div class="row"><button type="button" class="btn btn-line btn-sm" data-act="demo-undoall" aria-pressed="false">${svg('undo')}Undo all</button><span class="state" id="undo-state" aria-live="polite"></span></div>
        </div>
      </div>
    </div>
    ${pager('safety')}`;
  }

  // ── Pricing: the two plans, then the Discord ──
  function pagePricing() {
    return `${pageTop('pricing', 'Free.', 'Premium if you want it.', `The app is free to download and use. Premium is an optional upgrade, ${esc(PER_MONTH)} — pay through Payhip and get your own key.`)}
      <div class="plans">
        <div class="card plan spot rv">
          <div class="name"><span>Ego Tweaks</span><span class="chip">Free</span></div>
          <div class="price">$0<small>free download</small></div>
          <p class="plan-sub">The full utility. No card, no trial, no catch.</p>
          <ul>${[`All ${TWEAKS.length} tweaks`, 'Games and BIOS guides', 'Live network tools', 'Undo history and restore points', 'Every update', 'No subscription, no ads'].map((x) => `<li>${svg('check')}<span>${x}</span></li>`).join('')}</ul>
          <button class="btn btn-line btn-lg" data-nav="download">${svg('download')}Get Ego Tweaks</button>
        </div>
        ${premiumPlan('rv', 'style="--d:1"')}
      </div>
      <div class="pay-row rv"><span>${svg('lock')}Secure checkout by Payhip</span><span>${svg('key')}${DC_LOGIN ? 'Key sent to your Discord DMs' : 'Key sent in a Discord ticket'}</span><span>${svg('undo')}Never renews automatically</span></div>
    </div>
    ${DISCORD ? discordSection() : ''}
    ${pager('pricing')}`;
  }

  // ── FAQ ──
  function pageFaq() {
    return `${pageTop('faq', 'Straight', 'answers.', `Everything people ask before they download. Still stuck? ${DISCORD ? `<a href="${esc(DISCORD)}" target="_blank" rel="noopener">Ask in our Discord</a>.` : 'Ask us.'}`)}
      <div class="faq rv" style="--d:1">
        ${faq('Is it really free?', DC_LOGIN
          ? 'Yes. The app is free to download and use — you just log in with Discord to download, which also puts you in our Discord server for updates and help. Premium is an optional paid upgrade.'
          : 'Yes. The app is free to download and use — you make a free account on this site to download, that’s it. Premium is an optional paid upgrade.', true)}
        ${faqKey()}
        ${faqRenew()}
        ${faq('Is it safe? Can I undo changes?', 'Before any tweak changes a setting, Ego Tweaks saves the original value. Turn the tweak off and it’s written back. There’s also Undo all, a history of every change, and one-click Windows restore points.')}
        ${faq('Why does Windows SmartScreen warn me?', 'New apps that Windows hasn’t seen much yet can trigger it. Choose <b>More info → Run anyway</b>. You can check the file’s SHA-256 fingerprint on the Download page.')}
        ${faq('Why does it need administrator access?', 'Many tweaks change system-wide settings — services, power plans, network adapter settings — that Windows only lets administrators change. Windows asks when the app opens.')}
        ${faq('Does it touch my games?', 'No. Ego Tweaks changes Windows settings: registry values, services, scheduled tasks, power and network adapter settings. It doesn’t modify game files or run inside games. The Games page only sets Windows options for a game’s .exe and shows in-game settings for you to change yourself.')}
        ${faq('Which Windows versions work?', 'Windows 10 and 11, 64-bit. It needs Microsoft Edge WebView2 (built into Windows 11) and .NET Framework 4.7.2 or later (built into Windows 10 version 1803 and newer). On laptops, the scan skips tweaks that would hurt battery life.')}
      </div>
    </div>
    ${pager('faq')}`;
  }
  const faq = (q, a, open = false) => `<details${open ? ' open' : ''}><summary>${esc(q)}<i aria-hidden="true"></i></summary><div class="a"><p>${a}</p></div></details>`;
  // shared by the home FAQ and the Premium page's mini-FAQ
  const faqKey = () => faq('How do I get my Premium key?', DC_LOGIN
    ? `On the <a href="#/premium" data-nav="premium">Premium page</a>, press <b>Continue with Discord</b>, then buy — checkout is handled by Payhip. The moment you’ve paid, our bot DMs you on Discord and a team member sends your key there. You need to be in our ${DISCORD ? `<a href="${esc(DISCORD)}" target="_blank" rel="noopener">Discord server</a>` : 'Discord server'} so the bot can message you.`
    : `Buy Premium on the <a href="#/premium" data-nav="premium">Premium page</a> — checkout opens right on this site and is handled by Payhip, who email you a receipt. Then open a ticket in our ${TICKET ? `<a href="${esc(TICKET)}" target="_blank" rel="noopener">Discord</a>` : 'Discord'} with the email you paid with or your order number, and we’ll send your key there.`);
  const faqRenew = () => faq('Does Premium renew automatically?', DC_LOGIN
    ? `No. Premium is ${esc(PER_MONTH)}, and each purchase gives you a key that lasts one month. Nothing is charged automatically — when your month is up, buy again and your new key arrives in your Discord DMs.`
    : `No. Premium is ${esc(PER_MONTH)}, and each purchase gives you a key that lasts one month. Nothing is charged automatically — when your month is up, buy again and open a new ticket to keep Premium.`);

  function reviewSection() {
    // stars only when the review itself gives a rating
    const stars = (r) => { const n = Math.round(Number(r.stars)); return n >= 1 && n <= 5 ? `<div class="stars" role="img" aria-label="${n} out of 5">${svg('star').repeat(n)}</div>` : ''; };
    const card = (r, hide = false) => `<figure class="card vouch"${hide ? ' aria-hidden="true"' : ''}>
      ${stars(r)}
      <blockquote>${esc(r.text)}</blockquote>
      <figcaption><span class="av">${esc(String(r.name || '?')[0].toUpperCase())}</span><b>${esc(r.name)}</b>${r.tag ? `<span class="chip">${esc(r.tag)}</span>` : ''}</figcaption>
    </figure>`;
    // repeat a short list so the scrolling row never shows a gap
    const loop = [];
    while (loop.length < 6) loop.push(...REVIEWS);
    return `<section class="sec" id="reviews" data-velocity data-live>${KL}
      <div class="wrap">${secHead('07', 'Reviews', 'From the', 'Discord.')}</div>
      <div class="marquee rv" data-dir="-1"><div class="marquee-track">${loop.map((r, i) => card(r, i >= REVIEWS.length)).join('')}${loop.map((r) => card(r, true)).join('')}</div></div>
    </section>`;
  }

  function discordSection() {
    return `<section class="sec community" id="community" data-live>${KL}
      <div class="wrap dc-band">
        <span class="dc-glyph" aria-hidden="true">${BRAND.discord}</span>
        <div class="dc-copy rv">
          ${secK('DC', 'Community')}
          <h2>${hl('Join the', 'Ego Tweaks Discord.')}</h2>
          <p>Get your Premium key, ask for help with a tweak, and hear about new builds first.</p>
          <div class="dc-live dc-stats" data-dc-wrap hidden>
            <span><i class="pulse"></i><b data-dc="online">—</b> <small>online now</small></span>
            <span><b data-dc="members">—</b> <small>members</small></span></div>
          <a class="btn btn-primary btn-lg mag" href="${esc(DISCORD)}" target="_blank" rel="noopener">${BRAND.discord}Join the Discord</a>
        </div>
        <ul class="dc-list rv" style="--d:1">
          <li><span class="ico">${svg('key')}</span><div><b>Premium keys</b><small>${DC_LOGIN ? 'Our bot DMs you after you pay, and your key arrives there.' : 'Open a ticket after you pay and we send your key there.'}</small></div></li>
          <li><span class="ico">${svg('chat')}</span><div><b>Help when you need it</b><small>Stuck on a tweak, a game or a BIOS step? Ask.</small></div></li>
          <li><span class="ico">${svg('spark')}</span><div><b>Updates first</b><small>New versions and new tweaks, as they land.</small></div></li>
        </ul>
      </div></section>`;
  }

  // ── per-page effects on the home page ──
  function initHome() {
    // rotating game name in the hero
    if (!REDUCED) {
      let gi = 0, inView = true;
      // only while the hero is on screen (no off-screen work, and no half-scrambled name in the page text)
      const hg = $('#hero-game');
      if (hg && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; });
        io.observe(hg); onCleanup(() => io.disconnect());
      }
      const id = setInterval(() => {
        const el = $('#hero-game');
        if (!el || document.hidden || !inView) return;
        gi = (gi + 1) % GAMES.length;
        scrambleTo(el, GAMES[gi], 460);
      }, 2600);
      onCleanup(() => clearInterval(id));
    }
  }

  // The film strip has no timer: fx.js reports which frame is in view (scroll in cine, swipe on phones).
  document.addEventListener('ego:tour', (e) => { if (S.page === 'app' && e.detail && e.detail.id) setTour(e.detail.id); });
  function setTour(id) {
    const t = TOUR.find((x) => x.id === id);
    if (!t) return;
    const same = t.id === S.tour;
    S.tour = t.id;
    $$('.tour-tab').forEach((b) => { const on = b.dataset.tour === t.id; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; b.style.setProperty('--p', on ? 1 : 0); });
    const zoom = $('.vw-zoom');
    if (zoom) { zoom.dataset.src = `assets/shots/${t.id}.webp`; zoom.dataset.alt = t.alt; }
    const count = $('.film-count');
    if (count) { const n = $('b', count), name = $('span', count); if (n) n.textContent = String(TOUR.indexOf(t) + 1).padStart(2, '0'); if (name) name.textContent = t.tab; }
    if (same) return;
    $$('#tour-shots img').forEach((img) => { const on = img.dataset.shot === t.id; if (on) img.loading = 'eager'; img.classList.toggle('on', on); });
    const copy = $('#tour-copy');
    if (!copy) return;
    if (REDUCED) { copy.innerHTML = tourCopy(t); return; }
    copy.classList.add('swap');
    setTimeout(() => { copy.innerHTML = tourCopy(t); copy.classList.remove('swap'); }, 200);
  }

  // ── tweak explorer ──
  // On phones the full list starts clipped to a dozen rows, with a "Show all" button.
  const PHONE = matchMedia('(max-width: 760px)');
  function filterXp() {
    const list = $('#xp-list');
    if (!list) return;
    const q = S.xq.trim().toLowerCase();
    let n = 0;
    $$('.xp-row', list).forEach((r) => { const ok = (S.xcat === 'all' || r.dataset.cat === S.xcat) && (!q || r.dataset.q.includes(q)); r.hidden = !ok; if (ok) n++; });
    $('#xp-count').textContent = `Showing ${n} of ${TWEAKS.length}`;
    $('#xp-empty').hidden = n > 0;
    const clip = !S.xpAll && S.xcat === 'all' && !q && PHONE.matches;
    list.classList.toggle('is-clipped', clip); const more = $('.xp-more'); if (more) more.hidden = !clip;
    const inp = $('#xp-q'); if (inp && inp.value !== S.xq) inp.value = S.xq;
  }
  if (PHONE.addEventListener) PHONE.addEventListener('change', filterXp); else if (PHONE.addListener) PHONE.addListener(filterXp);

  // ── smooth FAQ open/close ──
  function toggleFaq(d) {
    const a = $('.a', d);
    if (REDUCED || !a || !a.animate) { d.open = !d.open; return; }
    if (d.dataset.anim) return;
    d.dataset.anim = '1';
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    if (d.open) {
      d.classList.add('closing');
      const h = a.offsetHeight;
      a.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: ease }).onfinish = () => { d.open = false; d.classList.remove('closing'); delete d.dataset.anim; };
    } else {
      d.open = true;
      const h = a.offsetHeight;
      a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: ease }).onfinish = () => { delete d.dataset.anim; };
    }
  }

  // ── demo: the real mouse acceleration tweak, with its real registry values ──
  const MOUSE_OPS = [['MouseSpeed', '1', '0'], ['MouseThreshold1', '6', '0'], ['MouseThreshold2', '10', '0']];
  async function demoTweak(btn) {
    if (S.demoBusy) return;
    S.demoBusy = true;
    const on = !S.demoOn;
    const card = btn.closest('.undo-demo'); card && card.setAttribute('data-state', 'busy');
    const log = $('#reglog');
    btn.classList.add('busy');
    const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const add = (html) => {
      const h = $('.hint', log); if (h) h.remove();
      const r = document.createElement('div');
      r.className = 'r';
      r.innerHTML = `<span class="t">${now()}</span>${html}`;
      log.appendChild(r);
      while (log.children.length > 7) log.removeChild(log.firstChild);
    };
    // the Saved / Now table beside the log
    const row = (n) => $(`.diff-row[data-reg="${n}"]`);
    const key = 'HKCU\\Control Panel\\Mouse';
    if (on) {
      for (const [n, was] of MOUSE_OPS) {
        add(`Saved   ${esc(key)} · <b>${n}</b> was ${was}`);
        const r = row(n);
        if (r) { r.classList.add('saving'); setTimeout(() => r.classList.remove('saving'), 600); scrambleTo($('.diff-saved', r), was, 260); }
        await sleep(REDUCED ? 0 : 160);
      }
      await sleep(REDUCED ? 0 : 200);
      add(`<b>Applied</b> · ${MOUSE_OPS.map(([n, , to]) => `${n} = ${to}`).join(' · ')}`);
      for (const [n, , to] of MOUSE_OPS) { const r = row(n); if (r) { scrambleTo($('.diff-now', r), to, 260); r.classList.add('changed'); } }
    } else {
      await sleep(REDUCED ? 0 : 240);
      add(`<b>Restored</b> · ${MOUSE_OPS.map(([n, was]) => `${n} = ${was}`).join(' · ')}`);
      for (const [n, was] of MOUSE_OPS) { const r = row(n); if (r) { scrambleTo($('.diff-now', r), was, 260); r.classList.remove('changed'); } }
      add('Back exactly as it was');
      await sleep(REDUCED ? 0 : 300);
      for (const [n] of MOUSE_OPS) { const r = row(n); if (r) scrambleTo($('.diff-saved', r), '—', 260); }
    }
    S.demoOn = on;
    btn.classList.remove('busy');
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', String(on));
    card && (card.setAttribute('data-state', on ? 'on' : 'off'), on && card.classList.add('was-on'));
    S.demoBusy = false;
  }
  async function demoRestore(btn) {
    const prog = $('#rp-prog'), st = $('#rp-state');
    btn.disabled = true;
    prog.className = 'prog';
    st.textContent = 'Creating snapshot…';
    await sleep(REDUCED ? 100 : 1800);
    prog.className = 'prog full';
    st.textContent = 'Snapshot ready';
    await sleep(2400);
    btn.disabled = false;
  }
  // Undo all: the five switches turn off one after another, then can be applied again.
  let undoBusy = false;
  async function demoUndoAll(btn) {
    if (undoBusy) return;
    undoBusy = true;
    const undo = btn.getAttribute('aria-pressed') !== 'true';
    const box = btn.closest('.undo-all') || document;
    const rows = $$('.undo-row', box);
    const st = $('#undo-state');
    for (const r of undo ? rows : rows.slice().reverse()) {
      const tg = $('.tg', r);
      tg && tg.classList.toggle('on', !undo);
      r.classList.toggle('restored', undo);
      await sleep(REDUCED ? 0 : 90);
    }
    if (st) st.textContent = undo ? 'All restored — back exactly as it was.' : '';
    btn.innerHTML = `${svg('undo')}${undo ? 'Apply again' : 'Undo all'}`;
    btn.setAttribute('aria-pressed', String(undo));
    undoBusy = false;
  }

  // Download page: copy the SHA-256 (falls back to selecting it when the clipboard isn't available).
  function copyHash(el) {
    const fallback = () => {
      const c = $('.hash');
      if (c) { const r = document.createRange(); r.selectNodeContents(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast('Hash selected — copy it', { dark: true, icon: 'alert' });
    };
    if (!navigator.clipboard || !navigator.clipboard.writeText) return fallback();
    try {
      navigator.clipboard.writeText(BUILD.sha256)
        .then(() => { toast('SHA-256 copied'); el.textContent = 'Copied'; setTimeout(() => (el.textContent = 'Copy'), 1600); })
        .catch(fallback);
    } catch (_) { fallback(); }
  }

  // ───────────── download ─────────────
  function pageDownload() {
    const u = S.user;
    const note = DC_LOGIN
      ? (S.dc
        ? `Logged in with Discord as <b>@${esc(S.dc.username)}</b> — your download starts right away.`
        : `You’ll log in with Discord first — one click. It also puts you in our Discord server, where updates and help happen.`)
      : u
        ? `Signed in as <b>@${esc(u.username)}</b> — your download starts right away.`
        : `You’ll make a free account first. It takes a few seconds and saves your downloads.`;
    const ready = DC_LOGIN ? !!S.dc : !!u;
    const hist = u && u.downloads.length ? `
      <div class="card dl-block rv"><h2>Your downloads <span class="muted" style="font:400 12px var(--body)">saved to your account</span></h2>
        <div>${u.downloads.slice(0, 6).map((d) => `<div class="log-row"><time datetime="${esc(d.at)}">${esc(fmtDate(d.at))}</time><span>${esc(d.file)} · v${esc(d.version)}</span><button class="btn btn-ghost btn-sm" data-act="get">Download again</button></div>`).join('')}</div>
      </div>` : '';

    // "What happens when you click", ticked off as far as this visitor has got
    const step = (n, title, text, done = false) => `<li${done ? ' class="done"' : ''}><span class="fn">${n}</span><div><b>${title}</b><p>${text}</p></div></li>`;
    const flow = DC_LOGIN
      ? step(1, S.dc ? `Logged in as @${esc(S.dc.username)}` : 'Log in with Discord', 'One click on Discord’s own page — no password on this site.', !!S.dc)
        + step(2, S.dc && S.dc.inGuild ? 'You’re in the server' : 'Join our server', DC_JOIN ? 'You’re added to the Ego Tweaks Discord automatically. Updates and help happen there.' : 'Join the Ego Tweaks Discord — updates and help happen there.', !!(S.dc && S.dc.inGuild))
        + step(3, 'The download starts', `${esc(BUILD.file)}, ${fmtMB(BUILD.bytes)}. Nothing to install.`)
      : step(1, u ? `Signed in as @${esc(u.username)}` : 'Make a free account', 'Username, email and password. It takes a few seconds.', !!u)
        + step(2, 'The download starts', `${esc(BUILD.file)}, ${fmtMB(BUILD.bytes)}.`)
        + step(3, 'Saved to your account', 'Download again any time from this page.');

    return `<div class="page-fx" aria-hidden="true"><i class="key-light"></i>${gaugeSvg('reticle')}</div>
    <div class="wrap page dl-page">
      <header class="page-hd rv">
        ${secK('↓', 'Download')}
        <h1>${hl('Get', 'Ego Tweaks')}</h1>
        <p>${DC_LOGIN ? 'Free for Windows 10 and 11. Log in with Discord and the download starts right away.' : 'Free for Windows 10 and 11. Make a free account and the download starts right away.'}</p>
      </header>
      <div class="dl-hero">
        <div class="dl-main">
          <button class="card dl-card spot is-hot rv" style="--d:1" data-act="get" data-tilt data-live aria-label="Get the ${esc(BUILD.name)}">
            <i class="beam" aria-hidden="true"></i><i class="lightbar" aria-hidden="true"></i>
            <span class="dl-tile" aria-hidden="true">${gaugeSvg('ring')}<span class="logo">EGO</span></span>
            <span class="t"><b>${esc(BUILD.name)}</b><small>${esc(BUILD.file)} · v${esc(BUILD.version)} · ${fmtMB(BUILD.bytes)} · Windows 10 &amp; 11</small></span>
            <span class="go">${ready ? `Download${svg('download')}` : DC_LOGIN ? `${BRAND.discord}Continue with Discord` : `Get it free${svg('download')}`}</span>
          </button>
          <div class="dl-note rv" style="--d:2"><span class="dot"></span><span>${note}</span></div>
        </div>
        <aside class="card dl-flow rv" style="--d:2">
          <h3>What happens when you click</h3>
          <ol class="flow-steps">${flow}</ol>
        </aside>
      </div>
      ${hist}
      <div class="dl-cols">
        <div class="card spot rv"><h3>The file<span>check it matches</span></h3>
          <dl class="kv">
            <dt>File</dt><dd>${esc(BUILD.file)}</dd>
            <dt>Version</dt><dd>${esc(BUILD.version)}</dd>
            <dt>Size</dt><dd>${fmtMB(BUILD.bytes)} (${BUILD.bytes.toLocaleString()} bytes)</dd>
            <dt>SHA-256</dt><dd class="hash-box"><code class="hash" title="Click to select">${esc(BUILD.sha256)}</code><button type="button" class="hash-copy" data-act="copy-hash" aria-label="Copy the SHA-256">Copy</button></dd>
          </dl>
          <p class="small">In PowerShell: <code>Get-FileHash .\\${esc(BUILD.file)}</code> — the hash should match.</p>
        </div>
        <div class="card spot rv" style="--d:1"><h3>What you need<span>most PCs already have it</span></h3>
          <dl class="kv">
            <dt>Windows</dt><dd class="wrap">Windows 10 or 11, 64-bit</dd>
            <dt>Runtime</dt><dd class="wrap">Microsoft Edge WebView2 — built into Windows 11 (<a href="https://developer.microsoft.com/microsoft-edge/webview2/" target="_blank" rel="noopener">get it</a>)</dd>
            <dt>.NET</dt><dd class="wrap">.NET Framework 4.7.2 or later — built into Windows 10 (1803+) and 11</dd>
            <dt>Access</dt><dd class="wrap">Administrator — Windows asks when it opens</dd>
          </dl>
        </div>
      </div>
      <section class="card dl-block firstrun rv" data-scene="steps"><h2>First run</h2>
        <ol class="steps">
          <li><div><b>Open EgoTweaks.exe</b><p>Windows asks for administrator access. Tweaks change system settings, so Ego Tweaks needs it.</p></div></li>
          <li><div><b>If SmartScreen appears, choose More info → Run anyway</b><p>New downloads that Windows hasn’t seen much yet can trigger it.</p></div></li>
          <li><div><b>Create a restore point</b><p>From Home → Quick actions, before applying anything. It’s your full-PC undo.</p></div></li>
          <li><div><b>Apply what’s recommended</b><p>The scan matches tweaks to your hardware. Apply them all, or review them one by one in Tweaks.</p></div></li>
        </ol>
      </section>
      <button class="card upsell spot rv" data-nav="premium"><span class="ico">${svg('key')}</span><span class="t"><b>Want more? Ego Tweaks Premium</b><small>${esc(PREMIUM.perks[0] || 'Unlock Premium')} · ${esc(PER_MONTH)}</small></span><span class="go">See Premium${svg('arrow')}</span></button>
    </div>`;
  }

  // ───────────── premium ─────────────
  // The Buy button is a real link to Payhip's checkout. When payhip.js has loaded, the click opens Payhip's
  // checkout on top of this page instead; after paying, Payhip sends the buyer back to #/premium/thanks.
  // With Discord login on, the link carries the buyer's Discord ID as Payhip metadata (which Payhip passes
  // to the bot's webhook), and it opens in a new tab so that metadata is kept.
  const checkoutUrl = () => {
    const q = new URLSearchParams({ link: PAYHIP_KEY });
    if (DC_LOGIN && S.dc) { q.set('metadata[discord_id]', S.dc.id); q.set('metadata[discord_name]', S.dc.username); }
    return 'https://payhip.com/buy?' + q;
  };
  const buyBtn = (cls) => `<a class="btn ${cls}" href="${PAYHIP_KEY ? esc(checkoutUrl()) : '#/premium'}" target="_blank" rel="noopener" data-act="buy-premium">${svg('key')}Buy Premium</a>`;
  const ticketBtn = (cls) => (TICKET ? `<a class="btn ${cls}" href="${esc(TICKET)}" target="_blank" rel="noopener">${BRAND.discord}Open a ticket in Discord</a>` : '');
  const thanksUrl = () => location.href.split(/[?#]/)[0] + '?premium=thanks#/premium/thanks';

  function premiumPlan(extra = '', attrs = '', btn = 'btn-primary btn-lg mag') {
    return `<div class="card plan pro is-hot spot ${extra}" ${attrs} data-live>
      <i class="beam" aria-hidden="true"></i>
      <div class="name"><span>Ego Tweaks Premium</span><span class="chip rec">Key via Discord</span></div>
      ${PREMIUM.price ? `<div class="price">${esc(PREMIUM.price)}<small>per month</small></div>` : '<div class="price word">Premium</div>'}
      <p class="plan-sub">One key, one month. Buy again whenever you want more.</p>
      <ul>${PREMIUM.perks.map((x) => `<li>${svg('check')}<span>${esc(x)}</span></li>`).join('')}</ul>
      <div class="buy-area" data-cls="${btn}">${buyArea(btn)}</div>
    </div>`;
  }

  // Connect Discord → (join the server) → Buy. Without Discord login it's just the Buy button.
  function buyArea(cls) {
    if (!DC_LOGIN) return buyBtn(cls);
    if (S.dcBusy) return `<button class="btn ${cls} busy" disabled>Connecting to Discord</button>`;
    const note = S.dcNote ? `<p class="dc-why">${esc(S.dcNote)}</p>` : '';
    if (!S.dc) return `<button type="button" class="btn ${cls} btn-discord" data-act="discord-connect">${BRAND.discord}Continue with Discord to buy</button>${note || '<p class="dc-why">So our bot can DM you your key the moment you pay.</p>'}`;
    const who = `<div class="dc-who"><img src="${esc(dcAvatar(S.dc))}" alt="" width="28" height="28"><span>Buying as <b>${esc(S.dc.name || S.dc.username)}</b> <small>@${esc(S.dc.username)}</small></span><button type="button" data-act="discord-forget">Not you?</button></div>`;
    if (DISCORD_LOGIN.guildId && !S.dc.inGuild) {
      return `${who}<a class="btn ${cls} btn-discord" href="${esc(DISCORD)}" target="_blank" rel="noopener" data-act="discord-join">${BRAND.discord}Join our Discord first</a><button type="button" class="btn btn-ghost btn-sm dc-recheck" data-act="discord-recheck">I’ve joined — continue</button><p class="dc-why">Our bot can only DM you if you’re in the server.</p>`;
    }
    return `${who}${buyBtn(cls)}`;
  }
  const refreshBuy = () => $$('.buy-area').forEach((el) => { el.innerHTML = buyArea(el.dataset.cls); });

  function pagePremium() {
    const steps = DC_LOGIN ? [
      ['Continue with Discord', 'One click, so our bot knows who to message. You’ll need to be in our Discord server.'],
      ['Buy Premium', 'Checkout opens in a new tab. Payhip handles the payment — your card details never touch this site.'],
      ['Check your Discord DMs', 'The moment you’ve paid, the Ego Tweaks bot messages you.'],
      ['Get your key', 'A team member sends your Premium key right there in your DMs.'],
      ['Renew when it runs out', 'Each key lasts one month and nothing is charged automatically. For another month, just buy again.'],
    ] : [
      ['Buy Premium', 'Checkout opens right here on the site. Payhip handles the payment — your card details never touch this site.'],
      ['Check your email', 'Payhip emails you a receipt for your order.'],
      ['Open a ticket in our Discord', 'Join the server, open a ticket and send the email you paid with or your order number.'],
      ['Get your key', 'We check your order and send your Premium key in the ticket.'],
      ['Renew when it runs out', 'Each key lasts one month and nothing is charged automatically. For another month, buy again and open a new ticket.'],
    ];
    const issued = S.page === 'thanks';
    const dmBtn = (cls) => (DC_LOGIN && DISCORD ? `<a class="btn ${cls}" href="${esc(DISCORD)}" target="_blank" rel="noopener">${BRAND.discord}Open Discord</a>` : ticketBtn(cls));
    const thanks = !issued ? '' : `
      <div class="card pm-thanks is-hot rv">
        <div class="done-ring">${gaugeSvg('ring')}<div class="done-mark">${svg('check')}</div></div>
        <h2>Thanks for buying Premium</h2>
        <p>${DC_LOGIN ? 'Payhip is emailing you a receipt, and the Ego Tweaks bot is messaging you on Discord now — your key arrives in your DMs.' : 'Payhip is emailing you a receipt. To get your key, open a ticket in our Discord and send us the email you paid with or your order number.'} Your key lasts one month.</p>
        <div class="hero-cta">${dmBtn('btn-primary btn-lg mag') || '<p>Join our Discord and open a ticket to get your key.</p>'}</div>
      </div>`;
    return `<div class="page-fx" aria-hidden="true"><i class="key-light"></i>${gaugeSvg('reticle')}</div>
    <div class="wrap page pm-page">
      <div class="pm-hero">
        <header class="page-hd rv">
          ${secK('★', 'Premium')}
          <h1>${hl('Ego Tweaks', 'Premium')}</h1>
          <p>${esc(PER_MONTH[0].toUpperCase() + PER_MONTH.slice(1))}. ${DC_LOGIN ? 'Continue with Discord, pay through a secure Payhip checkout, and your key arrives in your Discord DMs.' : 'Pay through a secure Payhip checkout right here, then open a ticket in our Discord to get your key.'}</p>
        </header>
        <div class="keycard-stage rv" style="--d:1" aria-hidden="true">
          <div class="keycard card is-hot spot${issued ? ' is-issued' : ''}" data-tilt data-live>
            <i class="beam"></i><i class="kc-sheen"></i><i class="scan-ov"></i>
            ${gaugeSvg('reticle')}
            <div class="kc-top"><span class="kc-logo">EGO</span><span class="hud-k">Premium key</span></div>
            <div class="kc-key">••••-••••-••••-••••</div>
            <div class="kc-meta"><span><small>Valid</small>1 month</span><span><small>Delivery</small>${DC_LOGIN ? 'Discord DM' : 'Discord ticket'}</span><span><small>Renewal</small>Manual</span></div>
            ${PREMIUM.price ? `<div class="kc-price">${esc(PREMIUM.price)}<small>/ month</small></div>` : ''}
            ${issued ? '<span class="kc-stamp chip rec">Thanks for buying</span>' : ''}
          </div>
          <p class="kc-cap">Illustration of a key — yours arrives in Discord.</p>
        </div>
      </div>
      ${thanks}
      <div class="pm-cols">
        ${premiumPlan('rv', 'style="--d:1"')}
        <div class="card pm-how spot rv" style="--d:2" data-scene="steps" data-live><h3>How you get your key<span>after you pay</span></h3>
          <ol class="timeline"><i class="tl-run" aria-hidden="true"><i></i></i>${steps.map(([b, p], i) => `<li style="--i:${i}"><span class="tl-n">${i + 1}</span><div><b>${b}</b><p>${p}</p></div></li>`).join('')}</ol>
          ${TICKET ? `<div class="pm-ticket">${dmBtn('btn-glass')}</div>` : ''}
        </div>
      </div>
      <div class="faq pm-faq rv">${faqKey()}${faqRenew()}${DC_LOGIN ? faq('Why do I need to be in the Discord server?', 'Our bot can only DM you if you’re in the server. When you continue with Discord, our bot adds you automatically if it can — if it can’t, you’ll see a Join our Discord button first.') : ''}</div>
      <div class="dl-note rv"><span class="dot"></span><span>${DC_LOGIN ? 'Already paid? Check your Discord DMs from the Ego Tweaks bot — or DM the bot yourself.' : 'Already paid? Open a ticket in our Discord with the email you paid with or your order number.'}</span></div>
    </div>`;
  }

  function buyPremium(e) {
    closeMenu();
    if (!PAYHIP_KEY) { e.preventDefault(); toast('Premium checkout isn’t open yet — check back soon.', { dark: true, icon: 'alert' }); return; }
    if (DC_LOGIN && S.dc) {
      // Let the link open Payhip in a new tab (it carries the Discord ID); this tab explains what happens next.
      openModal(`
        <div class="adm-lockmark">${BRAND.discord}</div>
        <h2 class="h2">Finish paying in the new tab</h2>
        <p>The moment you’ve paid, the Ego Tweaks bot DMs you on Discord as <b>@${esc(S.dc.username)}</b>. A team member sends your Premium key right there.</p>
        <div class="modal-actions">${DISCORD ? `<a class="btn btn-ghost" href="${esc(DISCORD)}" target="_blank" rel="noopener">Open Discord</a>` : ''}<button type="button" class="btn btn-primary" data-act="close">Got it</button></div>`);
      return;
    }
    const checkout = window.Payhip && window.Payhip.Checkout;
    if (checkout && typeof checkout.open === 'function') {
      try {
        checkout.open({ product: PAYHIP_KEY, message: 'After paying, open a ticket in our Discord to get your key.', successUrl: thanksUrl() });
        e.preventDefault();
        return;
      } catch (_) { /* fall back to the new tab below */ }
    }
    // payhip.js didn't load (ad blocker, offline): the link opens Payhip's checkout in a new tab, and this
    // tab says what to do after paying.
    openModal(`
      <div class="adm-lockmark">${svg('key')}</div>
      <h2 class="h2">Finish paying in the new tab</h2>
      <p>Payhip’s checkout opened in a new tab. Once you’ve paid, open a ticket in our Discord with the email you paid with or your order number, and we’ll send your key there.</p>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="close">Close</button>${ticketBtn('btn-primary') || '<button type="button" class="btn btn-primary" data-act="close">Got it</button>'}</div>`);
  }

  // ───────────── Continue with Discord (downloads and Premium) ─────────────
  // Discord's OAuth "implicit grant": Discord sends the visitor back here with a short-lived token in the
  // address bar. The browser uses it to read their Discord ID and check they're in the server; if they
  // aren't, the token goes to the bot (botUrl), which adds them. For Premium, the ID goes into the
  // Payhip checkout link so the bot can DM them the moment they pay.
  const DC_LOGIN = !!DISCORD_LOGIN.clientId;
  const DC_JOIN = !!(DISCORD_LOGIN.botUrl && DISCORD_LOGIN.guildId);
  const keep = {
    get(k, area = localStorage) { try { return JSON.parse(area.getItem(k) || 'null'); } catch (_) { return null; } },
    set(k, v, area = localStorage) { try { if (v === null) area.removeItem(k); else area.setItem(k, JSON.stringify(v)); } catch (_) { /* storage blocked */ } },
  };
  S.dc = DC_LOGIN ? keep.get('ego-discord') : null;
  const dcAvatar = (d) => (d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=64` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(d.id) >> 22n) % 6n)}.png`);

  // page: where to come back to. then: 'download' starts the download once they're back.
  function discordConnect(page = 'premium', then = '') {
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
  const dcName = () => (S.dc ? S.dc.name || S.dc.username : '');
  function dcChanged() {
    refreshBuy();
    if ($('#site').hidden) return;
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
    const after = keep.get('ego-oauth-after', sessionStorage) || { page: 'premium' };
    keep.set('ego-oauth-state', null, sessionStorage);
    keep.set('ego-oauth-after', null, sessionStorage);
    const page = ['home', 'download', 'premium'].includes(after.page) ? after.page : 'premium';
    const hash = page === 'home' ? '#/' : `#/${page}`;
    try { history.replaceState(null, '', location.pathname + hash); } catch (_) { location.hash = hash; }
    const token = params.get('access_token');
    if (!token || params.get('state') !== expected) {
      S.dcNote = params.get('error') === 'access_denied' ? 'Discord login was cancelled — press the button to try again.' : 'Discord login didn’t finish — press the button to try again.';
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
      toast(joinedNow ? `Logged in as @${me.username} — you’re in our Discord now` : `Logged in as @${me.username}`, { icon: 'check' });
    } catch (_) {
      S.dcNote = 'Couldn’t reach Discord — press the button to try again.';
    }
    S.dcBusy = false;
    dcChanged();
    if (after.then === 'download' && S.dc) startDownload();
  }
  async function discordRecheck(quiet = false) {
    const t = keep.get('ego-discord-token', sessionStorage);
    if (!S.dc || !t || t.exp < Date.now()) return discordConnect();
    try { S.dc.inGuild = (await dcInGuild(t.token)) || (await dcJoin(t.token)); } catch (_) { return discordConnect(); }
    keep.set('ego-discord', S.dc);
    if (S.dc.inGuild) S.dcAwaitJoin = false;
    else if (!quiet) toast('You’re not in the server yet — join it, then press continue.', { dark: true, icon: 'alert' });
    refreshBuy();
  }
  function discordLogout() {
    S.dc = null;
    keep.set('ego-discord', null);
    keep.set('ego-discord-token', null, sessionStorage);
    closeModal(); closeMenu();
    dcChanged();
    toast('Logged out', { dark: true });
  }
  function openDiscordMe() {
    closeMenu();
    if (!S.dc) return discordConnect(S.page === 'thanks' ? 'premium' : S.page);
    openModal(`
      <div class="acct-id"><img class="av" src="${esc(dcAvatar(S.dc))}" alt=""><div><b>${esc(dcName())}</b><small>@${esc(S.dc.username)} · logged in with Discord</small></div></div>
      <p>${S.dc.inGuild ? 'You’re in the Ego Tweaks Discord — updates, help and Premium keys all happen there.' : 'Join the Ego Tweaks Discord for updates, help and Premium keys.'}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-line" data-act="discord-forget">Log out</button><span class="sp"></span>
        ${DISCORD ? `<a class="btn btn-ghost" href="${esc(DISCORD)}" target="_blank" rel="noopener">Open Discord</a>` : ''}
        <button type="button" class="btn btn-primary" data-act="close">Done</button>
      </div>`);
  }

  // After "Join our Discord first", check again as soon as they come back to this tab.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.dcAwaitJoin) discordRecheck(true); });

  // ───────────── live Discord numbers (from your public invite link) ─────────────
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
  function toast(msg, { dark = false, icon = 'check', ms = 3600 } = {}) {
    const el = document.createElement('div');
    el.className = 'toast' + (dark ? ' dark' : '');
    el.innerHTML = `${svg(icon)}<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
  }

  // ───────────── modals ─────────────
  let lastFocus = null;
  function openModal(html) {
    const host = $('#modal');
    if (!host.firstElementChild) lastFocus = document.activeElement;
    host.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    fx() && fx().lock('modal');
    labelModal();
    document.body.classList.add('modal-open');
    const f = $('[autofocus]', host) || $('input, button', host);
    if (f) setTimeout(() => f.focus(), 30);
  }
  function setModal(html) {
    const m = $('#modal .modal');
    if (!m) return openModal(html);
    m.innerHTML = html;
    m.style.animation = 'none'; void m.offsetWidth; m.style.animation = '';
    const f = $('[autofocus]', m) || $('button.btn-primary, input', m);
    if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() {
    if (S.busy) return;
    clearInterval(ADM.timer);
    const wasOpen = !!$('#modal').firstElementChild;
    $('#modal').innerHTML = '';
    document.body.classList.remove('modal-open');
    fx() && fx().unlock('modal');
    // only hand focus back when a modal was really open (closeModal also runs on every page change)
    if (wasOpen && lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
  }
  $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
  // Name the dialog after its heading. setModal swaps the contents, so this re-runs whenever they change.
  function labelModal() {
    const m = $('#modal').firstElementChild;
    if (!m) return;
    const h = $('.h2, .adm-h', m);
    if (h) { if (h.id !== 'modal-title') h.id = 'modal-title'; m.setAttribute('aria-labelledby', 'modal-title'); } else m.removeAttribute('aria-labelledby');
  }
  if ('MutationObserver' in window) new MutationObserver(labelModal).observe($('#modal'), { childList: true, subtree: true });

  // ── account form ──
  const field = (id, label, icon, type, attrs = '', hint = '') => `
    <div class="field" data-field="${id}">
      <label for="f-${id}">${label}</label>
      <div class="inp">${svg(icon)}<input id="f-${id}" name="${id}" type="${type}" ${attrs}>${type === 'password' ? '<button type="button" class="peek" data-act="peek" aria-label="Show password">SHOW</button>' : ''}</div>
      ${hint ? `<span class="hint">${hint}</span>` : ''}
    </div>`;

  function openAuth({ mode = 'signup', then = null } = {}) {
    closeMenu();
    const create = mode === 'signup';
    const title = then === 'download' ? (create ? 'Create your account' : 'Sign in to download') : (create ? 'Create your account' : 'Welcome back');
    const sub = then === 'download'
      ? (create ? 'Your account saves your downloads and settings. The Ego Tweaking Utility downloads as soon as you’re in.' : 'Sign in and the Ego Tweaking Utility downloads straight away.')
      : (create ? 'Your account saves your downloads and settings.' : 'Sign in to see your downloads and settings.');
    const html = `
      <div class="modal-mark" aria-hidden="true">EGO</div>
      <h2 class="h2">${title}</h2>
      <p>${sub}</p>
      <div class="seg" role="tablist">
        <button type="button" role="tab" class="${create ? 'on' : ''}" aria-selected="${create}" data-act="auth-mode" data-mode="signup" data-then="${then || ''}">Create account</button>
        <button type="button" role="tab" class="${create ? '' : 'on'}" aria-selected="${!create}" data-act="auth-mode" data-mode="signin" data-then="${then || ''}">Sign in</button>
      </div>
      <form class="form" id="auth-form" data-mode="${mode}" data-then="${then || ''}" novalidate>
        ${create
          ? field('username', 'Username', 'user', 'text', 'autocomplete="username" maxlength="20" spellcheck="false" autocapitalize="off" autofocus', '3–20 letters, numbers, dots, dashes or underscores')
            + field('email', 'Email', 'at', 'email', 'autocomplete="email" spellcheck="false" autocapitalize="off"')
            + field('password', 'Password', 'lock', 'password', 'autocomplete="new-password" minlength="8"', 'At least 8 characters')
          : field('login', 'Email address', 'user', 'email', 'autocomplete="email" spellcheck="false" autocapitalize="off" autofocus')
            + field('password', 'Password', 'lock', 'password', 'autocomplete="current-password"')}
        <button type="button" class="check" data-act="check" aria-pressed="true"><span class="tg on"></span><span><b>Keep me signed in</b><small>Turn off on a shared PC</small></span></button>
        <div class="form-err" id="form-err" role="alert"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-act="close">Cancel</button>
          <button type="submit" class="btn btn-primary">${create ? (then === 'download' ? 'Create account &amp; download' : 'Create account') : (then === 'download' ? 'Sign in &amp; download' : 'Sign in')}</button>
        </div>
      </form>`;
    $('#modal').firstElementChild ? setModal(html) : openModal(html);
  }

  async function submitAuth(form) {
    const mode = form.dataset.mode;
    const then = form.dataset.then;
    const btn = $('button[type="submit"]', form);
    const err = $('#form-err', form);
    const data = Object.fromEntries(new FormData(form).entries());
    const remember = $('.check', form).getAttribute('aria-pressed') === 'true';
    $$('.field', form).forEach((f) => f.classList.remove('bad'));
    err.textContent = '';
    btn.classList.add('busy');
    S.busy = true;
    try {
      const user = mode === 'signup'
        ? await AUTH.signUp({ username: data.username, email: data.email, password: data.password, remember })
        : await AUTH.signIn({ login: data.login, password: data.password, remember });
      S.busy = false;
      S.user = user;
      if (mode === 'signup') track('/api/event', { t: 'signup' });
      if (then === 'download') return prepareDownload({ fresh: mode === 'signup' });
      closeModal();
      refresh();
      toast(mode === 'signup' ? `Account created — welcome, @${user.username}` : `Signed in as @${user.username}`);
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
  // otherwise it needs a free account on this site.
  function startDownload() {
    if (DC_LOGIN) {
      if (!S.dc) return discordConnect('download', 'download');
    } else if (!S.user) return openAuth({ mode: 'signup', then: 'download' });
    openModal('<div></div>');
    prepareDownload();
  }
  async function prepareDownload({ fresh = false } = {}) {
    S.busy = true;
    setModal(`
      <h2 class="h2">Preparing your download</h2>
      <p>${fresh ? 'Account saved. ' : ''}Getting the Ego Tweaking Utility ready for you.</p>
      <div class="mini-log" id="mini-log"></div>
      <div class="prog" id="mini-prog"><i></i></div>`);
    const log = $('#mini-log');
    await runLog(log, [
      DC_LOGIN && S.dc ? { k: 'Discord', ms: 140, v: () => `@${S.dc.username}${S.dc.inGuild ? ' · in the server' : ''}` } : { k: 'Account', ms: 140, v: () => (S.user ? `Saved · @${S.user.username}` : 'Guest') },
      { k: 'Build', ms: 160, v: `v${BUILD.version} · latest` },
      { k: 'Package', ms: 200, v: `${BUILD.file} · ${fmtMB(BUILD.bytes)}` },
      { k: 'SHA-256', ms: 160, v: BUILD.sha256.slice(0, 16) + '…' },
      { k: 'Ready', ms: 120, v: 'Handing it over' },
    ], { max: 6 });
    const prog = $('#mini-prog');
    if (prog) prog.classList.add('full');
    await sleep(REDUCED ? 0 : 320);

    let user = S.user;
    try { user = await AUTH.recordDownload({ file: BUILD.file, version: BUILD.version }); } catch (_) { /* still give them the file */ }
    S.user = user;
    const auto = !user || user.prefs.autoDownload !== false;
    if (auto) triggerDownload();
    S.busy = false;
    setModal(`
      <div class="done-mark">${svg('check')}</div>
      <h2 class="h2">${auto ? 'Your download has started' : 'Your download is ready'}</h2>
      <p>${auto ? `Look for <b>${esc(BUILD.file)}</b> in your downloads. If it didn’t start, use the button below.` : `Click below to save <b>${esc(BUILD.file)}</b>.`}</p>
      <p class="muted" style="font-size:12.5px">If Windows SmartScreen appears, choose <b>More info → Run anyway</b>.${DC_LOGIN && S.dc ? (S.dc.inGuild ? ' You’re in our Discord — updates and help happen there.' : ' Join our Discord for updates and help.') : user ? ` Saved to your account as @${esc(user.username)}.` : ''}</p>
      <div class="modal-actions">
        ${DC_LOGIN && DISCORD ? `<a class="btn btn-ghost" href="${esc(DISCORD)}" target="_blank" rel="noopener">${BRAND.discord}Open Discord</a>` : ''}
        <button type="button" class="btn btn-ghost" data-act="close">Close</button>
        <a class="btn btn-primary" href="${BUILD.href}" download="${BUILD.file}" data-act="manual-dl" autofocus>${svg('download')}${auto ? 'Download again' : 'Download ' + esc(BUILD.file)}</a>
      </div>`);
    if (auto) toast(`Downloading ${BUILD.file}`, { icon: 'download' });
    refresh();
  }

  function triggerDownload() {
    const a = document.createElement('a');
    a.href = BUILD.href;
    a.download = BUILD.file;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ── account ──
  function openAccount() {
    closeMenu();
    const u = S.user;
    if (!u) return openAuth({ mode: 'signin' });
    const last = u.downloads[0];
    const pref = (key, title, sub) => `<button type="button" class="check" data-act="pref" data-key="${key}" aria-pressed="${!!u.prefs[key]}"><span class="tg ${u.prefs[key] ? 'on' : ''}"></span><span><b>${title}</b><small>${sub}</small></span></button>`;
    openModal(`
      <div class="acct-id"><span class="av">${esc(u.username[0].toUpperCase())}</span><div><b>@${esc(u.username)}</b><small>${esc(u.email)}</small></div></div>
      <dl class="kv">
        <dt>Member since</dt><dd>${esc(fmtDate(u.created, false))}</dd>
        <dt>Downloads</dt><dd>${u.downloads.length}</dd>
        <dt>Last download</dt><dd>${last ? `${esc(fmtDate(last.at))} · v${esc(last.version)}` : 'None yet'}</dd>
      </dl>
      ${pref('intro', 'Play the intro on every visit', 'The Ego Tweaks loading sequence when the site opens')}
      ${pref('autoDownload', 'Start downloads automatically', 'Otherwise you’ll get a button to click')}
      <div class="modal-actions">
        <button type="button" class="btn btn-line" data-act="signout">Sign out</button>
        <span class="sp"></span>
        <button type="button" class="btn btn-ghost" data-act="go-download">Downloads</button>
        <button type="button" class="btn btn-primary" data-act="close">Done</button>
      </div>`);
  }

  function refresh() {
    S.user = AUTH.current();
    if ($('#site').hidden) return;
    renderNav(); renderFooter();
    if (S.page === 'download') renderPage();
  }
  AUTH.onChange(() => { if (!S.busy) refresh(); });


  // ───────────── hidden admin panel (Supabase registrations + downloads) ─────────────
  const ADM = { timer: 0, data: null };
  function openAdmin() {
    closeMenu();
    const user = AUTH.current();
    if (user && user.isAdmin) return showAdmin();
    openModal(`
      <div class="adm-lockmark">${svg('lock')}</div>
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
    setModal(`<div id="adm"></div>`);
    $('#modal .modal').classList.add('wide');
    renderAdmin(null, true);
    loadAdmin();
    clearInterval(ADM.timer);
    ADM.timer = setInterval(() => { if ($('#adm') && !document.hidden) loadAdmin(); else if (!$('#adm')) clearInterval(ADM.timer); }, 60000);
  }
  const admHead = (sub) => `<div class="adm-top"><div><span class="eyebrow">Ego Tweaks · Admin</span><h2 class="adm-h">Site statistics</h2><p class="adm-sub">${sub}</p></div><button type="button" class="icon-btn" data-act="close" aria-label="Close">${svg('x')}</button></div>`;
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
    host.innerHTML = `${admHead(d ? `Updated ${esc(d.at.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}))}` : 'Shared registration and download analytics')}
      ${err ? `<div class="form-err" style="margin:12px 0">${esc(err)}</div>` : ''}
      <div class="adm-big"><span class="num">${loading ? '—' : n(d?.accounts)}</span><span class="lbl">registered accounts</span></div>
      <div class="adm-tiles">
        <div><span>Tracked downloads</span><b>${loading ? '—' : n(d?.total)}</b><small>All recorded download clicks</small></div>
        <div><span>Last 30 days</span><b>${loading ? '—' : n(d?.recent)}</b><small>Recorded download clicks</small></div>
        <div><span>Data source</span><b>Supabase</b><small>Shared database</small></div>
      </div>
      <p class="adm-note">Download numbers count clicks recorded by this website, not guaranteed completed downloads or unique people. Old downloads from before tracking was installed are not included.</p>
      <p class="adm-note">If this is your first setup, create an account at the site first, then assign its admin role using the SQL in <span class="mono">supabase-setup.sql</span>.</p>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" data-act="admin-lock">Lock</button><span class="sp"></span><button type="button" class="btn btn-line" data-act="admin-refresh">Refresh</button><button type="button" class="btn btn-primary" data-act="close">Done</button></div>`;
    host.classList.remove('loading');
  }

  // ───────────── scroll + pointer effects ─────────────
  // Page height and the hero window's position are measured only when the layout changes (not on every
  // scroll frame), so scrolling never forces a synchronous layout.
  let ticking = false, geo = null;
  const measureGeo = () => { const st = $('#stage'), ft = S.page === 'home' && document.getElementById(SECTIONS[0][0]); geo = { max: document.documentElement.scrollHeight - window.innerHeight, stage: st ? st.getBoundingClientRect().top + window.scrollY : null, first: ft ? ft.getBoundingClientRect().top + window.scrollY : null }; };
  if ('ResizeObserver' in window) new ResizeObserver(() => { geo = null; }).observe(document.body);
  function scrollFx() {
    ticking = false;
    // with Lenis, take its position: reading window.scrollY here would force a style pass after fx's writes
    const L = fx() && fx().lenis, y = L ? L.scroll : window.scrollY, vh = window.innerHeight;
    $('#nav').classList.toggle('scrolled', y > 40);
    if (!geo) measureGeo();
    const bar = $('#progress');
    if (bar) bar.style.transform = `scaleX(${geo.max > 0 ? clamp(y / geo.max, 0, 1).toFixed(4) : 0})`;
    // back above the first section (the spy only reports sections it enters): no section is lit in the nav
    if (S.spy && geo.first != null && y + vh * 0.5 < geo.first) { S.spy = ''; $$('#nav-links [data-to].on').forEach((b) => b.classList.remove('on')); }
    if (REDUCED) return;
    const stage = $('#stage');
    // --p drives the lite tilt; in cine fx owns the window's transform
    if (stage && geo.stage != null && !(fx() && fx().mode === 'cine')) stage.style.setProperty('--p', clamp(1 - (geo.stage - y - vh * 0.18) / (vh * 0.7), 0, 1).toFixed(3));
    const hfx = $('.hero-fx');
    if (hfx) { hfx.style.setProperty('--y', Math.min(y, 1400).toFixed(0)); hfx.classList.toggle('off', y > 1300); }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(scrollFx); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { geo = null; onScroll(); }, { passive: true });

  // which section is on screen → highlight it in the nav
  let spyIO = null;
  function setupSpy() {
    if (spyIO) spyIO.disconnect();
    if (S.page !== 'home' || !('IntersectionObserver' in window)) { S.spy = ''; return; }
    spyIO = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      S.spy = en.target.id;
      $$('#nav-links [data-to]').forEach((b) => b.classList.toggle('on', b.dataset.to === S.spy));
    }), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) spyIO.observe(el); });
  }

  // nav: a soft highlight glides to the link you point at
  $('#nav-links').addEventListener('pointerover', (e) => {
    const b = e.target.closest('button'); const hl = $('.nav-hl');
    if (!b || !hl) return;
    hl.style.width = b.offsetWidth + 'px';
    hl.style.transform = `translateX(${b.offsetLeft}px)`;
    hl.classList.add('on');
  });
  $('#nav-links').addEventListener('pointerleave', () => { const hl = $('.nav-hl'); hl && hl.classList.remove('on'); });
  // Hover links done in JS rather than CSS :has(:hover), which restyles whole sections while the page
  // scrolls under a resting pointer: a legend item lights its marker; the main CTA tightens the gauge.
  let hovered = null;
  document.addEventListener('pointerover', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const li = t && t.closest('.stage-legend li[data-mk]'), cta = t && t.closest('.hero .hero-cta .btn-primary, .finale .btn-primary');
    const stage = $('#stage');
    if (stage && (li ? li.dataset.mk : '') !== (stage.dataset.hl || '')) { if (li) stage.dataset.hl = li.dataset.mk; else delete stage.dataset.hl; }
    const sec = cta && cta.closest('.hero, .finale');
    if (sec !== hovered) { hovered && hovered.classList.remove('cta-hot'); sec && sec.classList.add('cta-hot'); hovered = sec; }
  }, { passive: true });

  // card spotlights, magnetic buttons and the soft cursor glow (mouse only)
  if (FINE && !REDUCED && $('#cursor-glow')) {
    const glow = $('#cursor-glow');
    let gx = innerWidth / 2, gy = innerHeight / 3, tx = gx, ty = gy, gRaf = 0, mag = null;
    const glowLoop = () => {
      gx += (tx - gx) * 0.14; gy += (ty - gy) * 0.14;
      glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
      gRaf = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5 ? requestAnimationFrame(glowLoop) : 0;
    };
    const resetMag = () => { if (mag) { mag.style.setProperty('--tx', '0px'); mag.style.setProperty('--ty', '0px'); mag = null; } };
    document.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      glow.classList.add('on');
      if (!gRaf) gRaf = requestAnimationFrame(glowLoop);
      const t = e.target instanceof Element ? e.target : null;
      const card = t && t.closest('.spot');
      if (card) { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px'); card.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px'); }
      const m = t && t.closest('.mag');
      if (m !== mag) resetMag();
      if (m) {
        mag = m;
        const r = m.getBoundingClientRect();
        m.style.setProperty('--tx', ((e.clientX - (r.left + r.width / 2)) * 0.2).toFixed(1) + 'px');
        m.style.setProperty('--ty', ((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1) + 'px');
      }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { glow.classList.remove('on'); resetMag(); });
  }

  // ───────────── events ─────────────
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'auth-form') { e.preventDefault(); if (!S.busy) submitAuth(e.target); }
    if (e.target.id === 'admin-form') { e.preventDefault(); submitAdmin(e.target); }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'xp-q') { S.xq = e.target.value; filterXp(); }
  });

  document.addEventListener('click', async (e) => {
    const sum = e.target.closest('.faq summary');
    if (sum) { e.preventDefault(); toggleFaq(sum.parentElement); return; }
    const to = e.target.closest('[data-to]');
    if (to) { e.preventDefault(); scrollToSection(to.dataset.to); return; }
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); closeModal(); closeMenu(); go(nav.dataset.nav); return; }
    const tab = e.target.closest('[data-tour]');
    if (tab) { vwHold(); setTour(tab.dataset.tour); return; }
    const xc = e.target.closest('[data-xcat]');
    if (xc) {
      S.xcat = xc.dataset.xcat;
      $$('[data-xcat]').forEach((b) => { const on = b === xc; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      filterXp();
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'get': startDownload(); break;
      case 'signup': openAuth({ mode: 'signup' }); break;
      case 'signin': openAuth({ mode: 'signin' }); break;
      case 'account': openAccount(); break;
      case 'auth-mode': openAuth({ mode: el.dataset.mode, then: el.dataset.then || null }); break;
      case 'close': closeModal(); break;
      case 'menu': openMenu(); break;
      case 'menu-close': closeMenu(); break;
      case 'check': {
        const on = el.getAttribute('aria-pressed') !== 'true';
        el.setAttribute('aria-pressed', String(on));
        $('.tg', el).classList.toggle('on', on);
        break;
      }
      case 'peek': {
        const i = $('input', el.parentElement);
        const show = i.type === 'password';
        i.type = show ? 'text' : 'password';
        el.textContent = show ? 'HIDE' : 'SHOW';
        el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        break;
      }
      case 'pref': {
        const key = el.dataset.key;
        const on = el.getAttribute('aria-pressed') !== 'true';
        el.setAttribute('aria-pressed', String(on));
        $('.tg', el).classList.toggle('on', on);
        try { S.user = await AUTH.update({ prefs: { [key]: on } }); toast('Saved to your account'); } catch (err) { toast(err.message || 'Couldn’t save that', { dark: true, icon: 'alert' }); }
        break;
      }
      case 'signout':
        AUTH.signOut(); S.user = null; S.busy = false; closeModal(); toast('Signed out', { dark: true }); break;
      case 'go-download': closeModal(); go('download'); break;
      case 'manual-dl':
        if (S.user && el.textContent.trim().startsWith('Download again')) {
          AUTH.recordDownload({ file: BUILD.file, version: BUILD.version }).then((u) => (S.user = u)).catch(() => {});
        }
        break;
      case 'buy-premium': buyPremium(e); break;
      case 'discord-connect': discordConnect(S.page === 'home' ? 'home' : 'premium'); break;
      case 'discord-me': openDiscordMe(); break;
      case 'discord-forget': discordLogout(); break;
      case 'discord-join': S.dcAwaitJoin = true; break;
      case 'discord-recheck': discordRecheck(); break;
      case 'demo-tweak': demoTweak(el); break;
      case 'demo-restore': demoRestore(el); break;
      case 'replay': toTop(); runBoot({ full: true }); break;
      case 'skip': $('#view').focus(); break;
      case 'xp-more': S.xpAll = true; filterXp(); break;
      case 'copy-hash': copyHash(el); break;
      case 'motion':
        if (OS_REDUCED) break;
        try { localStorage.setItem('ego-motion', REDUCED ? 'on' : 'off'); } catch (_) { /* storage blocked */ }
        location.reload();
        break;
      case 'shot-zoom': vwHold(); openShot(el.dataset.src, el.dataset.alt); break;
      case 'vw-prev': vwHold(); stepTour(-1); break;
      case 'vw-next': vwHold(); stepTour(1); break;
      case 'xp-go': S.xcat = el.dataset.cat || 'all'; S.xq = ''; S.xpAll = false; go('tweaks'); break;
      case 'demo-undoall': demoUndoAll(el); break;
      case 'admin': openAdmin(); break;
      case 'admin-refresh': loadAdmin(); break;
      case 'admin-lock':
        clearInterval(ADM.timer); AUTH.signOut().catch(() => {}); closeModal(); toast('Admin signed out', { dark: true }); break;
    }
  });

  // Keep Tab inside an open modal or menu.
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapTab(e, box) {
    const els = $$(FOCUSABLE, box).filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    if (!els.length) { e.preventDefault(); return; }
    const first = els[0], last = els[els.length - 1], a = document.activeElement;
    if (!box.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('#modal').firstElementChild) closeModal(); else closeMenu();
      return;
    }
    if (e.key === 'Tab') {
      const modal = $('#modal .modal'), menu = $('#menu');
      if (modal) trapTab(e, modal);
      else if (menu && !menu.hidden && !menu.classList.contains('closing')) trapTab(e, menu);
      return;
    }
    // arrow keys move between tabs (app tour, explorer categories)
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const tab = e.target instanceof Element && e.target.closest('.tour-tabs [role="tab"], .xp-cats [role="tab"], .dx-rail [role="tab"]');
    if (!tab) return;
    const tabs = $$('[role="tab"]', tab.parentElement);
    const i = tabs.indexOf(tab);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault();
    tabs[j].focus({ preventScroll: true });
    tabs[j].click();
  });
  window.addEventListener('hashchange', () => route());

  // ───────────── start ─────────────
  buildBootTicks();
  // index.html preloads the hero screenshot for the match cut, but the page only renders after the intro:
  // claim the preloaded file now (no decode) so it counts as used and the browser doesn't warn about it.
  try { new Image().src = 'assets/shots/home.webp'; } catch (_) { /* ignore */ }
  // Back from a Payhip purchase (see thanksUrl): show the thanks page and tidy the address bar.
  if (/[?&]premium=thanks\b/.test(location.search)) {
    try { history.replaceState(null, '', location.pathname + '#/premium/thanks'); } catch (_) { location.hash = '#/premium/thanks'; }
  }
  // Back from "Continue with Discord"?
  const oauthReturn = new URLSearchParams(location.hash.slice(1));
  const backFromDiscord = DC_LOGIN && oauthReturn.has('state') && (oauthReturn.has('access_token') || oauthReturn.has('error'));
  if (backFromDiscord) finishDiscordLogin(oauthReturn);
  S.page = routeFromHash();
  if (backFromDiscord || (S.user && S.user.prefs.intro === false)) {
    $('#boot').hidden = true;
    document.body.classList.remove('booting');
    showSite();
  } else {
    runBoot();
  }
  onScroll();
})();
