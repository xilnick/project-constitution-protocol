---
name: steps
description: "Run a roadmap or multi-phase plan to completion under separation of duties — plan, review the plan, implement, review the implementation, fix, verify, commit, next phase. Use when the user asks to work through a roadmap, execute a plan in phases, or orchestrate agents across planning and implementation. Triggers include 'go through the roadmap', 'run this in phases', 'plan then implement then review', 'you are the orchestrator'."
---

# steps

A protocol for running a roadmap through to the end without the agent grading its own homework.

The central rule: **the agent that writes a thing never reviews it.** Everything else here follows
from that, or from a defect that got through because it was violated.

## Roles

You are the **orchestrator**. You do not write the plan, the implementation, or the review. You
decide the phases, dispatch the agents, reconcile what comes back, run the gates yourself, and
commit. Your scarcest resource is your own context: never read a full diff, never read a full plan,
never re-run a search you delegated. Ask for conclusions, not file dumps.

| Role | Writes | Never does |
|---|---|---|
| Planner | `PLAN.md` | Touch code |
| Plan reviewer (one per lens) | `REVIEW-<lens>.md` | Touch code, review its own plan |
| Reconciler | `PLAN.md` v2, `RECONCILIATION.md` | Touch code |
| Implementer | code | Review itself, commit, weaken a gate |
| Implementation reviewer (one per lens) | `IMPL-REVIEW-<lens>.md` | Touch code |
| Fix agent (one per area) | code, in its own files only | Touch another agent's files |
| Orchestrator | phase list, log, commits | Any of the above |

## Starting

If the invocation named a file, read it. Otherwise look for `ROADMAP.md`, `PLAN.md`, `TODO.md`,
`.plans/PHASES.md`, or a roadmap section in `README.md` / `AGENTS.md` / `CLAUDE.md`. If several
exist, name them and ask which. If `.plans/` already exists this is a resume, not a start: read
`PHASES.md` and `ORCHESTRATOR-LOG.md` first and report which phases are already done before
proposing anything.

Then write `.plans/PHASES.md` — the ordered phases, each with a one-line acceptance criterion that
is **checkable by a command**, plus a section naming what is out of scope and why. A phase whose
criterion cannot be checked by running something is not a phase yet: split it or harness it.
Present the list compactly; do not dump the file.

Then ask the two questions, in one message, once, and apply the answers to every remaining phase
rather than asking again:

1. **Commit per phase, or work on a branch?** If a branch, which name.
2. **How much of the roadmap in this pass?** All of it, through phase N, or a budget.

Do not begin phase 1 until both are answered.

## The phase loop

For each phase, in order. Do not skip a step because the phase looks small — the steps that catch
things are the ones that feel redundant.

1. **Plan.** One planner writes `.plans/phase-N/PLAN.md`.
2. **Review the plan.** Two or three reviewers, **one lens each**, in a single wave. Typical lenses:
   *design/spec consistency*, *executability and gates*, *coverage*. Each writes its own file and
   gives a verdict of `approve` / `approve-with-amendments` / `reject`.
3. **Reconcile.** A separate agent folds every finding into `PLAN.md` v2 and records a disposition
   per finding in `RECONCILIATION.md`: `accept`, `accept-modified` (say how), or `reject` (evidence,
   not preference). Nothing is dropped silently. v2 reads as one coherent plan, never v1 plus errata.
4. **Implement.** One implementer executes v2 item by item.
5. **Review the implementation.** Reviewers in one wave, one lens each: *correctness and regression*,
   *conformance to plan and gate integrity*. They read the actual files — a code graph or index
   lags the edits just made.
6. **Run a code-review pass** for the lens the others do not cover: reuse, simplification,
   efficiency, dead state.
7. **Fix.** One agent per area, in parallel, under **strict file ownership** (below).
8. **Verify yourself.** Run every gate. Do not accept a green report you did not reproduce.
9. **Record.** Update the roadmap and the project's intent record with numbers you measured this
   session, not numbers you copied.
10. **Commit.** One commit per phase. Then the next phase.

Dispatch each wave as **one message with several agent calls** — the same calls spread over several
turns run serially. Track phases with a todo list.

| Step | Agent | Writes |
|---|---|---|
| Plan | `steps-planner` (one) | `.plans/phase-N/PLAN.md` |
| Review plan | `steps-plan-reviewer` (2-3, one lens each) | `REVIEW-<lens>.md` |
| Reconcile | `steps-reconciler` (one) | `PLAN.md` v2, `RECONCILIATION.md` |
| Implement | `steps-implementer` (one) | code |
| Review implementation | `steps-impl-reviewer` (2-3, one lens each) | `IMPL-REVIEW-<lens>.md` |
| Fix | `steps-fixer` (one per area, strict ownership) | code, own files only |

