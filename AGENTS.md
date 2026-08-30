# Project Agent Instructions

Activate the `pcp` skill and follow its instructions.

## Project Conventions

This repository is a Claude Code **plugin marketplace**, not a single skill. It ships two plugins.

### Layout

- `.claude-plugin/marketplace.json` — marketplace manifest, named `pcp`, listing both plugins.
- `plugins/pcp/` — the Project Constitution Protocol plugin.
  - `.claude-plugin/plugin.json`
  - `skills/pcp/SKILL.md`, `skills/pcp/procedures/`, `skills/pcp/scripts/pcp.js`,
    `skills/pcp/examples/`
- `plugins/steps/` — the phased-execution plugin.
  - `.claude-plugin/plugin.json`
  - `skills/steps/SKILL.md` — the protocol, and the source of truth for the agents.
  - `MODEL_ROUTING.md` — the two-tier model routing: role→tier→model class, the complexity gate,
    and per-harness model bindings.
  - `agents/` — `steps-planner`, `steps-plan-reviewer`, `steps-reconciler`, `steps-implementer`,
    `steps-impl-reviewer`, `steps-fixer`, `steps-architect-pro`.
  - `harnesses/` — per-harness agent manifests: `codex/`, `claude-code/`, `opencode/`, `droid/`,
    `gemini-cli/`, `antigravity/`.
- `tests/pcp_skill.test.js` — the `pcp` CLI suite. Run with `npm test` from the repo root.

The PCP CLI lives at `plugins/pcp/skills/pcp/scripts/pcp.js`. `package.json`'s `main` and the test
suite's `skillDir` constant both point there; move the skill and both must move with it.

### Conventions

- `plugins/steps/skills/steps/SKILL.md` is canonical for the steps protocol. The agent briefs and
  the `/steps` command are the mechanism it describes — they must agree with it and must not
  restate it at length.
- Agent and command frontmatter follows the shape used by the official `feature-dev` plugin:
  agents carry `name`, `description`, `tools`, `model`, `color`; commands carry `description`,
  `argument-hint`, `allowed-tools`. Wrong frontmatter makes the artifact silently undiscoverable.
- Reviewer and planner agents are given no `Edit` tool. The tool model cannot scope `Write` to a
  path, so each such agent's body states the restriction instead.
- The steps role briefs in `agents/` are canonical. The manifests under `harnesses/` are generated
  from them and differ only in frontmatter (tools, model, file format). A role change belongs in
  `agents/` first, then is regenerated into `harnesses/`.
- Model routing is specified in `MODEL_ROUTING.md`; the `model`/`model_reasoning_effort` field of
  every harness manifest must agree with its tables.
