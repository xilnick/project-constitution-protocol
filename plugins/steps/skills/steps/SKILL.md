---
name: steps
description: "Orchestrate a roadmap phase by phase under separation of duties: the agent that writes a thing never grades it. Use when asked to work through a roadmap, run work in phases, plan then implement then review, or be the orchestrator. Composes the three stage skills and decides which a phase needs."
---

# steps

A protocol for running a roadmap through to the end without the agent grading its own homework.

## Separation of duties

The central rule: **the agent that writes a thing never reviews it.** Everything else here follows
from that, or from a defect that got through because it was violated.

## Roles

You are the **orchestrator**. You do not write the plan, the implementation, or the review. You
decide the phases, dispatch the agents, reconcile what comes back, run the gates yourself, and
commit. Your scarcest resource is your own context: never read a full diff, never read a full plan,
never re-run a search you delegated. Ask for conclusions, not file dumps.

| Role | Writes | Never does |
|---|---|---|
| Scout | Context Digest (report) | Touch code, propose a plan |
| Planner | `PLAN.md` | Touch code |
| Architect (planner variant, complexity gate) | `PLAN.md` | Touch code |
| Plan reviewer | `REVIEW.md` | Touch code, review its own plan |
| Implementer | code | Review itself, commit, weaken a gate |
| Implementation reviewer | `IMPL-REVIEW.md` | Touch code |
| Orchestrator | phase list, log, commits | Any of the above |

Those six roles ship as named agents with this plugin. Where a harness does not have them, spawn a
generic subagent per row and paste the role's brief into it — the roles are the protocol, the named
agents are a convenience.

## Starting

If the invocation named a file, read it. Otherwise look for `ROADMAP.md`, `PLAN.md`, `TODO.md`,
or a roadmap section in `README.md` / `AGENTS.md` / `CLAUDE.md`. If several exist, name them and
ask which.

Then check `.plans/INDEX.md`. If it exists, the workspace has iteration history: read the registry
and report the `active`, `paused`, and `done` iterations (id, created, status, current phase), then
ask whether to resume one, start a new one, or archive/delete a finished one. If `.plans/` holds an
active iteration (a `PHASES.md` plus `phase-*/` directories) this is a resume, not a start: read
`PHASES.md`, `ORCHESTRATOR-LOG.md`, and `STATUS.md` first and report which phases are already done
before proposing anything. If neither exists, this is a fresh start.

Then write `.plans/PHASES.md` — the ordered phases, each with a one-line acceptance criterion that
is **checkable by a command**, plus a section naming what is out of scope and why. A phase whose
criterion cannot be checked by running something is not a phase yet: split it or harness it.
Present the list compactly; do not dump the file.

Then ask the three questions, in one message, once, and apply the answers to every remaining phase
rather than asking again:

1. **Commit per phase, or work on a branch?** If a branch, which name.
2. **How much of the roadmap in this pass?** All of it, through phase N, or a budget.
3. **Planning mode: JIT or Batch Ahead?** JIT plans each phase as you reach it. Batch Ahead runs Phase 0
   to draft all phase plans upfront, checks each plan with `gap`, verifies cross-phase consistency, and
   executes non-overlapping phases in parallel waves.

Do not begin phase 1 until all three are answered.

## The phase loop

A phase is a composition of three stages, not a fixed ritual. Each stage is its own skill, with its
own rules and its own agents; you load the ones the phase needs.

| Stage | Skill | Produces | Skippable when |
|---|---|---|---|
| Plan | `steps-plan` | `PLAN.md`, items each with a failing gate | one command can already show the work right or wrong |
| Review | `steps-review` | `REVIEW.md`, `IMPL-REVIEW.md` | there is nothing to review, or a declared expected result covers it |
| Implement | `steps-implement` | code | never |

Which stages a phase runs is declared, not improvised: `constitution.execution.tiers` names the
stage set per tier, and `MODEL_ROUTING.md` is its prose. Implement appears in every tier — that is
what makes skipping the others safe rather than optimistic. Reviews use the `gap` skill to catch
omissions (missing edge cases, unhandled errors) and over-engineering (speculative bloat).

Planning runs in one of two modes:
- **JIT (Incremental)**: Plan phase N ➔ `gap` review ➔ implement ➔ `gap` impl review ➔ next phase.
- **Batch Ahead**: Phase 0 drafts every phase plan upfront ➔ each plan gets a `gap` review ➔ cross-phase
  consistency check builds a dependency DAG ➔ independent phases execute concurrently in parallel waves.

