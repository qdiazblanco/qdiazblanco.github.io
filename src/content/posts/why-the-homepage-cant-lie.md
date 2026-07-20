---
title: "Why the homepage can't lie"
description: "The animation on my homepage asserts a theorem every time it runs. Here's the small pact that keeps it honest."
date: 2026-07-20
tags: [math, meta]
kind: note
growth: seedling
draft: true
---

<!-- STARTER DRAFT (written by Claude as a pipeline test + first-post scaffold).
     Edit it into your own words — or delete it and write something else.
     Publish by changing `draft: true` to `draft: false`. -->

The animated surface on my homepage looks decorative, but it's making a
mathematical claim every second it runs. The dashed line is a genuine level set
of the height function — the projection is orthographic and the surface only
spins about the vertical axis, so *screen-vertical is the height function*. No
perspective tricks, because perspective would quietly lie.

As the line sweeps upward past the critical points, the site counts them:
$c_0$ minima, $c_1$ saddles, $c_2$ maxima. Morse theory says the alternating
sum is not up for negotiation:

$$
c_0 - c_1 + c_2 \;=\; \chi(\Sigma_g) \;=\; 2 - 2g .
$$

For the sphere that's $2$; for the torus, $0$; for the double torus that now
lives on the page, $-2$. The site doesn't take my word for it: the critical
points and their indices are *derived* — numerically, from the defining
functions — and a test suite asserts the sum equals $\chi$ for every surface
in the family. If I add a surface and get the topology wrong, the build fails
and the page refuses to draw it. The homepage physically cannot show me
something false about Morse theory. I find that funnier than I probably should.

The same pact holds one level up. Sublevel sets only change homotopy type when
the line crosses a critical value, and each crossing glues in a cell whose
dimension is the index — which is the whole reason the count works. In diagram
form, passing a critical point of index $k$ fits in the usual pair:

$$
\begin{CD}
S^{k-1} @>>> M_{a-\varepsilon} \\
@VVV @VVV \\
D^{k} @>>> M_{a+\varepsilon}
\end{CD}
$$

And because this site is also a Lean notebook: the proof stepper on the
[See a proof](/lean-proof) page runs the same policy. What it displays was
checked by a real compiler before it shipped — this exact file compiles:

```lean
import Mathlib.Data.Nat.Notation

theorem zero_add (n : ℕ) : 0 + n = n := by
  induction n with
  | zero => rfl
  | succ k ih => rw [Nat.add_succ, ih]
```

A rule I'm trying to hold myself to, in public: *if the site displays
mathematics, the mathematics must be machine-checked or derived — never
transcribed.* We'll see how long I last.
