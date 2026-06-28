# Project Constitution Protocol (PCP)

**Alias: `pcp`**. A context-hygiene-first, light-weight requirements tracking and tracing framework designed specifically for AI-driven software development. It eliminates token bloat, prevents code redundancy in parallel multi-agent workspaces, and enforces cryptographic shortcode traceability with area-based clustering.

## Repository Layout
- `pcp/SKILL.md`: The agent instruction skill file (slim core — references procedure files for verbose detail).
- `pcp/scripts/pcp.js`: Zero-dependency, ESM Node.js runner implementing the protocol automation.
- `pcp/procedures/`: Lazy-loaded procedure docs for init, actualize, and prune. Read on demand, not loaded into context by default.
- `pcp/examples/CONSTITUTION_TEMPLATE.md`: Standard boilerplates for decisions, caveats, and requirements.

---

## Invocation

When the `pcp` skill is activated in a workspace:

1. If `.pcp/` does not exist, `pcp init` runs automatically to scaffold it.
2. `pcp actualize` runs to compile all maps, indexes, and validate trace connections.
3. The agent reads `.pcp/INDEX.md` first for cheap orientation (one small file). It uses `pcp read <code>` and `pcp map <code>` to pull specific entries without globbing.

No manual setup is required. The skill is fully zero-friction on first invocation.

---

## Getting Started

### 1. Installation
Install the `pcp` skill into your agent workspace:
```bash
npx skills add pcp
```
This registers `pcp` as an available skill. No manual directory copy required.

### 2. Sandbox Initialization
When the `pcp` skill is first activated in a workspace it runs `pcp init` automatically. To initialise manually:
```bash
node pcp/scripts/pcp.js init
```
This scaffolds the sandbox:
- `.pcp/`: The container for specifications.
- `.pcp/CONSTITUTION.md`: Central record of Architectural Decisions (`d`) and Engineering Caveats (`c`).
- `.pcp/DRAFT_LOG.md`: Working log of Requirements (`r`) and Deferred Tasks (`l`).
- `.pcp/_general.md`: Default area for entries not specific to a bounded context.
- `.gitignore`: Updated to exclude generated runtime indexes (`.pcp/MAP.json`, `.pcp/INVENTORY.md`, `.pcp/INDEX.md`).
- `AGENTS.md`: Dropped at the project root if missing. Registers PCP as the active context-hygiene skill and points the agent to `.pcp/INDEX.md`.

---

## Areas & Sub-areas

PCP entries are organized into a semantic **area/sub-area** hierarchy matching the product's bounded contexts and logical modules. This reduces merge conflicts and keeps navigation fast.

- **Default area** (`_general`): Lives in `.pcp/_general.md`. Entries without a clear area go here.
- **Named areas**: Live in `.pcp/<area>/` folders (e.g. `auth/`, `billing/`, `infra/`).
- **Sub-areas**: Live in `.pcp/<area>/<sub>.md` (e.g. `.pcp/auth/oauth.md`, `.pcp/auth/sessions.md`).
- **Catch-all**: `.pcp/<area>/_misc.md` holds entries for that area with no specific sub-module.

### How sub-areas are picked

Sub-areas are chosen semantically from the codebase's logical modules:

- **Explicit**: `pcp mint r --cluster auth --sub oauth` writes to `.pcp/auth/oauth.md`.
- **Auto-route**: When `--sub` is omitted, the CLI runs `git diff --name-only` against committed state; if changed files share a path segment under the area, that segment becomes the sub-area (e.g. diff touches `src/auth/oauth/handler.ts` → sub `oauth`). Otherwise fallback to `_misc`.

### Naming rules
- Lowercase-kebab only (`a-z`, `0-9`, hyphens)
- Max 32 characters per segment
- Must be a stable codebase area name (e.g. `auth`, `billing`, `infra`)
- Prohibited: git branch prefixes (`feat/`, `fix/`, ...), ticket IDs, dates, path traversal characters

