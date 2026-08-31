# Model routing

How the steps protocol maps its nine roles onto two model tiers, and how each harness binds
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
| `steps-reconciler` | 1 | cheap long-context reader | `PLAN.md` v2, `RECONCILIATION.md` | fold review findings, dispositions |
| `steps-implementer` | 1 | cheap fast coder | code | execute items, run gates, never weaken a gate |
| `steps-plan-reviewer` | 1 | hard-reasoning reviewer | `REVIEW-<lens>.md` | one lens, verdict, catch a plan's holes |
| `steps-impl-reviewer` | 1 | hard-reasoning reviewer | `IMPL-REVIEW-<lens>.md` | one lens, read real files, catch gate weakening |
| `step-verifier` | 1 | hard-reasoning reviewer | gate-results report | run gates independently, check acceptance criteria |
| `steps-architect-pro` | 2 | heavy architect (planning only) | `PLAN.md` or `REVIEW-<lens>.md` | invariants, ordering, failure modes, per-item gates |
| `steps-fixer` | 2 | heavy debugger | code, own files only | deadlock escape, fix the class not the instance |

## Complexity gate

The orchestrator routes **planning** per phase, never per item:

- **Tier 0 (Fast-Track / Planning Bypass)** — Micro or trivial edits such as typos, single-line or isolated bug fixes, or simple documentation/config tweaks. Tier 0 completely bypasses the multi-agent planning and review waves, routing execution directly to `steps-implementer` (Tier 1 fast cheap coder), immediately followed by the automated verification gate (`verification_command`). The orchestrator never touches code directly.
- **Tier 1 (Standard)** — CRUD, a component edit, a local fix, a dependency bump: `steps-planner` (Tier 1).
- **Tier 1.5 (Middle)** — plan cheap with `steps-planner`, then dispatch `steps-architect-pro` as an extra
  plan-review lens (critic, never author), keeping the wave at three reviewers or fewer.
- **Tier 2 (Architectural)** — DB migration, protocol change, cross-cutting refactor, distributed logic or
  race-condition reasoning: `steps-architect-pro` (Tier 2). Rare by design; routing the architect
  for a standard phase is a defect, not thoroughness.

Implementation is **always** `steps-implementer` (Tier 1). The only Tier-2 model that writes code
is `steps-fixer`, and only as the deadlock escape: the same failure has survived two distinct
fixes, the implementer stops and reports verbatim, and the orchestrator escalates instead of
re-dispatching the flash coder.

## Hard rules

- Tier-2 models never write code, with one exception: `steps-fixer`.
- Context into a Tier-2 agent is distilled conclusions from Tier-1 work — paths, gate outputs,
  findings — never raw file dumps. Tier-2 returns structured reasoning plus the plan.
- Every agent runs each gate read-only and records its current (failing) output as evidence; no
  gate is reported as passing before implementation.
- Constitution check (graceful degradation): the plan reviewer checks `.factory/CONSTITUTION.md`
  or `CONSTITUTION.md` if present — a violation is a blocker; if absent, it falls back to a basic
  engineering audit without failing the pipeline.
- Circuit breaker with git checkpoints: record git state before each step; on the second distinct
  failure, roll back (`git checkout -- .`) and escalate to `steps-fixer` with the full logs. This
  is distinct from the normal fix wave for reviewer-found blockers.

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
| `steps-planner`, `steps-reconciler` | a fast cheap model (e.g. `claude-haiku-*`) |
| `steps-plan-reviewer`, `steps-impl-reviewer` | a strong reasoning model (e.g. `claude-sonnet-*`) |
| `steps-implementer` | a fast cheap model (e.g. `claude-haiku-*`) |
| `steps-architect-pro` | your strongest model (e.g. `claude-opus-*`) |
| `step-verifier` | a strong reasoning model (e.g. `claude-sonnet-*`) |
| `steps-fixer` | your strongest model (e.g. `claude-opus-*`) |

### Droid (`harnesses/droid/`)

| Role | `model` | `reasoningEffort` |
|---|---|---|
| `repo-scout` | `custom:~deepseek/deepseek-v4-flash-latest` | `low` |
| `steps-planner`, `steps-reconciler` | `custom:z-ai/glm-5.3-flash-0` | `medium` |
| `steps-plan-reviewer`, `steps-impl-reviewer` | `custom:minimax/minimax-m3-0` | `high` |
| `steps-implementer` | `custom:~deepseek/deepseek-v4-flash-latest` | `medium` |
| `steps-architect-pro` | `custom:qwen/qwen-3.8-max-0` | `high` |
| `step-verifier` | `custom:minimax/minimax-m3-0` | `medium` |
| `steps-fixer` | `custom:deepseek/deepseek-v4-pro-0813-0` | `high` |

### Codex CLI (`harnesses/codex/`)

| Role | `model` | `model_reasoning_effort` |
|---|---|---|
| `repo-scout` | `gpt-5.6-luna` | `low` |
| `steps-planner`, `steps-reconciler` | `gpt-5.6-terra` | `medium` |
| `steps-plan-reviewer`, `steps-impl-reviewer` | `gpt-5.6-terra` | `high` |
| `steps-implementer` | `gpt-5.6-luna` | `medium` |
| `steps-architect-pro` | `gpt-5.6` | `high` |
| `step-verifier` | `gpt-5.6-terra` | `medium` |
| `steps-fixer` | `gpt-5.6` | `max` |

### OpenCode (`harnesses/opencode/`)

| Role | `model` (`provider/model-id`) |
|---|---|
| `repo-scout` | `anthropic/claude-haiku-4-20250514` |
| `steps-planner`, `steps-reconciler` | `anthropic/claude-haiku-4-20250514` |
| `steps-plan-reviewer`, `steps-impl-reviewer` | `anthropic/claude-sonnet-4-20250514` |
| `steps-implementer` | `openai/gpt-5.1-codex` |
| `step-verifier` | `anthropic/claude-sonnet-4-20250514` |
| `steps-architect-pro`, `steps-fixer` | `anthropic/claude-sonnet-4-20250514` |

### Antigravity (`harnesses/antigravity/`)

| Role | `model` |
|---|---|
| `repo-scout` | `flash` |
| `steps-planner`, `steps-reconciler`, `steps-implementer` | `flash` |
| `steps-plan-reviewer`, `steps-impl-reviewer` | `pro` |
| `step-verifier` | `pro` |
| `steps-architect-pro`, `steps-fixer` | `pro` |
