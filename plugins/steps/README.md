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

## The stages

A phase composes five stages, and only two of them always run:

| Stage | Skill | Produces | Runs when |
|---|---|---|---|
| Plan | `steps-plan` | `PLAN.md`, each item with a gate that fails now | the change is more than one command can adjudicate |
| Review | `steps-review` | `REVIEW-<lens>.md`, `RECONCILIATION.md`, `IMPL-REVIEW-<lens>.md` | a gate could pass while the work is wrong |
| Implement | `steps-implement` | code | always |
| Verify | `steps-verify` | gate-results report | always |
| Fix | `steps-fix` | code, one agent per area | a review returned a blocker, or the circuit breaker tripped |

Which stages a phase runs is declared in `ai-docs/constitution.yaml` under
`constitution.execution`, with the prose in [`MODEL_ROUTING.md`](MODEL_ROUTING.md). Each stage is
invocable on its own, so `steps-verify` alone is a legitimate way to use this plugin.

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
a standing brief for its role and can be dispatched directly, not only through a stage.

The briefs are **rendered**: `roles/` holds each role's own prose, `partials/` holds the rules they
share, and `tools/render.mjs` composes `agents/` and every manifest under `harnesses/` from those
plus each harness's `profile.json`. Edit the source, run `npm run render`; `npm test` fails if the
committed output drifts. A role's write class in the source is what decides its tool surface,
permission map or sandbox on each harness — one place, five harnesses.

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
