---
name: steps-plan
description: "Turn one phase into an ordered list of work items, each with a command that fails now and passes when the item is done. Use when a phase needs a plan before code is written, when a rejected plan must be rewritten, or when a roadmap item has to become executable steps."
---

# steps-plan

The `plan` stage of the steps protocol. Run it alone, or let the `steps` orchestrator run it as part
of a phase.

## Why the stage exists

A plan whose items have no harness discovers everything at the end. The output is an ordered
sequence where each item can fail independently before the next starts.

## When you need it

Plan before code on non-trivial work (Tier 0 is for typos). Run standalone parallel to an implementer
to stage upcoming phases into `.plans/`.

**Without a prompt**: When invoked without a task (e.g. `steps plan` in a new session), **wait for
the user's prompt**. Do not scout, speculate, or plan autonomously until instructed.

## How to run it

1. Scouting (optional): 1–3 scouts in parallel across code (`repo-scout`), docs, coupling (digest ≤ 3k tokens).
2. Authoring: one planner writes `.plans/phase-N/PLAN.md` directly to disk per `procedures/step-planning.md` with atomic items and failing gates. Always write to disk; never return solely in chat. Speculative mode (`procedures/speculative-planning.md`) anchors on upstream contracts.
3. Proactive discovery: uncover latent capabilities and suggest them for future phases without burdening the implementer.
4. Synthesis: candidate plans undergo cross-phase synthesis (`procedures/plan-synthesis.md`) before review.

Both agents carry their own rules; this skill does not restate them.

## Done when

`PLAN.md` exists on disk, every item names its files and its gate, each gate's current (failing) output is
recorded, and the ordering answers *what fails now if this item is done wrong* for every item. The
planner stops upon writing `PLAN.md`; it never implements or executes any step.

## Next

`steps-review` if the plan is worth a second pair of eyes, otherwise `steps-implement`.
