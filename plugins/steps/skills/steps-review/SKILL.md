---
name: steps-review
description: "Review a plan or an implementation through one lens per reviewer, then fold every finding into a single coherent result. Use when a plan exists and must be checked before code is written, when an implementation is complete and nothing is committed yet, or when reviewers disagree and one side has to lose on evidence."
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

1. Two or three reviewers in **one message**, **one lens each** — spreading them over turns runs them
   serially. Typical lenses: *design and spec consistency*, *executability and gates*, *coverage*
   before implementation; *correctness and regression*, *conformance and gate integrity*, *reuse and
   dead state* after it. On a Tier 1.5 phase `steps-architect-pro` may join as one extra critic lens.
2. One `steps-reconciler` folds every finding into `PLAN.md` v2 and records a disposition per finding
   in `RECONCILIATION.md`. Nothing is dropped silently; v2 reads as one plan, never v1 plus errata.

## The two questions worth the wave

Ask every plan reviewer: **what would a conformant-but-wrong implementation still pass?** Ask every
implementation reviewer, of each gate file touched: **does this gate now check more, or less?**

## Done when

Every review file has a verdict, every finding has exactly one disposition, and the counts match.

## Next

`steps-implement`, or `steps-fix` when the reviews returned blockers.