### Minting to an area
```bash
node pcp/scripts/pcp.js mint r --cluster billing --sub invoices
node pcp/scripts/pcp.js mint r --cluster auth          # auto-routes sub from git diff, or lands in _misc
```

---

## Size Budget

Each cluster file has a soft **4 KB ceiling**. When `mint` would push a file near this limit, it prints a warning recommending the agent split into a new sub-area. The mint still succeeds; there is no hard block.

INDEX.md stays as a single file (the orientation entry point) and is kept lean by linking to sub-areas rather than listing every entry inline.

---

## CLI Maintenance Subcommands

All constitution lifecycle operations are CLI subcommands on `node pcp/scripts/pcp.js`. The agent invokes them programmatically when the `pcp` skill activates. `pcp` is the single skill entrypoint — there are no separate slash commands.

Detailed procedures for `init`, `actualize`, and `prune` live in `pcp/procedures/` and are loaded on demand (not baked into the always-loaded skill context).

### Bootstrap: `pcp init`
Scaffold the `.pcp/` sandbox. Run automatically on first skill activation, or manually:
```bash
node pcp/scripts/pcp.js init
```
Full procedure: `pcp/procedures/init.md`

### Fill gaps: `pcp mint <type> [--cluster <area>] [--sub <sub>]`
Allocate a non-colliding shortcode with cryptographic entropy.
```bash
node pcp/scripts/pcp.js mint d
node pcp/scripts/pcp.js mint r --cluster billing --sub invoices
```
Types:
- `d` (Decision): Architectural patterns or structural frameworks.
- `c` (Caveat): Concurrency traps, legacy bugs, or vendor quirks.
- `r` (Requirement): Functional product specifications. Supports optional `**Scenario**` and `**Why Non-Obvious**` fields for use cases on subtle code paths.
- `l` (Log): Deferred tasks or future improvements.

### Audit: `pcp actualize`
Compile maps, indexes, and validate trace connections. Run automatically on skill activation:
```bash
node pcp/scripts/pcp.js actualize
```
Full procedure: `pcp/procedures/actualize.md`

### Remove dead parts: `pcp prune [--write]`
Detect and optionally archive Zombie Document Blocks (markdown entries with no matching inline code anchor):
```bash
node pcp/scripts/pcp.js prune          # dry-run report
node pcp/scripts/pcp.js prune --write   # archive and clean
```
Full procedure: `pcp/procedures/prune.md`

### Programmatic lookup
Cheap one-shot reads that avoid globbing `.pcp/`:
```bash
node pcp/scripts/pcp.js read <shortcode>   # entry body only
node pcp/scripts/pcp.js map <shortcode>    # <file>:<line> only
node pcp/scripts/pcp.js ls <area>          # sub-areas and counts
node pcp/scripts/pcp.js find <query>       # search titles by substring
```

---

## Syntax Specifications

### Markdown Anchors
Format: `### [type-xxxx] Title Descriptor`
```markdown
### [d-8f3a] ESM Module Layer
- **Date**: 2026-06-27
- **Status**: Active
- **Cluster**: _general
- **Description**: We enforce ES module execution.
```

### Use-Case Capture (Non-Obvious Code)
For requirements on subtle or non-obvious code paths, add optional `**Scenario**` and `**Why Non-Obvious**` fields:
```markdown
### [r-7e1f] Idempotent Webhook Re-delivery Handling
- **Date**: 2026-06-28
- **Status**: Active
- **Cluster**: billing
- **Scenario**: A payment gateway sends the same webhook twice due to a network retry. The service must credit the user exactly once.
- **Why Non-Obvious**: The handler checks a `processed` flag, but the flag is set asynchronously. A naive read-then-write has a race window where the second webhook double-credits.
- **Description**: Webhook handlers must use an atomic idempotency key, not a read-then-write flag.
```

### Source Code Tracing
Format: `@pcp:<type>-<xxxx>`
```javascript
// @pcp:d-8f3a
import fs from 'fs/promises';
```
```python
# @pcp:d-8f3a
import os
```
