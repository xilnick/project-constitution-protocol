# Phase 4 Execution Plan: Automated Verification Suite & Test Harness

## Phase Goal
Create an automated, zero-dependency verification suite in `tests/constitution_skills.test.js` using Node.js native standard libraries (`node:test`, `node:assert/strict`, `node:child_process`, `node:fs/promises`, `node:path`) to validate constitution schema taxonomy, token-bounded query retrieval (< 300 tokens per slice using canonical token estimation), modular skills frontmatter and discoverability across all 5 skills, and bidirectional ADR synchronization. Update `package.json` so `npm test` runs both `tests/pcp_skill.test.js` and `tests/constitution_skills.test.js` and exits 0 while preserving all project configuration invariants.

## Evidence & Context Citations
- `.plans/PHASES.md:11-12`: Phase 4 acceptance criterion requiring `npm test` to run with all test suites passing, verifying retrieval queries, skill discovery, and schema conformance.
- `package.json:1-17`: Current root manifest with `"type": "module"` and `"scripts": { "test": "node --test tests/pcp_skill.test.js" }`, which executes the PCP sandbox suite and ignores constitution/skill validations.
- `ai-docs/constitution.yaml:1-57`: Root structured constitution defining `project`, `version`, `last_updated`, `verification_command: "npm test"`, `security.rules` (`sec-auth-01`, `sec-data-01`), `quality.pre_commit_checks` (`qual-gate-01`, `qual-hygiene-01`), `decisions` (`d-8f3a`), `caveats` (`c-e9a2`), `requirements` (`r-b111`), and `deferred` (`l-e404`).
- `ai-docs/specs/auth-spec.yaml:1-22`: Authentication domain specification defining root `spec` structure with `name`, `version`, `domain`, `description`, `endpoints` (`/api/v1/auth/login`, `/api/v1/auth/refresh`), and `security_invariants` (`inv-auth-jwt`, `inv-auth-revocation`).
- `ai-docs/decisions/ADR-0001-unified-esm.md:1-39`: Canonical ADR format containing metadata (`Shortcode: d-8f3a`, `Status: Active`, `Date`, `Cluster`, `Deciders`) and standard section headers (`## Context`, `## Decision Drivers`, `## Considered Options`, `## Decision Outcome`, `## Consequences`).
- `.agents/skills/constitution-query/SKILL.md:1-107`: Skill definition with frontmatter (`name: constitution-query`, `description`), query recipes for `yq` and `jq`, and the progressive disclosure < 300 token budget constraint per slice.
- `.agents/skills/code-intelligence/SKILL.md:1-136`: Skill definition with frontmatter (`name: code-intelligence`, `description`), progressive disclosure principles, and `tokensave tool` / MCP stdio recipes.
- `.agents/skills/adr-manager/SKILL.md:1-120`: Skill definition with frontmatter (`name: adr-manager`, `description`), ADR lifecycle rules, canonical ADR template, and bidirectional synchronization rules.
- `plugins/pcp/skills/pcp/SKILL.md:1-117`: Skill definition with frontmatter (`name: pcp`, `description`), invocation contract, CLI commands, and runtime layout.
- `plugins/steps/skills/steps/SKILL.md:1-261`: Skill definition with frontmatter (`name: steps`, `description`), multi-phase orchestrator roles, and phase lifecycle protocols.
- `tests/pcp_skill.test.js:1-60`: Existing Node native test harness utilizing `node:test`, `node:assert/strict`, and child process execution.

---

## Work Items

