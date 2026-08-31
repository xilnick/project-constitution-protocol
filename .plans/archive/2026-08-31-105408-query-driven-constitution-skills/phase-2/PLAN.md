# Phase 2 Execution Plan: Modular Skills Infrastructure

## Phase Goal
Create the modular skills under `.agents/skills/`:
1. `.agents/skills/constitution-query/SKILL.md`: Query-driven rule extraction with `yq`/`jq`, progressive disclosure guardrails, and taxonomy queries (`@pcp:d-xxxx`, `@pcp:c-xxxx`, `@pcp:r-xxxx`, `@pcp:l-xxxx`, and domain security policies).
2. `.agents/skills/code-intelligence/SKILL.md`: Code graph navigation via TokenSave MCP/CLI (`tokensave tool`), enabling sub-symbol and call-graph context retrieval instead of reading whole files.
3. `.agents/skills/adr-manager/SKILL.md`: Architecture Decision Record (ADR) lifecycle management, template structure enforcement, and bidirectional synchronization with `ai-docs/constitution.yaml`.

## Evidence & Context Citations
- `.plans/PHASES.md:7-8`: Phase 2 Acceptance criterion requiring `.agents/skills/constitution-query/SKILL.md`, `.agents/skills/code-intelligence/SKILL.md`, and `.agents/skills/adr-manager/SKILL.md` to exist with valid YAML frontmatter, strict tool definitions, and scoped actions.
- `AGENTS.md:35-37`: Frontmatter convention specifying agent schema (`name, description, tools, model, color`) and command/skill conventions where skill manifests carry `name` and `description`.
- `ai-docs/constitution.yaml:1-46`: Root structured constitution schema defining `security.rules`, `decisions` (`d-8f3a`), `caveats` (`c-e9a2`), `requirements` (`r-b111`), and `deferred` (`l-e404`).
- `ai-docs/decisions/ADR-0001-unified-esm.md:1-35`: Canonical ADR structure containing Status, Context, Decision Drivers, Considered Options, and Consequences.
- `ai-docs/README.md:1-85`: Established `yq`/`jq` query recipes returning isolated payloads under 300 tokens.
- `/Users/purplelephant/.cargo/bin/tokensave`: TokenSave v7.9.0 indexed over 45 files, 436 nodes, 110 edges (`tokensave tool status`).

---

## Work Items

### Item 1: Create Constitution Query Skill
- **What changes**: Create `.agents/skills/constitution-query/SKILL.md` with valid YAML frontmatter (`name: constitution-query`, `description`), structured markdown headers (`## Progressive Disclosure`, `## Query Recipes`), shortcode query recipes (`d-xxxx`, `c-xxxx`, `r-xxxx`, `l-xxxx`), and case-sensitive path queries against `ai-docs/constitution.yaml` and `security.rules` via `yq`/`jq`.
- **Why**: Provides the agent skill for targeted, query-driven rule extraction from `ai-docs/constitution.yaml`, domain specs (`ai-docs/specs/*.yaml`), and ADRs. Enforces progressive disclosure so agents query specific shortcodes (`d-xxxx`, `c-xxxx`, `r-xxxx`, `l-xxxx`) and domain security rules instead of loading full constitution documents into context.
- **Order justification**: First item in the modular skills suite. Agents executing subsequent tasks or other skills rely on query-driven constitutional rule extraction to verify project invariants.
- **Gate command**:
  ```bash
  node -e 'const fs = require("fs"); const p = ".agents/skills/constitution-query/SKILL.md"; if (!fs.existsSync(p)) { console.error("Missing skill file: " + p); process.exit(1); } const c = fs.readFileSync(p, "utf8"); const frontmatterMatch = c.match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!frontmatterMatch) { console.error("Missing valid YAML frontmatter"); process.exit(1); } const fm = frontmatterMatch[1]; if (!fm.includes("name: constitution-query") || !fm.includes("description:")) { console.error("Invalid frontmatter: name or description missing"); process.exit(1); } const requiredExact = ["Progressive Disclosure", "ai-docs/constitution.yaml", "d-xxxx", "c-xxxx", "r-xxxx", "l-xxxx", "security.rules", "yq", "jq"]; const missing = requiredExact.filter(r => !c.includes(r)); if (missing.length > 0) { console.error("Missing required content/sections: " + missing.join(", ")); process.exit(1); } console.log("constitution-query skill verified");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Missing skill file: .agents/skills/constitution-query/SKILL.md
  ```

---

