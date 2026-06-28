---
name: pcp
description: "Project constitution protocol. Enforce context hygiene, shortcode traceability, anti-redundancy, and area-clustered logging via the PCP engine."
---

# SYSTEM INSTRUCTION

Operate within a strict development framework designed to minimize token bloat, eliminate redundant module creations, and prevent branch merge conflicts.

## 1. INVOCATION CONTRACT

When this skill is activated in any workspace:

1. **Check sandbox existence:** Run `ls .pcp/`. If the directory is missing, load `pcp/procedures/init.md` and follow the bootstrap protocol. If it exists, skip init and go to step 2.
2. **Run audit:** Run `node pcp/scripts/pcp.js actualize` to compile MAP.json, INVENTORY.md, INDEX.md, and validate all trace connections. Full details: `pcp/procedures/actualize.md`.
3. **Surface results:** If `actualize` exits with a `Dead Connection Breach Exception`, surface the breach lines verbatim and stop. Do NOT auto-mutate user docs or auto-prune. Otherwise, report the audit summary (entry counts, breach count) and proceed with normal work.
4. **Context orientation:** Before any other tool call, read `.pcp/INDEX.md` (one short file) to orient on the current constitution state. Read `.pcp/MAP.json` only when a specific shortcode lookup is needed. Do not glob `.pcp/` to discover files.

## 2. CORE OPERATIONAL INVARIANTS
1. **Firewall Architecture Intent from Implementation:** Do not pollute source code files with monolithic descriptive comments, long design background text, or volatile relative documentation file paths.
2. **Context Sequestration:** You are strictly forbidden from reading unreferenced or bloated documentation trees. Only load targeted modules and active localized files indexed via the protocol translation layout.
3. **Open-Standard Portability:** Maintain absolute environment independence. All behavioral rules must link directly to `AGENTS.md` in the root space. Reject tool-specific settings or proprietary lock-ins.

## 3. THE SHORTCODE TAXONOMY SPECIFICATION
All traceability connections between structural architecture decisions and functional source implementations must utilize immutable, content-hashed cryptographic shortcodes following this exact pattern:
`@pcp:<type>-<4-hex-chars>` (e.g., `@pcp:c-e9a2`)

Recognize, maintain, and generate anchors across these four explicit domains:
- `@pcp:d-xxxx` (Architectural Decisions): Immutable design patterns, structural mandates, or framework configurations.
- `@pcp:c-xxxx` (Engineering Caveats): Technical landmines, concurrent race conditions, vendor quirks, or technical debt blocks.
- `@pcp:r-xxxx` (Functional Requirements): Lightweight target criteria clear of implementation clutter. Supports optional `**Scenario**` and `**Why Non-Obvious**` fields for use cases on subtle code paths.
- `@pcp:l-xxxx` (Deferred Logs): Intentionally postponed tracks, optimization pathways, or future-proof blueprints.

## 4. CLUSTER DISCIPLINE — AREAS & SUB-AREAS

PCP entries are organized into a semantic **area/sub-area** hierarchy matching the product's bounded contexts and logical modules.

- **Default area** (`_general`): Lives in `.pcp/_general.md`. Entries without a clear area go here.
- **Named areas**: Live in `.pcp/<area>/` folders (e.g. `auth/`, `billing/`, `infra/`).
- **Sub-areas** within an area: `.pcp/<area>/<sub>.md` (e.g. `.pcp/auth/oauth.md`, `.pcp/auth/sessions.md`).
- **Catch-all**: `.pcp/<area>/_misc.md` holds entries for that area with no specific sub-module.

### How sub-areas are picked
- **Explicit**: `pcp mint r --cluster auth --sub oauth` writes to `.pcp/auth/oauth.md`.
- **Auto-route**: When `--sub` is omitted, the CLI runs `git diff --name-only` against committed state; if changed files share a path segment under the area, that segment becomes the sub-area (e.g. diff touches `src/auth/oauth/handler.ts` → sub `oauth`). Otherwise fallback to `_misc`.

### Naming rules
- Lowercase-kebab only (a-z, 0-9, hyphens), max 32 characters per segment.
- Prohibited: branch prefixes (`feat/`, `fix/`, ...), ticket IDs, dates, path traversal characters.

### Tags stay stable
`@pcp:xxx` shortcodes never change when an entry moves between files. Only the file location differs.

## 5. SIZE BUDGET

Each cluster file has a soft 4 KB ceiling. When `mint` would push a file over this limit, it prints a warning recommending the agent split into a new sub-area. The mint still succeeds; there is no hard block.

INDEX.md stays as a single file (the orientation entry point) and is kept lean by linking to sub-areas rather than listing every entry inline.

## 6. CLI MAINTENANCE SUBCOMMANDS

All constitution lifecycle operations run as CLI subcommands on `node pcp/scripts/pcp.js`. The agent invokes them programmatically when the `pcp` skill activates. There are no slash commands; `pcp` is the only entrypoint.

| Subcommand | Purpose | Full procedure |
| :--- | :--- | :--- |
| `pcp init` | Bootstrap `.pcp/` sandbox, drop `AGENTS.md` | `pcp/procedures/init.md` |
| `pcp mint <type> [--cluster <area>] [--sub <sub>]` | Allocate a non-colliding shortcode | (inline — see below) |
| `pcp actualize` | Compile maps, inventory, index; validate traces | `pcp/procedures/actualize.md` |
| `pcp prune [--write]` | Detect and archive zombie document blocks | `pcp/procedures/prune.md` |
| `pcp read <shortcode>` | Print entry body only | (inline lookup) |
| `pcp map <shortcode>` | Print `<file>:<line>` only | (inline lookup) |
| `pcp ls <area>` | List sub-areas and entry counts | (inline lookup) |
| `pcp find <query>` | Search entry titles by substring | (inline lookup) |

### `pcp mint` detail
- Validates type (`d`, `c`, `r`, `l`), area name, and sub name.
- Auto-routes sub from `git diff` when `--sub` is omitted and a cluster is named.
- Resolves target file: `.pcp/_general.md` (default) or `.pcp/<area>/<sub>.md`.
- Warns when the target file approaches the 4 KB size budget.
- Appends the entry with a `**Cluster**: <area>/<sub>` metadata line.

## 8. LIFECYCLE DEVELOPMENT GUARDRAILS
- **Pre-Coding Validation:** Before writing any utility, helper, or core service routine, parse `.pcp/INVENTORY.md`. If a matching export surface exists, reuse it instead of writing a new implementation.
- **Feature Tracking:** When adding a new rule or code constraint, you must autonomously run `pcp mint` to generate a token, write the corresponding architectural intent block inside the appropriate area/sub-area file, and place the matching shortcode tag (e.g., `// @pcp:x-xxxx`) above the implementation code block.
- **Use-Case Capture for Non-Obvious Code:** When documenting a requirement (`r`) for a subtle or non-obvious part of the application (race conditions, implicit ordering, platform-specific behavior, edge-case flows), include the optional `**Scenario**` field (the actor and concrete scenario that exercises this code path) and the `**Why Non-Obvious**` field (what would mislead a developer without this context).
- **Prefer Programmatic Lookup Over Globbing:** Never glob `.pcp/` to discover content. Use `pcp read <code>` for entry bodies, `pcp map <code>` for file paths, `pcp ls <area>` for sub-area lists, and `pcp find <query>` for substring search.
