/* The hero canvas: Morse theory on a rotating surface of revolution.
   All math lives in src/lib/morse.ts; this file only draws + wires the
   HTML controls (surface chips, sweep slider, χ readout in Hero.astro).

   HONESTY CONSTRAINTS (do not trade away silently — see PROJECT_BRIEF.md):
   - orthographic projection, spin about the vertical y-axis only, so
     screen-vertical is EXACTLY the height function h and the sweep line
     is a genuine level set;
   - colors come from the design tokens (CSS custom properties), re-read on
     theme change, never hex literals here;
   - a surface whose derived Σ(-1)^index disagrees with its declared χ is
     never drawn.

   INTERACTION MODEL: while the mouse is over the hero, the level IS the
   cursor height ((cy - pointerY)/scale — the dashed line sits exactly under
   the cursor). The slider sets the level directly. After any interaction the
   level holds for IDLE_DELAY, then the idle sine sweep resumes FROM the held
   level (phase rebased), so nothing ever jumps. */

import { AXIS_EPS, SURFACES, TAU, analyse } from '../lib/morse';
import type { Analysis, Surface } from '../lib/morse';

const AMP = 1.1; // sweep clamp: level ∈ [-AMP·HMAX, +AMP·HMAX]
const IDLE_AMP = 1.04; // idle sine amplitude (slightly inside the clamp)
const SLIDER_MAX = 1000;
const IDLE_DELAY = 4000; // ms the level holds after an interaction
const CTRL_RESERVE = 150; // px reserved under the surface for the controls (desktop)

