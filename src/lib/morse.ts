/* ============================================================
   Morse theory on closed surfaces — the pure math.
   Consumed by the hero canvas (src/scripts/hero.ts) and unit
   tests (morse.test.ts). No DOM in this file.

   Three kinds of surface, one honest contract: the height
   function is ALWAYS the world y-coordinate (screen-vertical,
   preserved by the hero's spin about the y-axis), and every
   critical point, index and Euler characteristic below is
   DERIVED numerically — never hardcoded. Σ(-1)^index = χ is
   enforced by morse.test.ts and re-checked at runtime before
   a surface is ever drawn.

   1. kind 'lathe' — surface of revolution about the z-axis
      (pointing at the viewer):  P(u,v) = (ρ cos u, ρ sin u, ζ)
      so h = y = ρ(v)·sin u. Away from the axis the critical
      points sit at u ∈ {π/2, 3π/2}, ρ'(v) = 0, and the Hessian
      is diagonal:  h_uu = -ρ sin u,  h_vv = ρ'' sin u — the
      index is read off the signs (see the derivation in the
      original sketch, reference/index.html).

   2. kind 'latheV' — surface of revolution about the VERTICAL
      y-axis: P(u,v) = (ρ cos u, ζ(v), ρ sin u), h = ζ(v).
      h is constant on parallels, so any interior ζ' = 0 with
      ρ > 0 is a critical CIRCLE — not Morse. We verify ζ is
      strictly monotone in the interior and both endpoints are
      poles (ρ → 0); then the only critical points are the two
      poles (a min and a max), and χ = 2.

   3. kind 'implicit' — a level set F(x,y,z) = 0 (this is how
      genus ≥ 2 becomes reachable; a surface of revolution can
      only ever be S² or T²). Critical points of h = y solve
      F = Fx = Fz = 0 (∇F vertical), found by damped Newton from
      a grid of seeds. Where Fy ≠ 0 the surface is locally the
      graph y = g(x,z) and Hess g = -(1/Fy)·[[Fxx,Fxz],[Fxz,Fzz]];
      the index is its count of negative eigenvalues.
   ============================================================ */

export const TAU = Math.PI * 2;

/* below this ρ a lathe profile is at a coordinate singularity (a pole) */
export const AXIS_EPS = 0.05;

interface SurfaceBase {
  name: string;
  desc: string;
  /** short label for the surface picker */
  label: string;
  chi: number;
}

export interface LatheSurface extends SurfaceBase {
  kind: 'lathe';
  rho: (v: number) => number;
  zeta: (v: number) => number;
  vRange: [number, number];
  vClosed: boolean;
}

export interface VerticalLatheSurface extends SurfaceBase {
  kind: 'latheV';
  rho: (v: number) => number;
  zeta: (v: number) => number;
  vRange: [number, number];
}

export interface ImplicitSurface extends SurfaceBase {
  kind: 'implicit';
  F: (x: number, y: number, z: number) => number;
  /** bounding box the surface is known to live in: [x, y, z] ranges */
  bounds: [[number, number], [number, number], [number, number]];
}

export type Surface = LatheSurface | VerticalLatheSurface | ImplicitSurface;

export interface CriticalPoint {
  /** position on the surface, world coordinates */
  pos: [number, number, number];
  /** height h = y at the critical point */
  hv: number;
  /** Morse index: 0 = min, 1 = saddle, 2 = max */
  idx: number;
}

export interface Analysis {
  crit: CriticalPoint[];
  HMAX: number;
  RAD: number;
  /** Σ (-1)^index over the critical points — must equal the surface's χ.
      NaN when the height function is provably not Morse on this surface. */
  euler: number;
}

/* ------------------------------------------------------------------ */
/* the family                                                          */
/* ------------------------------------------------------------------ */

