---
name: steps-verify
description: "Reproduce every gate independently and check each acceptance criterion against the actual result, without trusting the implementer's report. Use after any change, including a fast-track one where this is the only review it gets."
---

# steps-verify

The `verify` stage of the steps protocol. It is never skipped — it is what makes skipping the other
stages safe.

## Why the stage exists

A green report is a claim. Reproducing the gate is the difference between knowing and being told,
and it is the cheapest stage in the protocol.

## How to run it

One `step-verifier` runs each item's verification command verbatim, records the exact output, and
compares against the acceptance criterion rather than the implementer's claim — then the phase-wide
gates. With no plan present, the phase's own gate is the whole list. Then the orchestrator reproduces
the critical ones itself: **a green you did not reproduce is not a green.**

## Escalation

A failing gate is the `gate-failed` trigger, not merely a result. It names the tier to escalate to —
a fast-track task whose gate fails was never a fast-track task, and it becomes a planned phase rather
than a reviewed-after-the-fact one.

## Done when

Every gate has a verbatim result, every acceptance criterion is met or reported unmet, and anything
that could not run is recorded as uncertainty rather than as a pass.

## Next

`steps-fix` if something failed, otherwise record and commit.
