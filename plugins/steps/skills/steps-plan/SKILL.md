---
name: steps-plan
description: "Turn one phase into an ordered list of work items, each with a command that fails now and passes when the item is done. Use when a phase needs a plan before code is written, when a rejected plan must be rewritten, or when a roadmap item has to become executable steps."
---

# steps-plan

The `plan` stage of the steps protocol. Run it alone, or let the `steps` orchestrator run it as part
of a phase.

## Why the stage exists

A plan whose middle items have no harness discovers everything at the end. The output is not a
description of the work — it is a sequence in which each item can fail on its own, before the next
one starts.

## When you need it

Always plan before writing code on non-trivial work (Tier 0 is strictly for typos). Run standalone in
a dedicated planning session parallel to an active implementer session, staging upcoming phases
into `.plans/` and uncovering latent system opportunities.

## How to run it

1. Scouting (optional): 1–3 scouts run in parallel across codebase (`repo-scout`), docs, or coupling (digest ≤ 3k tokens).
2. Authoring: one planner writes `.plans/phase-N/PLAN.md` per `procedures/step-planning.md` with atomic items and failing gates. In speculative mode (`procedures/speculative-planning.md`), anchor on upstream contracts.
3. Proactive discovery: uncover latent capabilities and missing system opportunities, noting them as suggestions for future phases without burdening the implementer.
4. Synthesis: candidate plans undergo cross-phase synthesis (`procedures/plan-synthesis.md`) before review.

Both agents carry their own rules; this skill does not restate them.

## Done when

`PLAN.md` exists, every item names its files and its gate, each gate's current (failing) output is
recorded, and the ordering answers *what fails now if this item is done wrong* for every item.

## Next

`steps-review` if the plan is worth a second pair of eyes, otherwise `steps-implement`.
