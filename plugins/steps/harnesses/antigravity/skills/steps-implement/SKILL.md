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

One `steps-implementer` executes the items in order. With no plan, the phase's own verification
command is the whole item list — make the change, run it, report. The implementer does not review its
own work and does not commit; the orchestrator does both.

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

`steps-verify`, always.
