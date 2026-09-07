# Phase 1 Plan: Replace Skill in Toolbelt & Route Code Intelligence

## Scope & Work Items

### 1. Replace `tokensave` with `asl-intel` in `plugins/toolbelt`
- **Target**: `plugins/toolbelt/skills/tokensave` -> `plugins/toolbelt/skills/asl-intel/SKILL.md`
- **Why**: Migrate code intelligence documentation from legacy TokenSave to native AgentScript (`asl intel`) from GenSEAM ecosystem (`aslang.dev` / `asex`).
- **Gate**: `plugins/toolbelt/skills/asl-intel/SKILL.md` exists and contains valid frontmatter, required headings, and < 4000 bytes.

### 2. Update `search-tools` Skill Routing
- **Target**: `plugins/toolbelt/skills/search-tools/SKILL.md`
- **Why**: Re-route symbols, call graphs, and blast radius from `tokensave` to `asl intel`. Remove references to legacy `rtk`.
- **Gate**: `grep -rn "tokensave" plugins/toolbelt/skills/search-tools/` returns exit 1.

### 3. Update `code-intelligence` Skill
- **Target**: `plugins/pcp/skills/code-intelligence/SKILL.md`
- **Why**: Replace `tokensave tool` commands with `asl intel` (`search`, `outline`, `callers`, `callees`, `impact`).
- **Gate**: `grep -rn "tokensave" plugins/pcp/skills/code-intelligence/` returns exit 1.

### 4. Clean References in `AGENTS.md` and Procedures
- **Target**: `AGENTS.md`, `plugins/steps/procedures/e2e-gap-audit.md`
- **Why**: Update toolbelt references to cite `asl-intel` instead of `tokensave`.
- **Gate**: `grep -rn "tokensave" AGENTS.md plugins/steps/procedures/` returns exit 1.
