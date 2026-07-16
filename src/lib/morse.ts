/* ============================================================
   Morse theory on a surface of revolution — the pure math.
   Consumed by the hero canvas (src/scripts/hero.ts) and unit
   tests (morse.test.ts). No DOM in this file.
   ------------------------------------------------------------
   Every surface in the family is a surface of revolution about
   the z-axis (the axis pointing at the viewer):

       P(u,v) = ( ρ(v)·cos u ,  ρ(v)·sin u ,  ζ(v) )

   and the height function is  h = y = ρ(v)·sin u.  Then

       ∂h/∂u = ρ(v)·cos u        ∂h/∂v = ρ'(v)·sin u

   so away from the axis (ρ > 0) the critical points sit exactly at

       u ∈ {π/2, 3π/2}   and   ρ'(v) = 0

   i.e. the critical points of h are pinned to the critical points
   of the *profile* ρ — a 1-D problem. At such a point h_uv = 0, so
   the Hessian is already diagonal:

       h_uu = -ρ·sin u          h_vv = ρ''·sin u

   and the index is read straight off the signs:

       ρ'' < 0  (a bulge)  →  index 2 at u=π/2,  index 0 at u=3π/2
       ρ'' > 0  (a waist)  →  index 1 at both

   So a surface is defined by ONE function, ρ(v), and everything
   else — critical points, indices, heights — is derived, not
   hardcoded. Σ(-1)^index = χ is enforced by morse.test.ts and
   double-checked at runtime before a surface is ever drawn.

   Caveat on ρ → 0 (the poles of a sphere-type profile): there
   ∂h/∂u vanishes for every u, but that's the parametrisation
   degenerating, not a critical point — the pole is a single
   regular point of h. Those v are excluded from the search.
   ============================================================ */

export const TAU = Math.PI * 2;

/* below this ρ we're at a coordinate singularity (a pole) */
export const AXIS_EPS = 0.05;

export interface Surface {
  name: string;
  desc: string;
  chi: number;
  rho: (v: number) => number;
  zeta: (v: number) => number;
  vRange: [number, number];
  vClosed: boolean;
}

export interface CriticalPoint {
  u: number;
  v: number;
  /** height h at the critical point */
  hv: number;
  /** Morse index: 0 = min, 1 = saddle, 2 = max */
  idx: number;
}

export interface Analysis {
  crit: CriticalPoint[];
  HMAX: number;
  RAD: number;
  /** Σ (-1)^index over the critical points — must equal the surface's χ */
  euler: number;
}

/* Only S² and T² are reachable this way: a closed surface of revolution
   is a sphere or a torus. Higher genus needs implicit surfaces — see
   IDEAS.md. What we *can* vary is the Morse function, which is the more
   interesting half anyway: same space, different critical sets, same χ
   every time. */
export const SURFACES: Surface[] = [
  {
    name: 'S²', desc: 'the sphere', chi: 2,
    rho: (v) => Math.sin(v),
    zeta: (v) => Math.cos(v),
    vRange: [0, Math.PI], vClosed: false,
  },
  {
    name: 'S²', desc: 'an ellipsoid', chi: 2,
    rho: (v) => 0.70 * Math.sin(v),
    zeta: (v) => 1.45 * Math.cos(v),
    vRange: [0, Math.PI], vClosed: false,
  },
  {
    name: 'S²', desc: 'a sphere with a waist', chi: 2,
    rho: (v) => Math.sin(v) * (1 + 0.90 * Math.cos(v) * Math.cos(v)),
    zeta: (v) => 1.35 * Math.cos(v),
    vRange: [0, Math.PI], vClosed: false,
  },
  {
    name: 'T²', desc: 'the torus', chi: 0,
    rho: (v) => 1 + 0.42 * Math.cos(v),
    zeta: (v) => 0.42 * Math.sin(v),
    vRange: [0, TAU], vClosed: true,
  },
  {
    name: 'T²', desc: 'a fat torus', chi: 0,
    rho: (v) => 1 + 0.62 * Math.cos(v),
    zeta: (v) => 0.62 * Math.sin(v),
    vRange: [0, TAU], vClosed: true,
  },
  {
    name: 'T²', desc: 'a rippled torus', chi: 0,
    rho: (v) => 1 + (0.40 * (1 + 0.22 * Math.cos(3 * v))) * Math.cos(v),
    zeta: (v) => (0.40 * (1 + 0.22 * Math.cos(3 * v))) * Math.sin(v),
    vRange: [0, TAU], vClosed: true,
  },
];

/** Derive the critical points of h (and their Morse indices) from the profile ρ. */
export function analyse(S: Surface): Analysis {
  const d = 1e-4;
  const rp = (v: number) => (S.rho(v + d) - S.rho(v - d)) / (2 * d);
  const rpp = (v: number) => (S.rho(v + d) - 2 * S.rho(v) + S.rho(v - d)) / (d * d);
  const [v0, v1] = S.vRange;
  const N = 3000;
  const period = v1 - v0;
  // on a closed profile v0 and v1 are the SAME point — dedupe modulo the period
  const same = (a: number, b: number) => {
    let diff = Math.abs(a - b);
    if (S.vClosed) diff = Math.min(diff, period - diff);
    return diff < 1e-3;
  };
  const vs: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = v0 + (period * i) / N;
    const b = v0 + (period * (i + 1)) / N;
    if (S.rho(a) < AXIS_EPS || S.rho(b) < AXIS_EPS) continue;
    let fa = rp(a);
    const fb = rp(b);
    if (fa * fb > 0) continue;
    let lo = a, hi = b; // bisect to the root of ρ'
    for (let k = 0; k < 50; k++) {
      const m = (lo + hi) / 2;
      if (rp(m) * fa <= 0) hi = m;
      else { lo = m; fa = rp(m); }
    }
    const v = (lo + hi) / 2;
    if (vs.some((x) => same(x, v))) continue; // dedupe
    vs.push(v);
  }
  const crit: CriticalPoint[] = [];
  for (const v of vs) {
    const c2 = rpp(v);
    if (Math.abs(c2) < 1e-5) continue; // degenerate → not Morse
    for (const u of [Math.PI / 2, (3 * Math.PI) / 2]) {
      const s = Math.sin(u) > 0 ? 1 : -1;
      const huu = -S.rho(v) * s;
      const hvv = c2 * s;
      const idx = (huu < 0 ? 1 : 0) + (hvv < 0 ? 1 : 0);
      crit.push({ u, v, hv: S.rho(v) * s, idx });
    }
  }
  crit.sort((a, b) => a.hv - b.hv);
  // bounds for scaling and the color ramp
  let HMAX = 0, RAD = 0;
  const M = 400;
  for (let i = 0; i <= M; i++) {
    const v = v0 + ((v1 - v0) * i) / M;
    HMAX = Math.max(HMAX, Math.abs(S.rho(v)));
    RAD = Math.max(RAD, Math.hypot(S.rho(v), S.zeta(v)));
  }
  // the grid can narrowly miss a true extremum that bisection found exactly —
  // the critical heights must always lie inside the ramp bounds
  for (const k of crit) HMAX = Math.max(HMAX, Math.abs(k.hv));
  const euler = crit.reduce((acc, k) => acc + (k.idx === 1 ? -1 : 1), 0);
  return { crit, HMAX, RAD, euler };
}