Those agent names ship with this skill. Where a harness does not have them, spawn a generic
subagent per row and paste the role's brief into it — the roles are the protocol, the named agents
are only a convenience.

## Rules that were paid for

Each of these exists because something got through without it.

**Agent reports are data, not truth.** Verify a claim by opening the file or running the command.
A cited `path:line` that turns out to be wrong is the highest-value finding a reviewer can produce.
Reviewers should be told this explicitly, and so should reconcilers reading reviews.

**A blocker is something that makes the work wrong, not something you would have done differently.**
Say so in every review brief, or you get twelve stylistic notes and miss the two real defects.

**Never make a gate pass by weakening it.** No new skip-list entry, no loosened assertion, no
narrowed glob, no expectation downgraded to something easier, no test rewritten to match whatever
the implementation emitted. If a gate must legitimately change scope, that is a reported decision,
not a quiet edit. Have a reviewer diff every gate file against the pre-phase state and answer one
question: does this gate now check *more* or *less*?

**Ask for the class, not the instance.** When you send an agent to fix a defect, require it to
enumerate every place the same class could occur and report the enumeration. A pass that recurses
on one node kind silently skips every form whose children are of another kind; a lowering that is
wrong at one type is usually wrong at the others. In practice the enumeration finds a second
instance more often than not, and the second instance is the one no review found.

**Two components agreeing on a wrong answer is not agreement.** Any gate that works by comparing
two implementations is blind to a defect they share. Give such a gate a *declared expected result*
for at least the cases that matter, so it can fail while both sides agree.

**"Exercised" is not "works".** A thing called once, at one type, in one shape, is evidence about
that call and nothing else. Coverage counted by *mentions* is fakeable and will be faked by
accident; count what actually executed. Before trusting a coverage number, try to construct the
cheapest edit that raises it without raising real coverage — if you can, the metric is wrong.

**Every number in a status document is re-measured or it is not written.** A figure copied from an
agent's report into a roadmap is an assertion wearing the costume of a measurement. Require the
command that produced it.

**Each work item must be able to fail before the next one starts.** A plan whose middle items have
no harness is a plan that discovers everything at the end. When reviewing a plan, ask of every item:
what fails, right now, if this item is done wrong? An item with no answer is misordered.

**Ask what a conformant-but-wrong implementation would still pass.** Put this question in every plan
review brief. It is the single highest-yield question in the protocol.

## Fanning out safely

Independent work goes out as **one message with several agent calls** — the same calls spread over
several turns run serially. Split by question-axis (area, layer, lens), not by file count, and keep
zones non-overlapping or the reports duplicate each other. Three to five agents is a normal wave;
one is fine.

When two agents write code at once, give each an explicit ownership list:

> **You own:** `<paths>`. **You must not touch:** `<paths>`. Another agent is editing those
> concurrently. If a gate fails in its area, report it — do not fix it. Expect the tree to move
> under you.

And tell each which gates to run and which to leave alone, so neither interprets the other's
half-finished state as its own failure.

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
- **The reply format**: conclusions only. Name the fields you want. Say "no file dumps" — the
  orchestrator's context is the thing being protected.

## Artifacts

```
.plans/
  PHASES.md              the phase list, with what is out of scope and why
  ORCHESTRATOR-LOG.md    cross-phase findings, ownership decisions, per-phase status
  phase-N/
    PLAN.md              v2 after reconciliation, in place
    RECONCILIATION.md    a row per review finding, with its disposition
    REVIEW-<lens>.md
    IMPL-REVIEW-<lens>.md
```

`ORCHESTRATOR-LOG.md` is the file that earns its keep. When a finding in one phase constrains
another — a defect two phases discovered independently, a decision about which phase owns a fix,
a number that turns out to mean something other than what it says — it goes there, with the
ownership call made explicitly. Otherwise it is rediscovered, or worse, fixed twice.

## Stopping

Stop and ask the user only when proceeding under any assumption would be unsafe, or would make the
work useless if the assumption is wrong. Everything else is a judgment call you make and state.

Decisions genuinely worth one question: whether to commit per phase or work in a branch, and how
much of the roadmap to run in this pass. Ask those once, at the start, and apply the answer to
every remaining phase rather than asking again.

Report a phase as done when the gates you ran yourself are green and the phase's stated acceptance
criterion is met — not when the implementer says so. If part of a phase is blocked, finish
everything else and say plainly what was left and why.