### Item 2: Create Code Intelligence Skill
- **What changes**: Create `.agents/skills/code-intelligence/SKILL.md` with valid YAML frontmatter (`name: code-intelligence`, `description`), progressive disclosure guardrails, and TokenSave MCP/CLI recipes for `find_exact_symbol`, `entities`, `callers`, `callees`, `impact`, and `body`.
- **Why**: Provides the agent skill for semantic code graph navigation via TokenSave MCP/CLI (`tokensave tool`). Defines recipes for symbol lookups (`find_exact_symbol`), file entity listings (`entities`), call graph analysis (`callers`, `callees`), impact radius computation (`impact`), and symbol body extraction (`body`), enforcing token-efficient graph traversal over full-file reads.
- **Order justification**: Must be created as the second skill. Scaffolds code graph navigation recipes that pair with constitutional query tools to complete the context retrieval toolkit.
- **Gate command**:
  ```bash
  node -e 'const fs = require("fs"); const p = ".agents/skills/code-intelligence/SKILL.md"; if (!fs.existsSync(p)) { console.error("Missing skill file: " + p); process.exit(1); } const c = fs.readFileSync(p, "utf8"); const frontmatterMatch = c.match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!frontmatterMatch) { console.error("Missing valid YAML frontmatter"); process.exit(1); } const fm = frontmatterMatch[1]; if (!fm.includes("name: code-intelligence") || !fm.includes("description:")) { console.error("Invalid frontmatter: name or description missing"); process.exit(1); } const requiredExact = ["Progressive Disclosure", "tokensave tool", "find_exact_symbol", "entities", "callers", "callees", "impact", "body"]; const missing = requiredExact.filter(r => !c.includes(r)); if (missing.length > 0) { console.error("Missing required content/recipes: " + missing.join(", ")); process.exit(1); } console.log("code-intelligence skill verified");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Missing skill file: .agents/skills/code-intelligence/SKILL.md
  ```

---

### Item 3: Create ADR Manager Skill
- **What changes**: Create `.agents/skills/adr-manager/SKILL.md` with valid YAML frontmatter (`name: adr-manager`, `description`), ADR lifecycle management instructions, canonical template structure (`Status`, `Context`, `Decision Drivers`, `Considered Options`, `Consequences`), shortcode generation (`d-xxxx`), and bidirectional synchronization recipes with `ai-docs/constitution.yaml` and `ai-docs/decisions/`.
- **Why**: Provides the agent skill for Architectural Decision Record (ADR) lifecycle management. Guides agents through creating, formatting (Status, Context, Decision Drivers, Considered Options, Consequences), shortcode tagging (`@pcp:d-xxxx`), and syncing ADR documents in `ai-docs/decisions/` with `ai-docs/constitution.yaml` entries.
- **Order justification**: Must run after Items 1 and 2. ADR management requires bidirectional alignment with `constitution.yaml` (queried via `constitution-query`) and source code anchors (mapped via `code-intelligence`).
- **Gate command**:
  ```bash
  node -e 'const fs = require("fs"); const p = ".agents/skills/adr-manager/SKILL.md"; if (!fs.existsSync(p)) { console.error("Missing skill file: " + p); process.exit(1); } const c = fs.readFileSync(p, "utf8"); const frontmatterMatch = c.match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!frontmatterMatch) { console.error("Missing valid YAML frontmatter"); process.exit(1); } const fm = frontmatterMatch[1]; if (!fm.includes("name: adr-manager") || !fm.includes("description:")) { console.error("Invalid frontmatter: name or description missing"); process.exit(1); } const requiredExact = ["ai-docs/constitution.yaml", "ai-docs/decisions", "d-xxxx", "Status", "Context", "Decision Drivers", "Considered Options", "Consequences", "synchronization"]; const missing = requiredExact.filter(r => !c.includes(r)); if (missing.length > 0) { console.error("Missing required content/sections: " + missing.join(", ")); process.exit(1); } console.log("adr-manager skill verified");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Missing skill file: .agents/skills/adr-manager/SKILL.md
  ```

---

## Phase Acceptance Criterion

