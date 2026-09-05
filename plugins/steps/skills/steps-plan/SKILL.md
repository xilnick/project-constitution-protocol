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

When the change is bigger than one verification gate can adjudicate. If a single command can show
the work right or wrong, skip this stage: implement, then review, and let a failing gate escalate you
back here. That is the ladder working, not a corner cut.

## How to run it

1. Scouting (optional): for complex phases, 1–3 scouts run in parallel across codebase (`explore`/`repo-scout`),
   docs (`research`), or coupling, each returning a digest (≤ 3k tokens).
2. One planner writes `.plans/phase-N/PLAN.md` (`steps-planner` or `steps-architect-pro`), following
   the step-planning procedure (`procedures/step-planning.md`). Each work item names its files, its
   gate, and its prerequisite items.
3. The planner re-reads its plan: items name files and gates, dependencies have no cycles, and file
   ownership is declared. A plan failing self-check goes back to step 2 before reaching review.

Both agents carry their own rules; this skill does not restate them.

## Done when

`PLAN.md` exists, every item names its files and its gate, each gate's current (failing) output is
recorded, and the ordering answers *what fails now if this item is done wrong* for every item.

## Next

`steps-review` if the plan is worth a second pair of eyes, otherwise `steps-implement`.