export const SURFACES: Surface[] = [
  {
    kind: 'lathe', name: 'S²', desc: 'the sphere', label: 'Sphere', chi: 2,
    rho: (v) => Math.sin(v),
    zeta: (v) => Math.cos(v),
    vRange: [0, Math.PI], vClosed: false,
  },
  {
    // revolves about the VERTICAL axis, so it stands upright; its height
    // function has just the two poles (blunt end down)
    kind: 'latheV', name: 'S²', desc: 'an egg, standing', label: 'Egg', chi: 2,
    rho: (v) => 0.88 * Math.sin(v) * (1 - 0.28 * Math.cos(v)),
    zeta: (v) => 1.15 * Math.cos(v),
    vRange: [0, Math.PI],
  },
  {
    kind: 'lathe', name: 'S²', desc: 'a sphere with a waist', label: 'Waisted S²', chi: 2,
    rho: (v) => Math.sin(v) * (1 + 0.90 * Math.cos(v) * Math.cos(v)),
    zeta: (v) => 1.35 * Math.cos(v),
    vRange: [0, Math.PI], vClosed: false,
  },
  {
    // six critical points in pairs (c₀,c₁,c₂) = (2,2,2) — same sphere,
    // a richer Morse function; Σ(-1)^index is still 2
    kind: 'lathe', name: 'S²', desc: 'a bumpy sphere', label: 'Bumpy S²', chi: 2,
    rho: (v) => Math.sin(v) * (1 + 0.30 * Math.cos(5 * v)),
    zeta: (v) => 1.30 * Math.cos(v),
    vRange: [0, Math.PI], vClosed: false,
  },
  {
    kind: 'lathe', name: 'T²', desc: 'the torus', label: 'Torus', chi: 0,
    rho: (v) => 1 + 0.42 * Math.cos(v),
    zeta: (v) => 0.42 * Math.sin(v),
    vRange: [0, TAU], vClosed: true,
  },
  {
    kind: 'lathe', name: 'T²', desc: 'a thin torus', label: 'Thin torus', chi: 0,
    rho: (v) => 1 + 0.26 * Math.cos(v),
    zeta: (v) => 0.26 * Math.sin(v),
    vRange: [0, TAU], vClosed: true,
  },
  {
    kind: 'lathe', name: 'T²', desc: 'a rippled torus', label: 'Rippled torus', chi: 0,
    rho: (v) => 1 + (0.40 * (1 + 0.22 * Math.cos(3 * v))) * Math.cos(v),
    zeta: (v) => (0.40 * (1 + 0.22 * Math.cos(3 * v))) * Math.sin(v),
    vRange: [0, TAU], vClosed: true,
  },
  {
    // the genus-2 upgrade: a tube around a standing figure-eight.
    // g(U,W) = U⁴ - U² + 0.06U³ + W² (the small U³ term breaks the
    // up/down symmetry so all six critical heights are distinct);
    // the surface is g² + (z/1.9)² = 0.16².
    kind: 'implicit', name: 'Σ₂', desc: 'a double torus', label: 'Double torus', chi: -2,
    F: (x, y, z) => {
      const U = y / 1.10, W = x / 0.85;
      const g = U * U * U * U - U * U + 0.06 * U * U * U + W * W;
      const Z = z / 1.9;
      return g * g + Z * Z - 0.0256;
    },
    bounds: [[-1.0, 1.0], [-1.35, 1.35], [-0.45, 0.45]],
  },
];

/* ------------------------------------------------------------------ */
/* analysis — dispatch on kind                                         */
/* ------------------------------------------------------------------ */

export function analyse(S: Surface): Analysis {
  if (S.kind === 'lathe') return analyseLathe(S);
  if (S.kind === 'latheV') return analyseLatheV(S);
  return analyseImplicit(S);
}

