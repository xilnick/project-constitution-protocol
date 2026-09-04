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
  - `skills/steps/SKILL.md` — the orchestrator: separation of duties, the stage composition, the
    complexity gate, the artifacts.
  - `skills/steps-{plan,review,implement}/` — the three stages, each invocable on its own.
  - `MODEL_ROUTING.md` — role→tier→model class, the complexity gate, the escalation triggers, and
    the per-harness model bindings.
  - `roles/`, `partials/` — **the canonical source** for the six role briefs (`@pcp:d-82a0`).
  - `tools/render.mjs` — renders `agents/` and every `harnesses/` manifest from `roles/`, `partials/`
    and each harness's `profile.json`. Run `npm run render`; `npm test` runs `--check`.
  - `agents/`, `harnesses/*/` — **rendered output**, committed because installs copy it
    (`@pcp:c-6307`).
- `plugins/toolbelt/` — the habits that decide what an agent costs.
  - `.claude-plugin/plugin.json`
  - `skills/parallel/`, `skills/tokensave/`, `skills/search-tools/`
- `ai-docs/` — the queried constitution: `constitution.yaml`, `decisions/`, `specs/`. Its
  `constitution.execution` block declares the tier ladder, the stages each tier runs, and the
  escalation triggers.
- `tests/` — `pcp_skill.test.js` (the `pcp` CLI), `constitution_skills.test.js` (constitution
  schema, skill frontmatter, ADR synchronization), `recipe-exec.test.js` (every documented recipe,
  executed), and `lib/repo-guard.mjs --selftest`. The default run covers those four; the mutation
  harness and the install smoke test have their own scripts (`test:mutation`, `test:smoke`).

The PCP CLI lives at `plugins/pcp/skills/pcp/scripts/pcp.js`. `package.json`'s `main` and the test
suite's `skillDir` constant both point there; move the skill and both must move with it.

### Conventions

Each rule below is enforced here; the reasoning behind it is one `pcp read` away, never restated.

- `plugins/steps/skills/steps/SKILL.md` is canonical for the steps protocol; the agent briefs are the
  mechanism it describes and must not restate it at length (`@pcp:d-83c2`). Neither plugin ships a
  `commands/` directory — the skills are the entrypoints, `/steps` invokes the steps skill itself,
  and the repo-root `.claude/commands/pcp.md` is the one alias.
- Agent frontmatter follows the shape used by the official `feature-dev` plugin: `name`,
  `description`, `tools`, `model`, `color` (`@pcp:c-6c09`).
- Reviewer and planner agents are given no `Edit` tool, and each such agent's body states the
  restriction (`@pcp:d-f3ba`).
- A role change belongs in `plugins/steps/roles/<role>.md`, or in `partials/` when every role shares
  it; tool names, models and capability fields belong in a harness's `profile.json` (`@pcp:d-82a0`).
- Model routing is specified in `MODEL_ROUTING.md`; the `model`/`model_reasoning_effort` field of
  every harness manifest must agree with its tables.

## Execution

The steps protocol governs execution: `plugins/steps/skills/steps/SKILL.md` composes the phases and
`plugins/steps/MODEL_ROUTING.md` holds the complexity gate and the escalation ladder. Both are prose
for a single declaration — `ai-docs/constitution.yaml` under `constitution.execution` — which is the
only place the ladder is written (`@pcp:d-83c2`). A stage is loaded when the gate calls for it, not
by default: implement runs always, the rest earn their place.

## Strict Tool Routing

The habits themselves live in the `toolbelt` skills — `parallel` for fan-out, `tokensave` for the
code graph and its staleness, `search-tools` for text, structure and structured data. They are not
restated here. What is local to this repository:

- The verification command is `npm test` (`@pcp:d-b9e6`); `MODEL_ROUTING.md` holds the resolution
  order for projects that name it differently.
- Rendered files (`plugins/steps/agents/`, `plugins/steps/harnesses/*/`) are never edited directly
  (`@pcp:c-6307`).
- Governance queries go through `constitution-query`; `ai-docs/constitution.yaml` is the source, and
  `.pcp/` is the pcp CLI's machine-local sandbox rather than governance.
