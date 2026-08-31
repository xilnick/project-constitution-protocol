# Project Agent Instructions

Activate the `pcp` skill and follow its instructions.

## Project Conventions

This repository is a Claude Code **plugin marketplace**, not a single skill. It ships two plugins.

### Layout

- `.claude-plugin/marketplace.json` — marketplace manifest, named `pcp`, listing both plugins.
- `plugins/pcp/` — the Project Constitution Protocol plugin.
  - `.claude-plugin/plugin.json`
  - `skills/pcp/` — `SKILL.md`, `procedures/`, `scripts/pcp.js`, `examples/`
  - `skills/constitution-query/`, `skills/code-intelligence/`, `skills/adr-manager/` — the
    governance-query, semantic-discovery and ADR-lifecycle skills. Each one's frontmatter
    `description` is the only place its activation rule is written; do not restate it here.
- `plugins/steps/` — the phased-execution plugin.
  - `.claude-plugin/plugin.json`
  - `skills/steps/SKILL.md` — the protocol, and the source of truth for the agents.
  - `MODEL_ROUTING.md` — role→tier→model class, the complexity gate, the escalation triggers, and
    the per-harness model bindings.
  - `agents/` — `steps-planner`, `steps-plan-reviewer`, `steps-reconciler`, `steps-implementer`,
    `steps-impl-reviewer`, `steps-fixer`, `steps-architect-pro`, `repo-scout`, `step-verifier`.
  - `harnesses/` — per-harness agent manifests: `codex/`, `claude-code/`, `opencode/`, `droid/`,
    `antigravity/`.
- `ai-docs/` — the queried constitution: `constitution.yaml`, `decisions/`, `specs/`.
- `tests/` — `pcp_skill.test.js` (the `pcp` CLI), `constitution_skills.test.js` (constitution
  schema, skill frontmatter, ADR synchronization), `recipe-exec.test.js` (every documented recipe,
  executed), and `lib/repo-guard.mjs --selftest`. The default run covers those four; the mutation
  harness and the install smoke test have their own scripts (`test:mutation`, `test:smoke`).

The PCP CLI lives at `plugins/pcp/skills/pcp/scripts/pcp.js`. `package.json`'s `main` and the test
suite's `skillDir` constant both point there; move the skill and both must move with it.

### Conventions

- `plugins/steps/skills/steps/SKILL.md` is canonical for the steps protocol. The agent briefs are
  the mechanism it describes — they must agree with it and must not restate it at length. Neither
  plugin ships a `commands/` directory: the skills are the entrypoints, and `/steps` invokes the
  steps skill itself.
- Agent frontmatter follows the shape used by the official `feature-dev` plugin: `name`,
  `description`, `tools`, `model`, `color`. Wrong frontmatter makes the artifact silently
  undiscoverable.
- Reviewer and planner agents are given no `Edit` tool. The tool model cannot scope `Write` to a
  path, so each such agent's body states the restriction instead.
- The steps role briefs in `agents/` are canonical. The manifests under `harnesses/` are generated
  from them and differ only in frontmatter, an H1 title line, and harness tool names (Droid's
  `Create` and `Execute` for `Write` and `Bash`). A role change belongs in `agents/` first, then is
  regenerated into `harnesses/`.
- Model routing is specified in `MODEL_ROUTING.md`; the `model`/`model_reasoning_effort` field of
  every harness manifest must agree with its tables.

## Execution

The steps protocol governs execution: `plugins/steps/skills/steps/SKILL.md` for the phase loop,
`plugins/steps/MODEL_ROUTING.md` for the complexity gate and the escalation ladder. The tiers and
their escalation triggers are declared once, in `ai-docs/constitution.yaml` under
`constitution.execution`; those docs are that block's prose. Do not restate the ladder anywhere
else — a fifth copy is how the four drifted apart.

## Strict Tool Routing

1. **Progressive disclosure.** No repository-wide grep, deep recursive file scans, or raw full-file
   dumping. Inspect symbols, call graphs, and module dependencies through `tokensave` or the RTK
   CLI; query governance through the `constitution-query` skill.
2. **RTK fallback.** When a filtered or semantic command truncates, drops, or omits required
   execution logs or compiler diagnostics, re-run it as `rtk proxy <cmd>` to inspect the complete
   output.
3. **Index staleness.** Check with `tokensave tool status`; refresh the index when modifications
   exceed the staleness cooldown, or when a lookup fails to resolve a newly introduced export.
4. **The gate.** Before completing a phase or committing, run the resolved verification command
   (`npm test` here — resolution order in `MODEL_ROUTING.md`) and confirm exit code 0.
