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
    "html.ego-down,html.ego-down body{overflow:hidden!important;background:#fff}",
    "html.ego-down body>*:not(#ego-down){display:none!important}",
    "#ego-down{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:32px 16px;overflow:auto;color:#3d3d4a;font:400 16px/1.55 EgoSans,'Segoe UI',system-ui,-apple-system,sans-serif;text-align:center;-webkit-font-smoothing:antialiased;",
    "background:linear-gradient(#f0f0f3 1px,transparent 1px) 0 0/56px 56px,linear-gradient(90deg,#f0f0f3 1px,transparent 1px) 0 0/56px 56px,#fff}",
    "#ego-down::before{content:'';position:fixed;inset:0;pointer-events:none;background:radial-gradient(closest-side at 50% 45%,#fff 35%,rgba(255,255,255,0))}",
    "#ego-down *{box-sizing:border-box}",
    "#ego-down .in{position:relative;display:grid;justify-items:center;gap:20px;max-width:720px;width:100%}",
    "#ego-down .logo{display:inline-flex;align-items:center;gap:10px;color:#6b6b7a;font:500 18px/1 EgoSans,'Segoe UI',sans-serif;letter-spacing:-.01em;margin-bottom:10px}#ego-down .wm-ego{color:#0d0d14;font-weight:600}",
    "#ego-down .mark{display:block;width:30px;height:30px;flex:none}",
    "#ego-down .eyebrow{display:inline-flex;align-items:center;gap:8px;height:28px;padding:0 12px;border-radius:999px;background:#efedfe;color:#4b3bde;font:500 13px/1 EgoSans,'Segoe UI',sans-serif}",
    "#ego-down .eyebrow i{width:7px;height:7px;border-radius:50%;background:#5b4cf0;animation:egoPulse 1.8s ease-in-out infinite}",
    "@keyframes egoPulse{50%{opacity:.35}}",
    "#ego-down h1{margin:0;color:#0d0d14;font:650 clamp(30px,5.6vw,52px)/1.1 EgoSans,'Segoe UI',sans-serif;letter-spacing:-.02em;text-wrap:balance}",
    "#ego-down p{margin:0;max-width:52ch;color:#3d3d4a;font-size:17px;text-wrap:pretty}",
    "#ego-down .clock{display:flex;gap:clamp(8px,2vw,14px);margin-top:8px}",
    "#ego-down .unit{display:grid;gap:10px;min-width:clamp(84px,20vw,128px);padding:clamp(16px,3vw,22px) 8px;border:1px solid #e6e6eb;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(16,16,40,.04),0 6px 20px -6px rgba(16,16,40,.10)}",
    "#ego-down .unit b{color:#0d0d14;font:650 clamp(34px,7.5vw,60px)/1 EgoSans,'Segoe UI',sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums}",
    "#ego-down .unit small{color:#6b6b7a;font:500 13px/1 EgoSans,'Segoe UI',sans-serif}",
    "#ego-down .when{color:#0d0d14;font-weight:600}#ego-down .local{color:#6b6b7a;font-size:14px}",
    "#ego-down .btn{display:inline-flex;align-items:center;gap:9px;height:44px;padding:0 20px;border-radius:8px;background:#5b4cf0;color:#fff;font:600 15.5px/1 EgoSans,'Segoe UI',sans-serif;text-decoration:none;box-shadow:0 1px 2px rgba(16,16,40,.05);transition:background .15s ease-out}",
    "#ego-down .btn:hover{background:#4b3bde}",
    "#ego-down .btn svg{width:19px;height:19px;fill:currentColor}",
    "#ego-down :focus-visible{outline:2px solid #5b4cf0;outline-offset:2px;border-radius:6px}",
    "#ego-down .fine{font-size:14px;color:#6b6b7a}",
    "#ego-down .owner{margin-top:6px;color:#9b9ba8;font-size:12.5px;text-decoration:none}",
    "#ego-down .owner:hover{color:#4b3bde;text-decoration:underline;text-underline-offset:3px}",
    "@media (max-width:420px){#ego-down .clock{gap:8px}#ego-down .unit{min-width:0;flex:1}#ego-down p{font-size:16px}}",
    "@media (prefers-reduced-motion:reduce){#ego-down .eyebrow i{animation:none}}",
  ].join('');
  (document.head || root).appendChild(css);

  var DISCORD_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.85a.07.07 0 0 0-.08.04c-.21.38-.44.86-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1 0 .13 12.3 12.3 0 0 1-1.88.89.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"/></svg>';
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
    el.innerHTML = '<div class="in">' +
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
