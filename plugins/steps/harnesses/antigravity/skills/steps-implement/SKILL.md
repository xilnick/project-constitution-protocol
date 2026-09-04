---
name: steps-implement
description: "Execute a change item by item, running each item's gate before starting the next. Use when a plan is approved and code must be written, or for a fast-track change that needs no plan at all. Never weakens a gate to make it pass."
---

# steps-implement

The `implement` stage of the steps protocol. It is never skipped — something has to write the change.

## Why the stage exists

Separately from writing code, it enforces one thing: a gate runs after each item, not after all of
them. A phase that batches its gates to the end learns everything at the end.

## How to run it

One `steps-implementer` executes items in order within its declared `owns` boundary. In parallel
waves, peer implementers edit disjoint zones in the tree or in `.worktrees/<phase-id>`. With no plan,
the phase verification command is the whole item list — make the change, run it, report. The
implementer never reviews itself or commits; the orchestrator handles review, gates, and integration.

The implementer re-reads its own diff once before reporting: the change does what the plan asked,
nothing more, nothing less, and no gate was weakened to make it green. That self-check is the first
verification pass; on a planned phase a separate implementation reviewer is the second, on a
fast-track change the orchestrator reproduces the gate itself.

## The rule that cannot bend

Never make a gate pass by weakening it: no new skip entry, no loosened assertion, no narrowed glob,
no test rewritten to match what the code emitted. A gate that must legitimately change scope is a
reported decision. An implementer that cannot finish an item as written stops and reports it rather
than improvising a different item.

## Escalation

Two distinct fixes that leave the same failure, or coupling the plan did not anticipate, is the
`hidden-coupling` trigger: report the verbatim error and hand the tier decision back.

## Done when

Every item is done or explicitly reported undone, and each one's gate was run with its output
recorded.

## Next

`steps-review` when the phase was planned; a fast-track change goes straight to the orchestrator,
which reproduces the gate and commits.
