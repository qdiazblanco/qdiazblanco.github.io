/* The hero canvas: Morse theory on a rotating surface of revolution.
   All math lives in src/lib/morse.ts; this file only draws.

   HONESTY CONSTRAINTS (do not trade away silently — see PROJECT_BRIEF.md):
   - orthographic projection, spin about the vertical y-axis only, so
     screen-vertical is EXACTLY the height function h and the sweep line
     is a genuine level set;
   - colors come from the design tokens (CSS custom properties), never
     hex literals here;
   - a surface whose derived Σ(-1)^index disagrees with its declared χ
     is never drawn. */

import { AXIS_EPS, SURFACES, TAU, analyse } from '../lib/morse';
import type { Analysis, Surface } from '../lib/morse';

export function initHero(): void {
  const canvas = document.getElementById('net') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- colors from the design tokens (single source of truth) ----
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const hexToRgb = (hex: string): [number, number, number] => {
    const raw = hex.replace('#', '');
    const f = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    return [
      parseInt(f.slice(0, 2), 16),
      parseInt(f.slice(2, 4), 16),
      parseInt(f.slice(4, 6), 16),
    ];
  };
  const COL = [token('--mint'), token('--amber'), token('--hbo')]; // index 0 / 1 / 2
  const NAMES = ['min', 'saddle', 'max'];
  // height → colour: blue (low) · violet · coral (high)
  const STOPS = [token('--blue'), token('--violet'), token('--hbo')].map(hexToRgb);
  const INK = token('--ink');
  const MUTED = token('--muted');
  const BG = token('--bg');
  const MONO = `ui-monospace, "JetBrains Mono", monospace`;

  // ---- never draw something false ----
  const surfaces = SURFACES.filter((s) => {
    const ok = analyse(s).euler === s.chi;
    if (!ok) console.error(`[hero] ${s.name} (${s.desc}) failed the Euler check — excluded`);
    return ok;
  });
  if (surfaces.length === 0) return;

  let S: Surface = surfaces[0]!;
  let A: Analysis = analyse(S);
  let NU = 60;
  let NV = 26;
  let w = 0, h = 0, dpr = 1, raf = 0, theta = 0.6, t = 0;
  let level = 0, targetLevel = 0, spin = 0.0035;
  const pointer = { active: false, x: 0, y: 0 };
  let scale = 120, cx = 0, cy = 0, narrow = false;
  let inView = true;
  let lastDraw = -1e9;

  function pick(i?: number): void {
    S = surfaces[i !== undefined ? i : Math.floor(Math.random() * surfaces.length)]!;
    A = analyse(S);
    level = targetLevel = -A.HMAX * 1.1; // start below everything
  }

  function size(): void {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas!.clientWidth;
    h = canvas!.clientHeight;
    canvas!.width = w * dpr;
    canvas!.height = h * dpr;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    narrow = w < 820;
    // fewer polylines on phones — same math, lighter frames
    NU = narrow ? 44 : 60;
    NV = S.vClosed ? (narrow ? 22 : 26) : (narrow ? 18 : 22);
    const fit = narrow ? Math.min(h * 0.23, w * 0.38) : Math.min(h * 0.44, w * 0.26);
    scale = fit / A.RAD;
    if (narrow) {
      // below the text block: legibility of the words always wins
      cx = w * 0.5;
      cy = h * 0.68;
    } else {
      cx = w * 0.73;
      cy = h * 0.5;
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

  function frame(now = 0): void {
    if (!reduce) raf = requestAnimationFrame(frame);
    // cap phones at ~33fps; t advances by wall-clock share so the idle
    // sweep runs at the same visible speed as at 60fps
    if (narrow && now - lastDraw < 30) return;
    t += narrow ? 0.032 : 0.016;
    lastDraw = now;
    if (!reduce) theta += spin;

    if (pointer.active) {
      targetLevel = (0.5 - pointer.y / h) * 2 * A.HMAX * 1.15;
      spin = 0.0035 + (pointer.x / w - 0.5) * 0.011;
    } else {
      targetLevel = Math.sin(t * 0.3) * A.HMAX * 1.04;
      spin = 0.0035;
    }
    targetLevel = Math.max(-A.HMAX * 1.12, Math.min(A.HMAX * 1.12, targetLevel));
    level += (targetLevel - level) * (reduce ? 1 : 0.07);

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
    ctx!.globalAlpha = 0.5;
    ctx!.fillStyle = MUTED;
    ctx!.font = `500 11px ${MONO}`;
    ctx!.fillText(`a = ${level.toFixed(2)}`, 14, py - 7);
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

    // ---- the tally:  Σ (-1)^index  =  χ,  once the sweep clears the top
    const b = [0, 0, 0];
    let n = 0;
    for (const k of A.crit)
      if (level >= k.hv) {
        b[k.idx]!++;
        n++;
      }
    ctx!.globalAlpha = 0.7;
    ctx!.fillStyle = MUTED;
    ctx!.font = `500 11px ${MONO}`;
    const total = A.crit.length;
    ctx!.fillText(
      narrow
        ? `${S.name} · ${n}/${total} · c₀=${b[0]} c₁=${b[1]} c₂=${b[2]} · χ=${b[0]! - b[1]! + b[2]!}`
        : `${S.name} — ${S.desc}   ·   critical points passed ${n}/${total}   ·   c₀=${b[0]}  c₁=${b[1]}  c₂=${b[2]}   ·   c₀ − c₁ + c₂ = ${b[0]! - b[1]! + b[2]!}`,
      14,
      h - 18,
    );
    ctx!.globalAlpha = 0.45;
    const hint = narrow ? 'tap to change' : 'click to change surface';
    ctx!.fillText(hint, w - ctx!.measureText(hint).width - 14, h - 18);
    ctx!.globalAlpha = 1;
  }

  // ---- run state: draw only while visible (tab AND viewport) ----
  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function run(): void {
    if (reduce) { frame(); return; } // single honest frame
    if (!raf && inView && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function start(): void {
    size();
    stop();
    run();
  }

  pick();
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(start, 180);
  });
  addEventListener('pointermove', (e) => {
    const rc = canvas!.getBoundingClientRect();
    pointer.x = e.clientX - rc.left;
    pointer.y = e.clientY - rc.top;
    pointer.active = pointer.y > 0 && pointer.y < h;
  });
  addEventListener('pointerleave', () => {
    pointer.active = false;
  });
  canvas.addEventListener('click', () => {
    pick((surfaces.indexOf(S) + 1) % surfaces.length);
    size();
    if (reduce) frame();
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
