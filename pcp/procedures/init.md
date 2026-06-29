# PCP Init Procedure

When the PCP skill is activated and the sandbox (`.pcp/`) does not exist, execute the following protocol.

## 1. Scaffold the sandbox

Run the CLI command:

```bash
node pcp/scripts/pcp.js init
```

This creates:
- `.pcp/CONSTITUTION.md` – stable decisions (`@pcp:d`) and caveats (`@pcp:c`).
- `.pcp/DRAFT_LOG.md` – working log of requirements (`@pcp:r`) and deferred tasks (`@pcp:l`).
- `.pcp/_general.md` – default area for entries not tied to a bounded context.
- Appends `.pcp/MAP.json`, `.pcp/INVENTORY.md`, `.pcp/INDEX.md` to `.gitignore`.

## 2. Drop project-level `AGENTS.md` (if missing)

Check whether `AGENTS.md` exists at the project root. If it does not, create it with the following content:

```markdown
# Project Agent Instructions

Activate the `pcp` skill and follow its instructions.
```

If `AGENTS.md` already exists, the `pcp init` CLI does nothing to it. Normalization of a bloated existing `AGENTS.md` (protocol prose replacement) is handled by the agent after init, in Invocation Contract step 5. See the "Normalize existing AGENTS.md" section below for details.

## 3. Normalize existing `AGENTS.md` (agent-driven, after init)

This step executes during skill activation (Invocation Contract step 5), not in the `pcp init` CLI itself. It is an LLM-driven process, not a script heuristic.

### Classification rules

Read the existing `AGENTS.md` and classify each block/section as one of:

**Keep (user-specific):**
- Project-specific coding conventions (e.g. "use camelCase", "all functions must have JSDoc")
- Tooling notes (e.g. "run tests with `pnpm test`", "lint with biome")
- Team rules (e.g. "PRs require two approvals")
- Build/dev setup instructions unique to this repo
- Non-PCP agent behavior rules
- Contributor guidelines

**Replace (protocol duplication):**
- PCP shortcode taxonomy and usage rules (`@pcp:d-xxxx`, `@pcp:c-xxxx`, etc.)
- PCP CLI subcommand tables or usage docs
- PCP audit / actualize / prune instructions
- PCP lifecycle guardrails (mint-before-code, INVENTORY checks)
- PCP cluster discipline, area/sub-area rules
- PCP size budget rules
- Any content verbatim from `pcp/SKILL.md`

### Rewrite template

If user-specific content survives classification, produce:

```markdown
# Project Agent Instructions

Activate the `pcp` skill and follow its instructions.

## Project Conventions

<preserved user-specific directives, verbatim, under original headings if applicable>
```

If no user-specific content survives, produce only the 3-line thin pointer without the `## Project Conventions` section.

### Log

After rewriting, log: `- Normalized AGENTS.md: preserved N user-specific block(s), replaced protocol prose with thin pointer.`

## 4. Continue with audit

After init completes, proceed to the audit step (run `pcp actualize`) as specified in the Invocation Contract.
