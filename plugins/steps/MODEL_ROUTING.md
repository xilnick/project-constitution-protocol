# Model routing

How the steps protocol maps its six roles onto two model tiers, and how each harness binds
those tiers to concrete models.

The protocol is harness-agnostic. The roles, the phase loop, and the rules are the same
everywhere; only the agent manifests (file format, tool names, model ids) differ per harness.
Those manifests live under `harnesses/`. This file is the single source of truth for the model
routing — every harness manifest's `model`/`model_reasoning_effort` field must agree with the
binding table below.

## Roles → tier → model class

| Role | Tier | Model class | Writes | Model does |
|---|---|---|---|---|
| `repo-scout` | 1 | cheap fast reader | Context Digest (report) | map the tree, interfaces, entrypoints, utilities |
| `steps-planner` | 1 | cheap long-context reader | `PLAN.md` | read the tree, draft a plan with failing gates |
| `steps-plan-reviewer` | 1 | hard-reasoning reviewer | `REVIEW.md` | review a plan in a clean context, return a verdict |
| `steps-implementer` | 1 | cheap fast coder | code | execute items, run gates, never weaken a gate |
| `steps-impl-reviewer` | 1 | hard-reasoning reviewer | `IMPL-REVIEW.md` | read real files, run gates, catch gate weakening |
| `steps-architect-pro` | 2 | heavy architect (planning only) | `PLAN.md` | invariants, ordering, failure modes, per-item gates |

## Complexity gate

The orchestrator picks a tier per phase, never per item. The ladder itself — the tiers, the stages
each one runs, and the escalation triggers — is declared in `ai-docs/constitution.yaml` under
`constitution.execution`; this section is its prose.

| Tier | Entry | Stages | Plans with | Escalates to |
|---|---|---|---|---|
| **Tier 0 (Fast-Track / Planning Bypass)** | a typo, an isolated single-line fix, a doc or config tweak | implement | nobody | Tier 1 |
| **Tier 1 (Standard)** | CRUD, a component edit, a local fix, a dependency bump | plan, review, implement | `steps-planner` | Tier 2 |
| **Tier 2 (Architectural)** | DB migration, protocol change, cross-cutting refactor, distributed logic or race-condition reasoning | plan, review, implement | `steps-architect-pro` | — |

Each stage is its own skill — `steps-plan`, `steps-review`, `steps-implement` — loaded when the
tier calls for it. Implement appears in every tier: it is what makes leaving the others out a
decision rather than a gamble. Review runs twice in a planned phase, once after the plan and once
after the implementation, one reviewer each with a clean context.

Tier 2 is rare by design: routing the architect for a standard phase is a defect, not thoroughness.
Implementation is **always** `steps-implementer` (Tier 1), and no Tier-2 model writes code.

### Escalation

A phase starts at the lowest tier its entry criterion admits, and climbs when a runtime signal says
that tier was the wrong bet. The triggers are declared in
`constitution.execution.escalation_triggers`:

| Trigger | Detected by | Action |
|---|---|---|
| `gate-failed` | `steps-impl-reviewer` | report the failing gate verbatim and name the tier to escalate to; never fix it |
| `hidden-coupling` | `steps-implementer` | stop varying details, report the verbatim error, request escalation |
| `circuit-breaker` | orchestrator | on the second distinct failure, roll back (`git checkout -- .`) and re-dispatch `steps-implementer` |

Escalating adds the roles the tier was missing rather than restarting the phase: a Tier-0 task whose
gate fails becomes a Tier-1 phase with a plan; a Tier-1 phase that surfaces an invariant nobody
planned for is re-planned by the architect at Tier 2. Roles compose to the tier, not the other way
round — `steps-implementer` ➔ gate at Tier 0, `steps-planner` ➔ `steps-plan-reviewer` ➔
`steps-implementer` ➔ `steps-impl-reviewer` at Tier 1, the architect planning it at Tier 2.

The orchestrator records the tier it chose, and any escalation with its trigger, in
`ORCHESTRATOR-LOG.md`. For a Tier-0 task that log line is the only artifact, so it is not optional.

### The verification gate

Tier 0's only review is the implementer's own self-check plus the verification command, so the
command has to resolve to something real. Resolve it in the order declared in
`constitution.execution.verification_command_resolution`:

