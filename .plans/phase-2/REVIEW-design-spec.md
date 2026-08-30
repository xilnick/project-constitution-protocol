# Review: design-spec

**Lens:** Design/spec consistency, modular skills architecture, progressive disclosure
**Verdict:** reject

## Blockers

1. **Frontmatter Schema Contradiction and Mis-citation**
   - **Evidence:** The plan cites `AGENTS.md:35-37` (lines 9-11 in plan) and its gates (lines 27, 42, 57, 70) enforce `fm.includes("name: ...")` AND `fm.includes("allowed-tools:")`. However, `AGENTS.md:31-33` states that agents carry `name, description, tools, model, color` while commands carry `description, argument-hint, allowed-tools`.
   - **Why it fails:** `AGENTS.md:33` warns that "Wrong frontmatter makes the artifact silently undiscoverable." The combination of `name` and `allowed-tools` mixes the two schemas, creating a broken artifact that Claude Code will ignore.
   - **Fix:** Decide if these skills are agents or commands. Update the frontmatter check in all three Work Items and the Acceptance gate to enforce either the valid agent schema or the valid command schema, without mixing them. Correct the citation to `AGENTS.md:31-33`.

2. **Unenforced `body` extraction in Code Intelligence Gate**
   - **Evidence:** Work Item 2 (line 38) mandates a recipe for "symbol body extraction (body)". However, the gate command array (line 42) `reqs = ["tokensave", "find_exact_symbol", "entities", "callers", "callees", "impact", "progressive disclosure"]` omits `"body"`.
   - **Why it fails:** A conformant-but-wrong implementation could omit the symbol body extraction recipe entirely and still pass the gate.
   - **Fix:** Add `"body"` to the `reqs` array in Item 2's gate command.

3. **Unenforced ADR formatting sections in ADR Manager Gate**
   - **Evidence:** Work Item 3 (line 53) states the skill guides formatting for "(Status, Context, Decision Drivers, Considered Options, Consequences)". However, the gate command array (line 57) `reqs = ["ai-docs/constitution.yaml", "ai-docs/decisions", "d-xxxx", "Status", "Context", "Consequences", "synchronization"]` omits "Decision Drivers" and "Considered Options".
   - **Why it fails:** A conformant-but-wrong implementation could define an incomplete ADR template missing the critical Decision Drivers and Considered Options sections and still pass the gate.
   - **Fix:** Add `"Decision Drivers"` and `"Considered Options"` to the `reqs` array in Item 3's gate command.

## Non-blocking

1. **Inaccurate TokenSave stats in citation**
   - **Evidence:** The plan cites `tokensave tool status` yielding "38 files, 339 nodes, 56 edges" (line 15). Running `tokensave tool status` currently yields "45 files, 436 nodes, 110 edges".
   - **Fix:** Update the citation to reflect the current codebase graph size, or leave it if purely illustrative.

2. **Installation path `.agents/skills/` not in `AGENTS.md`**
   - **Evidence:** The Phase Goal dictates creating skills under `.agents/skills/`. However, `AGENTS.md` explicitly lists only two plugins (`plugins/pcp/` and `plugins/steps/`).
   - **Note:** This is required by `.plans/PHASES.md` so it is not a blocker, but be aware this introduces a new path convention that Phase 3 must formally register in `AGENTS.md`.

## Verified

- `ai-docs/constitution.yaml:1-46` perfectly matches the schema slice referenced (security rules, decisions, caveats, requirements, deferred).
- `ai-docs/decisions/ADR-0001-unified-esm.md:1-35` perfectly matches the canonical ADR structure (Status, Context, Decision Drivers, Considered Options, Consequences).
- `ai-docs/README.md:1-85` accurately shows `yq`/`jq` recipes for isolated sub-300 token queries.
- Acceptance Gate Phase 2 CLI commands (`tokensave tool status` and `yq ...`) correctly execute and parse.
- Progressive disclosure intent is properly articulated in `constitution-query` and `code-intelligence`.

## Unverified

- The exact CLI parameters for all TokenSave tool methods (e.g., `tokensave tool find_exact_symbol <args>`) were not deeply verified for parameter correctness, but the tool names exist on the CLI.
