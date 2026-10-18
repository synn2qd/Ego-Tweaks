/* Ego Tweaks - motion engine (v4): ticker, Lenis, curtain, WebGL gauge, scroll scenes (SPEC 6-8).
   Never throws or logs an error; degrades (no-gl: SVG gauge, fx-off: static). */
(function () {
	'use strict';
	const W = window, D = document, H = D.documentElement, { min, max, abs, floor, ceil, round, pow, PI } = Math;
	const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
	const cl = (t, s) => (t && t.closest ? t.closest(s) : null), rect = (el) => el.getBoundingClientRect(), now = () => performance.now(), f4 = (v) => v.toFixed(4);
	const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
	const ss = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }; // e(a,b)
	const kf = (k, dt) => 1 - pow(1 - k, dt / 16.667); // frame-rate independent lerp
	const warned = {}, warn = (e, w) => warned[w] || ((warned[w] = 1), console.warn('[EgoFX] ' + w, e));
	const safe = (fn, w) => { try { return fn(); } catch (e) { warn(e, w); } };
	const on = (t, ev, fn, o) => t && t.addEventListener(ev, fn, o), PV = { passive: true };
	const B3 = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
	const SNAP = (x) => { let lo = 0, hi = 1, t = clamp(x, 0, 1); for (let i = 0; i < 18 && x > 0 && x < 1; i++) { t = (lo + hi) / 2; B3(t, 0.7, 0.2) < x ? (lo = t) : (hi = t); } return B3(t, 0, 1); };
	const OEXPO = (t) => (t >= 1 ? 1 : 1 - pow(2, -10 * t));
	const mq = (q) => W.matchMedia && W.matchMedia(q);
	const tog = (el, c, v) => { if (el && el.classList.contains(c) !== !!v) el.classList.toggle(c, !!v); };
	const memo = (el, k, v) => { const m = el.__fx || (el.__fx = {}); return m[k] !== v && ((m[k] = v), true); };
	const setV = (el, k, v) => el && memo(el, k, v) && el.style.setProperty(k, v);
	const setS = (el, p, v) => el && memo(el, p, v) && (el.style[p] = v);
	const clearS = (el, ...ps) => { if (el) { ps.forEach((p) => (p[0] === '-' ? el.style.removeProperty(p) : (el.style[p] = ''))); el.__fx = null; } };

	// modes (6.1)
	const MQ_CINE = mq('(min-width: 900px) and (hover: hover) and (pointer: fine)'), MQ_PHONE = mq('(max-width: 760px)');
	let OFF = !!(mq('(prefers-reduced-motion: reduce)') || {}).matches;
	try { OFF = OFF || localStorage.getItem('ego-motion') === 'off'; } catch (_) {}
	let mode = OFF ? 'off' : MQ_CINE && MQ_CINE.matches ? 'cine' : 'lite';
	const setModeClasses = () => { H.classList.remove('fx-cine', 'fx-lite', 'fx-off'); H.classList.add('fx', 'fx-' + mode); };
	setModeClasses();
	if (OFF) H.classList.add('no-gl');
	if (!$('#fx-runtime')) { // Lenis rules (8.2)
		const s = (D.head || H).appendChild(D.createElement('style'));
		s.id = 'fx-runtime';
		s.textContent = 'html.lenis,html.lenis body{height:auto}.lenis.lenis-smooth{scroll-behavior:auto!important}.lenis.lenis-stopped{overflow:hidden}';
	}

	// ticker (8.1): workers return true while busy; sleeps after 10 idle frames
	const core = [], extra = new Set();
	let raf = 0, last = 0, idle = 0, frames = 0, lclock = 0, lenis = null;
	function wake() { if (!raf && !D.hidden) { idle = 0; raf = requestAnimationFrame(frame); } }
	function frame(t) {
		const dt = last ? clamp(t - last, 0, 64) : 16.667;
		let busy = false;
		raf = 0;
		if (D.hidden) return void (last = 0);
		last = t; frames++;
		if (lenis) { lclock += dt; try { lenis.raf(lclock); busy = !!lenis.isScrolling; } catch (e) { warn(e, 'lenis'); } }
		core.forEach((f) => { try { if (f(dt)) busy = true; } catch (e) { warn(e, f.name); } });
		extra.forEach((f) => { let r; try { r = f(); } catch (e) { warn(e, 'tween'); } r ? (busy = true) : extra.delete(f); });
		idle = busy ? 0 : idle + 1;
		if (idle < 10) raf = requestAnimationFrame(frame); else last = 0;
	}

	// Lenis (8.2)
	function setLenis() {
		if (mode !== 'cine') return void (lenis && safe(() => lenis.destroy(), 'lenis'), (lenis = null)); // destroy() drops its classes
		if (!lenis && W.Lenis) safe(() => {
			lenis = new W.Lenis({ autoRaf: false, lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, syncTouch: false, anchors: false, allowNestedScroll: true,
				prevent: (n) => !!cl(n, '#modal, #menu, .boot, [data-lenis-prevent]') });
			lclock = 0; syncLock();
		}, 'lenis');
	}

	// lock/unlock (7)
	const reasons = new Set(), reason = (r) => String(r == null ? 'app' : r);
	const bodyHas = (c) => !!(D.body && D.body.classList.contains(c)), menuOpen = () => { const m = $('#menu'); return !!(m && !m.hidden); };
	const hardLock = () => bodyHas('booting') || bodyHas('modal-open') || !!(D.body && D.body.style.overflow === 'hidden');
	function syncLock() {
		const stop = reasons.size > 0 || hardLock();
		tog(H, 'fx-locked', reasons.size > 0);
		if (stop || menuOpen()) lockRelease();
		if (lenis) safe(() => (stop ? lenis.stop() : lenis.start()), 'lenis');
		dockEval(); wake();
	}

	// scrollTo / top (7)
	function scrollTo(target, o) {
		o = o || {};
		const off = +o.offset || 0, imm = !!o.immediate, dur = o.duration == null ? 1.1 : +o.duration, num = typeof target === 'number';
		return new Promise((res) => {
			let done = 0;
			const fin = () => done++ || res();
			try {
				const el = num ? null : typeof target === 'string' ? $(target) : target, inst = imm || mode === 'off';
				wake();
				if (!el && !num) return fin();
				if (lenis) {
					lenis.resize();
					lenis.scrollTo(el || target, { offset: off, immediate: imm, duration: dur, force: true, lock: false, onComplete: fin });
					return void setTimeout(fin, imm ? 60 : dur * 1000 + 500);
				}
				W.scrollTo({ top: max(0, el ? rect(el).top + W.scrollY + off : target + off), behavior: inst ? 'instant' : 'smooth' });
				if (inst) return void requestAnimationFrame(fin);
				on(W, 'scrollend', fin, { once: true }); setTimeout(fin, 900);
			} catch (e) { warn(e, 'scrollTo'); fin(); }
		});
	}
	function top() {
		if (lenis) safe(() => lenis.scrollTo(0, { immediate: true, force: true }), 'lenis');
		W.scrollTo({ top: 0, left: 0, behavior: 'instant' }); wake();
	}

	// curtain (8.4)
	let curtainBusy = false;
	const outQueue = [], runOut = () => outQueue.splice(0).forEach((f) => safe(f, 'out'));
	const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/';
	function scramble(el, text, ms) {
		const t0 = now();
		if (el) extra.add(() => {
			const p = clamp((now() - t0) / ms, 0, 1), n = floor(p * text.length);
			let s = text.slice(0, n);
			for (let i = n; i < text.length; i++) s += text[i] === ' ' ? ' ' : CHARS[(Math.random() * CHARS.length) | 0];
			el.textContent = p < 1 ? s : text;
			return p < 1;
		});
		wake();
	}
	function transition(swapFn, label) {
		const c = $('#curtain'), cs = c && c.style, anims = [];
		const swap = () => { try { swapFn && swapFn(); } catch (e) { warn(e, 'swap'); } finally { safe(refresh, 'refresh'); } };
		if (mode === 'off' || curtainBusy || !c || !c.animate) return swap(), Promise.resolve();
		const A = (el, k, ms) => el && anims[anims.push(el.animate(k, { duration: ms, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' })) - 1];
		const wipe = (k, ms) => (A($('.curtain-line', c), [{ transform: 'translateY(100vh)' }, { transform: 'none' }], ms), A(c, k.map((v) => ({ clipPath: `inset(${v})` })), ms));
		curtainBusy = true;
		return new Promise((resolve) => {
			let swapped = 0, ended = 0;
			const doSwap = () => swapped++ || swap();
			const end = () => {
				if (ended++) return;
				clearTimeout(hard); doSwap(); runOut();
				anims.forEach((a) => a.cancel());
				cs.visibility = 'hidden'; cs.pointerEvents = 'none';
				tog(H, 'is-transitioning'); curtainBusy = false; wake(); resolve();
			};
			const hard = setTimeout(end, 3000);
			try {
				cs.visibility = 'visible'; cs.pointerEvents = 'auto'; tog(H, 'is-transitioning', 1);
				scramble($('#curtain-label'), '' + (label || ''), 420);
				wipe(['100% 0 0 0', '0 0 0 0'], 460).finished.then(() => ended || (setTimeout(() => {
					if (ended) return;
					cs.pointerEvents = 'none'; runOut();
					wipe(['0 0 0 0', '0 0 100% 0'], 640).finished.then(end, end); setTimeout(end, 650);
				}, 120), doSwap()), end);
			} catch (e) { warn(e, 'curtain'); end(); }
		});
	}

	// WebGL gauge (8.5), shader from ref/gauge-proto (R0V -> uR0)
	const FS = `precision highp float;
uniform vec2 uRes,uC,uM;uniform float uR,uR0,uHW,uOpen,uLit,uBase,uMix,uSweep,uHover,uFade,uDpr;
float h(float x){return fract(sin(x*91.345+7.13)*43758.5453);}
void main(){vec2 p=gl_FragCoord.xy/uDpr;p.y=uRes.y-p.y;vec2 d=(p-uC)/uR;float P=3.14159265,r=length(d),a=atan(d.x,-d.y),
span=mix(2.*P,1.5*P,uOpen),st=-span*.5,i=clamp(floor((a-st)/span*86.+.5),0.,86.),ta=st+i/86.*span,da=(a-ta)*r;
vec2 md=(uM-uC)/uR;float ma=atan(md.x,-md.y),mf=abs(mod(ta-ma+P,2.*P)-P),lift=uHover*pow(max(0.,1.-mf/.38),2.)*.07;
float sd=max(abs(da)-uHW,max(uR0-r,r-1.-lift)),px=1./uR,tick=1.-smoothstep(-px*.2,px*1.2,sd),glow=exp(-max(sd,0.)*uR*.09)*.22;
float hb=h(i),app=hb>.62?1.:(hb>.25?.42:.13),b=mix((.16+.84*step(i/86.,uLit-.0001))*uBase,app,uMix);
float sw=exp(-max(uSweep-ta,0.)*2.6)*step(ta,uSweep+.02)*step(uSweep-1.6,ta);b=min(1.,b+sw*.7+lift*6.);
float ring=(1.-smoothstep(0.,px*1.2,abs(r-.715)-px*.5))*.22*step(abs(a),span*.5+.002);
float c=(tick*b+glow*b*1.2+ring)*uFade;gl_FragColor=vec4(vec3(c),c);}`;
	const UN = 'uC* uR uR0 uHW uOpen uLit uBase uMix uSweep uM* uHover uFade uRes* uDpr'.split(' '); // * = vec2
	let G = null, glFrames = 0, glQuality = 'high', intro = null, sweepT0 = 0, sweepTimer = 0;
	const gs = { mx: -1e4, my: -1e4, hover: 0 }, ptr = { x: -1e4, y: -1e4, inHero: false };
	const loseGL = (cv, gl) => safe(() => { cv.__fxDead = 1; const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); }, 'gl');
	const glFail = () => { tog(H, 'has-gl'); tog(H, 'no-gl', 1); };
	function glMake(cv) {
		let gl = null;
		try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (_) {}
		if (!gl) return null;
		const pr = gl.createProgram(), U = {}, sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); gl.attachShader(pr, o); return gl.getShaderParameter(o, gl.COMPILE_STATUS); };
		const ok = sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}') & sh(gl.FRAGMENT_SHADER, FS);
		gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
		if (!ok || !gl.getProgramParameter(pr, gl.LINK_STATUS)) return loseGL(cv, gl), null;
		gl.useProgram(pr);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		UN.forEach((n) => (U[n] = gl.getUniformLocation(pr, n.replace('*', ''))));
		let rd = gl.getParameter(gl.RENDERER) || '', x = /^webkit/i.test(rd) && gl.getExtension('WEBGL_debug_renderer_info');
		if (x) rd = gl.getParameter(x.UNMASKED_RENDERER_WEBGL) || '';
		return { gl, U, soft: /swiftshader|llvmpipe|software|basic render/i.test(rd) }; // software GL: read back per frame
	}
	function glStart(cv) {
		if (mode === 'off' || (G && G.cv === cv)) return;
		glStop();
		cv.__fxDead = 0;
		const g = glMake(cv);
		if (!g) return glFail();
		G = Object.assign(g, { cv, dpr: 1, s: 1, cw: 0, ch: 0, last: '', ok: 0, drew: 0, n: 0, sum: 0, lastFade: -1 });
		if (g.soft) glQuality = 'low';
		if (!cv.__fxL) {
			cv.__fxL = 1;
			on(cv, 'webglcontextlost', (e) => { if (cv.__fxDead) return; e.preventDefault(); if (G && G.cv === cv) G = null; glFail(); });
			on(cv, 'webglcontextrestored', () => { if (!cv.__fxDead && cv.isConnected && page === 'home') { tog(H, 'no-gl'); glStart(cv); wake(); } });
		}
		glSize();
	}
	function glStop() {
		clearTimeout(sweepTimer); sweepT0 = 0; intro = null;
		if (G) { loseGL(G.cv, G.gl); G = null; tog(H, 'has-gl'); }
	}
	function glSize() {
		if (!G) return;
		const cv = G.cv, cw = cv.clientWidth, ch = cv.clientHeight, dpr = G.soft ? 0.5 : glQuality === 'low' ? 0.75 : min(W.devicePixelRatio || 1, 1.5);
		const w = max(1, round(cw * dpr)), h = max(1, round(ch * dpr));
		if (cv.width !== w) cv.width = w;
		if (cv.height !== h) cv.height = h;
		Object.assign(G, { cw, ch, dpr, s: cw ? w / cw : dpr, last: '' });
		G.gl.viewport(0, 0, w, h);
	}
	function heroGeo() { // lite canvas: 100vw x 58svh
		const cw = G.cw, ch = G.ch, v = ch / 0.58;
		return mode === 'cine' ? { x: cw / 2, y: ch * 0.54, R: min(ch * 0.62, cw * 0.42) } : { x: cw / 2, y: v * 0.27, R: min(cw * 0.4, v * 0.21) };
	}
	const startSweep = () => { if (G && glQuality !== 'low') { sweepT0 = now(); wake(); } };
	const startShort = () => { intro = { kind: 'short', t0: now() }; wake(); };
	function scheduleSweep() {
		clearTimeout(sweepTimer);
		if (G && glQuality !== 'low') sweepTimer = setTimeout(() => { if (hero && hero.vis && !D.hidden && !intro && hero.sp <= 0.3) startSweep(); scheduleSweep(); }, 5500);
	}
	// intro, scroll (B' track, C fade), sweep, hover; draws on change
	function glTick(dt, force) {
		if (!G || D.hidden || !hero || !(force || hero.vis) || (intro && intro.kind === 'wait') || !G.cw || !G.ch) return false;
		if (G.drew && !force && !(G.drew = 0) && glQuality === 'high' && G.n < 60 && ((G.sum += dt), ++G.n === 60) && G.sum > 1320) {
			glQuality = 'low'; sweepT0 = 0; clearTimeout(sweepTimer); glSize(); // first 60 drawn frames averaged > 22ms
		}
		const cine = mode === 'cine', h = heroGeo(), hw = max(1.3 / h.R, 0.0033), sp = cine ? hero.sp : 0, e = intro ? now() - intro.t0 : 0;
		let anim = !!intro, m = 0, x = h.x, y = h.y, R = h.R, r0 = 0.83, w = hw, open = 1, base = 0.34, mix = 0, fade = 1, sweep = -9;
		if (intro && intro.kind === 'boot') {
			const b = intro.from, pO = SNAP((e - 400) / 1100), pP = OEXPO(clamp((e - 400) / 1400, 0, 1));
			open = pO; x = lerp(b.x, h.x, pP); y = lerp(b.y, h.y, pP); R = lerp(b.R, h.R, pP);
			r0 = lerp(0.939, 0.83, pO); w = lerp(0.77 / b.R, hw, pO); base = lerp(1, 0.34, SNAP((e - 800) / 900));
			if (e >= 1600 && !intro.swept) { intro.swept = 1; startSweep(); }
		} else if (intro) { fade = OEXPO(clamp(e / 900, 0, 1)); R *= lerp(0.85, 1, fade); }
		if (intro && e >= (intro.kind === 'boot' ? 1800 : 900)) { intro = null; scheduleSweep(); }
		if (cine && hero.dial && sp > 0.3) {
			const d = hero.dialNow();
			m = ss(0.3, 0.62, sp);
			x = lerp(x, d.x, m); y = lerp(y, d.y, m); R = lerp(R, d.R, m);
			r0 = lerp(r0, hero.dial[3] || 0.783, m); w = lerp(w, 0.0085, m); mix = m; base = lerp(base, 1, m);
			fade *= 1 - ss(0.62, 0.72, sp);
		}
		if (sweepT0) {
			const p = (now() - sweepT0) / 2200, st = -lerp(PI, 0.75 * PI, open);
			if (p >= 1 || sp > 0.3) sweepT0 = 0; else { sweep = lerp(st - 0.2, -st + 0.2, SNAP(p)); anim = true; }
		}
		const ht = cine && ptr.inHero && sp <= 0.3 ? 1 : 0;
		if (gs.hover < 0.01 && ht) { gs.mx = ptr.x; gs.my = ptr.y; }
		gs.mx += (ptr.x - gs.mx) * kf(0.12, dt); gs.my += (ptr.y - gs.my) * kf(0.12, dt);
		gs.hover = abs(ht - gs.hover) < 0.002 ? ht : gs.hover + (ht - gs.hover) * kf(0.08, dt);
		if (gs.hover > 0 && (gs.hover !== ht || abs(ptr.x - gs.mx) + abs(ptr.y - gs.my) > 0.5)) anim = true;
		if (mode === 'lite' && frames & 1 && !force) return true;
		const u = [x, y, R, r0, w, open, 1, base, mix, sweep, gs.mx, gs.my, gs.hover * (1 - m), fade], key = u.map((v) => v.toFixed(3)).join();
		if (force || (key !== G.last && (fade > 0.001 || G.lastFade > 0.001))) glDraw(u);
		G.last = key;
		return anim;
	}
	function glDraw(u) {
		const { gl, U, cv, s } = G, [x, y, R] = u, e = 1.25 * R, fade = u[13], W0 = cv.width, H0 = cv.height;
		let i = 0;
		try {
			u.push(W0 / s, H0 / s, s);
			UN.forEach((n) => (n.endsWith('*') ? gl.uniform2f(U[n], u[i++], u[i++]) : gl.uniform1f(U[n], u[i++])));
			const X0 = clamp(floor((x - e) * s), 0, W0), X1 = clamp(ceil((x + e) * s), 0, W0), Y0 = clamp(floor((G.ch - y - e) * s), 0, H0), Y1 = clamp(ceil((G.ch - y + e) * s), 0, H0);
			if (X1 <= X0 || Y1 <= Y0 || fade <= 0.001 || R < 1) { gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT); }
			else { gl.enable(gl.SCISSOR_TEST); gl.scissor(X0, Y0, X1 - X0, Y1 - Y0); gl.drawArrays(gl.TRIANGLES, 0, 3); }
			G.lastFade = fade; G.drew = 1; glFrames++;
			if (!G.ok++) { tog(H, 'no-gl'); tog(H, 'has-gl', 1); }
		} catch (err) { warn(err, 'gl'); glStop(); glFail(); }
	}
	on(D, 'ego:booted', () => safe(() => { // 8.6 handoff, before #boot gets .out
		if (page !== 'home' || !view || !$('[data-scene=hero]', view)) return;
		tog($('#boot'), 'handoff', true);
		if (!G || !hero) return;
		glSize();
		const r = rect(G.cv), vh = W.innerHeight;
		intro = { kind: 'boot', t0: now(), from: { x: H.clientWidth / 2 - r.left, y: 0.41 * vh - r.top, R: (min(0.56 * vh, 460, 0.86 * W.innerWidth) / 2) * 0.873 } };
		glTick(16.667, true); wake();
	}, 'handoff'));

	// scenes
	let view = null, page = '', gen = 0, scenes = [], bound = [], hero = null, scanS = null, filmS = null, tilts = [], marqs = [];
	let timers = [], ios = [], dockS = null, sceneIO = null, vh = W.innerHeight, lastY = -1, vel = 0, forceAll = true;
	const IO = (cb, o) => { const io = new IntersectionObserver(cb, o); ios.push(io); return io; };
	const later = (fn, ms) => { const id = setTimeout(() => safe(fn, 'timer'), ms); timers.push(id); return id; };
	const pinSp = (s, y) => clamp((y - s.top) / max(1, s.h - vh), 0, 1);
	const measure = (s, el) => { const r = rect(el || s.root); s.top = r.top + W.scrollY; s.h = r.height; };
	const writeSp = (s, sp) => (abs(sp - (s.lsp == null ? -1 : s.lsp)) > 0.0005 || ((sp === 0 || sp === 1) && sp !== s.lsp)) && setV(s.root, '--sp', f4((s.lsp = sp)));
	const tourEv = (id) => id && D.dispatchEvent(new CustomEvent('ego:tour', { detail: { id } }));
	const cine = () => mode === 'cine', wc = (el, a) => setS(el, 'willChange', a && cine() ? 'transform' : '');

	function bindHero(root) { // 8.6
		const pin = $('[data-pin]', root) || root, win = $('#stage', root), img = $('img[data-dial]', root), cv = $('#hero-gl', root);
		const dv = img ? (img.dataset.dial || '').trim().split(/\s+/).map(Number) : [];
		const s = (hero = { root, sp: 0, vis: true, dial: dv.length > 2 && dv.every(isFinite) ? dv : null, sc: 1, ty: 0 });
		s.measure = () => { // untransformed boxes, relative to the canvas
			measure(s);
			if (!win) return;
			const tr = win.style.transform, box = (el) => ((win.style.transform = 'none'), rect(el));
			const wr = box(win), pr = box(pin), ir = box(img || win), cr = box(cv || pin), o = getComputedStyle(win).transformOrigin.split(' ').map(parseFloat);
			win.style.transform = tr;
			s.ty0 = 0.9 * vh - (wr.top - pr.top);
			s.ox = wr.left - cr.left + (o[0] >= 0 ? o[0] : wr.width / 2); s.oy = wr.top - cr.top + (o[1] >= 0 ? o[1] : wr.height / 2);
			s.iL = ir.left - cr.left; s.iT = ir.top - cr.top; s.iW = ir.width; s.iH = ir.height;
		};
		s.dialNow = () => {
			const d = s.dial, px = s.iL + d[0] * s.iW, py = s.iT + d[1] * s.iH;
			return { x: s.ox + (px - s.ox) * s.sc, y: s.oy + s.ty + (py - s.oy) * s.sc, R: d[2] * s.iW * s.sc };
		};
		s.update = (y) => {
			if (!cine()) return;
			const sp = (s.sp = pinSp(s, y)), prev = s.prev == null ? sp : s.prev, w = ss(0.18, 0.45, sp);
			s.prev = sp; writeSp(s, sp);
			const hx = ss(0, 0.3, sp);
			setV(root, '--hx', f4(hx)); setV(root, '--hd', f4(ss(0.72, 1, sp)));
			tog(root, 'is-past', hx > 0.9999); // hides the faded copy where @container style() isn't supported
			s.sc = 0.9 + 0.1 * w; s.ty = (1 - w) * (s.ty0 || 0);
			setS(win, 'transform', w > 0.9999 ? 'none' : `translate3d(0,${s.ty.toFixed(1)}px,0) scale(${f4(s.sc)}) rotateX(${((1 - w) * 12).toFixed(2)}deg)`);
			setS(img, 'opacity', ss(0.5, 0.66, sp).toFixed(3));
			if (sp >= 0.72 || sp < 0.7) tog(win, 'is-flat', sp >= 0.72);
			if (prev < 0.66 && sp >= 0.66) { tog(win, 'cut', 1); clearTimeout(s.cutT); s.cutT = later(() => tog(win, 'cut'), 900); }
		};
		s.active = (a) => wc(win, a);
		s.destroy = () => { if (win && win.isConnected) { clearS(win, 'transform', 'willChange'); tog(win, 'cut'); tog(win, 'is-flat'); } clearS(img, 'opacity'); clearS(root, '--sp', '--hx', '--hd'); tog(root, 'is-past'); };
		IO((es) => es.forEach((e) => { s.vis = e.isIntersecting; if (G) G.last = ''; wake(); })).observe(root);
		if (mode === 'lite' && win) IO((es) => es.forEach((e) => e.intersectionRatio >= 0.89 && tog(win, 'is-flat', 1)), { threshold: 0.9 }).observe(win);
		if (cv) glStart(cv);
		return s;
	}

	function bindScan(root) { // 8.7
		const chs = $$('.scan-ch', root), labels = $$('text[data-c]', root), rail = $$('[data-scan]', root), cats = [];
		$$('.g-ticks line[data-c]', root).forEach((l, i) => { // grouped in catalog order
			let c = cats[cats.length - 1];
			if (!c || c.id !== l.dataset.c) cats.push((c = { id: l.dataset.c, first: i, k: cats.length, n: 0, t: [] }));
			c.t.push(l); c.n++; l.__s = l.dataset.s || '';
		});
		const nk = chs.length || cats.length || 6, s = (scanS = { root, chs, k: -1 });
		const paint = (k, f) => cats.forEach((c) => c.t.forEach((l, j) => {
			const v = c.k < k ? 'done' : c.k === k && j / c.n < f ? 'on' : '';
			if (l.__s !== v) (l.__s = v) ? (l.dataset.s = v) : delete l.dataset.s;
		}));
		const setK = (k, instant) => {
			if ((k = clamp(k, 0, nk - 1)) === s.k) return false;
			const prev = s.k, c = cats[k], ch = chs[k], n = $('.scan-n', root), unit = $('.scan-unit', root);
			s.k = root.dataset.k = k;
			if (c) { setV(root, '--needle', (-135 + ((c.first + (c.n - 1) / 2) * 270) / 86).toFixed(1) + 'deg'); labels.forEach((t) => tog(t, 'on', t.dataset.c === c.id)); }
			if (ch && n) {
				const cnt = ch.dataset.n || (c ? '' + c.n : ''), old = n.lastElementChild, ni = D.createElement('i'), o = { duration: 520, easing: 'cubic-bezier(.19,1,.22,1)' };
				$$('i', n).slice(0, -1).forEach((i) => i.remove());
				if (!old || old.textContent !== cnt) {
					ni.textContent = cnt; n.appendChild(ni);
					if (!old || instant || !ni.animate) old && old.remove();
					else {
						old.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-100%)', opacity: 0 }], o).onfinish = () => old.remove();
						ni.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], o);
					}
				}
				if (unit && ch.dataset.name) unit.textContent = 'Tweaks · ' + ch.dataset.name;
			}
			clearTimeout(s.tA);
			chs.forEach((h, i) => {
				if (i === k || !h.classList.contains('is-active')) return;
				tog(h, 'is-active'); tog(h, 'is-leaving', !instant);
				if (!instant) later(() => tog(h, 'is-leaving'), 420);
			});
			const act = () => { tog(ch, 'is-leaving'); tog(ch, 'is-active', 1); };
			if (ch) instant || prev < 0 ? act() : (s.tA = later(act, 120));
			rail.forEach((b, i) => { tog(b, 'done', i < k); tog(b, 'on', i === k); });
			return true;
		};
		s.measure = () => measure(s);
		s.update = (y) => {
			if (!cine()) return;
			const sp = pinSp(s, y), k = min(nk - 1, floor(sp * nk)), q = clamp(sp * nk - k, 0, 1);
			writeSp(s, sp); setK(k); paint(k, q * 1.4); setV(rail[k], '--q', q.toFixed(3));
		};
		s.go = (i) => (cine() ? scrollTo(s.top + ((i + 0.35) / nk) * (s.h - vh)) : chs[i] && chs[i].scrollIntoView({ block: 'center', behavior: 'smooth' }));
		mode === 'lite' || setK(+root.dataset.k || 0, true);
		if (mode === 'lite') {
			const io = IO((es) => es.forEach((e) => {
				const k = chs.indexOf(e.target), t0 = now(), g = gen;
				if (!e.isIntersecting || !setK(k)) return;
				extra.delete(s.step);
				extra.add((s.step = () => { const f = (now() - t0) / 700; return g === gen && (paint(k, f), f < 1); }));
				wake();
			}), { rootMargin: '-70% 0px -29% 0px' });
			chs.forEach((h) => io.observe(h));
		}
		return s;
	}

	function bindFilm(root) { // 8.8
		const track = $('#tour-shots', root), tabs = $$('.tour-tab', root), fr = $$('.film-frame', root).map((el) => ({ el, img: $('.film-win img', el), c0: 0 }));
		if (!track || !fr.length) return null;
		const s = (filmS = { root, fr, tabs, dist: 0, lr: max(0, tabs.findIndex((b) => b.classList.contains('on'))) }), n1 = max(1, fr.length - 1);
		s.pre = () => { // --film-dist changes the page height: write it first
			if (!cine()) return;
			const tr = track.style.transform;
			track.style.transform = 'none';
			fr.forEach((f) => { const r = rect(f.el); f.c0 = r.left + r.width / 2; });
			track.style.transform = tr;
			setV(root, '--film-dist', round((s.dist = max(0, fr[fr.length - 1].c0 - fr[0].c0))) + 'px');
		};
		s.measure = () => measure(s);
		s.update = (y) => {
			if (!cine()) return;
			const sp = pinSp(s, y), tx = -sp * s.dist, vw = W.innerWidth, g = sp * n1, r = round(g);
			writeSp(s, sp);
			setS(track, 'transform', `translate3d(${tx.toFixed(1)}px,0,0)`);
			fr.forEach((f) => {
				const c = (f.c0 + tx - vw / 2) / vw;
				setS(f.el, 'transform', `scale(${f4(1 - min(abs(c), 1) * 0.1)})`);
				const cc = clamp(c, -1, 1); // zoom only off-centre, so the centred frame shows the whole screenshot
				setS(f.img, 'transform', `translateX(${(cc * -6).toFixed(2)}%) scale(${f4(1 + abs(cc) * 0.12)})`);
				tog(f.el, 'is-center', abs(c) < 0.25);
			});
			tabs.forEach((b, i) => setV(b, '--p', clamp(g - i + 1, 0, 1).toFixed(3)));
			if (r !== s.lr && (s.hold == null || r === s.hold)) { s.lr = r; tourEv(fr[r] && fr[r].el.dataset.frame); } // held during a tab click
		};
		s.go = (i) => (cine() ? ((s.hold = i), scrollTo(s.top + (i / n1) * (s.h - vh), { duration: 1.2 }).then(() => (s.hold = null))) : fr[i] && fr[i].el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }));
		s.active = (a) => wc(track, a);
		s.destroy = () => {
			if (!track.isConnected) return;
			clearS(track, 'transform', 'willChange'); clearS(root, '--sp', '--film-dist');
			fr.forEach((f) => { clearS(f.el, 'transform'); clearS(f.img, 'transform'); tog(f.el, 'is-center'); });
			tabs.forEach((b) => { b.__fx = null; b.style.setProperty('--p', b.classList.contains('on') ? 1 : 0); });
		};
		if (mode === 'lite') {
			const io = IO((es) => es.forEach((e) => e.intersectionRatio >= 0.59 && tourEv(e.target.dataset.frame)), { root: track, threshold: 0.6 });
			fr.forEach((f) => io.observe(f.el));
		}
		return s;
	}

	function bindRange(root, el, range, after) { // 8.9: range(s) = scrollY at sp 0 and 1
		const s = { root, el: el || root };
		s.measure = () => { measure(s, s.el); s.m && s.m(); };
		s.update = (y) => { const [a, b] = range(s), sp = clamp((y - a) / max(1, b - a), 0, 1); writeSp(s, sp); after && after(sp); };
		s.destroy = () => s.root && s.root.isConnected && clearS(s.root, '--sp');
		return s;
	}
	const bindHow = (root) => { const st = $$('.how-step', root); return bindRange(root, 0, (s) => [s.top - 0.8 * vh, s.top - 0.35 * vh], (sp) => st.forEach((e, i) => sp > i / 3 + 0.05 && tog(e, 'on', 1))); };
	function bindSteps(root) {
		const ol = $('ol', root), li = ol ? $$(':scope > li', ol) : [];
		let off = [];
		const s = ol && bindRange(root, ol, (s) => [s.top - 0.75 * vh, s.top + s.h - 0.55 * vh], (sp) => li.forEach((e, i) => tog(e, 'on', sp > off[i])));
		if (s) s.m = () => { const t = rect(ol); off = li.map((e) => (rect(e).top - t.top) / max(1, t.height)); };
		return s || null;
	}
	function bindCredits() { // re-queried: renderFooter replaces it
		const s = bindRange(0, 0, (s) => [s.top - vh, s.top + s.h - vh]), m = s.measure, u = s.update;
		const find = () => { const el = $('#foot .foot-mark'); if (el && el !== s.el) { s.el = s.root = el; s.lsp = null; sceneIO && sceneIO.observe(el); m(); } return el; };
		s.measure = () => find() && m();
		s.update = (y) => ((s.el && s.el.isConnected) || find()) && u(y);
		return find() ? s : null;
	}

	function bindScrub(p) { // 8.10
		if (!p.__fxSplit) {
			const t = p.textContent.replace(/\s+/g, ' ').trim();
			p.setAttribute('aria-label', t);
			p.innerHTML = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').split(' ').map((w) => `<span class="sw" aria-hidden="true">${w}</span>`).join(' ');
			p.__fxSplit = 1;
		}
		const words = $$('.sw', p), n = words.length, op = words.map(() => -1), s = { root: p };
		s.measure = () => { measure(s); s.c = s.top + s.h / 2; };
		s.update = (y) => {
			const pr = clamp((0.85 * vh - (s.c - y)) / (0.5 * vh), 0, 1);
			words.forEach((w, i) => {
				const o = 0.16 + 0.84 * clamp((pr * (n + 6) - i) / 6, 0, 1);
				if (abs(o - op[i]) > 0.01 || ((o === 1 || o === 0.16) && o !== op[i])) w.style.opacity = (op[i] = o).toFixed(3);
			});
		};
		s.destroy = () => p.isConnected && words.forEach((w) => (w.style.opacity = ''));
		return s;
	}

	function bindMarquee(root) { // 8.11
		const s = { root, rows: [] };
		$$('.marquee', root).forEach((el) => {
			const track = $('.marquee-track', el);
			if (track) { el.classList.add('js'); s.rows.push({ el, track, dir: +el.dataset.dir || -1, x: 0, half: 0, skew: 0, ds: 1, hf: 1 }); }
		});
		s.measure = () => s.rows.forEach((r) => (r.half = r.track.scrollWidth / 2));
		s.active = (a) => s.rows.forEach((r) => setS(r.track, 'willChange', a ? 'transform' : ''));
		s.destroy = () => s.rows.forEach((r) => r.el.isConnected && (clearS(r.track, 'transform', 'willChange'), tog(r.el, 'js')));
		marqs.push(s);
		return s;
	}
	function marqTick(dt) {
		let busy = false;
		marqs.forEach((s) => s.near && s.rows.forEach((r) => {
			busy = true;
			r.hf += ((r.hov && cine() ? 0 : 1) - r.hf) * kf(0.08, dt);
			r.ds += ((vel < -0.1 ? -1 : 1) - r.ds) * (1 - Math.exp(-dt / 100));
			r.x += (r.dir * r.ds * (36 * r.hf + clamp(abs(vel) * 1.6, 0, 600)) * dt) / 1000;
			if (r.half > 0) { r.x %= r.half; if (r.x > 0) r.x -= r.half; }
			r.skew = cine() ? r.skew + (clamp(-vel * 0.35, -6, 6) - r.skew) * kf(0.12, dt) : 0;
			setS(r.track, 'transform', `translate3d(${r.x.toFixed(2)}px,0,0) skewX(${r.skew.toFixed(2)}deg)`);
		}));
		return busy;
	}
	function tiltTick(dt) { // 8.12
		let busy = false;
		tilts.forEach((s) => {
			s.rx += (s.tx - s.rx) * kf(0.12, dt); s.ry += (s.ty - s.ry) * kf(0.12, dt);
			if (abs(s.tx - s.rx) + abs(s.ty - s.ry) < 0.01) { s.rx = s.tx; s.ry = s.ty; } else busy = true;
			setV(s.el, '--rx', s.rx.toFixed(2) + 'deg'); setV(s.el, '--ry', s.ry.toFixed(2) + 'deg');
		});
		return busy;
	}

	// lock brackets (8.13, cine)
	const LOCK_T = '.btn, .icon-btn, .pill, .nav-links button, .dl-card, .upsell, .plan, .tour-tab, .xp-cats button, .faq summary, .foot-in a, .foot-in button, .stage-legend li, .games .marquee-track span, .scan-rail button, .keycard, [data-lock]';
	const lk = { el: null, on: false, by: '', px: -99, py: -99 };
	const lockBox = (L, ...v) => ['--x', '--y', '--w', '--h'].forEach((k, i) => setV(L, k, v[i].toFixed(1) + 'px'));
	const lockPlace = (L, r) => { const p = r.width > 200 ? 8 : 5; lockBox(L, r.left - p, r.top - p, r.width + 2 * p, r.height + 2 * p); tog(L, 'big', r.width > 200); };
	function lockTo(el, by) {
		const L = $('#lock'), r = el && rect(el), ptr = by === 'ptr';
		if (!L || !el) return;
		if (!cine() || reasons.size || hardLock() || menuOpen() || cl(el, '#modal, #menu, .boot') || !(r.width || r.height)) return lockRelease();
		if (!lk.on) { // fly out of the cursor
			L.classList.add('jump');
			lockBox(L, (ptr ? lk.px : r.left + r.width / 2) - 12, (ptr ? lk.py : r.top + r.height / 2) - 12, 24, 24);
			void L.offsetWidth; L.classList.remove('jump');
		}
		Object.assign(lk, { el, by, on: true }); lockPlace(L, r); tog(L, 'on', 1); wake();
	}
	function lockRelease() { if (lk.on) { Object.assign(lk, { on: false, el: null, by: '' }); tog($('#lock'), 'on'); } }
	function lockFollow() {
		const L = $('#lock');
		if (lk.on) L && lk.el && lk.el.isConnected ? lockPlace(L, rect(lk.el)) : lockRelease();
	}

	// dock (8.14)
	const dockSet = (v) => { const d = $('#dock'); if (d) { tog(d, 'is-on', v); tog(D.body, 'dock-on', v); } };
	function dockEval() {
		const c = dockS && dockS.map.get(dockS.cta), block = dockS && [...dockS.map].some(([el, e]) => el !== dockS.cta && e.isIntersecting);
		dockSet(page === 'home' && !!(MQ_PHONE && MQ_PHONE.matches) && !!c && !c.isIntersecting && c.boundingClientRect.bottom < 0 && !block && !bodyHas('modal-open') && !menuOpen());
	}
	function bindDock() {
		const cta = page === 'home' && $('[data-scene=hero] .hero-cta', view);
		dockS = cta && $('#dock') ? { cta, map: new Map() } : null;
		if (!dockS) return dockSet(false), false;
		const io = IO((es) => { es.forEach((e) => dockS && dockS.map.set(e.target, e)); dockEval(); });
		[cta, $('#pricing', view), $('.finale', view), $('#foot')].forEach((el) => el && io.observe(el));
	}

	// live + lit (8.15)
	const liveSt = new Map();
	let liveIO = null;
	function bindLive() {
		liveIO = liveIO || new IntersectionObserver((es) => es.forEach((e) => { liveSt.set(e.target, e.isIntersecting); D.hidden || tog(e.target, 'is-live', e.isIntersecting); }), { rootMargin: '10% 0px' });
		liveIO.disconnect(); liveSt.clear();
		$$('[data-live]').forEach((el) => liveIO.observe(el));
	}
	function bindLit() { // lit once its top reaches 70%
		const io = IO((es, o) => es.forEach((e) => e.isIntersecting && (tog(e.target, 'is-lit', 1), o.unobserve(e.target))), { rootMargin: '0px 0px -30% 0px' });
		$$('.sec > .key-light', view).forEach((k) => io.observe(k.parentElement));
	}

	// per frame: cached geometry in; transforms/opacity/vars out
	function scrollWork() {
		const y = W.scrollY, f = forceAll;
		vel = lenis ? lenis.velocity || 0 : lastY < 0 ? 0 : y - lastY;
		if (y === lastY && !f) return;
		forceAll = false; lastY = y;
		tilts.forEach((s) => (s.rect = null));
		scenes.forEach((s) => s.update && (s.near || f) && safe(() => s.update(y), s.name));
	}
	core.push(scrollWork, glTick, marqTick, tiltTick, lockFollow);

	function refresh() {
		vh = W.innerHeight;
		['pre', 'measure'].forEach((k) => scenes.forEach((s) => s[k] && safe(s[k], s.name)));
		if (lenis) safe(() => lenis.resize(), 'lenis');
		glSize(); forceAll = true; wake();
	}
	let rT = 0;
	const refreshSoon = (ms) => { clearTimeout(rT); rT = setTimeout(() => safe(refresh, 'refresh'), ms); };

	function unbind() {
		ios.forEach((io) => io.disconnect()); timers.forEach(clearTimeout);
		scenes.forEach((s) => s.destroy && safe(s.destroy, s.name));
		tilts.forEach((s) => s.el.isConnected && clearS(s.el, '--rx', '--ry'));
		if (scanS) extra.delete(scanS.step);
		ios = []; timers = []; scenes = []; bound = []; tilts = []; marqs = [];
		hero = scanS = filmS = dockS = sceneIO = null;
		lockRelease();
	}

	function afterRender(v, pg, rebind) { // 7: idempotent
		const add = (name, fn) => { try { const s = fn(); if (s !== false && s !== null) { if (s && typeof s === 'object') scenes.push(Object.assign(s, { name, near: true })); bound.push(name); } } catch (e) { warn(e, name); } };
		gen++;
		safe(unbind, 'unbind');
		view = v || $('#view'); page = pg || 'home';
		if (!view) return;
		add('live', bindLive); add('lit', bindLit);
		if (mode !== 'off') {
			const B = { hero: bindHero, scan: bindScan, film: bindFilm, how: bindHow, steps: bindSteps, finale: (r) => bindRange(r, 0, (s) => [s.top - vh, s.top + s.h / 2 - 0.5 * vh]) };
			$$('[data-scene]', view).forEach((r) => { const n = r.dataset.scene; B[n] && add(n, () => B[n](r)); });
			add('credits', bindCredits);
			$$('[data-scrub]', view).forEach((p) => add('scrub', () => bindScrub(p)));
			$$('[data-velocity]', view).forEach((r) => add('marquee', () => bindMarquee(r)));
			if (cine()) add('tilt', () => (tilts = $$('[data-tilt]', view).map((el) => ({ el, rx: 0, ry: 0, tx: 0, ty: 0 }))).length > 0);
			sceneIO = IO((es) => es.forEach((e) => scenes.forEach((s) => {
				if (s.root !== e.target) return;
				s.near = e.isIntersecting; // GL uses hero.vis (0-margin IO)
				safe(() => { s.active && s.active(s.near); s.update && s.update(W.scrollY); }, s.name); wake();
			})), { rootMargin: '50% 0px' });
			scenes.forEach((s) => s.root && sceneIO.observe(s.root));
		}
		add('dock', bindDock);
		if (!hero || page !== 'home') glStop();
		else if (rebind) intro = null;
		else if (bodyHas('booting')) intro = { kind: 'wait' }; // until ego:booted
		else if (curtainBusy) { intro = { kind: 'wait' }; outQueue.push(startShort); }
		else if (G) startShort();
		safe(refresh, 'refresh');
		const g = gen, again = (ms) => () => g === gen && refreshSoon(ms);
		safe(() => D.fonts.ready.then(again(0)), 'fonts');
		$$('[data-scene] img', view).forEach((im) => im.complete || on(im, 'load', again(30), { once: true }));
	}

	// global listeners
	on(D, 'pointermove', (e) => {
		const t = e.target, m = cl(t, '.marquee'), tl = cl(t, '[data-tilt]');
		lk.px = e.clientX; lk.py = e.clientY;
		if (cine() && hero && G && (ptr.inHero = !!cl(t, '[data-scene=hero]'))) { const r = rect(G.cv); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; }
		tilts.forEach((s) => {
			const r = cine() && s.el === tl && (s.rect || (s.rect = rect(s.el)));
			s.tx = r ? (0.5 - (e.clientY - r.top) / r.height) * 8 : 0; s.ty = r ? ((e.clientX - r.left) / r.width - 0.5) * 10 : 0;
		});
		marqs.forEach((s) => s.rows.forEach((r) => (r.hov = r.el === m)));
		wake();
	}, PV);
	on(D, 'pointerover', (e) => {
		const t = cl(e.target, LOCK_T);
		if (e.pointerType === 'touch' || !cine()) return;
		lk.px = e.clientX; lk.py = e.clientY;
		if (!t) lockRelease(); else if (t !== lk.el || !lk.on) lockTo(t, 'ptr');
	}, PV);
	on(D, 'pointerout', (e) => { if (!e.relatedTarget) { lockRelease(); ptr.inHero = false; wake(); } }, PV);
	on(D, 'focusin', (e) => {
		const el = e.target, f = cine() && filmS && cl(el, '.film-frame'), i = f ? filmS.fr.findIndex((x) => x.el === f) : -1;
		let fv = false;
		if (i >= 0) { $$('[data-pin], .film-view', filmS.root).forEach((x) => (x.scrollLeft = 0)); i !== filmS.lr && filmS.go(i); }
		try { fv = el.matches(':focus-visible'); } catch (_) {}
		const t = fv && (cl(el, LOCK_T) || (el.tabIndex >= 0 && el !== D.body && el));
		if (t) lockTo(t, 'focus');
	});
	on(D, 'focusout', () => setTimeout(() => lk.by === 'focus' && !(lk.el && lk.el.contains(D.activeElement)) && lockRelease(), 0));
	on(D, 'click', (e) => { // rail/tab clicks scroll the scene
		const sb = cl(e.target, '[data-scan]'), tb = cl(e.target, '[data-tour]'), i = tb && filmS ? filmS.fr.findIndex((f) => f.el.dataset.frame === tb.dataset.tour) : -1;
		if (mode === 'off') return;
		if (sb && scanS && scanS.root.contains(sb)) safe(() => scanS.go(+sb.dataset.scan || 0), 'scan');
		else if (i >= 0) safe(() => filmS.go(i), 'film');
	});
	['wheel', 'scroll'].forEach((ev) => on(W, ev, wake, PV));
	on(D, 'keydown', wake);
	on(W, 'touchstart', (e) => { wake(); if (mode === 'lite' && hero && G && !sweepT0 && cl(e.target, '[data-scene=hero]')) startSweep(); }, PV);
	on(W, 'resize', () => { wake(); refreshSoon(150); dockEval(); }, PV);
	on(D, 'visibilitychange', () => {
		if (D.hidden) cancelAnimationFrame(raf), (raf = last = 0);
		liveSt.forEach((v, el) => tog(el, 'is-live', v && !D.hidden));
		if (G) G.last = '';
		wake();
	});
	safe(() => { const v = $('#view'); v && W.ResizeObserver && new ResizeObserver(() => view && refreshSoon(150)).observe(v); }, 'ro');
	safe(() => { // safety net (7)
		const mo = new MutationObserver(syncLock), m = $('#menu');
		mo.observe(D.body, { attributes: true, attributeFilter: ['class', 'style'] });
		m && mo.observe(m, { attributes: true, attributeFilter: ['hidden'] });
	}, 'mo');
	const mqOn = (m, f) => m && m.addEventListener && m.addEventListener('change', f);
	mqOn(MQ_PHONE, dockEval);
	mqOn(MQ_CINE, () => safe(() => { // crossed 900px: swap cine/lite
		const m = MQ_CINE.matches ? 'cine' : 'lite';
		if (mode === 'off' || m === mode) return;
		mode = m; setModeClasses(); lockRelease();
		setLenis();
		view && afterRender(view, page, true);
	}, 'mode'));
	setLenis();

	W.EgoFX = {
		version: '4.0',
		get mode() { return mode; },
		get lenis() { return lenis; },
		afterRender: (v, pg) => safe(() => afterRender(v, pg), 'afterRender'),
		scrollTo,
		top: () => safe(top, 'top'),
		lock: (r) => safe(() => { reasons.add(reason(r)); syncLock(); }, 'lock'),
		unlock: (r) => safe(() => { reasons.delete(reason(r)); syncLock(); }, 'unlock'),
		transition: (fn, label) => safe(() => transition(fn, label), 'transition') || Promise.resolve(),
		refresh: () => safe(refresh, 'refresh'),
		stats: () => ({
			mode, lenis: !!lenis, locked: Array.from(reasons), ticker: { running: !!raf, frames },
			gl: { running: !!(G && hero && hero.vis && !D.hidden), frames: glFrames, dpr: G ? G.dpr : 0, quality: G ? glQuality : 'off' },
			scenes: bound.slice(),
		}),
	};
})();
