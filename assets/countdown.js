// "Update dropping" countdown: until DROP the site shows only this page, then reloads into the normal site by itself
// (no redeploy needed). It runs in <head> before anything draws, so the real site never flashes first.
// Gets through anyway: the owner's admin page (#/admin) and a preview link (egotweaks.com/?preview), which lasts for
// that browser tab. Downloads, the bot, Discord sign-in and the apps keep working: only this page is covered.
(function () {
  var DROP = Date.parse('2026-11-08T18:00:00Z'); // Sunday 11/8/2026, 1:00 PM EST (UTC-5)
  var DROP_TEXT = 'Sunday, Nov 8 · 1:00 PM EST';
  var DISCORD = 'https://discord.gg/gtPggZ9zpz';
  if (!(Date.now() < DROP)) return;
  try {
    if (/[?&]preview\b/.test(location.search)) sessionStorage.setItem('ego-preview', '1');
    if (sessionStorage.getItem('ego-preview') === '1') return;
  } catch (_) {}
  if (/^#\/admin/.test(location.hash)) return;

  var root = document.documentElement;
  root.classList.add('ego-down');
  var css = document.createElement('style');
  css.textContent = [
    "@font-face{font-family:'EgoDisplay';src:url(assets/fonts/unbounded-latin-900-normal.woff2) format('woff2');font-weight:900;font-display:swap}",
    "@font-face{font-family:'EgoDisplay';src:url(assets/fonts/unbounded-latin-700-normal.woff2) format('woff2');font-weight:700;font-display:swap}",
    "@font-face{font-family:'EgoBody';src:url(assets/fonts/geist-latin-wght-normal.woff2) format('woff2-variations');font-weight:100 900;font-display:swap}",
    "@font-face{font-family:'EgoMono';src:url(assets/fonts/jetbrains-mono-latin-700-normal.woff2) format('woff2');font-weight:700;font-display:swap}",
    "html.ego-down,html.ego-down body{overflow:hidden!important;background:#08080a}",
    "html.ego-down body>*:not(#ego-down){display:none!important}",
    "#ego-down{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px 16px;overflow:auto;color:#fff;font:400 16px/1.55 EgoBody,'Segoe UI',system-ui,sans-serif;text-align:center;",
    "background:radial-gradient(900px 520px at 50% 115%,rgba(255,45,61,.28),transparent 65%),radial-gradient(700px 360px at 50% -10%,rgba(255,45,61,.10),transparent 60%),#08080a}",
    "#ego-down::before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px) 0 0/48px 48px,linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px) 0 0/48px 48px;-webkit-mask:radial-gradient(closest-side,#000,transparent);mask:radial-gradient(closest-side,#000,transparent)}",
    "#ego-down .in{position:relative;display:grid;justify-items:center;gap:22px;max-width:760px;width:100%}",
    "#ego-down .logo{font:900 22px/1 EgoDisplay,'Segoe UI',sans-serif;letter-spacing:.04em}#ego-down .logo span{color:#ff2d3d}",
    "#ego-down .eyebrow{display:inline-flex;align-items:center;gap:9px;padding:7px 13px;border:1px solid rgba(255,45,61,.45);border-radius:99px;background:rgba(255,45,61,.12);color:#ff8b94;font:700 11px/1 EgoMono,Consolas,monospace;letter-spacing:.18em;text-transform:uppercase}",
    "#ego-down .eyebrow i{width:7px;height:7px;border-radius:50%;background:#ff2d3d;box-shadow:0 0 10px #ff2d3d;animation:egoPulse 1.4s ease-in-out infinite}",
    "@keyframes egoPulse{50%{opacity:.35}}",
    "#ego-down h1{margin:0;font:900 clamp(30px,6vw,58px)/1.05 EgoDisplay,'Segoe UI',sans-serif;letter-spacing:-.01em}",
    "#ego-down p{margin:0;max-width:52ch;color:rgba(255,255,255,.62)}",
    "#ego-down .clock{display:flex;gap:clamp(8px,2vw,16px);margin-top:6px}",
    "#ego-down .unit{display:grid;gap:8px;min-width:clamp(68px,17vw,120px);padding:clamp(14px,3vw,22px) 8px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(16,16,20,.85)}",
    "#ego-down .unit b{font:900 clamp(32px,8vw,64px)/1 EgoDisplay,'Segoe UI',sans-serif;font-variant-numeric:tabular-nums;text-shadow:0 0 34px rgba(255,45,61,.55)}",
    "#ego-down .unit small{color:rgba(255,255,255,.45);font:700 10.5px/1 EgoMono,Consolas,monospace;letter-spacing:.16em;text-transform:uppercase}",
    "#ego-down .when{color:#fff;font-weight:600}#ego-down .local{color:rgba(255,255,255,.45);font-size:13.5px}",
    "#ego-down .btn{display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 24px;border-radius:13px;background:#5865f2;color:#fff;font-weight:700;text-decoration:none;box-shadow:0 10px 30px -12px #5865f2}",
    "#ego-down .btn:hover{background:#6d78f5}",
    "#ego-down .fine{font-size:13px;color:rgba(255,255,255,.4)}",
    "@media (prefers-reduced-motion:reduce){#ego-down .eyebrow i{animation:none}}",
  ].join('');
  (document.head || root).appendChild(css);

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function localWhen() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === 'America/New_York' || tz === 'America/Detroit' || tz === 'America/Toronto') return '';
      return 'That’s ' + new Date(DROP).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) + ' where you are.';
    } catch (_) { return ''; }
  }
  function show() {
    if (document.getElementById('ego-down')) return;
    var el = document.createElement('div');
    el.id = 'ego-down';
    el.setAttribute('role', 'main');
    el.innerHTML = '<div class="in">' +
      '<div class="logo">EGO <span>TWEAKS</span></div>' +
      '<span class="eyebrow"><i></i>Update incoming</span>' +
      '<h1>The next update drops soon.</h1>' +
      '<p>We’re getting the site ready for it. Everything comes back, with the update, when the timer hits zero.</p>' +
      '<div class="clock" aria-live="off">' +
      '<div class="unit"><b data-u="h">00</b><small>Hours</small></div>' +
      '<div class="unit"><b data-u="m">00</b><small>Minutes</small></div>' +
      '<div class="unit"><b data-u="s">00</b><small>Seconds</small></div></div>' +
      '<div><div class="when">' + DROP_TEXT + '</div><div class="local">' + localWhen() + '</div></div>' +
      '<a class="btn" href="' + DISCORD + '" target="_blank" rel="noopener">Join the Discord for the drop</a>' +
      '<p class="fine">Already have Ego Tweaks or Ego for Roblox? The apps keep working while the site is down.</p>' +
      '</div>';
    document.body.appendChild(el);
    tick();
  }
  function tick() {
    var left = DROP - Date.now();
    if (left <= 0) { location.reload(); return; }
    var s = Math.floor(left / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    var el = document.getElementById('ego-down');
    if (el) {
      el.querySelector('[data-u="h"]').textContent = pad(h);
      el.querySelector('[data-u="m"]').textContent = pad(m);
      el.querySelector('[data-u="s"]').textContent = pad(s % 60);
    }
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