### Item 1: Create Zero-Dependency Constitution & Skills Verification Test Suite (`tests/constitution_skills.test.js`)
- **What changes**: Create `tests/constitution_skills.test.js` using Node.js native standard libraries (`node:test`, `node:assert/strict`, `node:fs/promises`, `node:path`, `node:child_process`) with zero external npm dependencies. To maintain clean, dependency-free schema parsing without fragile custom regexes, the suite utilizes `execSync("yq -o=json <path>", { encoding: "utf8", env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" } })` coupled with standard `JSON.parse()` to evaluate document structures directly. The file implements four distinct subtest suites:
  1. **Constitution Schema & Taxonomy Validation**:
     - Asserts `ai-docs/constitution.yaml` exists, is readable, and contains root keys: `constitution`, `decisions`, `caveats`, `requirements`, `deferred`.
     - Validates `constitution` block attributes: `project` (`"project-constitution-protocol"`), `version` matching semantic versioning format (`^\d+\.\d+\.\d+`), `last_updated` matching date format (`^\d{4}-\d{2}-\d{2}$`), and `verification_command` (`"npm test"`).
     - Validates `security.rules` array with non-empty entries containing `id` (matching `^sec-`), `domain`, `rule`, and `enforcement` (`"strict"`).
     - Validates `quality.pre_commit_checks` array containing `qual-gate-01` and `qual-hygiene-01` with `id` (matching `^qual-`), `domain`, `rule`, and `enforcement` (`"strict"`).
     - Validates taxonomy shortcode entries in `ai-docs/constitution.yaml`:
       - Decisions: `id` matches `^d-` (e.g. `d-8f3a`), requires `title`, `status`, `cluster`, `date`, `summary`, `adr`.
       - Caveats: `id` matches `^c-` (e.g. `c-e9a2`), requires `title`, `status`, `cluster`, `date`, `summary`.
       - Requirements: `id` matches `^r-` (e.g. `r-b111`), requires `id`, `cluster`, `title`, `status`, `summary`.
       - Deferred: `id` matches `^l-` (e.g. `l-e404`), requires `id`, `title`, `cluster`, `status` (`"deferred"`), `reason`.
     - Validates `ai-docs/specs/auth-spec.yaml`: root `spec` object containing `name` (`"auth-spec"`), `version` (matching `^\d+\.\d+\.\d+`), `domain` (`"auth"`), `description`, `endpoints` (array with `path`, `method`, `auth_required`, `rate_limit`, `description`), and `security_invariants` (array with `id` matching `^inv-`, `rule`).
  2. **Query-Driven Retrieval & Token Budget Bounds**:
     - Executes isolated slice retrieval queries via `yq` CLI child processes for:
       - Security rules slice by domain (`auth`): `yq '.constitution.security.rules[] | select(.domain == "auth")' ai-docs/constitution.yaml`
       - Architectural decision slice (`d-8f3a`): `yq '.decisions[] | select(.id == "d-8f3a")' ai-docs/constitution.yaml`
       - Engineering caveat slice (`c-e9a2`): `yq '.caveats[] | select(.id == "c-e9a2")' ai-docs/constitution.yaml`
       - Requirement slice (`r-b111`): `yq '.requirements[] | select(.id == "r-b111")' ai-docs/constitution.yaml`
       - Deferred track slice (`l-e404`): `yq '.deferred[] | select(.id == "l-e404")' ai-docs/constitution.yaml`
       - Domain spec endpoint slice: `yq '.spec.endpoints[] | select(.path == "/api/v1/auth/login")' ai-docs/specs/auth-spec.yaml`
     - Verifies each query returns non-empty output and matches expected payload attributes.
     - Asserts token budget bounds: calculates word count (`const words = payload.trim().split(/\s+/).filter(Boolean).length;`), enforces the canonical token estimation formula (`const estimatedTokens = Math.round(words * 1.3); assert.ok(estimatedTokens < 300, ...);`), and verifies absolute character bounds (`assert.ok(payload.length < 1200, ...);`).
  3. **Modular Skills Discoverability & Frontmatter Conformance**:
     - Verifies existence and non-empty content for all 5 skill definitions:
       - `.agents/skills/constitution-query/SKILL.md`
       - `.agents/skills/code-intelligence/SKILL.md`
       - `.agents/skills/adr-manager/SKILL.md`
       - `plugins/pcp/skills/pcp/SKILL.md`
       - `plugins/steps/skills/steps/SKILL.md`
     - Validates YAML frontmatter delimiters (`---` at top and closing boundary), extracting and validating `name` and non-empty `description` strings.
     - Validates skill name identifiers match: `constitution-query`, `code-intelligence`, `adr-manager`, `pcp`, `steps`.
     - Validates essential operational sections in each skill:
       - `constitution-query`: `Progressive Disclosure`, `Shortcode Taxonomy`, `Query Recipes`
       - `code-intelligence`: `Progressive Disclosure`, `Navigation Workflows`, `Stdio MCP Integration` / `tokensave`
       - `adr-manager`: `Lifecycle & Workflow`, `Canonical ADR Template`, `Bidirectional Synchronization`
       - `pcp`: `INVOCATION CONTRACT`, `CLI Commands`, `Runtime Directory (.pcp)`
       - `steps`: `Roles`, `The phase loop`, `Review lenses`, `Separation of duties`
  4. **Bidirectional ADR Synchronization & Structural Headers**:
     - Forward synchronization: Validates that every decision entry under `decisions` in `ai-docs/constitution.yaml` has an `.adr` path pointing to an existing markdown document on disk.
     - ADR document structure validation: Verifies each markdown file in `ai-docs/decisions/` contains:
       - Level 1 heading `# ADR-XXXX: <Title>`
       - Metadata bullets: `- **Shortcode**: \`<id>\``, `- **Status**: <status>`, `- **Date**: <date>`, `- **Cluster**: <cluster>`, `- **Deciders**: <deciders>`.
       - Shortcode in ADR matches `id` in `constitution.yaml`.
       - Standard H2 structural headers: `## Context`, `## Decision Drivers`, `## Considered Options`, `## Decision Outcome`, `## Consequences` (including `### Positive` and `### Negative / Caveats`).
     - Reverse synchronization: Asserts that every ADR markdown file in `ai-docs/decisions/` is registered under `decisions` in `ai-docs/constitution.yaml` with matching shortcode ID and metadata, applying case-normalization and trimming on status comparisons (`adrStatus.toLowerCase().trim() === constStatus.toLowerCase().trim()`).