1. `constitution.verification_command` in `ai-docs/constitution.yaml`.
2. The gate command named in `.factory/CONSTITUTION.md` or `CONSTITUTION.md`.
3. The project's own test script (`npm test` or equivalent).

If none of the three resolves, Tier 0 is unavailable: the phase starts at Tier 1, where the plan
supplies per-item gates instead.

## Hard rules

- Tier-2 models never write code.
- Context into a Tier-2 agent is distilled conclusions from Tier-1 work — paths, gate outputs,
  findings — never raw file dumps. Tier-2 returns structured reasoning plus the plan.
- Every agent runs each gate read-only and records its current (failing) output as evidence; no
  gate is reported as passing before implementation.
- Constitution check (graceful degradation): the plan reviewer checks `ai-docs/constitution.yaml`,
  `.factory/CONSTITUTION.md` or `CONSTITUTION.md` if present — a violation is a blocker; if none
  exists, it falls back to a basic engineering audit without failing the pipeline.

## Per-harness bindings

The tables bind each role to a concrete model. Non-Droid entries are **example defaults** — replace
them with the models your providers actually expose. The role→tier mapping above is what must not
change; the concrete ids are yours to own.

### Claude Code (native)

The canonical manifests are `agents/*.md`. Set `model:` on each, or leave `inherit` to use the
session model:

| Role | `model` |
|---|---|
| `repo-scout` | a fast cheap model (e.g. `claude-haiku-*`) |
| `steps-planner` | a fast cheap model (e.g. `claude-haiku-*`) |
| `steps-plan-reviewer`, `steps-impl-reviewer` | a strong reasoning model (e.g. `claude-sonnet-*`) |
| `steps-implementer` | a fast cheap model (e.g. `claude-haiku-*`) |
| `steps-architect-pro` | your strongest model (e.g. `claude-opus-*`) |

### Droid (`harnesses/droid/`)

| Role | `model` | `reasoningEffort` |
|---|---|---|
| `repo-scout` | `custom:~deepseek/deepseek-v4-flash-latest` | `low` |
| `steps-planner` | `gpt-5.6-luna` | `medium` |
| `steps-plan-reviewer`, `steps-impl-reviewer` | `custom:minimax/minimax-m3-0` | `high` |
| `steps-implementer` | `custom:~deepseek/deepseek-v4-flash-latest` | `medium` |
| `steps-architect-pro` | `custom:qwen/qwen-3.8-max-0` | `high` |

### Codex CLI (`harnesses/codex/`)

| Role | `model` | `model_reasoning_effort` |
|---|---|---|
| `repo-scout` | `gpt-5.6-luna` | `low` |
| `steps-planner` | `gpt-5.6-terra` | `medium` |
| `steps-plan-reviewer`, `steps-impl-reviewer` | `gpt-5.6-terra` | `high` |
| `steps-implementer` | `gpt-5.6-luna` | `medium` |
| `steps-architect-pro` | `gpt-5.6` | `high` |

### OpenCode (`harnesses/opencode/`)

| Role | `model` (`provider/model-id`) |
|---|---|
| `repo-scout` | `anthropic/claude-haiku-4-20250514` |
| `steps-planner` | `anthropic/claude-haiku-4-20250514` |
| `steps-plan-reviewer`, `steps-impl-reviewer` | `anthropic/claude-sonnet-4-20250514` |
| `steps-implementer` | `openai/gpt-5.1-codex` |
| `steps-architect-pro` | `anthropic/claude-sonnet-4-20250514` |

### Antigravity (`harnesses/antigravity/`)

| Role | `model` |
|---|---|
| `repo-scout` | `flash` |
| `steps-planner`, `steps-implementer` | `flash` |
| `steps-plan-reviewer`, `steps-impl-reviewer` | `flash` |
| `steps-architect-pro` | `flash` |

Antigravity's `model` is a tier, not a model id: `inherit`, `flash`, or `pro`. The thinking level
(low/medium/high) is session-level — `agy --effort`, or the `/model` variant
`gemini-3.8-flash-low` / `-medium` / `-high` — not a subagent field, so every role binds to `flash`
and inherits the session effort. The harness renders as a plugin bundle
(`harnesses/antigravity/`); see `harnesses/README.md` for the install command.
