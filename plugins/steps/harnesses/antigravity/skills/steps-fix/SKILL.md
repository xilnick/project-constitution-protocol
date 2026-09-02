---
name: steps-fix
description: "Repair review blockers by area under strict file ownership, fixing the whole class of a defect rather than the reported instance. Use when reviews returned blockers, or when the same failure has survived two distinct fixes and the tree was rolled back."
---

# steps-fix

The `fix` stage of the steps protocol.

## Why the stage exists

The review named an instance; the defect is usually a class. A pass that recurses on one node kind
skips every form whose children are of another kind. In practice the enumeration finds a second
instance more often than not, and the second one is what no review found.

## When you need it

When a review returned a blocker, or when the circuit breaker tripped — the same failure survived two
distinct fixes, so the tree was rolled back (`git checkout -- .`) and the repair goes to a heavier
model instead of a third attempt from the same one. Skip the stage when neither happened.

## How to run it

One `steps-fixer` per area, in **one message**, each with an explicit ownership list: the paths it
owns, the paths another agent is editing right now, and which gates to run. A failure outside a
fixer's zone is reported, not fixed — it is probably someone else's half-finished state.

## Done when

Every assigned finding is fixed or reported unfixed with a reason, each one carries its class
enumeration, and no fixer touched a file it did not own.

## Next

`steps-verify` again. A fix is not done because the fixer says so.
