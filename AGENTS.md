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
    `steps-impl-reviewer`, `steps-fixer`, `steps-architect-pro`, `repo-scout`, `step-verifier`.
  - `harnesses/` — per-harness agent manifests: `codex/`, `claude-code/`, `opencode/`, `droid/`,
    `antigravity/`.
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

## Modular Skills Matrix

The repository exposes modular skills for governance, semantic discovery, and ADR lifecycle management:

| Skill | Path | Description & Activation Rule |
|---|---|---|
| `pcp` | `plugins/pcp/skills/pcp/SKILL.md` | Root marketplace skill for project constitution protocol management and atom minting. |
| `constitution-query` | `.agents/skills/constitution-query/SKILL.md` | Project governance & decisions. Query active constraints, security rules, and requirements before planning or executing changes. |
| `code-intelligence` | `.agents/skills/code-intelligence/SKILL.md` | Semantic graph exploration & token-efficient targeting. Map codebase dependencies, symbols, and cross-file relationships using progressive disclosure. |
| `adr-manager` | `.agents/skills/adr-manager/SKILL.md` | Architectural decision record lifecycle. Mint, update, link, and retire ADR documents matching the structured schema. |

## Strict Tool Routing & Gap Closures

1. **Progressive Disclosure & Tool Limits**:
   - Strictly forbid repository-wide broad grep, deep recursive file scans, or raw full-file dumping.
   - Agents must inspect symbols, call graphs, and module dependencies via `tokensave` or RTK CLI.
2. **RTK Fallback Protocol**:
   - When filtered or semantic commands truncate, drop, or omit required execution logs or compiler diagnostics, agents must fallback to `rtk raw <cmd>` to inspect complete output safely.
3. **Constitutional Automated Verification**:
   - Consult `ai-docs/constitution.yaml` for governance invariants.
   - Before completing any phase or committing changes, agents must execute `verification_command: "npm test"` and confirm an exit code of 0.
4. **Index Synchronization & TokenSave Staleness**:
   - Check index status with `tokensave tool status`.
   - Execute index refresh when code modifications exceed staleness cooldown periods or when symbol lookups fail to resolve newly introduced exports.

## End-to-End Workflow Protocol

All non-trivial operations proceed through five sequential phases:

1. **Context Setup**: Skill activation and constitutional query via `constitution-query` to establish active rules, security policies, and architectural boundaries.
2. **Code Intelligence**: Semantic symbol mapping and reference tracing via `tokensave` or `code-intelligence` tools without context dumping.
3. **Precision Edit**: Surgical file editing strictly scoped to owned target files, maintaining invariant integrity.
4. **Compressed Validation**: Executing verification commands (`verification_command`) and evaluating exit codes cleanly.
5. **Commit & ADR**: Updating ADR records via `adr-manager`, synchronizing code intelligence index, and creating atomic phase commits.

## Adaptive Complexity Gate

Task complexity dictates planning and agent routing per phase:

- **Tier 0 (Fast-Track / Planning Bypass)**: Micro or trivial tasks (e.g. typos, isolated single-line fixes, simple documentation/config tweaks). Completely bypasses planning and review waves directly to `steps-implementer` (Tier 1 fast cheap coder), immediately followed by the automated verification gate (`verification_command`). The orchestrator never touches code.
- **Tier 1 (Standard)**: Standard feature additions, refactoring, and component edits. Follows the phased workflow via `steps-planner` (Tier 1 cheap reader) and `steps-implementer` (Tier 1 fast coder).
- **Tier 2 (Architectural)**: High-complexity, protocol changes, database migrations, or cross-cutting architectural tasks. Planned by `steps-architect-pro` (Tier 2 heavy architect), implemented by `steps-implementer`, with `steps-fixer` (Tier 2) reserved strictly as a deadlock escape if failures survive two distinct fix attempts.
