# Phase 2 Executability & Gates Review

**Lens**: `executability-gates` (executability, test commands, gate coverage)
**Verdict**: `reject`

## Blockers

1. **Phase Acceptance Gate ignores phase deliverables**: The Phase Acceptance Gate runs `yq ".decisions[]..."` and `tokensave tool status` to test pre-existing repository state (`ai-docs/constitution.yaml`) and globally installed tools (`tokensave`). It does not verify the content of the `.agents/skills/...` files beyond checking for their existence and basic YAML frontmatter. A conformant-but-wrong implementation that fills the `SKILL.md` files with random text will pass this gate.
   *Evidence*: The `execSync` commands in the Phase Acceptance gate (`.plans/phase-2/PLAN.md:68-71`) do not read from or depend on the newly created skills.
   *Fix*: The acceptance gate must dynamically extract and execute at least one command recipe from the generated `SKILL.md` files to prove that the documented commands actually work, or run a mock validation against their contents.

2. **Item gates are trivial keyword checks**: The gates for Items 1, 2, and 3 use `reqs.filter(r => !c.toLowerCase().includes(r.toLowerCase()))`. An implementation that just drops a comma-separated list of these exact words at the bottom of the file satisfies the gate without providing any actual skill instruction or valid formatting.
   *Evidence*: `PLAN.md:27`, `PLAN.md:42`, `PLAN.md:57` rely entirely on `toLowerCase().includes()`.
   *Fix*: The gates must assert the existence of structured sections (e.g. `## Symbol Lookups`, `## Decision Drivers`) or exact substrings of the actual commands (e.g. `yq '.security.rules'`).

3. **Item 1 case-insensitive validation for case-sensitive queries**: `toLowerCase()` is applied to the requirement `".constitution.security.rules"`. Since `yq` and `jq` queries are case-sensitive, an implementation that incorrectly writes `.CONSTITUTION.SECURITY.RULES` would pass the gate but result in a broken query for the agent.
   *Evidence*: `PLAN.md:27` checks `".constitution.security.rules"` using `.toLowerCase()`.
   *Fix*: Use exact, case-sensitive matching for code snippets, JSON paths, and shortcodes.

## Non-blocking

1. **Regex for frontmatter is fragile**: `c.match(/^---\n([\s\S]*?)\n---/)` assumes exact `\n` line endings. If an implementation happens to use Windows-style line endings (`\r\n`), the gate will fail confusingly. Consider using `^---\r?\n` for robustness.
2. **`allowed-tools` vs `tools`**: `AGENTS.md:35-37` states that *agents* carry `tools` and *commands* carry `allowed-tools`. While the plan's Risks section explicitly decides to use `allowed-tools:`, if these skills are ingested as agents rather than commands, they may become "silently undiscoverable" per the documentation.

## Verified

- `PHASES.md:7-8` citation correctly reflects the Acceptance criterion.
- `AGENTS.md:35-37` citation accurately reflects the frontmatter conventions.
- `tokensave tool status` runs successfully and outputs a valid JSON object with `node_count`.
- `yq ".decisions[] | select(.id == \"d-8f3a\") | .adr" ai-docs/constitution.yaml` runs successfully and outputs `ai-docs/decisions/ADR-0001-unified-esm.md`.

## Unverified

- Could not verify the extraction of the actual command recipes from the markdown files, as the files do not exist yet and the current gates do not attempt this.