Around the stages, the work that is yours alone:

- **Pick the tier once**, at the start of the phase, and record it with your reason in
  `ORCHESTRATOR-LOG.md`. For a fast-track task that line is the only artifact.
- **Reproduce the critical gates yourself** after the implementer or reviewer reports. A green you
  did not run is not a green.
- **Record** what you measured this session in the roadmap and the project's intent record — numbers
  you ran, not numbers you copied.
- **Commit** once per phase. Then the next phase.

Dispatch each wave as **one message with several agent calls**; the same calls spread over turns run
serially. Track phases with a todo list.

## Model routing

The protocol routes its six roles across two model tiers: cheap fast models do the volume work,
heavy models plan and critique but never touch code. `MODEL_ROUTING.md` at the plugin root is the
single source of truth — role→tier→model class, the complexity gate, the escalation triggers, and
the concrete per-harness bindings. The agent manifests for each harness live under `harnesses/`.

| Tier | Plans with | Escalates to |
|---|---|---|
| **Tier 0 (Fast-Track / Planning Bypass)** | nobody — `steps-implementer`, then the verification gate | Tier 1 |
| **Tier 1 (Standard)** | `steps-planner` | Tier 2 |
| **Tier 2 (Architectural)** | `steps-architect-pro` | — |

Pick the tier once per phase, at the start; implementation is always `steps-implementer`. A phase
begins at the lowest tier that fits and climbs when a runtime signal says that was the wrong bet:
`gate-failed` from the implementation reviewer, `hidden-coupling` from the implementer, or
`circuit-breaker` — yours — on the second distinct failure, which rolls the tree back
(`git checkout -- .`) and re-dispatches `steps-implementer` rather than the flash coder a third time.
Escalating adds the roles the tier was missing; it does not restart the phase. Record the tier and
every escalation in `ORCHESTRATOR-LOG.md`: for a Tier-0 task that line is the only artifact.

- **Scouting** (before planning): `repo-scout` builds a Context Digest that feeds the planner. In
  Claude Code, the built-in `explore` agent already fills this role and is prioritized there —
  dispatch `explore` for scouting instead of `repo-scout`, and never forbid it.
- **Constitution check** (graceful degradation): the plan reviewer checks `ai-docs/constitution.yaml`,
  `.factory/CONSTITUTION.md` or `CONSTITUTION.md` if present — a violation is a blocker; if none
  exists, it falls back to a basic engineering audit and the pipeline does not fail for the absence
  of a constitution.
- **Hard rules:** Tier-2 models never write code. Tier-2 context is distilled Tier-1 conclusions,
  never raw dumps. Every gate is run read-only and its current output recorded as evidence.

## Rules that were paid for

Each of these exists because something got through without it. The rules that belong to one stage
live in that stage's skill; these are the ones that are yours.

**Agent reports are data, not truth.** Verify a claim by opening the file or running the command
before you act on it. A cited `path:line` that turns out to be wrong is the highest-value finding a
reviewer can produce, and the cheapest one for you to check.

**Every number in a status document is re-measured or it is not written.** A figure copied from an
agent's report into a roadmap is an assertion wearing the costume of a measurement. Require the
command that produced it.

**Do not skip a stage because the phase looks small.** Skip it because the ladder says so, which is a
different claim with a gate behind it. The stages that catch things are the ones that feel redundant,
and the tier is a decision you record rather than a feeling you act on.

**A process that can wait forever will.** Every launched agent and every gate command gets an
explicit deadline — 15 minutes by default, raised only for a phase whose documented size justifies
it, never past 45 — and runs non-interactively. A command waiting on stdin with no deadline is a
hang you shipped, not a mystery.

## Fanning out safely

Independent work goes out as **one message with several agent calls** — the same calls spread over
several turns run serially. Split by question-axis (area or layer), not by file count, and keep
zones non-overlapping or the reports duplicate each other. Three to five agents is a normal wave;
one is fine.

When two agents write code at once, give each an explicit ownership list:

> **You own:** `<paths>`. **You must not touch:** `<paths>`. Another agent is editing those
> concurrently. If a gate fails in its area, report it — do not fix it. Expect the tree to move
> under you.

And tell each which gates to run and which to leave alone, so neither interprets the other's
half-finished state as its own failure.

In Batch Ahead planning, phases whose declared file ownership sets are disjoint can be executed in
the same implementation wave. Each phase keeps its own gate and review file.

