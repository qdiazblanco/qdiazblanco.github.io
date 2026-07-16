import { describe, expect, test } from 'vitest';
import { SURFACES, analyse } from './morse';

/* The site's founding invariant: the hero must not be able to display
   something false. For every surface in the family, the critical points
   and indices derived from the profile ρ must satisfy Σ(-1)^index = χ. */
describe('Morse data derived from each profile ρ', () => {
  for (const S of SURFACES) {
    test(`${S.name} (${S.desc}): Σ(-1)^index = χ = ${S.chi}`, () => {
      const A = analyse(S);
      expect(A.euler).toBe(S.chi);
      expect(A.crit.length).toBeGreaterThan(0);
      for (const k of A.crit) {
        expect([0, 1, 2]).toContain(k.idx);
        expect(Math.abs(k.hv)).toBeLessThanOrEqual(A.HMAX + 1e-9);
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

  test('the torus has exactly four critical points (min, two saddles, max)', () => {
    const T = SURFACES.find((s) => s.desc === 'the torus')!;
    const A = analyse(T);
    expect(A.crit).toHaveLength(4);
    expect(A.crit.map((k) => k.idx)).toEqual([0, 1, 1, 2]); // sorted by height
  });
});
