# Phase 1 Execution Plan: Structured Constitution Schema & Retrieval Recipes

## Phase Goal
Establish the structured YAML constitution schema at `ai-docs/constitution.yaml`, create sample modular ADR and specification files (`ai-docs/decisions/ADR-0001-unified-esm.md` and `ai-docs/specs/auth-spec.yaml`), and document/validate query retrieval recipes across `yq` and `jq` covering all taxonomy elements (`d-xxxx`, `c-xxxx`, `r-xxxx`, `l-xxxx`, and security policies) ensuring sub-300 token responses.

## Evidence & Context Citations
- `.plans/PHASES.md:5-6`: Phase 1 Acceptance criterion requires query CLI tooling check and structured `ai-docs/constitution.yaml` queries returning isolated payloads (< 300 tokens).
- `.pcp/_general.md:5-9`: Existing decision `d-8f3a` (Unified ESM Execution Layer).
- `.pcp/_general.md:11-15`: Existing caveat `c-e9a2` (Zero-Dependency Runtime Constraint).
- `.pcp/MAP.json:20-31`: Shortcode registry indexing `d-8f3a` and `c-e9a2`.
- `yq` CLI version measured on host: `yq (https://github.com/mikefarah/yq/) version v4.53.2` via `/opt/homebrew/bin/yq`.
- `jq` CLI version measured on host: `jq-1.7.1-apple` via `/usr/bin/jq`.

---

## Work Items

### Item 1: Create Structured Constitution File
- **What changes**: Create `ai-docs/constitution.yaml`.
- **Why**: Implements the root structured schema for context retrieval containing project metadata, security policies, dependency constraints, architectural decisions (`d-8f3a`), engineering caveats (`c-e9a2`), functional requirements (`r-b111` for billing), and deferred tracks (`l-e404`), allowing precise CLI queries without loading monolithic prose.
- **Order justification**: First item. All subsequent modular ADRs, domain specifications, and query recipes reference keys and identifiers defined in this root schema.
- **Gate command**:
  ```bash
  node -e 'const { execSync } = require("child_process"); const d = execSync("yq \".decisions[] | select(.id == \\\"d-8f3a\\\") | .title\" ai-docs/constitution.yaml").toString().trim(); const c = execSync("yq \".caveats[] | select(.id == \\\"c-e9a2\\\") | .title\" ai-docs/constitution.yaml").toString().trim(); const s = execSync("yq \".constitution.security.rules[] | select(.domain == \\\"auth\\\") | .rule\" ai-docs/constitution.yaml").toString().trim(); const r = execSync("yq \".requirements[] | select(.cluster == \\\"billing\\\") | .id\" ai-docs/constitution.yaml").toString().trim(); const l = execSync("yq \".deferred[] | select(.id == \\\"l-e404\\\") | .title\" ai-docs/constitution.yaml").toString().trim(); if (!d || !c || !s || !r || !l) throw new Error("Missing required schema fields"); console.log("Constitution Schema Validated: " + [d, c, s, r, l].join(" | "));'
  ```
- **Verbatim gate output before implementation**:
  ```
  Error: open ai-docs/constitution.yaml: no such file or directory
  node:child_process:990
      throw err;
      ^

  Error: Command failed: yq ".decisions[] | select(.id == \"d-8f3a\") | .title" ai-docs/constitution.yaml
  Error: open ai-docs/constitution.yaml: no such file or directory
  ```

---

### Item 2: Create Modular ADR Document for Unified ESM
- **What changes**: Create `ai-docs/decisions/ADR-0001-unified-esm.md`.
- **Why**: Provides the modular deep-dive document linked from `d-8f3a` in `constitution.yaml`. Separates high-level constitutional constraints from detailed architectural decision context (Status, Context, Decision Drivers, Considered Options, Consequences), adhering to progressive disclosure.
- **Order justification**: Must run after Item 1 so that the ADR identifier (`d-8f3a`) and title align exactly with the entry in `ai-docs/constitution.yaml`.
- **Gate command**:
  ```bash
  node -e 'const fs = require("fs"); const p = "ai-docs/decisions/ADR-0001-unified-esm.md"; if (!fs.existsSync(p)) { console.error("Missing ADR: " + p); process.exit(1); } const c = fs.readFileSync(p, "utf8"); const reqs = ["d-8f3a", "Unified ESM Execution Layer", "Status", "Context", "Decision Drivers", "Consequences"]; const missing = reqs.filter(r => !c.includes(r)); if (missing.length > 0) { console.error("ADR missing required sections/metadata: " + missing.join(", ")); process.exit(1); } console.log("ADR-0001 verified");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Missing ADR: ai-docs/decisions/ADR-0001-unified-esm.md
  ```

---