- **Why**: Implements the verification logic for Phase 4, guaranteeing automated validation of constitutional governance, query performance bounds, modular skill metadata, and ADR consistency.
- **Order justification**: First item in Phase 4. Creates `tests/constitution_skills.test.js` before updating `package.json`, ensuring the test target exists before the runner script references it.
- **Gate command**:
  ```bash
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" node -e 'const { execSync } = require("child_process"); const out = execSync("node --test tests/constitution_skills.test.js", { env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" } }).toString(); const expectedSuites = ["Constitution Schema & Taxonomy Validation", "Query-Driven Retrieval & Token Budget Bounds", "Modular Skills Discoverability & Frontmatter Conformance", "Bidirectional ADR Synchronization & Structural Headers"]; for (const suite of expectedSuites) { if (!out.includes(suite)) throw new Error("Missing expected suite in test output: " + suite); } console.log("tests/constitution_skills.test.js passed all 4 subtest suites!");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Could not find 'tests/constitution_skills.test.js'
  node:child_process:990
      throw err;
      ^

  Error: Command failed: node --test tests/constitution_skills.test.js
  Could not find 'tests/constitution_skills.test.js'
  ```

---

### Item 2: Update `package.json` Test Script Configuration
- **What changes**: In `package.json`, update the `"scripts"` section while preserving all other package manifest attributes (`name`, `version`, `type: "module"`, `main`, `keywords`, `license`):
  ```json
  "scripts": {
    "test": "node --test tests/pcp_skill.test.js tests/constitution_skills.test.js"
  }
  ```
- **Why**: Connects the new verification suite to `npm test` so that both `tests/pcp_skill.test.js` and `tests/constitution_skills.test.js` are executed together on every test run.
- **Order justification**: Must run after Item 1 so that `tests/constitution_skills.test.js` is already implemented and passing when `npm test` invokes both files.
- **Gate command**:
  ```bash
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" node -e 'const pkg = JSON.parse(require("fs").readFileSync("./package.json", "utf8")); if (pkg.type !== "module") throw new Error("package.json type must be module"); if (pkg.name !== "project-constitution-protocol") throw new Error("package.json name corrupted"); if (pkg.scripts?.test !== "node --test tests/pcp_skill.test.js tests/constitution_skills.test.js") { console.error("package.json test script is not configured for both test files: " + pkg.scripts?.test); process.exit(1); } console.log("package.json test script configured");'
  ```
- **Verbatim gate output before implementation**:
  ```
  package.json test script is not configured for both test files: node --test tests/pcp_skill.test.js
  ```

---

## Phase Acceptance Criterion

- **Gate Command**:
  ```bash
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" node -e 'const { execSync } = require("child_process"); const pkg = JSON.parse(require("fs").readFileSync("./package.json", "utf8")); if (pkg.type !== "module") throw new Error("package.json type must be module"); if (pkg.scripts?.test !== "node --test tests/pcp_skill.test.js tests/constitution_skills.test.js") throw new Error("package.json test script not configured for both test files: " + pkg.scripts?.test); const out = execSync("npm test", { env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" } }).toString(); if (!out.includes("PCP Skill Automation Suite") || !out.includes("Constitution Schema & Taxonomy Validation") || !out.includes("Query-Driven Retrieval & Token Budget Bounds") || !out.includes("Modular Skills Discoverability & Frontmatter Conformance") || !out.includes("Bidirectional ADR Synchronization & Structural Headers")) throw new Error("Missing test suite output in npm test"); console.log("Phase 4 Acceptance Gate: npm test successfully executed all test suites!");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Error: package.json test script not configured for both test files: node --test tests/pcp_skill.test.js
  ```

---

## Risks

1. **Subprocess PATH Resolution**: Child process invocations of `yq` within `tests/constitution_skills.test.js` must specify `PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"` (or merge with `process.env`) to prevent `ENOENT` failures across varied shell environments.
2. **Token Calculation Heuristic Consistency**: The test suite enforces the canonical token estimation formula `Math.round(words * 1.3) < 300` alongside character bounds (`< 1200`). Sliced query outputs should be trimmed of extraneous leading/trailing whitespace to prevent artificial inflation.
3. **PCP Integration Invariants**: Modifying `package.json` must preserve its other keys (`name`, `version`, `type: "module"`, `main`, `keywords`, `license`) without reformatting unmanaged sections.

---

## Out of Scope

- Modifying core PCP CLI logic in `plugins/pcp/skills/pcp/scripts/pcp.js` or changing existing tests in `tests/pcp_skill.test.js`.
- Adding third-party testing dependencies (Mocha, Jest, Vitest, Chai, js-yaml). All tests must remain zero-dependency using Node standard library modules (`node:test`, `node:assert/strict`, `node:child_process`, `node:fs/promises`, `node:path`).
- Creating additional domain specification YAML files beyond `ai-docs/specs/auth-spec.yaml`.
