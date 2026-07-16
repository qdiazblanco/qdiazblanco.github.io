/* The proof shown in the Lean stepper.
 *
 * VERIFIED against a real compiler on 2026-07-16:
 * compiles clean with Lean 4 (leanprover/lean4:v4.32.0-rc1) given
 * `import Mathlib.Data.Nat.Notation` (which provides the ℕ notation —
 * bare core Lean spells it `Nat`). The goal states below match the
 * compiler's `trace_state` output exactly. The displayed snippet omits
 * the import line, as snippets conventionally do.
 *
 * To swap in a new proof: create a sibling file exporting the same
 * shape (NAME, CODE, PROOF — same length!) and point Playground.astro
 * at it. Verify it with a real compiler first; a wrong proof is the
 * most damaging thing this site could ship.
 */

export interface Goal {
  case?: string;
  hyps: string[];
  target: string;
}

export interface ProofStep {
  goals: Goal[];
}

export const NAME = 'ZeroAdd.lean';

/* display lines (syntax-highlighted by hand — real-Lean rendering via
   LeanInk/Alectryon is a planned upgrade, see IDEAS.md) */
export const CODE: string[] = [
  `<span class="kw">theorem</span> <span class="fn">zero_add</span> (n : <span class="ty">ℕ</span>) : <span class="num">0</span> <span class="op">+</span> n <span class="op">=</span> n := <span class="kw">by</span>`,
  `  <span class="kw">induction</span> n <span class="kw">with</span>`,
  `  <span class="op">|</span> <span class="fn">zero</span> <span class="op">=&gt;</span> <span class="kw">rfl</span>`,
  `  <span class="op">|</span> <span class="fn">succ</span> k ih <span class="op">=&gt;</span> <span class="kw">rw</span> [<span class="ty">Nat.add_succ</span>, ih]`,
];

/* goal state AFTER executing each line */
export const PROOF: ProofStep[] = [
  { goals: [{ hyps: ['n : ℕ'], target: '0 + n = n' }] },
  {
    goals: [
      { case: 'zero', hyps: [], target: '0 + 0 = 0' },
      { case: 'succ', hyps: ['k : ℕ', 'ih : 0 + k = k'], target: '0 + (k + 1) = k + 1' },
    ],
  },
  {
    goals: [
      { case: 'succ', hyps: ['k : ℕ', 'ih : 0 + k = k'], target: '0 + (k + 1) = k + 1' },
    ],
  },
  { goals: [] }, // no goals — done
];
