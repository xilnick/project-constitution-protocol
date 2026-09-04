---
name: steps-review
description: "Review a plan or an implementation with a single reviewer holding a clean context, then hand the findings back for the author to apply. Use when a plan exists and must be checked before code is written, or when an implementation is complete and nothing is committed yet."
---

# steps-review

The `review` stage of the steps protocol, covering both review points: before implementation, and
after it.

## Why the stage exists

The agent that writes a thing cannot grade it. Everything here follows from that, or from a defect
that got through because it was violated.

## When you need it

When a gate could pass while the work is wrong. Skip it when there is no plan to review, or when a
single item carries a declared expected result that a gate can check on its own.

## How to run it

1. One reviewer at each review point, dispatched in a **fresh context**. `steps-plan-reviewer` checks
   `PLAN.md` before implementation; `steps-impl-reviewer` checks the implementation after it, running
   the gates itself rather than trusting the implementer's green. A single reviewer evaluates design,
   gates, omissions, and anti-overengineering (`gap` skill) together.
2. Findings go back to the author, not to a third party. Plan blockers return to `steps-planner`,
   which rewrites the plan whole; implementation blockers return to `steps-implementer`, which fixes
   the class of the defect and re-runs the gates.

## The two questions worth the wave

Ask the plan reviewer: **what would a conformant-but-wrong implementation still pass?** Ask the
implementation reviewer, of each gate file touched: **does this gate now check more, or less?**

## Done when

The review file carries a verdict and every blocker names its evidence; blockers were handed back to
the author for application.

## Next

`steps-implement` when the plan is approved, or back to `steps-plan` when the plan reviewer found
blockers; after implementation, back to `steps-implement` when the implementation reviewer found
blockers, otherwise commit.
