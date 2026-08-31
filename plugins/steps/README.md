# steps

Run a roadmap phase by phase without the agent grading its own homework.

The central rule: **the agent that writes a thing never reviews it.** A planner writes the plan,
different agents review it, a third folds the findings in, an implementer executes, reviewers who
did not write the code check it, and the orchestrator runs every gate itself before calling
anything done.

## Install

```
/plugin marketplace add xilnick/project-constitution-protocol
/plugin install steps@pcp
```

Then `/steps`, optionally with a roadmap path or a phase number to resume from:

```
/steps ROADMAP.md
/steps 3
```

## The phase loop

Per phase, in order:

0. **Scout** — one `repo-scout` builds the phase's Context Digest for the planner.
1. **Plan** — one planner writes `PLAN.md`: work items, each with a gate that fails now.
2. **Review the plan** — two or three reviewers, one lens each, in one wave.
3. **Reconcile** — a separate agent folds every finding into `PLAN.md` v2 and dispositions each one
   in `RECONCILIATION.md`. Nothing is dropped silently.
4. **Implement** — one implementer executes v2 item by item.
5. **Review the implementation** — reviewers in one wave, one lens each, reading the actual files.
6. **Code-review pass** — reuse, simplification, efficiency, dead state.
7. **Fix** — one agent per area, in parallel, under strict file ownership.
8. **Verify yourself** — the orchestrator runs every gate. A green report it did not reproduce is
   not a green gate.
9. **Record** — roadmap and intent record updated with numbers measured this session.
10. **Commit** — one commit per phase.

## Artifacts

```
.plans/
  INDEX.md               the iteration registry: id, created, status, goal, current phase
  PHASES.md              the phase list, with what is out of scope and why
  ORCHESTRATOR-LOG.md    cross-phase findings, ownership decisions, per-phase tier and status
  STATUS.md              current phase, what is done, why paused
  phase-N/
    PLAN.md              v2 after reconciliation, in place
    RECONCILIATION.md    a row per review finding, with its disposition
    REVIEW-<lens>.md
    IMPL-REVIEW-<lens>.md
  iterations/<id>/       paused iterations, each a full snapshot plus STATUS.md
  archive/<id>/          finished iterations
```

Several roadmaps can be in flight: the active iteration is the flat `.plans/` working copy, and
pausing moves it whole into `iterations/<timestamp>-<slug>/` so a new one can start beside it.

## Agents

`steps-planner`, `steps-plan-reviewer`, `steps-reconciler`, `steps-implementer`,
`steps-impl-reviewer`, `steps-fixer`, `steps-architect-pro`, `repo-scout`, `step-verifier`. Each is
a standing brief for its role and can be dispatched directly, not only through `/steps`.
`repo-scout` builds the pre-planning Context Digest; `step-verifier` runs the gates independently
after implementation; `steps-architect-pro` is the heavy Tier-2 planner for architectural phases
and a plan-review critic on Tier 1.5 (Middle) phases, and it never writes code.

## Model routing and harnesses

The nine roles map onto two model tiers — cheap fast models for volume work, heavy models for
planning and deadlock escape. The routing (role→tier, the complexity gate, per-harness model
bindings) lives in [`MODEL_ROUTING.md`](MODEL_ROUTING.md), and installable agent manifests for
Codex CLI, Claude Code, OpenCode, Factory Droid, and Antigravity live under
[`harnesses/`](harnesses/).

## When not to use it

The full wave is heavy machinery. A reviewed phase costs six or more agent dispatches, a directory
of artifacts, and a good deal of wall-clock time, and it buys one thing: defects caught by someone
other than the author.

The complexity gate is what keeps that cost proportionate. A typo, a rename, a config tweak, or
anything you can verify in one command enters at Tier 0 — the implementer and its gate, no plan and
no review wave — and climbs only when a gate actually fails. Reach for the full wave when the work
spans several phases, when a gate could be weakened without anyone noticing, or when a defect
surfacing late would cost more than the overhead.

What the protocol will not do is decide for you that a roadmap is worth running. A protocol applied
where it is not needed teaches people to skip it where it is.
