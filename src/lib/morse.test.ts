import { describe, expect, test } from 'vitest';
import { SURFACES, analyse } from './morse';

/* The site's founding invariant: the hero must not be able to display
   something false. For every surface in the family — surfaces of
   revolution AND implicit surfaces — the critical points and indices
   derived numerically must satisfy Σ(-1)^index = χ. */
describe('Morse data derived from each surface', () => {
  for (const S of SURFACES) {
    test(`${S.name} (${S.desc}): Σ(-1)^index = χ = ${S.chi}`, () => {
      const A = analyse(S);
      expect(A.euler).toBe(S.chi); // NaN (non-Morse) also fails here, loudly
      expect(A.crit.length).toBeGreaterThan(0);
      for (const k of A.crit) {
        expect([0, 1, 2]).toContain(k.idx);
        expect(Math.abs(k.hv)).toBeLessThanOrEqual(A.HMAX + 1e-9);
        expect(k.pos[1]).toBeCloseTo(k.hv, 6); // hv IS the height coordinate
      }
      expect(A.HMAX).toBeGreaterThan(0);
      expect(A.RAD).toBeGreaterThan(0);
    });
  }

  test('the round sphere has exactly two critical points (a min and a max)', () => {
    const A = analyse(SURFACES[0]!);
    expect(A.crit).toHaveLength(2);
    expect(A.crit.map((k) => k.idx)).toEqual([0, 2]); // sorted by height
  });

  test('the standing egg (vertical axis) is Morse with exactly the two poles', () => {
    const egg = SURFACES.find((s) => s.desc === 'an egg, standing')!;
    const A = analyse(egg);
    expect(A.crit).toHaveLength(2);
    expect(A.crit.map((k) => k.idx)).toEqual([0, 2]);
    // both critical points sit ON the vertical axis
    for (const k of A.crit) {
      expect(k.pos[0]).toBeCloseTo(0, 9);
      expect(k.pos[2]).toBeCloseTo(0, 9);
    }
  });

  test('the torus has exactly four critical points (min, two saddles, max)', () => {
    const T = SURFACES.find((s) => s.desc === 'the torus')!;
    const A = analyse(T);
    expect(A.crit).toHaveLength(4);
    expect(A.crit.map((k) => k.idx)).toEqual([0, 1, 1, 2]); // sorted by height
  });

  test('the double torus: six critical points (1,4,1) at distinct heights, χ = -2', () => {
    const D = SURFACES.find((s) => s.desc === 'a double torus')!;
    const A = analyse(D);
    expect(A.crit).toHaveLength(6);
    expect(A.crit.map((k) => k.idx)).toEqual([0, 1, 1, 1, 1, 2]); // sorted by height
    // Morse in the strong sense: all critical heights distinct
    for (let i = 1; i < A.crit.length; i++) {
      expect(A.crit[i]!.hv - A.crit[i - 1]!.hv).toBeGreaterThan(0.05);
    }
    expect(A.euler).toBe(-2);
  });

  test('every genus-2 shape variant keeps six critical points (1,4,1)', () => {
    for (const S of SURFACES.filter((s) => s.name === 'Σ₂')) {
      const A = analyse(S);
      expect(A.crit.map((k) => k.idx), S.desc).toEqual([0, 1, 1, 1, 1, 2]);
    }
  });

  test('the triple tori: eight critical points (1,6,1) at distinct heights, χ = -4', () => {
    const tris = SURFACES.filter((s) => s.name === 'Σ₃');
    expect(tris.length).toBeGreaterThan(0);
    for (const S of tris) {
      const A = analyse(S);
      expect(A.crit, S.desc).toHaveLength(8);
      expect(A.crit.map((k) => k.idx), S.desc).toEqual([0, 1, 1, 1, 1, 1, 1, 2]);
      for (let i = 1; i < A.crit.length; i++) {
        expect(A.crit[i]!.hv - A.crit[i - 1]!.hv, S.desc).toBeGreaterThan(0.05);
      }
      expect(A.euler, S.desc).toBe(-4);
    }
  });
});
