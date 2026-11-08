/* Ego Tweaks — light / dark mode (THEME.md). The saved choice is applied before first paint by the small inline
 * script in each page's <head>; this file adds the toggle: a sun ↔ moon morph and a circular View-Transition wipe
 * from the button, with the old view zooming back and blurring. Used by index.html, privacy.html, terms.html and
 * the countdown cover. Any element with data-act="mode" toggles. Website default = dark. */
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'ego-mode';
  var EASE = 'cubic-bezier(.76,0,.24,1)', DURATION = 750;
  var current = function () { return root.dataset.mode === 'light' ? 'light' : 'dark'; };
  var reduced = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };

  function sync() {
    var next = current() === 'dark' ? 'light' : 'dark';
    var label = 'Switch to ' + next + ' mode';
    var btns = document.querySelectorAll('[data-act="mode"]');
    for (var i = 0; i < btns.length; i++) { btns[i].setAttribute('aria-label', label); btns[i].setAttribute('title', label); }
  }
  function apply(next) {
    root.dataset.mode = next;
    root.style.colorScheme = next;
    try { localStorage.setItem(KEY, next); } catch (_) { /* storage blocked: the mode still applies for this page */ }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#0a0a0f' : '#ffffff');
    sync();
    try { window.dispatchEvent(new CustomEvent('ego-mode', { detail: next })); } catch (_) { /* old browser */ }
  }
  function set(next, fromEl) {
    if (next !== 'light' && next !== 'dark') return;
    if (next === current()) { apply(next); return; }
    if (!document.startViewTransition || reduced()) { apply(next); return; }
    var r = fromEl && fromEl.getBoundingClientRect ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: 0, width: 0, height: 0 };
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('mode-switching');
    var t;
    try { t = document.startViewTransition(function () { apply(next); }); } catch (_) { root.classList.remove('mode-switching'); apply(next); return; }
    t.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'],
          filter: ['brightness(1.6) saturate(1.3)', 'brightness(1) saturate(1)'] },
        { duration: DURATION, easing: EASE, pseudoElement: '::view-transition-new(root)' });
      root.animate(
        { transform: ['scale(1)', 'scale(.94)'], filter: ['blur(0px)', 'blur(6px)'], opacity: [1, 0.35] },
        { duration: DURATION, easing: EASE, pseudoElement: '::view-transition-old(root)' });
    }).catch(function () { /* transition skipped: the mode is already applied */ });
    t.finished.catch(function () {}).then(function () { root.classList.remove('mode-switching'); });
  }
  function toggle(fromEl) { set(current() === 'dark' ? 'light' : 'dark', fromEl); }
  // The icon (sun ↔ moon morph). uid keeps the mask id unique when several buttons are on one page.
  function icon(uid) {
    var id = 'mode-moon-' + (uid || 'x');
    return '<svg class="mode-ic" viewBox="0 0 24 24" aria-hidden="true"><mask id="' + id + '"><rect width="24" height="24" fill="#fff"/><circle class="mode-cut" cx="24" cy="4" r="8" fill="#000"/></mask>' +
      '<circle class="mode-core" cx="12" cy="12" r="5" mask="url(#' + id + ')" fill="currentColor" stroke="none"/>' +
      '<g class="mode-rays" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1.5v2M12 20.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M1.5 12h2M20.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></g></svg>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-act="mode"]');
    if (!b) return;
    e.preventDefault();
    toggle(b);
  });
  window.EgoMode = { current: current, set: set, toggle: toggle, icon: icon, sync: sync };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();