### Item 3: Create Sample Domain Specification for Auth
- **What changes**: Create `ai-docs/specs/auth-spec.yaml`.
- **Why**: Demonstrates domain-level modular specification query patterns (e.g. auth contracts, endpoints, security invariants) distinct from global constitution entries, allowing agents to retrieve domain specs on demand.
- **Order justification**: Must run after Item 1 because domain security rules in `constitution.yaml` establish the auth domain boundaries detailed in this spec.
- **Gate command**:
  ```bash
  node -e 'const { execSync } = require("child_process"); const p = "ai-docs/specs/auth-spec.yaml"; const n = execSync("yq \".spec.name\" " + p).toString().trim(); const v = execSync("yq \".spec.version\" " + p).toString().trim(); const e = execSync("yq \".spec.endpoints | length\" " + p).toString().trim(); const i = execSync("yq \".spec.security_invariants | length\" " + p).toString().trim(); if (n !== "auth-spec" || !v || Number(e) < 1 || Number(i) < 1) throw new Error("Invalid or incomplete auth spec schema"); console.log("Spec verified: " + n + " v" + v + " (endpoints: " + e + ", invariants: " + i + ")");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Error: open ai-docs/specs/auth-spec.yaml: no such file or directory
  node:child_process:990
      throw err;
      ^

  Error: Command failed: yq ".spec.name" ai-docs/specs/auth-spec.yaml
  Error: open ai-docs/specs/auth-spec.yaml: no such file or directory
  ```

---

### Item 4: Document Retrieval Recipes & Verification Suite
- **What changes**: Create `ai-docs/README.md`.
- **Why**: Documents reproducible CLI query recipes across `yq` and `jq` for retrieving decisions by ID (`d-xxxx`), caveats by ID (`c-xxxx`), requirements by cluster (`r-xxxx`), deferred tracks (`l-xxxx`), and security rules by domain, verifying that all queries produce concise payloads under 300 tokens.
- **Order justification**: Must run after Items 1, 2, and 3 so all referenced paths and queries can be verified against the real files.
- **Gate command**:
  ```bash
  node -e 'const fs = require("fs"); const p = "ai-docs/README.md"; if (!fs.existsSync(p)) { console.error("Missing README: " + p); process.exit(1); } const c = fs.readFileSync(p, "utf8"); const reqs = ["yq", "jq", "d-8f3a", "c-e9a2", "l-e404", "billing", ".constitution.security.rules"]; const missing = reqs.filter(r => !c.includes(r)); if (missing.length > 0) { console.error("README missing required retrieval recipes/tools: " + missing.join(", ")); process.exit(1); } console.log("Retrieval documentation verified");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Missing README: ai-docs/README.md
  ```

---

## Phase Acceptance Criterion
- **Gate Command**:
  ```bash
  node -e 'const { execSync } = require("child_process"); execSync("yq --version || jq --version"); const q1 = execSync("yq \".constitution.security.rules[] | select(.domain == \\\"auth\\\")\" ai-docs/constitution.yaml").toString(); const q2 = execSync("yq \".decisions[] | select(.id == \\\"d-8f3a\\\")\" ai-docs/constitution.yaml").toString(); const q3 = execSync("yq \".caveats[] | select(.id == \\\"c-e9a2\\\")\" ai-docs/constitution.yaml").toString(); const q4 = execSync("yq \".requirements[] | select(.cluster == \\\"billing\\\")\" ai-docs/constitution.yaml").toString(); const q5 = execSync("yq \".deferred[] | select(.id == \\\"l-e404\\\")\" ai-docs/constitution.yaml").toString(); const q6 = execSync("yq \".spec\" ai-docs/specs/auth-spec.yaml").toString(); [q1, q2, q3, q4, q5, q6].forEach((out, i) => { if (!out.trim()) throw new Error("Empty query " + i); const tokens = out.trim().split(/\s+/).length * 1.3; if (tokens > 300) throw new Error("Payload too large: " + tokens); }); console.log("All retrieval recipes verified under 300 tokens!");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Error: open ai-docs/constitution.yaml: no such file or directory
  node:child_process:990
      throw err;
      ^

  Error: Command failed: yq ".constitution.security.rules[] | select(.domain == \"auth\")" ai-docs/constitution.yaml
  Error: open ai-docs/constitution.yaml: no such file or directory
  ```

---

## Risks
1. **`yq` binary variant**: The gate commands use Mike Farah's `yq` (v4 syntax). If executed in an environment where Python `yq` (Kislyuk wrapper over `jq`) is installed instead, arguments may require slight adjustments. Verified locally: `/opt/homebrew/bin/yq` v4.53.2 is installed.
2. **Token calculation heuristic**: The acceptance check estimates tokens as `word_count * 1.3`. Actual tokenizer count can vary depending on specific model BPE tokenizers, but all queries target concise isolated blocks under 100 words (~130 tokens), well beneath the 300 token limit.

---

## Out of Scope
- Creating agent skill manifests in `.agents/skills/` (scoped to Phase 2: Modular Skills Infrastructure).
- Modifying `AGENTS.md` orchestration routing (scoped to Phase 3: AGENTS.md Orchestrator & Workflow Integration).
- Modifying test runner configurations or `tests/pcp_skill.test.js` (scoped to Phase 4: Automated Verification Suite).
- Mutating legacy `.pcp/` directory files (`.pcp/` remains untouched for backward compatibility).
