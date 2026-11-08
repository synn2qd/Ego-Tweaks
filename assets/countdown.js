// "Update dropping" countdown: until DROP the site shows only this page, then reloads into the normal site by itself
// (no redeploy needed). It runs in <head> before anything draws, so the real site never flashes first.
// Gets through anyway:
//   - the owner's admin page (#/admin), and the Discord login coming back to it (#access_token=… with the admin
//     flow saved in sessionStorage by site.js), so the owner can log in while the countdown is up;
//   - the owner, once logged in on #/admin: site.js stores localStorage 'ego-owner' = '1' when the bot confirms the
//     Discord login is an admin, and clears it on a 403 or a log-out. This is a convenience, not security: the admin
//     data itself still needs the bot's OK;
//   - a preview link (egotweaks.com/?preview), which lasts for that browser tab.
// Downloads, the bot, Discord sign-in and the apps keep working: only this page is covered.
(function () {
  var DROP = Date.parse('2026-11-08T18:00:00Z'); // Sunday 11/8/2026, 1:00 PM EST (UTC-5)
  var DROP_TEXT = 'Sunday, Nov 8 · 1:00 PM EST';
  var DISCORD = 'https://discord.gg/gtPggZ9zpz';
  if (!(Date.now() < DROP)) return;
  try {
    if (/[?&]preview\b/.test(location.search)) sessionStorage.setItem('ego-preview', '1');
    if (sessionStorage.getItem('ego-preview') === '1') return;
  } catch (_) {}
  var isAdminHash = function () { return /^#\/?admin/.test(location.hash); };
  if (isAdminHash()) return;
  // Back from Discord's login page: the redirect lands on /#access_token=…&state=… (or #error=…). If that login was
  // started from the admin page, let it through so site.js can finish it and open #/admin.
  try {
    var h = location.hash;
    if (/[#&](access_token|error)=/.test(h) && /[#&]state=/.test(h)) {
      var after = JSON.parse(sessionStorage.getItem('ego-oauth-after') || 'null');
      if (after && after.page === 'admin') return;
    }
  } catch (_) {}
  try { if (localStorage.getItem('ego-owner') === '1') return; } catch (_) {}

  var root = document.documentElement;
  root.classList.add('ego-down');
  var css = document.createElement('style');
  css.id = 'ego-down-css';
  css.textContent = [
    "@font-face{font-family:'EgoSans';src:url(assets/fonts/geist-latin-wght-normal.woff2) format('woff2-variations'),url(assets/fonts/geist-latin-wght-normal.woff2) format('woff2');font-weight:100 900;font-display:swap}",
    // colours follow <html data-mode> (THEME.md); dark is the default
    "#ego-down{--c-bg:#0a0a0f;--c-surface:#111119;--c-border:#22222d;--c-text:#f3f3f7;--c-2:#c4c4cf;--c-muted:#8a8a99;--c-faint:#5f5f6e;--c-accent:#7b6cff;--c-accent-h:#8d80ff;--c-soft:rgba(123,108,255,.14);--c-atext:#a99fff;--c-dot:rgba(123,108,255,.42);--c-glow:rgba(123,108,255,.24);--c-shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px -8px rgba(0,0,0,.6)}",
    "html[data-mode=light] #ego-down{--c-bg:#ffffff;--c-surface:#ffffff;--c-border:#e6e6eb;--c-text:#0d0d14;--c-2:#3d3d4a;--c-muted:#6b6b7a;--c-faint:#9b9ba8;--c-accent:#5b4cf0;--c-accent-h:#4b3bde;--c-soft:#efedfe;--c-atext:#4b3bde;--c-dot:rgba(91,76,240,.30);--c-glow:rgba(91,76,240,.14);--c-shadow:0 1px 2px rgba(16,16,40,.04),0 6px 20px -6px rgba(16,16,40,.10)}",
    "html.ego-down,html.ego-down body{overflow:hidden!important;background:#0a0a0f}html.ego-down[data-mode=light],html.ego-down[data-mode=light] body{background:#fff}",
    "html.ego-down body>*:not(#ego-down){display:none!important}",
    "#ego-down{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:56px 16px 32px;overflow:auto;background:var(--c-bg);color:var(--c-2);font:400 16px/1.55 EgoSans,'Segoe UI',system-ui,-apple-system,sans-serif;text-align:center;-webkit-font-smoothing:antialiased;isolation:isolate}",
    "#ego-down::before{content:'';position:fixed;inset:-5% -5% 0;z-index:-1;pointer-events:none;background-image:radial-gradient(circle,var(--c-dot) 1.1px,transparent 1.7px);background-size:14px 14px;-webkit-mask:radial-gradient(55% 55% at 50% 40%,#000,rgba(0,0,0,.4) 45%,transparent 78%);mask:radial-gradient(55% 55% at 50% 40%,#000,rgba(0,0,0,.4) 45%,transparent 78%)}",
    "#ego-down::after{content:'';position:fixed;left:50%;top:-20%;width:min(1100px,140vw);height:80vh;transform:translateX(-50%);z-index:-1;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,var(--c-glow),transparent 72%)}",
    "#ego-down *{box-sizing:border-box}",
    "#ego-down .in{position:relative;display:grid;justify-items:center;gap:20px;max-width:720px;width:100%}",
    "#ego-down .logo{display:inline-flex;align-items:center;gap:10px;color:var(--c-muted);font:500 18px/1 EgoSans,'Segoe UI',sans-serif;letter-spacing:-.01em;margin-bottom:10px}#ego-down .wm-ego{color:var(--c-text);font-weight:600}",
    "#ego-down .mark{display:block;width:30px;height:30px;flex:none}",
    "#ego-down .mode-btn{position:fixed;top:16px;right:16px;z-index:2}",
    "#ego-down .eyebrow{display:inline-flex;align-items:center;gap:8px;height:28px;padding:0 12px;border:1px solid rgba(123,108,255,.28);border-radius:999px;background:var(--c-soft);color:var(--c-atext);font:500 13px/1 EgoSans,'Segoe UI',sans-serif}",
    "#ego-down .eyebrow i{width:7px;height:7px;border-radius:50%;background:var(--c-accent);animation:egoPulse 1.8s ease-in-out infinite}",
    "@keyframes egoPulse{50%{opacity:.35}}",
    "#ego-down h1{margin:0;color:var(--c-text);font:650 clamp(32px,6vw,60px)/1.06 EgoSans,'Segoe UI',sans-serif;letter-spacing:-.03em;text-wrap:balance}",
    "#ego-down p{margin:0;max-width:52ch;color:var(--c-2);font-size:17px;text-wrap:pretty}",
    "#ego-down .clock{display:flex;gap:clamp(8px,2vw,14px);margin-top:8px}",
    "#ego-down .unit{display:grid;gap:10px;min-width:clamp(84px,20vw,128px);padding:clamp(16px,3vw,22px) 8px;border:1px solid var(--c-border);border-radius:16px;background:var(--c-surface);box-shadow:var(--c-shadow)}",
    "#ego-down .unit b{color:var(--c-text);font:650 clamp(34px,7.5vw,60px)/1 EgoSans,'Segoe UI',sans-serif;letter-spacing:-.03em;font-variant-numeric:tabular-nums}",
    "#ego-down .unit small{color:var(--c-muted);font:500 13px/1 EgoSans,'Segoe UI',sans-serif}",
    "#ego-down .when{color:var(--c-text);font-weight:600}#ego-down .local{color:var(--c-muted);font-size:14px}",
    "#ego-down .btn{display:inline-flex;align-items:center;gap:9px;height:44px;padding:0 20px;border-radius:8px;background:var(--c-accent);color:#fff;font:600 15.5px/1 EgoSans,'Segoe UI',sans-serif;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.14);transition:background .15s ease-out}",
    "#ego-down .btn:hover{background:var(--c-accent-h)}",
    "#ego-down .btn svg{width:19px;height:19px;fill:currentColor}",
    "#ego-down :focus-visible{outline:2px solid var(--c-accent);outline-offset:2px;border-radius:6px}",
    "#ego-down .fine{font-size:14px;color:var(--c-muted)}",
    "#ego-down .owner{margin-top:6px;color:var(--c-faint);font-size:12.5px;text-decoration:none}",
    "#ego-down .owner:hover{color:var(--c-atext);text-decoration:underline;text-underline-offset:3px}",
    "@media (prefers-reduced-motion:no-preference){#ego-down .in>*{animation:egoIn .9s cubic-bezier(.16,1,.3,1) both}#ego-down .in>*:nth-child(2){animation-delay:.08s}#ego-down .in>*:nth-child(3){animation-delay:.16s}#ego-down .in>*:nth-child(4){animation-delay:.24s}#ego-down .in>*:nth-child(n+5){animation-delay:.32s}}",
    "@keyframes egoIn{from{opacity:0;transform:translateY(14px);filter:blur(8px)}}",
    "@media (max-width:420px){#ego-down .clock{gap:8px}#ego-down .unit{min-width:0;flex:1}#ego-down p{font-size:16px}}",
    "@media (prefers-reduced-motion:reduce){#ego-down .eyebrow i{animation:none}}",
  ].join('');
  (document.head || root).appendChild(css);

  var DISCORD_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.85a.07.07 0 0 0-.08.04c-.21.38-.44.86-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1 0 .13 12.3 12.3 0 0 1-1.88.89.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"/></svg>';
  // light / dark toggle (assets/mode.js handles data-act="mode" once the page has loaded)
  var MODE_BTN = '<button type="button" class="mode-btn" data-act="mode" aria-label="Switch to light mode" title="Switch to light mode"><svg class="mode-ic" viewBox="0 0 24 24" aria-hidden="true"><mask id="mode-moon-cd"><rect width="24" height="24" fill="#fff"/><circle class="mode-cut" cx="24" cy="4" r="8" fill="#000"/></mask><circle class="mode-core" cx="12" cy="12" r="5" mask="url(#mode-moon-cd)" fill="currentColor" stroke="none"/><g class="mode-rays" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1.5v2M12 20.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M1.5 12h2M20.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></g></svg></button>';
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var timer = 0, lifted = false;
  function localWhen() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === 'America/New_York' || tz === 'America/Detroit' || tz === 'America/Toronto') return '';
      return 'That’s ' + new Date(DROP).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) + ' where you are.';
    } catch (_) { return ''; }
  }
  function show() {
    if (lifted || document.getElementById('ego-down')) return;
    var el = document.createElement('div');
    el.id = 'ego-down';
    el.setAttribute('role', 'main');
    el.innerHTML = MODE_BTN + '<div class="in">' +
      '<div class="logo"><img class="mark" src="assets/logo-mark.svg?v=7" alt="" width="30" height="30"><span><span class="wm-ego">Ego</span> Tweaks</span></div>' +
      '<span class="eyebrow"><i></i>Update incoming</span>' +
      '<h1>The next update drops soon.</h1>' +
      '<p>We’re getting the site ready for it. Everything comes back, with the update, when the timer hits zero.</p>' +
      '<div class="clock" aria-live="off">' +
      '<div class="unit"><b data-u="h">00</b><small>Hours</small></div>' +
      '<div class="unit"><b data-u="m">00</b><small>Minutes</small></div>' +
      '<div class="unit"><b data-u="s">00</b><small>Seconds</small></div></div>' +
      '<div><div class="when">' + DROP_TEXT + '</div><div class="local">' + localWhen() + '</div></div>' +
      '<a class="btn" href="' + DISCORD + '" target="_blank" rel="noopener">' + DISCORD_SVG + 'Join the Discord for the drop</a>' +
      '<p class="fine">Already have Ego Tweaks? The app keeps working while the site is down.</p>' +
      '<a class="owner" href="#/admin">Owner login</a>' +
      '</div>';
    document.body.appendChild(el);
    if (window.EgoMode) window.EgoMode.sync();
    tick();
  }
  function tick() {
    if (lifted) return;
    var left = DROP - Date.now();
    if (left <= 0) { location.reload(); return; }
    var s = Math.floor(left / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    var el = document.getElementById('ego-down');
    if (el) {
      el.querySelector('[data-u="h"]').textContent = pad(h);
      el.querySelector('[data-u="m"]').textContent = pad(m);
      el.querySelector('[data-u="s"]').textContent = pad(s % 60);
    }
    timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  // "Owner login" (or typing #/admin): take the cover off and let the site's own router open the admin page.
  function lift() {
    if (lifted) return;
    lifted = true;
    clearTimeout(timer);
    var el = document.getElementById('ego-down');
    if (el) el.remove();
    root.classList.remove('ego-down');
    window.removeEventListener('hashchange', onHash);
  }
  function onHash() { if (isAdminHash()) lift(); }
  window.addEventListener('hashchange', onHash);
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
