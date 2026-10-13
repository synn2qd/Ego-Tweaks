/* Ego Tweaks — website */
(() => {
  'use strict';

  // ───────────── helpers ─────────────
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = matchMedia('(hover: none)').matches;
  const { categories: CATEGORIES, tweaks: TWEAKS } = window.EGO_SITE_CATALOG;
  const CATNAME = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
  const ORDERED = CATEGORIES.flatMap((c) => TWEAKS.filter((t) => t.cat === c.id));
  const perCat = (id) => TWEAKS.filter((t) => t.cat === id).length;
  const AUTH = window.EgoAuth;

  // The build offered on the Download page. Swap these when you ship a new version.
  const BUILD = {
    name: 'Ego Tweaking Utility',
    file: 'EgoTweaks.exe',
    href: 'downloads/EgoTweaks.exe',
    version: '1.2.0',
    bytes: 1422848,
    sha256: 'a6c3d250da0e6220a2e390288de2081d052838451bdfb527d3880e47f567c941',
  };
  const fmtMB = (b) => (b / 1048576).toFixed(1) + ' MB';
  const fmtDate = (iso, time = true) => { try { return new Date(iso).toLocaleString(undefined, Object.assign({ month: 'short', day: 'numeric', year: 'numeric' }, time ? { hour: 'numeric', minute: '2-digit' } : {})); } catch (_) { return iso; } };

  const ICON = {
    home: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4.2-4.8"/><circle cx="12" cy="17" r="1.2"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    at: '<circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.3a2.4 2.4 0 0 0 4.8 0V12a8.3 8.3 0 1 0-3.3 6.6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    shield: '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  };
  const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  const S = { page: 'home', firstPaint: true, user: AUTH.current(), busy: false };

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

  async function runBoot({ replay = false } = {}) {
    const boot = $('#boot');
    const log = $('#boot-log');
    let skip = replay;
    const fast = () => skip;
    const onSkip = () => { skip = true; };
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
      { k: 'Account', v: () => (S.user ? `Signed in · @${S.user.username}` : 'Guest') },
      { k: 'Latest build', v: `${BUILD.file} · ${fmtMB(BUILD.bytes)}` },
    ];
    await runLog(log, steps, { fast, onProgress: setBootProgress });
    $('#boot-step').textContent = 'Ready';
    await sleep(fast() ? 150 : 380);

    boot.removeEventListener('pointerdown', onSkip);
    window.removeEventListener('keydown', onSkip);
    if ($('#app').hidden) showApp();
    else { S.firstPaint = true; renderPage(); }
    boot.classList.add('out');
    await sleep(REDUCED ? 50 : 900);
    boot.classList.add('gone');
    await sleep(560);
    boot.hidden = true;
  }

  function showApp() {
    const app = $('#app');
    if (!app.hidden) return;
    app.hidden = false;
    S.firstPaint = true;
    renderRail(); renderStatus(); renderPage();
  }

  // ───────────── shell ─────────────
  const PAGES = [
    { id: 'home', name: 'Home', icon: 'home' },
    { id: 'download', name: 'Download', icon: 'download' },
  ];

  function renderRail() {
    $('#rail').innerHTML = PAGES.map((p) => `<button class="rail-btn ${S.page === p.id ? 'on' : ''}" data-nav="${p.id}" aria-label="${p.name}" ${S.page === p.id ? 'aria-current="page"' : ''} title="${p.name}">${svg(p.icon)}<span>${p.name}</span></button>`).join('')
      + `<div class="rail-sp"></div>`
      + `<button class="rail-btn" data-act="${S.user ? 'account' : 'signin'}" aria-label="${S.user ? 'Your account' : 'Sign in'}" title="${S.user ? 'Your account' : 'Sign in'}">${svg('user')}<span>${S.user ? 'Account' : 'Sign in'}</span></button>`
      + `<button class="rail-btn small replay" data-act="replay" title="Replay intro" aria-label="Replay intro">${svg('replay')}</button>`;
  }

  function renderStatus() {
    $('#tb-status').innerHTML = S.user
      ? `<span class="pill ver">v${BUILD.version}</span><button class="pill" data-act="account" title="Your account"><span class="dot"></span>@${esc(S.user.username)}</button>`
      : `<span class="pill ver">v${BUILD.version}</span><button class="pill" data-act="signin">Sign in</button><button class="pill solid" data-act="signup"><span class="dot"></span>Create account</button>`;
  }

  const routeFromHash = () => (/^#\/?download/.test(location.hash) ? 'download' : 'home');
  function go(page) {
    const hash = page === 'home' ? '#/' : `#/${page}`;
    if (location.hash !== hash) location.hash = hash;
    else route();
  }
  function route() {
    const page = routeFromHash();
    const changed = page !== S.page;
    S.page = page;
    document.title = page === 'home' ? 'Ego Tweaks' : 'Download · Ego Tweaks';
    if ($('#app').hidden) return;
    renderRail();
    if (changed || !$('#view').firstElementChild) { renderPage(); $('#view').scrollTop = 0; }
  }

  function renderPage({ keepScroll = false } = {}) {
    const view = $('#view');
    const top = view.scrollTop;
    view.innerHTML = `<div class="page ${keepScroll ? '' : 'enter'}">${S.page === 'download' ? pageDownload() : pageHome()}</div>`;
    $$('.page > *', view).forEach((el, i) => el.style.setProperty('--i', i));
    if (keepScroll) view.scrollTop = top;
    if (S.page === 'home') { animateDial(); requestAnimationFrame(() => $$('.cat-card .bar i').forEach((i) => (i.style.width = i.dataset.w + '%'))); }
  }

  // ───────────── home ─────────────
  function dialSvg() {
    const n = ORDERED.length;
    const gap = 2.2;
    const slots = n + gap * (CATEGORIES.length - 1);
    const span = 270; const start = -135;
    const per = span / slots;
    let pos = 0; let ticks = ''; let hits = ''; const labels = [];
    CATEGORIES.forEach((c, ci) => {
      const list = ORDERED.filter((t) => t.cat === c.id);
      const a0 = start + pos * per;
      list.forEach((t) => {
        const a = (start + (pos + 0.5) * per) * Math.PI / 180;
        const r1 = 196, r2 = 226;
        const xy = `x1="${(Math.sin(a) * r1).toFixed(1)}" y1="${(-Math.cos(a) * r1).toFixed(1)}" x2="${(Math.sin(a) * r2).toFixed(1)}" y2="${(-Math.cos(a) * r2).toFixed(1)}"`;
        ticks += `<line class="tick" data-tick="${t.id}" ${xy}></line>`;
        hits += `<line class="hit" data-hit="${t.id}" ${xy}><title>${esc(t.name)}</title></line>`;
        pos += 1;
      });
      const a1 = start + pos * per;
      const mid = ((a0 + a1) / 2) * Math.PI / 180;
      const sx = Math.sin(mid);
      const anchor = sx > 0.35 ? 'start' : sx < -0.35 ? 'end' : 'middle';
      const lr = anchor === 'middle' ? 246 : 236;
      labels.push(`<text class="cat-label" text-anchor="${anchor}" x="${(sx * lr).toFixed(1)}" y="${(-Math.cos(mid) * lr + 3).toFixed(1)}">${esc(c.name)}</text>`);
      if (ci < CATEGORIES.length - 1) pos += gap;
    });
    const R = 182;
    const arcLen = (span / 360) * 2 * Math.PI * R;
    const a0 = start * Math.PI / 180, a1 = (start + span) * Math.PI / 180;
    const arc = `M ${(Math.sin(a0) * R).toFixed(2)} ${(-Math.cos(a0) * R).toFixed(2)} A ${R} ${R} 0 1 1 ${(Math.sin(a1) * R).toFixed(2)} ${(-Math.cos(a1) * R).toFixed(2)}`;
    return `<svg viewBox="-270 -270 540 540" role="img" aria-label="One mark per tweak, ${n} in all">
      <path class="inner" d="${arc}" stroke-width="1.5"></path>
      <path class="arc" id="dial-arc" d="${arc}" stroke-dasharray="${arcLen.toFixed(1)}" stroke-dashoffset="${arcLen.toFixed(1)}" data-len="${arcLen.toFixed(1)}"></path>
      ${ticks}${labels.join('')}${hits}</svg>`;
  }

  const DIAL_CAP = `<b>tweaks</b> in ${CATEGORIES.length} categories<br>every one reversible`;
  function animateDial() {
    const ticks = $$('.dial .tick');
    const first = S.firstPaint && !REDUCED;
    const stepMs = first ? 14 : 4;
    ticks.forEach((el, i) => {
      el.style.transitionDelay = `${180 + i * stepMs}ms`;
      requestAnimationFrame(() => el.setAttribute('class', 'tick on'));
      setTimeout(() => (el.style.transitionDelay = ''), 900 + i * stepMs);
    });
    const arc = $('#dial-arc');
    const dur = 180 + ticks.length * stepMs;
    if (arc) {
      arc.style.transition = `stroke-dashoffset ${dur}ms var(--ease) 180ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => (arc.style.strokeDashoffset = '0')));
    }
    countTo($('#dial-num'), TWEAKS.length, dur + 200);
    S.firstPaint = false;
  }

  function countTo(el, to, dur = 800) {
    if (!el) return;
    if (REDUCED) { el.textContent = String(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function pageHome() {
    const rig = [
      ['Tweaks', String(TWEAKS.length), `across ${CATEGORIES.length} categories`],
      ['Backups', 'Before every change', 'Turn any tweak back off'],
      ['Restore points', 'One click', 'Windows snapshot you can roll back to'],
      ['Platform', 'Windows 10 & 11', '64-bit · runs as administrator'],
      ['Download', fmtMB(BUILD.bytes), 'Single .exe · nothing to install'],
      ['Version', `v${BUILD.version}`, 'Latest build'],
    ];
    const max = Math.max(...CATEGORIES.map((c) => perCat(c.id)));
    const cats = CATEGORIES.map((c) => {
      const list = TWEAKS.filter((t) => t.cat === c.id).sort((a, b) => b.impact - a.impact).slice(0, 3);
      return `<article class="cat-card">
        <div class="top"><h3>${esc(c.name)}</h3><span class="n">${perCat(c.id)}<small>tweaks</small></span></div>
        <div class="bar"><i data-w="${Math.round((perCat(c.id) / max) * 100)}"></i></div>
        <p>${esc(c.blurb)}</p>
        <div class="eg">${list.map((t) => `<div><span class="impact" data-v="${t.impact}" title="Impact"><i></i><i></i><i></i></span><span>${esc(t.name)}</span></div>`).join('')}</div>
      </article>`;
    }).join('');

    return `
    <section class="hero">
      <div class="dial" id="dial">${dialSvg()}
        <div class="dial-center"><div class="dial-num" id="dial-num">0</div>
        <div class="dial-cap" id="dial-cap">${DIAL_CAP}</div></div>
      </div>
      <div class="hero-copy">
        <h1 class="h1">Tune Windows.<br>Undo anything.</h1>
        <p class="lede">Ego Tweaks scans your PC, matches <b>${TWEAKS.length}</b> tweaks to your hardware and applies the ones that help — frame pacing, input response, network latency, power and background noise. Everything is backed up before it changes and can be turned off again.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-nav="download">${svg('download')}Download for Windows</button>
          <button class="btn btn-line" data-act="scroll-tunes">See what it tunes</button>
        </div>
        <div class="hero-legend"><span><i></i>One mark per tweak</span><span class="muted hov">${TOUCH ? 'Tap' : 'Hover'} a mark to read it</span></div>
      </div>
    </section>
    <dl class="rig">${rig.map(([k, v, sub]) => `<div><dt>${esc(k)}</dt><dd title="${esc(v)}">${esc(v)}</dd><div class="sub" title="${esc(sub)}">${esc(sub)}</div></div>`).join('')}</dl>
    <section class="block" id="tunes">
      <div class="sec-head"><div><h2 class="h2">What it tunes</h2><p>One switch per tweak. Each one says what it changes, and the scan only recommends the ones that fit your PC.</p></div></div>
      <div class="cat-grid">${cats}</div>
    </section>
    <section class="block">
      <div class="sec-head"><div><h2 class="h2">Nothing permanent</h2><p>Built so you can try everything and keep only what you like.</p></div></div>
      <div class="safe-cards">
        <div class="safe"><span class="big">${TWEAKS.length}/${TWEAKS.length}</span><h3>Every tweak is reversible</h3><p>Before a tweak changes anything, Ego Tweaks saves the original value. Turn it off and that value goes straight back.</p></div>
        <div class="safe"><span class="big">1 click</span><h3>Restore point first</h3><p>Create a Windows restore point from Quick actions before you start — a full snapshot you can roll the whole PC back to.</p></div>
      </div>
    </section>
    <div class="banner"><p><strong>Ready when you are.</strong> Make an account and grab the latest build of the Ego Tweaking Utility.</p><button class="btn btn-primary btn-sm" data-nav="download">Go to download</button></div>
    <footer class="foot"><span>© ${new Date().getFullYear()} Ego Tweaks</span><span>v${BUILD.version} · Windows 10 &amp; 11</span></footer>`;
  }

  // dial hover → show the tweak's name in the middle
  document.addEventListener('pointerover', (e) => {
    const hit = e.target.closest && e.target.closest('.dial .hit');
    if (!hit) return;
    const t = TWEAKS.find((x) => x.id === hit.dataset.hit);
    $$('.dial .tick.hot').forEach((el) => el.classList.remove('hot'));
    const tick = $(`.dial .tick[data-tick="${hit.dataset.hit}"]`);
    if (tick) tick.classList.add('hot');
    const cap = $('#dial-cap');
    if (cap && t) cap.innerHTML = `<b>${esc(t.name)}</b><br>${esc(CATNAME[t.cat])}`;
  });
  document.addEventListener('pointerout', (e) => {
    if (!(e.target.closest && e.target.closest('.dial .hit'))) return;
    if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.dial .hit')) return;
    $$('.dial .tick.hot').forEach((el) => el.classList.remove('hot'));
    const cap = $('#dial-cap');
    if (cap) cap.innerHTML = DIAL_CAP;
  });

  // ───────────── download ─────────────
  function pageDownload() {
    const u = S.user;
    const note = u
      ? `<span class="dot"></span>Signed in as <b>@${esc(u.username)}</b> — your download starts right away.`
      : `<span class="dot"></span>You’ll make an account first. It takes a few seconds and saves your downloads.`;
    const hist = u && u.downloads.length ? `
    <section class="block">
      <div class="sec-head"><div><h2 class="h2">Your downloads</h2><p>Saved to your account.</p></div></div>
      <div class="log">${u.downloads.slice(0, 6).map((d) => `<div class="log-row"><time datetime="${esc(d.at)}">${esc(fmtDate(d.at))}</time><span>${esc(d.file)} · v${esc(d.version)}</span><button class="btn btn-ghost btn-sm" data-act="get">Download again</button></div>`).join('')}</div>
    </section>` : '';

    return `
    <header class="dl-head">
      <h1 class="h1">Download</h1>
      <p class="lede">Click the Ego Tweaking Utility to get the latest build for Windows.</p>
    </header>
    <section class="block">
      <button class="dl-card" data-act="get" aria-label="Get the ${esc(BUILD.name)}">
        <span class="logo" aria-hidden="true">EGO</span>
        <span class="t"><b>${esc(BUILD.name)}</b><small>${esc(BUILD.file)} · v${esc(BUILD.version)} · ${fmtMB(BUILD.bytes)} · Windows 10 &amp; 11</small></span>
        <span class="go">${u ? 'Download' : 'Get it'}${svg('download')}</span>
      </button>
      <div class="dl-note">${note}</div>
    </section>
    ${hist}
    <section class="block spec-grid">
      <div class="spec"><h3>The file<span>check it matches</span></h3>
        <dl class="kv">
          <dt>File</dt><dd>${esc(BUILD.file)}</dd>
          <dt>Version</dt><dd>${esc(BUILD.version)}</dd>
          <dt>Size</dt><dd>${fmtMB(BUILD.bytes)} (${BUILD.bytes.toLocaleString()} bytes)</dd>
          <dt>SHA-256</dt><dd class="hash" title="Click to select">${esc(BUILD.sha256)}</dd>
        </dl>
      </div>
      <div class="spec"><h3>What you need<span>most PCs already have it</span></h3>
        <dl class="kv">
          <dt>Windows</dt><dd class="wrap">Windows 10 or 11, 64-bit</dd>
          <dt>Runtime</dt><dd class="wrap">Microsoft Edge WebView2 — built into Windows 11 (<a href="https://developer.microsoft.com/microsoft-edge/webview2/" target="_blank" rel="noopener">get it</a>)</dd>
          <dt>.NET</dt><dd class="wrap">.NET Framework 4.7.2 or later — built into Windows 10 (1803+) and 11</dd>
          <dt>Access</dt><dd class="wrap">Administrator — Windows asks when it opens</dd>
        </dl>
      </div>
    </section>
    <section class="block">
      <div class="sec-head"><div><h2 class="h2">First run</h2><p>Four steps, about a minute.</p></div></div>
      <ol class="steps">
        <li><div><b>Open EgoTweaks.exe</b><p>Windows asks for administrator access. Tweaks change system settings, so Ego Tweaks needs it.</p></div></li>
        <li><div><b>If SmartScreen appears, choose More info → Run anyway</b><p>New downloads that Windows hasn’t seen much yet can trigger it.</p></div></li>
        <li><div><b>Create a restore point</b><p>From Home → Quick actions, before applying anything. It’s your full-PC undo.</p></div></li>
        <li><div><b>Apply what’s recommended</b><p>The scan matches tweaks to your hardware. Apply them all, or review them one by one in Tweaks.</p></div></li>
      </ol>
    </section>
    <footer class="foot"><span>© ${new Date().getFullYear()} Ego Tweaks</span><span>v${BUILD.version} · Windows 10 &amp; 11</span></footer>`;
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
    $('#modal').innerHTML = '';
    if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (_) { /* ignore */ }
  }
  $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#modal').firstElementChild) closeModal(); });

  // ── account form ──
  const field = (id, label, icon, type, attrs = '', hint = '') => `
    <div class="field" data-field="${id}">
      <label for="f-${id}">${label}</label>
      <div class="inp">${svg(icon)}<input id="f-${id}" name="${id}" type="${type}" ${attrs}>${type === 'password' ? '<button type="button" class="peek" data-act="peek" aria-label="Show password">SHOW</button>' : ''}</div>
      ${hint ? `<span class="hint">${hint}</span>` : ''}
    </div>`;

  function openAuth({ mode = 'signup', then = null } = {}) {
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
          : field('login', 'Username or email', 'user', 'text', 'autocomplete="username" spellcheck="false" autocapitalize="off" autofocus')
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
      <p>${fresh ? `Account saved. ` : ''}Getting the Ego Tweaking Utility ready for you.</p>
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
    if ($('#app').hidden) return;
    renderStatus(); renderRail();
    if (S.page === 'download') renderPage({ keepScroll: true });
  }
  AUTH.onChange(() => { if (!S.busy) refresh(); });

  // ───────────── events ─────────────
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'auth-form') { e.preventDefault(); if (!S.busy) submitAuth(e.target); }
  });

  document.addEventListener('click', async (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); closeModal(); go(nav.dataset.nav); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    switch (act) {
      case 'get':
        if (S.user) { openModal('<div></div>'); prepareDownload(); } else openAuth({ mode: 'signup', then: 'download' });
        break;
      case 'signup': openAuth({ mode: 'signup' }); break;
      case 'signin': openAuth({ mode: 'signin' }); break;
      case 'account': openAccount(); break;
      case 'auth-mode': openAuth({ mode: el.dataset.mode, then: el.dataset.then || null }); break;
      case 'close': closeModal(); break;
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
      case 'scroll-tunes': { const t = $('#tunes'); if (t) t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); break; }
      case 'replay': runBoot({ replay: false }); break;
    }
  });

  window.addEventListener('hashchange', route);

  // ───────────── start ─────────────
  buildBootTicks();
  S.page = routeFromHash();
  if (S.user && S.user.prefs.intro === false) {
    $('#boot').hidden = true;
    showApp();
  } else {
    runBoot();
  }
})();