- **Gate Command**:
  ```bash
  node -e 'const fs = require("fs"); const { execSync } = require("child_process"); const skills = [ { path: ".agents/skills/constitution-query/SKILL.md", name: "constitution-query", reqs: ["Progressive Disclosure", "ai-docs/constitution.yaml", "d-xxxx", "c-xxxx", "r-xxxx", "l-xxxx", "security.rules", "yq"] }, { path: ".agents/skills/code-intelligence/SKILL.md", name: "code-intelligence", reqs: ["Progressive Disclosure", "tokensave tool", "find_exact_symbol", "entities", "callers", "callees", "impact", "body"] }, { path: ".agents/skills/adr-manager/SKILL.md", name: "adr-manager", reqs: ["ai-docs/constitution.yaml", "ai-docs/decisions", "d-xxxx", "Status", "Context", "Decision Drivers", "Considered Options", "Consequences"] } ]; for (const s of skills) { if (!fs.existsSync(s.path)) throw new Error("Missing skill file: " + s.path); const content = fs.readFileSync(s.path, "utf8"); const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!match) throw new Error("Missing YAML frontmatter in " + s.path); const fm = match[1]; if (!fm.includes("name: " + s.name) || !fm.includes("description:")) throw new Error("Invalid frontmatter in " + s.path); for (const req of s.reqs) { if (!content.includes(req)) throw new Error("Missing required snippet \"" + req + "\" in " + s.path); } } const q1 = execSync("yq \".decisions[] | select(.id == \\\"d-8f3a\\\") | .adr\" ai-docs/constitution.yaml").toString().trim(); if (!fs.existsSync(q1)) throw new Error("ADR referenced in constitution does not exist: " + q1); const q2 = execSync("tokensave tool status").toString(); const st = JSON.parse(q2); if (!st.node_count || st.node_count <= 0) throw new Error("Invalid tokensave status node_count"); console.log("Phase 2 Acceptance Gate: All 3 modular skills verified and command tooling functional!");'
  ```
- **Verbatim gate output before implementation**:
  ```
  [eval]:1
  const fs = require("fs"); const { execSync } = require("child_process"); const skills = [ { path: ".agents/skills/constitution-query/SKILL.md", name: "constitution-query", reqs: ["Progressive Disclosure", "ai-docs/constitution.yaml", "d-xxxx", "c-xxxx", "r-xxxx", "l-xxxx", "security.rules", "yq"] }, { path: ".agents/skills/code-intelligence/SKILL.md", name: "code-intelligence", reqs: ["Progressive Disclosure", "tokensave tool", "find_exact_symbol", "entities", "callers", "callees", "impact", "body"] }, { path: ".agents/skills/adr-manager/SKILL.md", name: "adr-manager", reqs: ["ai-docs/constitution.yaml", "ai-docs/decisions", "d-xxxx", "Status", "Context", "Decision Drivers", "Considered Options", "Consequences"] } ]; for (const s of skills) { if (!fs.existsSync(s.path)) throw new Error("Missing skill file: " + s.path); const content = fs.readFileSync(s.path, "utf8"); const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/); if (!match) throw new Error("Missing YAML frontmatter in " + s.path); const fm = match[1]; if (!fm.includes("name: " + s.name) || !fm.includes("description:")) throw new Error("Invalid frontmatter in " + s.path); for (const req of s.reqs) { if (!content.includes(req)) throw new Error("Missing required snippet \"" + req + "\" in " + s.path); } } const q1 = execSync("yq \".decisions[] | select(.id == \\\"d-8f3a\\\") | .adr\" ai-docs/constitution.yaml").toString().trim(); if (!fs.existsSync(q1)) throw new Error("ADR referenced in constitution does not exist: " + q1); const q2 = execSync("tokensave tool status").toString(); const st = JSON.parse(q2); if (!st.node_count || st.node_count <= 0) throw new Error("Invalid tokensave status node_count"); console.log("Phase 2 Acceptance Gate: All 3 modular skills verified and command tooling functional!");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               ^

  Error: Missing skill file: .agents/skills/constitution-query/SKILL.md
      at [eval]:1:788
      at runScriptInThisContext (node:internal/vm:209:10)
      at node:internal/process/execution:446:12
      at [eval]-wrapper:6:24
      at runScriptInContext (node:internal/process/execution:444:60)
      at evalFunction (node:internal/process/execution:279:30)
      at evalTypeScript (node:internal/process/execution:291:3)
      at node:internal/main/eval_string:74:3

  Node.js v22.19.0
  ```

---

## Risks
1. **Frontmatter Schema Portability**: Skill manifests define `name` and `description` in YAML frontmatter matching Claude Code and PCP conventions. Scoped actions and tool recipes (`yq`, `jq`, `tokensave`) are clearly documented in the skill body.
2. **TokenSave CLI vs MCP stdio**: `tokensave` can be invoked either directly via CLI (`tokensave tool <cmd>`) or as an MCP server via stdio. The `code-intelligence` skill documents both CLI recipes and MCP tool call syntax for maximum agent portability.

---

## Out of Scope
- Updating `AGENTS.md` to register the new `.agents/skills/` directory and orchestrate across workflow phases (scoped to Phase 3: AGENTS.md Orchestrator & Workflow Integration).
- Implementing automated verification test runner scripts in `tests/` (scoped to Phase 4: Automated Verification Suite & Test Harness).
- Editing core PCP legacy scripts in `plugins/pcp/skills/pcp/scripts/pcp.js`.
