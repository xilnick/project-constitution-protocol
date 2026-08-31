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
  - `skills/steps-{plan,review,implement,verify,fix}/` — the five stages, each invocable on its own.
  - `MODEL_ROUTING.md` — role→tier→model class, the complexity gate, the escalation triggers, and
    the per-harness model bindings.
  - `roles/`, `partials/` — **the canonical source** for the nine role briefs: per-role prose plus
    the shared rules, included once and composed at render time.
  - `tools/render.mjs` — renders `agents/` and every `harnesses/` manifest from `roles/`, `partials/`
    and each harness's `profile.json`. Run `npm run render`; `npm test` runs `--check`.
  - `agents/`, `harnesses/*/` — **rendered output**, committed because installs copy it. Never edit
    by hand: the render check will fail and your edit will be overwritten.
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

- `plugins/steps/skills/steps/SKILL.md` is canonical for the steps protocol. The agent briefs are
  the mechanism it describes — they must agree with it and must not restate it at length. Neither
  plugin ships a `commands/` directory: the skills are the entrypoints, and `/steps` invokes the
  steps skill itself.
- Agent frontmatter follows the shape used by the official `feature-dev` plugin: `name`,
  `description`, `tools`, `model`, `color`. Wrong frontmatter makes the artifact silently
  undiscoverable.
- Reviewer and planner agents are given no `Edit` tool. The tool model cannot scope `Write` to a
  path, so each such agent's body states the restriction instead.
- A role change belongs in `plugins/steps/roles/<role>.md`, or in `partials/` when it is a rule every
  role shares. Tool names, models and capability fields belong in a harness's `profile.json`, never
  in a rendered file: each harness's write capability is derived from the role's `writes` class, so
  one profile rule fixes every manifest at once.
- Model routing is specified in `MODEL_ROUTING.md`; the `model`/`model_reasoning_effort` field of
  every harness manifest must agree with its tables.

## Execution

The steps protocol governs execution: `plugins/steps/skills/steps/SKILL.md` composes the phases and
`plugins/steps/MODEL_ROUTING.md` holds the complexity gate and the escalation ladder. The tiers, the
stages each tier runs, and the escalation triggers are declared once, in `ai-docs/constitution.yaml`
under `constitution.execution`; those docs are that block's prose. Do not restate the ladder anywhere
else — a fifth copy is how the four drifted apart. A stage is loaded when the tier calls for it, not
by default: implement and verify run always, the rest earn their place.

## Strict Tool Routing

The habits themselves live in the `toolbelt` skills — `parallel` for fan-out, `tokensave` for the
code graph and its staleness, `search-tools` for text, structure and structured data. They are not
restated here. What is local to this repository:

- The verification command is `npm test`, and it must exit 0 before a phase is complete or anything
  is committed. `MODEL_ROUTING.md` holds the resolution order for projects that name it differently.
- Rendered files (`plugins/steps/agents/`, `plugins/steps/harnesses/*/`) are never edited directly.
- Governance queries go through `constitution-query`; `ai-docs/constitution.yaml` is the source, and
  `.pcp/` is the pcp CLI's machine-local sandbox rather than governance.