export function initHero(): void {
  const canvas = document.getElementById('net') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- colors from the design tokens (single source of truth) ----
  const hexToRgb = (hex: string): [number, number, number] => {
    const raw = hex.replace('#', '');
    const f = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
  };
  let COL: string[] = [];
  let STOPS: [number, number, number][] = [];
  let INK = '', BG = '';
  function refreshColors(): void {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    COL = [token('--mint'), token('--amber'), token('--hbo')]; // index 0 / 1 / 2
    STOPS = [token('--blue'), token('--violet'), token('--hbo')].map(hexToRgb);
    INK = token('--ink');
    BG = token('--bg');
  }
  refreshColors();
  const NAMES = ['min', 'saddle', 'max'];
  const MONO = `ui-monospace, "JetBrains Mono", monospace`;

  // ---- never draw something false ----
  const surfaces = SURFACES.filter((s) => {
    const ok = analyse(s).euler === s.chi;
    if (!ok) console.error(`[hero] ${s.name} (${s.desc}) failed the Euler check — excluded`);
    return ok;
  });
  if (surfaces.length === 0) return;

  // matchMedia (not clientWidth) so JS and CSS agree on the breakpoints
  const narrowMq = matchMedia('(max-width: 820px)');
  // wide screens overlay the controls bottom-right (see Hero.astro) — only
  // then does the surface need vertical room reserved beneath it
  const overlayMq = matchMedia('(min-width: 1121px)');

  // ---- control elements (all optional — the hero may render without them) ----
  const slider = document.getElementById('hcSlider') as HTMLInputElement | null;
  const levelEl = document.getElementById('hcLevel');
  const nameEl = document.getElementById('hcName');
  const chiEl = document.getElementById('hcChi');
  const passedEl = document.getElementById('hcPassed');
  const countsEl = document.getElementById('hcCounts');
  const sumEl = document.getElementById('hcSum');
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('.hc-chip'));

  let S: Surface = surfaces[0]!;
  let A: Analysis = analyse(S);
  let curIndex = 0;
  let NU = 60, NV = 26;
  let w = 0, h = 0, dpr = 1, raf = 0, theta = 0.6, t = 0;
  let level = 0, spin = 0.0035;
  const pointer = { active: false, x: 0, y: 0 };
  let holdUntil = 0; // performance.now() until which the level stays put
  let sliderSyncBlockUntil = 0; // don't overwrite the thumb right after a drag
  let idling = false; // are we inside the idle sine sweep (phase valid)?
  let scale = 120, cx = 0, cy = 0, narrow = false;
  let inView = true, lastDraw = -1e9;
  let lastReadout = '', lastLevelStr = '';

  const clampLevel = (lv: number) => Math.max(-A.HMAX * AMP, Math.min(A.HMAX * AMP, lv));

  function pick(i?: number): void {
    curIndex = i !== undefined ? i : Math.floor(Math.random() * surfaces.length);
    S = surfaces[curIndex]!;
    A = analyse(S);
    level = -A.HMAX * AMP; // start below everything; idle sweeps it up
    idling = false;
  }

  function size(): void {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas!.clientWidth;
    h = canvas!.clientHeight;
    if (w === 0 || h === 0) return; // hidden (e.g. no-JS gate) — nothing to size
    canvas!.width = w * dpr;
    canvas!.height = h * dpr;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    narrow = narrowMq.matches;
    NU = narrow ? 44 : 60;
    NV = S.vClosed ? (narrow ? 22 : 26) : (narrow ? 18 : 22);
    if (narrow) {
      // contained figure — centre the surface; no text to collide with
      cx = w * 0.5;
      cy = h * 0.5;
      scale = Math.min(h * 0.42, w * 0.42) / A.RAD;
    } else {
      // full-bleed background: surface on the right; on wide screens it is
      // lifted so the overlaid control strip has clear room underneath; the
      // CSS mask keeps the wireframe out of the text column on the left
      const free = h - (overlayMq.matches ? CTRL_RESERVE : 0);
      cx = w * 0.76;
      cy = free / 2 + 14;
      scale = Math.min(free * 0.42, w * 0.24) / A.RAD;
    }
  }

  const P = (u: number, v: number): [number, number, number] => {
    const p = S.rho(v);
    return [p * Math.cos(u), p * Math.sin(u), S.zeta(v)];
  };
  const rot = (p: [number, number, number], a: number): [number, number, number] => {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  };
  const sx = (p: [number, number, number]) => cx + p[0] * scale;
  const sy = (p: [number, number, number]) => cy - p[1] * scale;

  function ramp(hv: number): string {
    const s = Math.max(0, Math.min(1, (hv + A.HMAX) / (2 * A.HMAX)));
    const k = s * (STOPS.length - 1);
    const i = Math.min(STOPS.length - 2, Math.floor(k));
    const f = k - i;
    const a = STOPS[i]!, b = STOPS[i + 1]!;
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  }

  function strokeCurve(pts: [number, number, number][]): void {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i]!, q = pts[i + 1]!;
      const hv = (p[1] + q[1]) / 2;
      const front = ((p[2] + q[2]) / 2 + A.RAD) / (2 * A.RAD);
      const inSub = hv <= level;
      ctx!.strokeStyle = ramp(hv);
      ctx!.globalAlpha = inSub ? 0.16 + 0.52 * front : 0.04 + 0.09 * front;
      ctx!.lineWidth = inSub ? 0.5 + 1.0 * front : 0.5;
      ctx!.beginPath();
      ctx!.moveTo(sx(p), sy(p));
      ctx!.lineTo(sx(q), sy(q));
      ctx!.stroke();
    }
  }

  const levelToSlider = (lv: number) =>
    Math.round(((lv / (AMP * A.HMAX) + 1) / 2) * SLIDER_MAX);
  const sliderToLevel = (v: number) => ((v / SLIDER_MAX) * 2 - 1) * AMP * A.HMAX;

  function updateReadout(now: number): void {
    // the height label tracks every frame; it lives OUTSIDE any live region,
    // and the slider exposes the real height (not the opaque 0–1000) to AT
    const lv = level.toFixed(2);
    if (lv !== lastLevelStr) {
      lastLevelStr = lv;
      if (levelEl) levelEl.textContent = `a = ${lv}`;
      if (slider) {
        slider.setAttribute('aria-valuetext', `height a = ${lv}`);
        if (now > sliderSyncBlockUntil) slider.value = String(levelToSlider(level));
      }
    }
    // the counts/χ only change when the sweep crosses a critical point —
    // gate the readout DOM writes on that, so it isn't rewritten every frame
    const b = [0, 0, 0];
    let n = 0;
    for (const k of A.crit)
      if (level >= k.hv) {
        b[k.idx]!++;
        n++;
      }
    const sum = b[0]! - b[1]! + b[2]!;
    const total = A.crit.length;
    const done = n === total && sum === S.chi;
    const sig = `${curIndex}|${n}|${sum}`;
    if (sig === lastReadout) return;
    lastReadout = sig;
    if (nameEl) nameEl.textContent = `${S.name} · ${S.desc}`;
    if (chiEl) chiEl.textContent = `χ = ${S.chi}`;
    if (passedEl) passedEl.textContent = `${n}/${total} critical points`;
    if (countsEl) countsEl.textContent = `c₀ ${b[0]} · c₁ ${b[1]} · c₂ ${b[2]}`;
    if (sumEl) {
      sumEl.textContent = `Σ(−1)ⁱ = ${sum}${done ? ' ✓' : ''}`;
      sumEl.classList.toggle('done', done);
    }
  }

  function setActiveChip(i: number): void {
    chips.forEach((c, j) => c.setAttribute('aria-pressed', String(j === i)));
  }

  // `once` = draw a single frame without scheduling the loop (init, control
  // events, reduce mode) — must never be swallowed by the fps cap
  function frame(now = 0, once = false): void {
    if (!reduce && !once) raf = requestAnimationFrame(frame);
    if (!reduce && narrow && now - lastDraw < 30 && !once) return; // ~30fps phone cap
    const clock = narrow ? 2 : 1; // advance clocks 2× at half the frame rate
    t += 0.016 * clock;
    lastDraw = now;
    if (!reduce) theta += spin * clock;

    const idleAmp = A.HMAX * IDLE_AMP;
    if (!reduce && pointer.active) {
      // the dashed line sits EXACTLY under the cursor
      level = clampLevel((cy - pointer.y) / scale);
      spin = 0.0035 + (pointer.x / w - 0.5) * 0.011;
      idling = false;
    } else if (reduce || now < holdUntil) {
      // hold: keep the level where the user (or the last frame) left it
      spin = 0.0035;
      idling = false;
    } else {
      if (!idling) {
        // resume the sine FROM the current level: rebase its phase so the
        // sweep continues without a jump
        const r = Math.max(-1, Math.min(1, level / idleAmp));
        t = Math.asin(r) / 0.3;
        idling = true;
      }
      level += (Math.sin(t * 0.3) * idleAmp - level) * 0.07;
      spin = 0.0035;
    }

    ctx!.clearRect(0, 0, w, h);

    // ---- the sweep: a true horizontal line, because screen-vertical IS h
    const py = cy - level * scale;
    ctx!.strokeStyle = INK;
    ctx!.globalAlpha = 0.2;
    ctx!.lineWidth = 1;
    ctx!.setLineDash([5, 7]);
    ctx!.beginPath();
    ctx!.moveTo(0, py);
    ctx!.lineTo(w, py);
    ctx!.stroke();
    ctx!.setLineDash([]);
    ctx!.globalAlpha = 1;

    const [v0, v1] = S.vRange;
    // ---- meridians (u fixed): the profile curve, rotated
    for (let i = 0; i < NU; i++) {
      const u = (i / NU) * TAU;
      const pts: [number, number, number][] = [];
      for (let j = 0; j <= NV; j++) pts.push(rot(P(u, v0 + ((v1 - v0) * j) / NV), theta));
      strokeCurve(pts);
    }
    // ---- parallels (v fixed): circles about the axis
    for (let j = 0; j <= NV; j++) {
      const v = v0 + ((v1 - v0) * j) / NV;
      if (S.rho(v) < AXIS_EPS) continue; // skip the poles
      if (S.vClosed && j === NV) continue;
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= NU; i++) pts.push(rot(P((i / NU) * TAU, v), theta));
      strokeCurve(pts);
    }

    // ---- the critical points
    for (const k of A.crit) {
      const p = rot(P(k.u, k.v), theta);
      const X = sx(p), Y = sy(p);
      const front = (p[2] + A.RAD) / (2 * A.RAD);
      const passed = level >= k.hv;
      const near = Math.max(0, 1 - Math.abs(level - k.hv) * ((3.0 / A.HMAX) * 1.42));
      const c = COL[k.idx]!;

      if (near > 0.01) {
        ctx!.beginPath();
        ctx!.fillStyle = c;
        ctx!.globalAlpha = 0.15 * near;
        ctx!.arc(X, Y, 9 + 26 * near, 0, TAU);
        ctx!.fill();
      }
      ctx!.beginPath();
      ctx!.fillStyle = passed ? c : BG;
      ctx!.globalAlpha = 0.45 + 0.55 * front;
      ctx!.arc(X, Y, 4.2 + 2.0 * near, 0, TAU);
      ctx!.fill();
      ctx!.lineWidth = 1.6;
      ctx!.strokeStyle = c;
      ctx!.globalAlpha = 0.5 + 0.5 * front;
      ctx!.stroke();

      if (near > 0.3 && !narrow) {
        ctx!.globalAlpha = near;
        ctx!.fillStyle = c;
        ctx!.font = `600 10.5px ${MONO}`;
        ctx!.fillText(`index ${k.idx} · ${NAMES[k.idx]}`, X + 13, Y - 10);
      }
      ctx!.globalAlpha = 1;
    }

    updateReadout(now);
  }

  // ---- run state: draw only while visible (tab AND viewport) ----
  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function run(): void {
    if (reduce) { frame(performance.now(), true); return; } // single honest frame
    if (!raf && inView && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function start(): void {
    size();
    stop();
    frame(performance.now(), true); // one honest frame now, so the readout fills
    run(); // then start (or not) the loop depending on visibility
  }

  // ---- controls ----
  function wireControls(): void {
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const i = Number(chip.dataset.i);
        if (Number.isNaN(i)) return;
        pick(i);
        setActiveChip(i);
        size();
        // brief hold at the bottom, then the idle sweep reveals the new surface
        holdUntil = performance.now() + 900;
        // redraw now, unconditionally: the rAF loop may be paused (canvas
        // scrolled out of view on mobile), so don't rely on it for the readout
        frame(performance.now(), true);
      });
    });
    if (slider) {
      slider.addEventListener('input', () => {
        const now = performance.now();
        level = clampLevel(sliderToLevel(+slider.value));
        idling = false;
        holdUntil = now + IDLE_DELAY;
        sliderSyncBlockUntil = now + 600; // don't fight the user's thumb
        frame(now, true); // redraw even if the loop is paused
      });
    }
    // hover-to-sweep is a MOUSE-only delight — touch uses the slider, so it
    // never fights vertical scrolling; and it's disabled under reduced motion.
    // Listen on window so tracking never drops while crossing the hero text;
    // interactive elements (controls, links) pause the sweep instead.
    if (!reduce) {
      addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const rc = canvas!.getBoundingClientRect();
        const inside =
          e.clientX >= rc.left && e.clientX <= rc.right && e.clientY >= rc.top && e.clientY <= rc.bottom;
        const onControl = !!(e.target as Element | null)?.closest?.('#heroControls, a, button');
        pointer.active = inside && !onControl;
        if (pointer.active) {
          pointer.x = e.clientX - rc.left;
          pointer.y = e.clientY - rc.top;
          holdUntil = performance.now() + IDLE_DELAY;
        }
      });
      document.documentElement.addEventListener('mouseleave', () => {
        pointer.active = false;
      });
    }
  }

  pick();
  wireControls();
  setActiveChip(curIndex);

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(start, 180);
  });
  narrowMq.addEventListener('change', start);
  overlayMq.addEventListener('change', start);
  addEventListener('themechange', () => {
    refreshColors();
    frame(performance.now(), true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else run();
  });
  // pause the animation when the hero scrolls out of view — saves battery
  new IntersectionObserver(
    (entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      if (inView) run();
      else stop();
    },
    { threshold: 0.02 },
  ).observe(canvas);

  start();
}