function analyseLathe(S: LatheSurface): Analysis {
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
      const p = S.rho(v);
      crit.push({ pos: [p * Math.cos(u), p * Math.sin(u), S.zeta(v)], hv: p * s, idx });
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

function analyseLatheV(S: VerticalLatheSurface): Analysis {
  const [v0, v1] = S.vRange;
  const d = 1e-4;
  const zp = (v: number) => (S.zeta(v + d) - S.zeta(v - d)) / (2 * d);
  // Morse verification: h = ζ(v) is constant on parallels, so an interior
  // ζ' = 0 with ρ > 0 would be a critical CIRCLE (degenerate). Require ζ
  // strictly monotone in the interior and poles (ρ → 0) at both ends.
  const M = 400;
  let sign = 0;
  let monotone = true;
  for (let i = 1; i < M; i++) {
    const v = v0 + ((v1 - v0) * i) / M;
    const s = Math.sign(zp(v));
    if (s === 0) { monotone = false; break; }
    if (sign === 0) sign = s;
    else if (s !== sign) { monotone = false; break; }
  }
  const poleEnds = S.rho(v0) < AXIS_EPS && S.rho(v1) < AXIS_EPS;
  let HMAX = 0, RAD = 0;
  for (let i = 0; i <= M; i++) {
    const v = v0 + ((v1 - v0) * i) / M;
    HMAX = Math.max(HMAX, Math.abs(S.zeta(v)));
    RAD = Math.max(RAD, Math.hypot(S.rho(v), S.zeta(v)));
  }
  if (!monotone || !poleEnds) {
    // provably not a Morse height function → refuse (euler NaN never
    // equals chi, so tests fail and the runtime filter excludes it)
    return { crit: [], HMAX, RAD, euler: NaN };
  }
  const ends = [v0, v1].map((v) => ({ pos: [0, S.zeta(v), 0] as [number, number, number], hv: S.zeta(v) }));
  ends.sort((a, b) => a.hv - b.hv);
  const crit: CriticalPoint[] = [
    { ...ends[0]!, idx: 0 }, // bottom pole — the min
    { ...ends[1]!, idx: 2 }, // top pole — the max
  ];
  for (const k of crit) HMAX = Math.max(HMAX, Math.abs(k.hv));
  const euler = crit.reduce((acc, k) => acc + (k.idx === 1 ? -1 : 1), 0);
  return { crit, HMAX, RAD, euler };
}

/* ---- implicit surfaces ------------------------------------------- */

const H1 = 1e-4, H2 = 2e-3;
type F3 = (x: number, y: number, z: number) => number;
const pd = (F: F3, i: number, p: number[]): number => {
  const q = [...p]; q[i]! += H1;
  const r = [...p]; r[i]! -= H1;
  return (F(q[0]!, q[1]!, q[2]!) - F(r[0]!, r[1]!, r[2]!)) / (2 * H1);
};
const pdd = (F: F3, i: number, j: number, p: number[]): number => {
  if (i === j) {
    const q = [...p]; q[i]! += H2;
    const r = [...p]; r[i]! -= H2;
    return (F(q[0]!, q[1]!, q[2]!) - 2 * F(p[0]!, p[1]!, p[2]!) + F(r[0]!, r[1]!, r[2]!)) / (H2 * H2);
  }
  const pp = [...p]; pp[i]! += H2; pp[j]! += H2;
  const pm = [...p]; pm[i]! += H2; pm[j]! -= H2;
  const mp = [...p]; mp[i]! -= H2; mp[j]! += H2;
  const mm = [...p]; mm[i]! -= H2; mm[j]! -= H2;
  return (
    (F(pp[0]!, pp[1]!, pp[2]!) - F(pm[0]!, pm[1]!, pm[2]!) - F(mp[0]!, mp[1]!, mp[2]!) + F(mm[0]!, mm[1]!, mm[2]!)) /
    (4 * H2 * H2)
  );
};

function solve3(A: number[][], b: number[]): number[] | null {
  const M = A.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    if (Math.abs(M[piv]![c]!) < 1e-14) return null;
    [M[c], M[piv]] = [M[piv]!, M[c]!];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / M[c]![c]!;
      for (let k = c; k < 4; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  return [M[0]![3]! / M[0]![0]!, M[1]![3]! / M[1]![1]!, M[2]![3]! / M[2]![2]!];
}

function analyseImplicit(S: ImplicitSurface): Analysis {
  const { F, bounds } = S;
  // Newton search for F = Fx = Fz = 0 (∇F vertical ⇒ h = y critical)
  const seeds: number[][] = [];
  const [xb, yb, zb] = bounds;
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 15; j++)
      for (let k = 0; k < 5; k++)
        seeds.push([
          xb[0] + ((xb[1] - xb[0]) * i) / 6,
          yb[0] + ((yb[1] - yb[0]) * j) / 14,
          zb[0] + ((zb[1] - zb[0]) * k) / 4,
        ]);
  const crit: CriticalPoint[] = [];
  for (const seed of seeds) {
    let p = [...seed];
    let ok = false;
    for (let it = 0; it < 60; it++) {
      const E = [F(p[0]!, p[1]!, p[2]!), pd(F, 0, p), pd(F, 2, p)];
      if (Math.abs(E[0]!) < 1e-10 && Math.abs(E[1]!) < 1e-9 && Math.abs(E[2]!) < 1e-9) { ok = true; break; }
      const J = [
        [pd(F, 0, p), pd(F, 1, p), pd(F, 2, p)],
        [pdd(F, 0, 0, p), pdd(F, 0, 1, p), pdd(F, 0, 2, p)],
        [pdd(F, 2, 0, p), pdd(F, 2, 1, p), pdd(F, 2, 2, p)],
      ];
      const st = solve3(J, E.map((e) => -e));
      if (!st) break;
      const lim = 0.25; // damped step keeps Newton inside the basin
      p = [
        p[0]! + Math.max(-lim, Math.min(lim, st[0]!)),
        p[1]! + Math.max(-lim, Math.min(lim, st[1]!)),
        p[2]! + Math.max(-lim, Math.min(lim, st[2]!)),
      ];
      if (p.some((c, i2) => c < bounds[i2 as 0 | 1 | 2][0] - 0.5 || c > bounds[i2 as 0 | 1 | 2][1] + 0.5)) break;
    }
    if (!ok) continue;
    if (crit.some((q) => Math.hypot(q.pos[0] - p[0]!, q.pos[1] - p[1]!, q.pos[2] - p[2]!) < 5e-3)) continue;
    const Fy = pd(F, 1, p);
    if (Math.abs(Fy) < 1e-6) continue; // not a graph over (x,z) here — reject
    // Hessian of the local height graph y = g(x,z)
    const a = -pdd(F, 0, 0, p) / Fy;
    const b2 = -pdd(F, 0, 2, p) / Fy;
    const c = -pdd(F, 2, 2, p) / Fy;
    const tr = a + c, det = a * c - b2 * b2;
    if (Math.abs(det) < 1e-6) continue; // degenerate → not Morse
    const idx = det < 0 ? 1 : tr < 0 ? 2 : 0;
    crit.push({ pos: [p[0]!, p[1]!, p[2]!], hv: p[1]!, idx });
  }
  crit.sort((a, b) => a.hv - b.hv);
  let HMAX = 0;
  for (const k of crit) HMAX = Math.max(HMAX, Math.abs(k.hv));
  // RAD from coarse slice geometry — used only for view scaling
  let RAD = 0;
  for (let i = 0; i <= 12; i++) {
    const y = yb[0] + ((yb[1] - yb[0]) * i) / 12;
    for (const seg of sliceSegments(S, y, 40))
      for (const q of seg) RAD = Math.max(RAD, Math.hypot(q[0], q[1], q[2]));
  }
  const euler = crit.reduce((acc, k) => acc + (k.idx === 1 ? -1 : 1), 0);
  return { crit, HMAX, RAD, euler };
}

/* ------------------------------------------------------------------ */
/* implicit-surface geometry (marching squares)                        */
/* ------------------------------------------------------------------ */

export type Seg3 = [[number, number, number], [number, number, number]];

/** trace G = 0 over a 2D grid; emit line segments via marching squares */
function marchingSquares(
  G: (a: number, b: number) => number,
  a0: number, a1: number, b0: number, b1: number,
  n: number,
  toWorld: (a: number, b: number) => [number, number, number],
): Seg3[] {
  const segs: Seg3[] = [];
  const da = (a1 - a0) / n, db = (b1 - b0) / n;
  const val: number[][] = [];
  for (let i = 0; i <= n; i++) {
    val[i] = [];
    for (let j = 0; j <= n; j++) val[i]![j] = G(a0 + i * da, b0 + j * db);
  }
  const lerp = (p: number, q: number) => (p === q ? 0.5 : p / (p - q));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v00 = val[i]![j]!, v10 = val[i + 1]![j]!, v01 = val[i]![j + 1]!, v11 = val[i + 1]![j + 1]!;
      const m = (v00 < 0 ? 1 : 0) | (v10 < 0 ? 2 : 0) | (v11 < 0 ? 4 : 0) | (v01 < 0 ? 8 : 0);
      if (m === 0 || m === 15) continue;
      const ax = a0 + i * da, bx = b0 + j * db;
      // edge intersection points (parameter along each cell edge)
      const bottom: [number, number] = [ax + da * lerp(v00, v10), bx];
      const top: [number, number] = [ax + da * lerp(v01, v11), bx + db];
      const left: [number, number] = [ax, bx + db * lerp(v00, v01)];
      const right: [number, number] = [ax + da, bx + db * lerp(v10, v11)];
      const emit = (p: [number, number], q: [number, number]) =>
        segs.push([toWorld(p[0], p[1]), toWorld(q[0], q[1])]);
      switch (m) {
        case 1: case 14: emit(left, bottom); break;
        case 2: case 13: emit(bottom, right); break;
        case 3: case 12: emit(left, right); break;
        case 4: case 11: emit(top, right); break;
        case 6: case 9: emit(bottom, top); break;
        case 7: case 8: emit(left, top); break;
        case 5: emit(left, bottom); emit(top, right); break; // ambiguous — resolve as two
        case 10: emit(left, top); emit(bottom, right); break;
      }
    }
  }
  return segs;
}

/** horizontal slice y = const — a TRUE level set of the height function */
export function sliceSegments(S: ImplicitSurface, y: number, n = 84): Seg3[] {
  const [xb, , zb] = S.bounds;
  return marchingSquares(
    (x, z) => S.F(x, y, z),
    xb[0], xb[1], zb[0], zb[1], n,
    (x, z) => [x, y, z],
  );
}

/** vertical section through the y-axis at angle φ (meridian-like curves) */
export function sectionSegments(S: ImplicitSurface, phi: number, n = 84): Seg3[] {
  const [xb, yb, zb] = S.bounds;
  const rmax = Math.max(
    Math.abs(xb[0]), Math.abs(xb[1]), Math.abs(zb[0]), Math.abs(zb[1]),
  ) * 1.05;
  const c = Math.cos(phi), s = Math.sin(phi);
  return marchingSquares(
    (r, y) => S.F(r * c, y, r * s),
    -rmax, rmax, yb[0], yb[1], n,
    (r, y) => [r * c, y, r * s],
  );
}
