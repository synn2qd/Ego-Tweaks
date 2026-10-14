/* Ego Tweaks — website */
(() => {
  'use strict';

  // ───────────── settings you may want to change ─────────────
  // The build offered on the Download page. Swap these when you ship a new version.
  const BUILD = {
    name: 'Ego Tweaking Utility',
    file: 'EgoTweaks.exe',
    href: 'downloads/EgoTweaks.exe',
    version: '1.2.0',
    bytes: 1422848,
    sha256: 'a6c3d250da0e6220a2e390288de2081d052838451bdfb527d3880e47f567c941',
  };
  // Paste your links here and they show up in the footer and menu. Leave '' to hide.
  const LINKS = { discord: '', x: '' };
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
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { categories: CATEGORIES, tweaks: TWEAKS } = window.EGO_SITE_CATALOG;
  const perCat = (id) => TWEAKS.filter((t) => t.cat === id).length;
  const AUTH = window.EgoAuth;
  const fmtMB = (b) => (b / 1048576).toFixed(1) + ' MB';
  const fmtDate = (iso, time = true) => { try { return new Date(iso).toLocaleString(undefined, Object.assign({ month: 'short', day: 'numeric', year: 'numeric' }, time ? { hour: 'numeric', minute: '2-digit' } : {})); } catch (_) { return iso; } };
  const YEAR = new Date().getFullYear();

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
  };
  const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  const S = { page: 'home', user: AUTH.current(), busy: false, tour: 'home', demoOn: false, demoBusy: false };

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

  async function runBoot() {
    const boot = $('#boot');
    const log = $('#boot-log');
    let skip = false;
    const fast = () => skip;
    const onSkip = () => { skip = true; };
    document.body.classList.add('booting');
    boot.hidden = false;
    boot.className = 'boot';
    log.innerHTML = '';
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
      { k: 'Account', v: () => (S.user ? `Signed in · @${S.user.username}` : 'Guest') },
      { k: 'Latest build', v: `${BUILD.file} · ${fmtMB(BUILD.bytes)}` },
    ];
    await runLog(log, steps, { fast, onProgress: setBootProgress });
    $('#boot-step').textContent = 'Ready';
    await sleep(fast() ? 150 : 380);

    boot.removeEventListener('pointerdown', onSkip);
    window.removeEventListener('keydown', onSkip);
    if ($('#site').hidden) showSite(); else renderPage();
    document.body.classList.remove('booting');
    boot.classList.add('out');
    await sleep(REDUCED ? 50 : 900);
    boot.classList.add('gone');
    await sleep(560);
    boot.hidden = true;
  }

  function showSite() {
    $('#site').hidden = false;
    renderNav(); renderFooter(); renderPage();
  }

  // ───────────── nav, menu, footer ─────────────
  const SECTIONS = [['features', 'Features'], ['app', 'The app'], ['safety', 'Safety'], ['faq', 'FAQ']];

  function renderNav() {
    $('#nav-links').innerHTML = SECTIONS.map(([id, n]) => `<button type="button" data-to="${id}">${n}</button>`).join('')
      + `<button type="button" data-nav="download" class="${S.page === 'download' ? 'on' : ''}">Download</button>`;
    $('#nav-cta').innerHTML = S.user
      ? `<button class="pill hide-sm" data-act="account" title="Your account"><span class="dot"></span>@${esc(S.user.username)}</button><button class="btn btn-primary btn-sm" data-nav="download">${svg('download')}Download</button>`
      : `<button class="btn btn-ghost btn-sm hide-sm" data-act="signin">Sign in</button><button class="btn btn-primary btn-sm" data-nav="download">Get Ego Tweaks</button>`;
  }

  function openMenu() {
    const m = $('#menu');
    const community = [LINKS.discord && `<a class="btn btn-glass" href="${esc(LINKS.discord)}" target="_blank" rel="noopener">Join the Discord</a>`].filter(Boolean).join('');
    m.innerHTML = `
      <div class="menu-top"><a class="brand" href="#/" data-nav="home"><span class="brand-logo">EGO</span><span class="brand-name">Tweaks</span></a>
        <button class="nav-burger" style="display:grid" data-act="menu-close" aria-label="Close menu">${svg('x')}</button></div>
      <ol>${SECTIONS.map(([id, n]) => `<li><button type="button" data-to="${id}">${n}</button></li>`).join('')}<li><button type="button" data-nav="download">Download</button></li></ol>
      <div class="menu-cta">${community}
        ${S.user ? `<button class="btn btn-glass" data-act="account">Account · @${esc(S.user.username)}</button>` : `<button class="btn btn-glass" data-act="signin">Sign in</button>`}
        <button class="btn btn-primary btn-lg" data-nav="download">${svg('download')}Get Ego Tweaks — free</button></div>`;
    m.hidden = false;
    $('.nav-burger').setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    const m = $('#menu');
    if (m.hidden) return;
    m.hidden = true;
    $('.nav-burger').setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function renderFooter() {
    const community = [LINKS.discord && `<li><a href="${esc(LINKS.discord)}" target="_blank" rel="noopener">Discord</a></li>`, LINKS.x && `<li><a href="${esc(LINKS.x)}" target="_blank" rel="noopener">X (Twitter)</a></li>`].filter(Boolean).join('');
    $('#foot').innerHTML = `<div class="wrap">
      <div class="foot-in" style="${community ? 'grid-template-columns:1.4fr repeat(3,minmax(0,.6fr))' : ''}">
        <div><a class="brand" href="#/" data-nav="home"><span class="brand-logo">EGO</span><span class="brand-name">Tweaks</span></a>
          <p>A completely free Windows tweaking utility. ${TWEAKS.length} tweaks for FPS, input delay and ping — every one reversible.</p></div>
        <div><h4>Product</h4><ul>${SECTIONS.map(([id, n]) => `<li><button type="button" data-to="${id}">${n}</button></li>`).join('')}<li><button type="button" data-nav="download">Download</button></li></ul></div>
        <div><h4>Account</h4><ul>${S.user
          ? `<li><button type="button" data-act="account">Your account</button></li><li><button type="button" data-nav="download">Your downloads</button></li>`
          : `<li><button type="button" data-act="signup">Create account</button></li><li><button type="button" data-act="signin">Sign in</button></li>`}</ul></div>
        ${community ? `<div><h4>Community</h4><ul>${community}</ul></div>` : ''}
      </div>
      <div class="foot-bot"><span><button type="button" class="hush" data-act="admin" tabindex="-1" aria-hidden="true">©</button> ${YEAR} Ego Tweaks · v${esc(BUILD.version)}</span><span>Not affiliated with Microsoft or any game publisher.</span><button type="button" data-act="replay">Replay intro</button></div>
    </div>`;
  }

  // ───────────── routing ─────────────
  const routeFromHash = () => (/^#\/?download/.test(location.hash) ? 'download' : 'home');
  function go(page) {
    const hash = page === 'home' ? '#/' : `#/${page}`;
    if (location.hash !== hash) location.hash = hash; else route(true);
  }
  function route(force = false) {
    const page = routeFromHash();
    const changed = page !== S.page;
    S.page = page;
    document.title = page === 'home' ? 'Ego Tweaks — free Windows tweaking utility' : 'Download · Ego Tweaks';
    if ($('#site').hidden) return;
    renderNav();
    if (changed || force || !$('#view').firstElementChild) { renderPage(); window.scrollTo({ top: 0, behavior: 'auto' }); }
  }
  function scrollToSection(id) {
    closeMenu();
    const doIt = () => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); };
    if (S.page !== 'home') { go('home'); setTimeout(doIt, 140); } else doIt();
  }

  let io = null;
  function renderPage() {
    const view = $('#view');
    view.innerHTML = S.page === 'download' ? pageDownload() : pageHome();
    if (io) io.disconnect();
    const els = $$('.rv', view);
    if (REDUCED || !('IntersectionObserver' in window)) els.forEach((e) => e.classList.add('in'));
    else {
      io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      els.forEach((e) => io.observe(e));
    }
    S.demoOn = false; S.demoBusy = false;
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

  const tourPanel = (t) => `
    <div class="tour-copy"><div class="k">${String(TOUR.indexOf(t) + 1).padStart(2, '0')} · ${esc(t.tab)}</div><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p><ul>${t.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
    <div class="window"><img src="assets/shots/${t.id}.webp" width="1920" height="1200" alt="${esc(t.alt)}" loading="lazy" decoding="async"></div>`;

  function pageHome() {
    const feats = CATEGORIES.map((c, i) => {
      const [title, icon] = FEAT[c.id] || [c.name, 'spark'];
      const eg = TWEAKS.filter((t) => t.cat === c.id).sort((a, b) => b.impact - a.impact).slice(0, 3);
      return `<article class="card feat rv" style="--d:${i % 3}">
        <div class="top"><span class="ico">${svg(icon)}</span><span class="n"><b>${perCat(c.id)}</b>tweaks</span></div>
        <h3>${esc(title)}</h3><p>${esc(c.name)} · ${esc(c.blurb)}</p>
        <div class="eg">${eg.map((t) => `<div><span class="impact" data-v="${t.impact}" title="Impact"><i></i><i></i><i></i></span><span>${esc(t.name)}</span></div>`).join('')}</div>
      </article>`;
    }).join('');
    const t = TOUR.find((x) => x.id === S.tour) || TOUR[0];
    const games = GAMES.map((g) => `<span>${esc(g)}</span>`).join('');
    const mouse = TWEAKS.find((x) => x.id === 'mouse-accel') || { name: 'Turn off mouse acceleration', impact: 2 };

    return `
    <section class="hero wrap" id="top">
      <a class="badge rv" href="#/download" data-nav="download"><b>New</b>v1.2 adds Games and BIOS guides ${svg('arrow')}</a>
      <h1 class="rv" style="--d:1">More frames. Less lag.<br> <span class="dim">Completely free.</span></h1>
      <p class="hero-sub rv" style="--d:2">Ego Tweaks scans your PC and matches <b>${TWEAKS.length} Windows tweaks</b> to your hardware — frame pacing, input delay, network and power. Every change is backed up and can be undone in one click.</p>
      <div class="hero-cta rv" style="--d:3">
        <button class="btn btn-primary btn-lg" data-nav="download">${svg('download')}Get Ego Tweaks</button>
        <button class="btn btn-glass btn-lg" data-to="app">Tour the app</button>
      </div>
      <div class="hero-stats rv" style="--d:4">
        <span class="stat-chip"><b>${TWEAKS.length}</b>tweaks</span>
        <span class="stat-chip"><b>${GAMES.length}</b>games</span>
        <span class="stat-chip"><b>100%</b>reversible</span>
        <span class="stat-chip"><b>$0</b>no subscription</span>
      </div>
      <div class="shot-wrap rv" style="--d:5">
        <div class="lightbar" aria-hidden="true"></div>
        <div class="window"><img src="assets/shots/home.webp" width="1920" height="1200" alt="The Ego Tweaks app: a dial of all ${TWEAKS.length} tweaks, the PC’s hardware and live CPU, memory and ping meters" fetchpriority="high"></div>
        <div class="shot-cap">The Ego Tweaks app, shown with demo data.</div>
      </div>
    </section>

    <section class="marquee-sec rv" aria-label="Games with built-in settings">
      <p>Game-specific settings for</p>
      <div class="marquee"><div class="marquee-track">${games}${games.replace(/<span>/g, '<span aria-hidden="true">')}</div></div>
    </section>

    <section class="sec wrap" id="features">
      <div class="sec-hd rv"><span class="eyebrow">Why Ego</span><h2>Built for what slows you down.</h2><p>Six areas, ${TWEAKS.length} tweaks. Each one says exactly what it changes — and the scan only recommends the ones that fit your PC.</p></div>
      <div class="feat-grid">${feats}</div>
    </section>

    <section class="sec wrap" id="app">
      <div class="sec-hd rv"><span class="eyebrow">The app</span><h2>Everything in one window.</h2><p>One scan powers every page. Here’s what’s inside.</p></div>
      <div class="tour-tabs rv"><div class="seg" role="tablist" aria-label="App pages">${TOUR.map((x) => `<button type="button" role="tab" aria-selected="${x.id === t.id}" class="${x.id === t.id ? 'on' : ''}" data-tour="${x.id}">${esc(x.tab)}</button>`).join('')}</div></div>
      <div class="card tour rv" id="tour-panel" role="tabpanel">${tourPanel(t)}</div>
    </section>

    <section class="sec wrap" id="safety">
      <div class="sec-hd rv"><span class="eyebrow">Nothing permanent</span><h2>Made to be undone.</h2><p>Try anything. Keep what you like. Everything else goes back exactly how it was.</p></div>
      <div class="bento">
        <div class="card b-demo rv">
          <div class="b-k"><span>Try it</span><span class="chip">Demo</span></div>
          <h3>Flip a tweak. Flip it back.</h3>
          <p>Before a tweak touches anything, Ego Tweaks saves the value it replaces. This is the real mouse acceleration tweak — try the switch.</p>
          <div class="tw">
            <span class="impact" data-v="${mouse.impact}" title="Impact"><i></i><i></i><i></i></span>
            <div><div class="tw-name">${esc(mouse.name)}</div><p class="tw-desc">Your cursor moves exactly as far as your hand does.</p><div class="tw-meta"><span class="chip rec">For your PC</span><span class="chip">Input</span></div></div>
            <button type="button" class="tg" data-act="demo-tweak" role="switch" aria-checked="false" aria-label="${esc(mouse.name)}"></button>
          </div>
          <div class="reglog" id="reglog" aria-live="polite"><div class="hint">› Nothing changed yet. Flip the switch.</div></div>
        </div>
        <div class="card b-sm rv" style="--d:1">
          <div class="b-k"><span>Restore points</span><span class="chip">Demo</span></div>
          <div class="big">1 click</div>
          <p>Make a full Windows snapshot before big batches of changes. You can roll back from Windows Recovery even if the app is uninstalled.</p>
          <div class="row"><button type="button" class="btn btn-line btn-sm" data-act="demo-restore">Create restore point</button><div class="prog idle" id="rp-prog"><i></i></div><span class="state" id="rp-state"></span></div>
        </div>
        <div class="card b-sm rv" style="--d:2">
          <div class="b-k"><span>Undo all</span></div>
          <div class="big">${TWEAKS.length}/${TWEAKS.length}</div>
          <p>Every tweak is reversible. Turn one off — or hit Undo all — and the saved values are written back. Every change is listed in a history you can read.</p>
        </div>
      </div>
    </section>

    <section class="sec wrap" id="how">
      <div class="sec-hd rv"><span class="eyebrow">How it works</span><h2>Up and running in a minute.</h2></div>
      <div class="steps3">
        <div class="card step rv"><span class="ico">${svg('download')}</span><h3>Get it</h3><p>Make a free account here and download the ${fmtMB(BUILD.bytes)} app. Nothing to install.</p></div>
        <div class="card step rv" style="--d:1"><span class="ico">${svg('scan')}</span><h3>Scan</h3><p>It reads your CPU, GPU, memory, drives, display and network, then matches the tweaks that fit.</p></div>
        <div class="card step rv" style="--d:2"><span class="ico">${svg('check')}</span><h3>Apply</h3><p>Apply everything recommended in one click, or pick tweaks one by one. Turn any of them off later.</p></div>
      </div>
    </section>

    <section class="sec wrap" id="free">
      <div class="sec-hd rv"><span class="eyebrow">Pricing</span><h2>Free. <span class="dim">Actually free.</span></h2><p>No plans, no tiers, no “pro” unlock. You get the whole thing.</p></div>
      <div class="compare">
        <div class="card plan us rv">
          <div class="name"><span>Ego Tweaks</span><span class="chip rec">Everything included</span></div>
          <div class="price">$0<small>for everything</small></div>
          <ul>${[`All ${TWEAKS.length} tweaks`, 'Games and BIOS guides', 'Live network tools', 'Undo history and restore points', 'Every update', 'No subscription, no ads'].map((x) => `<li>${svg('check')}<span>${x}</span></li>`).join('')}</ul>
          <button class="btn btn-primary btn-lg" data-nav="download">${svg('download')}Get Ego Tweaks</button>
        </div>
        <div class="card plan them rv" style="--d:1">
          <div class="name"><span>Typical paid tweakers</span></div>
          <div class="price">$$$</div>
          <ul>${['Monthly subscription or per-session fees', 'Best tools locked behind a higher plan', 'Remote “tuning sessions” that cost extra', 'Pay again to keep it working'].map((x) => `<li>${svg('x')}<span>${x}</span></li>`).join('')}</ul>
        </div>
      </div>
    </section>

    <section class="sec wrap" id="faq">
      <div class="sec-hd rv"><span class="eyebrow">FAQ</span><h2>Straight answers.</h2></div>
      <div class="faq rv">
        ${faq('Is it really free?', 'Yes. Every tweak and every page in the app is free. You make a free account on this site to download — that’s it.', true)}
        ${faq('Is it safe? Can I undo changes?', 'Before any tweak changes a setting, Ego Tweaks saves the original value. Turn the tweak off and it’s written back. There’s also Undo all, a history of every change, and one-click Windows restore points.')}
        ${faq('Why does Windows SmartScreen warn me?', 'New apps that Windows hasn’t seen much yet can trigger it. Choose <b>More info → Run anyway</b>. You can check the file’s SHA-256 fingerprint on the Download page.')}
        ${faq('Why does it need administrator access?', 'Many tweaks change system-wide settings — services, power plans, network adapter settings — that Windows only lets administrators change. Windows asks when the app opens.')}
        ${faq('Does it touch my games?', 'No. Ego Tweaks changes Windows settings: registry values, services, scheduled tasks, power and network adapter settings. It doesn’t modify game files or run inside games. The Games page only sets Windows options for a game’s .exe and shows in-game settings for you to change yourself.')}
        ${faq('Which Windows versions work?', 'Windows 10 and 11, 64-bit. It needs Microsoft Edge WebView2 (built into Windows 11) and .NET Framework 4.7.2 or later (built into Windows 10 version 1803 and newer). On laptops, the scan skips tweaks that would hurt battery life.')}
      </div>
    </section>

    <section class="wrap">
      <div class="card cta rv">
        <h2>Your PC, tuned<br>in about a minute.</h2>
        <p>Free account, ${fmtMB(BUILD.bytes)} download, every tweak reversible.</p>
        <div class="hero-cta"><button class="btn btn-primary btn-lg" data-nav="download">${svg('download')}Get Ego Tweaks</button><button class="btn btn-glass btn-lg" data-to="features">See what it tunes</button></div>
        <div class="fine">FREE · v${esc(BUILD.version)} · WINDOWS 10 &amp; 11 · ${fmtMB(BUILD.bytes).toUpperCase()}</div>
      </div>
    </section>`;
  }
  const faq = (q, a, open = false) => `<details${open ? ' open' : ''}><summary>${esc(q)}<i aria-hidden="true"></i></summary><div class="a"><p>${a}</p></div></details>`;

  // ── demo: the real mouse acceleration tweak, with its real registry values ──
  const MOUSE_OPS = [['MouseSpeed', '1', '0'], ['MouseThreshold1', '6', '0'], ['MouseThreshold2', '10', '0']];
  async function demoTweak(btn) {
    if (S.demoBusy) return;
    S.demoBusy = true;
    const on = !S.demoOn;
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
    const key = 'HKCU\\Control Panel\\Mouse';
    if (on) {
      for (const [n, was] of MOUSE_OPS) { add(`Saved   ${esc(key)} · <b>${n}</b> was ${was}`); await sleep(REDUCED ? 0 : 160); }
      await sleep(REDUCED ? 0 : 200);
      add(`<b>Applied</b> · ${MOUSE_OPS.map(([n, , to]) => `${n} = ${to}`).join(' · ')}`);
    } else {
      await sleep(REDUCED ? 0 : 240);
      add(`<b>Restored</b> · ${MOUSE_OPS.map(([n, was]) => `${n} = ${was}`).join(' · ')}`);
      add('Back exactly as it was');
    }
    S.demoOn = on;
    btn.classList.remove('busy');
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', String(on));
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

  // ───────────── download ─────────────
  function pageDownload() {
    const u = S.user;
    const note = u
      ? `<span class="dot"></span>Signed in as <b>@${esc(u.username)}</b> — your download starts right away.`
      : `<span class="dot"></span>You’ll make a free account first. It takes a few seconds and saves your downloads.`;
    const hist = u && u.downloads.length ? `
      <div class="card dl-block rv"><h2>Your downloads <span class="muted" style="font:400 12px var(--body)">saved to your account</span></h2>
        <div>${u.downloads.slice(0, 6).map((d) => `<div class="log-row"><time datetime="${esc(d.at)}">${esc(fmtDate(d.at))}</time><span>${esc(d.file)} · v${esc(d.version)}</span><button class="btn btn-ghost btn-sm" data-act="get">Download again</button></div>`).join('')}</div>
      </div>` : '';

    return `<div class="wrap dl-page">
      <header class="dl-head rv"><span class="eyebrow">Download</span><h1>Get Ego Tweaks</h1><p>Click the Ego Tweaking Utility to get the latest build for Windows. It’s free.</p></header>
      <button class="card dl-card rv" data-act="get" aria-label="Get the ${esc(BUILD.name)}">
        <span class="logo" aria-hidden="true">EGO</span>
        <span class="t"><b>${esc(BUILD.name)}</b><small>${esc(BUILD.file)} · v${esc(BUILD.version)} · ${fmtMB(BUILD.bytes)} · Windows 10 &amp; 11</small></span>
        <span class="go">${u ? 'Download' : 'Get it'}${svg('download')}</span>
      </button>
      <div class="dl-note rv">${note}</div>
      ${hist}
      <div class="dl-cols">
        <div class="card rv"><h3>The file<span>check it matches</span></h3>
          <dl class="kv">
            <dt>File</dt><dd>${esc(BUILD.file)}</dd>
            <dt>Version</dt><dd>${esc(BUILD.version)}</dd>
            <dt>Size</dt><dd>${fmtMB(BUILD.bytes)} (${BUILD.bytes.toLocaleString()} bytes)</dd>
            <dt>SHA-256</dt><dd class="hash" title="Click to select">${esc(BUILD.sha256)}</dd>
          </dl>
        </div>
        <div class="card rv" style="--d:1"><h3>What you need<span>most PCs already have it</span></h3>
          <dl class="kv">
            <dt>Windows</dt><dd class="wrap">Windows 10 or 11, 64-bit</dd>
            <dt>Runtime</dt><dd class="wrap">Microsoft Edge WebView2 — built into Windows 11 (<a href="https://developer.microsoft.com/microsoft-edge/webview2/" target="_blank" rel="noopener">get it</a>)</dd>
            <dt>.NET</dt><dd class="wrap">.NET Framework 4.7.2 or later — built into Windows 10 (1803+) and 11</dd>
            <dt>Access</dt><dd class="wrap">Administrator — Windows asks when it opens</dd>
          </dl>
        </div>
      </div>
      <div class="card dl-block rv"><h2>First run</h2>
        <ol class="steps">
          <li><div><b>Open EgoTweaks.exe</b><p>Windows asks for administrator access. Tweaks change system settings, so Ego Tweaks needs it.</p></div></li>
          <li><div><b>If SmartScreen appears, choose More info → Run anyway</b><p>New downloads that Windows hasn’t seen much yet can trigger it.</p></div></li>
          <li><div><b>Create a restore point</b><p>From Home → Quick actions, before applying anything. It’s your full-PC undo.</p></div></li>
          <li><div><b>Apply what’s recommended</b><p>The scan matches tweaks to your hardware. Apply them all, or review them one by one in Tweaks.</p></div></li>
        </ol>
      </div>
    </div>`;
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
    $('#modal').innerHTML = '';
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (_) { /* ignore */ }
  }
  $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });

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
  async function prepareDownload({ fresh = false } = {}) {
    S.busy = true;
    setModal(`
      <h2 class="h2">Preparing your download</h2>
      <p>${fresh ? 'Account saved. ' : ''}Getting the Ego Tweaking Utility ready for you.</p>
      <div class="mini-log" id="mini-log"></div>
      <div class="prog" id="mini-prog"><i></i></div>`);
    const log = $('#mini-log');
    await runLog(log, [
      { k: 'Account', ms: 140, v: () => `Saved · @${S.user.username}` },
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
      <p class="muted" style="font-size:12.5px">If Windows SmartScreen appears, choose <b>More info → Run anyway</b>. Saved to your account as @${esc(user.username)}.</p>
      <div class="modal-actions">
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
  const admHead = (sub) => `<div class="adm-top"><div><span class="eyebrow">Ego Tweaks · Admin</span><h2 class="adm-h">Site statistics</h2><p class="adm-sub">${sub}</p></div><button type="button" class="nav-burger" style="display:grid" data-act="close" aria-label="Close">${svg('x')}</button></div>`;
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

  // ───────────── events ─────────────
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'auth-form') { e.preventDefault(); if (!S.busy) submitAuth(e.target); }
    if (e.target.id === 'admin-form') { e.preventDefault(); submitAdmin(e.target); }
  });

  document.addEventListener('click', async (e) => {
    const to = e.target.closest('[data-to]');
    if (to) { e.preventDefault(); scrollToSection(to.dataset.to); return; }
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); closeModal(); closeMenu(); go(nav.dataset.nav); return; }
    const tab = e.target.closest('[data-tour]');
    if (tab) {
      const t = TOUR.find((x) => x.id === tab.dataset.tour);
      if (!t || t.id === S.tour) return;
      S.tour = t.id;
      $$('[data-tour]').forEach((b) => { const on = b.dataset.tour === t.id; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      const panel = $('#tour-panel');
      const img = $('.window img', panel);
      if (img && !REDUCED) { img.classList.add('swap'); await sleep(160); }
      panel.innerHTML = tourPanel(t);
      const ni = $('.window img', panel);
      if (ni && !REDUCED) { ni.classList.add('swap'); requestAnimationFrame(() => requestAnimationFrame(() => ni.classList.remove('swap'))); }
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.dataset.act) {
      case 'get':
        if (S.user) { openModal('<div></div>'); prepareDownload(); } else openAuth({ mode: 'signup', then: 'download' });
        break;
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
      case 'demo-tweak': demoTweak(el); break;
      case 'demo-restore': demoRestore(el); break;
      case 'replay': window.scrollTo({ top: 0 }); runBoot(); break;
      case 'admin': openAdmin(); break;
      case 'admin-refresh': loadAdmin(); break;
      case 'admin-lock':
        clearInterval(ADM.timer); AUTH.signOut().catch(() => {}); closeModal(); toast('Admin signed out', { dark: true }); break;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#modal').firstElementChild) closeModal(); else closeMenu();
  });
  window.addEventListener('hashchange', () => route());
  const onScroll = () => $('#nav').classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });

  // ───────────── start ─────────────
  buildBootTicks();
  S.page = routeFromHash();
  if (S.user && S.user.prefs.intro === false) {
    $('#boot').hidden = true;
    document.body.classList.remove('booting');
    showSite();
  } else {
    runBoot();
  }
  onScroll();
})();