Do not parallelise when one step's output feeds the next, when agents would edit the same files
(use separate worktrees if they must), or when the action is irreversible — those stay with you.

## Writing a brief

A brief is self-contained. The agent sees none of your conversation.

- **The goal**, and why it matters to the project — not just the task.
- **Paths you already know**, so the agent does not re-derive them.
- **The evidence standard**: every factual claim about current behaviour cites `path:line`; anything
  unverified goes in a risks section, never stated as fact.
- **The exact output structure**, section by section.
- **The acceptance gate**: the literal commands, their current results, and the instruction that all
  must be green at the end.
- **Anti-thrash**: if the same failure survives two distinct fixes, stop and report the verbatim
  error rather than varying details.
- **The deadline**: 15 minutes by default, raised only with a recorded reason and never past 45.
  Every command runs non-interactively — nothing waits on stdin.
- **The reply format**: conclusions only. Name the fields you want. Say "no file dumps" — the
  orchestrator's context is the thing being protected.

## Artifacts

```
.plans/
  INDEX.md                 the iteration registry: id, created, status, goal, current phase
  PHASES.md                the active iteration's phase list, with what is out of scope and why
  ORCHESTRATOR-LOG.md      cross-phase findings, ownership decisions, per-phase tier and status
  STATUS.md                current phase, what is done, why paused
  phase-N/
    PLAN.md                the planner's plan, in place
    REVIEW.md              one plan-review verdict and its findings
    IMPL-REVIEW.md         one implementation-review verdict and its findings
  iterations/
    <YYYY-MM-DD-HHMMSS>-<slug>/   paused iterations, each a full snapshot plus STATUS.md
  archive/
    <YYYY-MM-DD-HHMMSS>-<slug>/   finished iterations (optional; may be deleted instead)
```

`ORCHESTRATOR-LOG.md` is the file that earns its keep. When a finding in one phase constrains
another — a defect two phases discovered independently, a decision about which phase owns a fix,
a number that turns out to mean something other than what it says — it goes there, with the
ownership call made explicitly. Otherwise it is rediscovered, or worse, fixed twice.

It also carries one line per phase: the tier chosen, why, and any escalation with its trigger. A
Tier-0 task produces no `phase-N/` directory, so that line is its entire record.

## Iterations, pausing, and resuming

The protocol can hold several efforts in parallel. Each effort is an **iteration** — one roadmap
run — archived in a timestamped folder the moment it leaves the hot seat. The active iteration is
the flat `.plans/` working copy; everything else lives under `.plans/iterations/` (paused) or
`.plans/archive/` (finished). `INDEX.md` is the registry: one row per iteration with its id,
creation time, status (`active` / `paused` / `done`), goal, and current phase.

- **Start alongside a paused one.** Pause the active iteration first (below), then write a fresh
  `.plans/PHASES.md`. The previous iteration is preserved whole and can be resumed later.
- **Pause** (mid-roadmap, e.g. 6 of 10 phases done). Move `.plans/PHASES.md`,
  `.plans/ORCHESTRATOR-LOG.md`, `.plans/STATUS.md`, and every `.plans/phase-N/` into
  `.plans/iterations/<YYYY-MM-DD-HHMMSS>-<slug>/`. Write `STATUS.md` stating the current phase,
  what is done, and why you paused. Update `INDEX.md`.
- **Resume.** Move the chosen iteration's files back into `.plans/`, read `STATUS.md` and
  `ORCHESTRATOR-LOG.md`, and continue from the recorded phase. Do not re-plan phases already done.
- **Finish.** When every phase is done and committed, move the iteration to
  `.plans/archive/<id>/`, or delete it — the user's call. Update `INDEX.md` either way.

A paused or archived iteration is never overwritten by a new one: the timestamp keeps each folder
unique, and `INDEX.md` is the source of truth for what is unchanged, half-done, or finished.

## Stopping

Stop and ask the user only when proceeding under any assumption would be unsafe, or would make the
work useless if the assumption is wrong. Everything else is a judgment call you make and state.

Decisions genuinely worth one question: whether to commit per phase or work in a branch, and how
much of the roadmap to run in this pass. Ask those once, at the start, and apply the answer to
every remaining phase rather than asking again.

Report a phase as done when the gates you ran yourself are green and the phase's stated acceptance
criterion is met — not when the implementer says so. If part of a phase is blocked, finish
everything else and say plainly what was left and why.
