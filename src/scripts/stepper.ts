/* The Lean proof stepper. The code lines and the initial goal state are
   server-rendered in Playground.astro (readable with JS disabled); this
   script only drives the stepping. */

import { CODE, PROOF } from '../data/proofs/zero-add';

export function initStepper(): void {
  const codeEl = document.getElementById('code');
  const goalsEl = document.getElementById('goals');
  const countEl = document.getElementById('goalCount');
  const progEl = document.getElementById('prog');
  const stepBtn = document.getElementById('stepBtn') as HTMLButtonElement | null;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement | null;
  if (!codeEl || !goalsEl || !countEl || !progEl || !stepBtn || !resetBtn) return;

  let step = 0; // number of lines executed (0..CODE.length)

  function renderCode(): void {
    codeEl!.innerHTML = CODE.map((line, i) => {
      let cls = 'ln';
      if (i === step) cls += ' active'; // line about to run / just ran
      else if (i < step) cls += ' done';
      return `<span class="${cls}">${line || ' '}</span>`;
    }).join('');
  }

  function renderGoals(): void {
    const state = step === 0 ? PROOF[0]! : PROOF[step - 1]!;
    const goals = state.goals;
    if (goals.length === 0) {
      countEl!.textContent = '0 goals';
      goalsEl!.innerHTML = `<div class="solved">🎉 no goals — <span style="font-family:var(--disp)">Q.E.D.</span></div>`;
      return;
    }
    countEl!.textContent = goals.length === 1 ? '1 goal' : `${goals.length} goals`;
    goalsEl!.innerHTML = goals
      .map((g) => {
        const cs = g.case ? `<span class="case">case ${g.case}</span>` : '';
        const hy = g.hyps.map((x) => `<div class="hyp">${x}</div>`).join('');
        return `<div class="goal">${cs}${hy}<div><span class="turn">⊢</span> <span class="tgt">${g.target}</span></div></div>`;
      })
      .join('');
  }

  function sync(): void {
    renderCode();
    renderGoals();
    progEl!.textContent = `${step} / ${CODE.length}`;
    const done = step >= CODE.length;
    // disabling a focused button silently drops keyboard focus to <body>;
    // hand it to Reset instead so a keyboard user keeps their place
    const hadFocus = document.activeElement === stepBtn;
    stepBtn!.disabled = done;
    stepBtn!.textContent = done ? 'Done ✓' : 'Step ▸';
    if (done && hadFocus) resetBtn!.focus();
  }

  stepBtn.addEventListener('click', () => {
    if (step < CODE.length) {
      step++;
      sync();
    }
  });
  resetBtn.addEventListener('click', () => {
    step = 0;
    sync();
  });
}
