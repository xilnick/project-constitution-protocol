# Phase 2 Reconciliation

## Summary
- **Findings In**: 10
- **Dispositions**:
  - `accept`: 8
  - `accept-modified`: 2
  - `reject`: 0
- **Item Ordering Changes**: None. The 3-item sequence (`constitution-query` -> `code-intelligence` -> `adr-manager`) is preserved.

---

## Adjudications

| # | Review | Type | Finding | Disposition | Details |
|---|---|---|---|---|---|
| 1 | `design-spec` | Blocker 1 | Frontmatter Schema Contradiction and Mis-citation | `accept-modified` | Standardized `SKILL.md` frontmatter schema across all work items to require `name` and `description` (conforming to Claude Code skill conventions and `plugins/pcp/skills/pcp/SKILL.md`). Removed requirement of mixing `allowed-tools` in skill frontmatter. Corrected citation to `AGENTS.md:35-37`. |
| 2 | `design-spec` | Blocker 2 | Unenforced `body` extraction in Code Intelligence Gate | `accept` | Added `"body"` to required exact snippets in Item 2 gate command in `.plans/phase-2/PLAN.md`. |
| 3 | `design-spec` | Blocker 3 | Unenforced ADR formatting sections in ADR Manager Gate | `accept` | Added `"Decision Drivers"` and `"Considered Options"` to required exact snippets in Item 3 gate command in `.plans/phase-2/PLAN.md`. |
| 4 | `design-spec` | Non-blocking 1 | Inaccurate TokenSave stats in citation | `accept` | Updated citation in `.plans/phase-2/PLAN.md:15` to current codebase graph size ("45 files, 436 nodes, 110 edges"). |
| 5 | `design-spec` | Non-blocking 2 | Installation path `.agents/skills/` not in `AGENTS.md` | `accept` | Clarified in `Out of Scope` that registering `.agents/skills/` in `AGENTS.md` is strictly deferred to Phase 3 per `.plans/PHASES.md`. |
| 6 | `executability-gates` | Blocker 1 | Phase Acceptance Gate ignores phase deliverables | `accept-modified` | Upgraded Phase Acceptance gate in `.plans/phase-2/PLAN.md` to comprehensively parse and validate the internal content, structural headers, and command recipes of all 3 deliverable `SKILL.md` files in addition to executing live CLI query tools. |
| 7 | `executability-gates` | Blocker 2 | Item gates are trivial keyword checks | `accept` | Upgraded Item 1, 2, and 3 gates in `.plans/phase-2/PLAN.md` to assert exact structural section headings and specific recipe syntax rather than loose lowercase words. |
| 8 | `executability-gates` | Blocker 3 | Item 1 case-insensitive validation for case-sensitive queries | `accept` | Removed `toLowerCase()` in Item 1 gate in `.plans/phase-2/PLAN.md` and enforced case-sensitive matching for query paths (`security.rules`, `yq`, `jq`, `d-xxxx`). |
| 9 | `executability-gates` | Non-blocking 1 | Regex for frontmatter is fragile | `accept` | Updated frontmatter regex across Item 1, Item 2, Item 3, and Phase Acceptance gate in `.plans/phase-2/PLAN.md` to `/^---\r?\n([\s\S]*?)\r?\n---/` to support Windows and Unix line endings. |
| 10 | `executability-gates` | Non-blocking 2 | `allowed-tools` vs `tools` | `accept` | Addressed alongside Design-Spec Blocker 1: frontmatter for skills standardized to `name` and `description`, while tool recipes and permissions are documented in the skill specification body. |

