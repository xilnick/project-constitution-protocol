# Phase 3 Execution Plan: AGENTS.md Orchestrator & Workflow Integration

## Phase Goal
Integrate modular skills infrastructure, strict tool routing protocols, automated constitutional verification, TokenSave staleness cooldown, and the adaptive complexity gate into the orchestrator entrypoint (`AGENTS.md`), steps protocol (`plugins/steps/skills/steps/SKILL.md`), model routing specification (`plugins/steps/MODEL_ROUTING.md`), and structured constitution (`ai-docs/constitution.yaml`).

## Evidence & Context Citations
- `.plans/PHASES.md:9-10`: Phase 3 acceptance criterion requiring `AGENTS.md` to provide thin hot-memory routing across the workflow phases while adhering to PCP normalization invariants.
- `AGENTS.md:1-45`: Current root agent instructions containing the top activation pointer (`Activate the \`pcp\` skill and follow its instructions.`), plugin marketplace layout, and conventions (`Reviewer and planner agents are given no \`Edit\` tool`), but lacking the modular skills matrix, strict tool routing protocols, TokenSave staleness management, end-to-end workflow phases, and adaptive complexity gate.
- `ai-docs/constitution.yaml:1-15`: Root structured constitution schema defining `security.rules` but missing `verification_command: "npm test"` and automated pre-commit quality checks under `constitution:`.
- `plugins/steps/MODEL_ROUTING.md:26-40`: Complexity gate specification defining Standard (Tier 1), Architectural (Tier 2), and Middle tiers, but lacking explicit documentation of Tier 0 (Fast-Track / Planning Bypass).
- `plugins/steps/skills/steps/SKILL.md:56-124`: The canonical steps phase loop and model routing documentation requiring Tier 0 fast-track protocol definition and step-skipping exception for micro/trivial edits.
- `.agents/skills/`: Established Phase 2 modular skills (`constitution-query`, `code-intelligence`, `adr-manager`).

---

## Work Items

### Item 1: Update Structured Constitution with Verification Command and Pre-Commit Rules
- **What changes**: Update `ai-docs/constitution.yaml` under `constitution:` to add:
  1. `verification_command: "npm test"`
  2. `quality.pre_commit_checks` containing explicit validation rules:
     - `qual-gate-01`: "All pre-commit verification gates and the test suite defined in verification_command must execute cleanly and return exit code 0 prior to phase completion."
     - `qual-hygiene-01`: "Context exploration must use progressive disclosure via tokensave or RTK tools; broad repository-wide grep or full-file dumping is prohibited."
- **Why**: Establishes machine-readable verification metadata and quality invariants directly in the project's root constitution, enabling automated pre-commit governance and automated gate execution by agent workflows.
- **Order justification**: First item in Phase 3. The orchestrator instructions and steps protocol reference the constitutional verification command and quality rules; defining them in `ai-docs/constitution.yaml` establishes the single source of truth before referencing it in documentation and routing.
- **Gate command**:
  ```bash
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" node -e 'const fs = require("fs"); const { execSync } = require("child_process"); const p = "ai-docs/constitution.yaml"; if (!fs.existsSync(p)) { console.error("Missing " + p); process.exit(1); } const vcmd = execSync("yq \".constitution.verification_command\" ai-docs/constitution.yaml", { env: process.env }).toString().trim(); if (vcmd !== "npm test") { console.error("Missing or invalid constitution.verification_command in " + p + ": got " + vcmd); process.exit(1); } const q1 = execSync("yq \".constitution.quality.pre_commit_checks[] | select(.id == \\\"qual-gate-01\\\") | .id\" ai-docs/constitution.yaml", { env: process.env }).toString().trim(); const q2 = execSync("yq \".constitution.quality.pre_commit_checks[] | select(.id == \\\"qual-hygiene-01\\\") | .id\" ai-docs/constitution.yaml", { env: process.env }).toString().trim(); if (q1 !== "qual-gate-01" || q2 !== "qual-hygiene-01") { console.error("Missing or invalid constitution.quality.pre_commit_checks (qual-gate-01, qual-hygiene-01) in " + p); process.exit(1); } console.log("ai-docs/constitution.yaml verification passed");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Missing or invalid constitution.verification_command in ai-docs/constitution.yaml: got null
  ```

---

### Item 2: Document Tier 0 Fast-Track Planning Bypass in Steps Protocol & Model Routing
- **What changes**:
  1. In `plugins/steps/MODEL_ROUTING.md`: Add **Tier 0 (Fast-Track / Planning Bypass)** to the Complexity Gate section. Document the exact criteria for Tier 0 (micro/trivial edits such as typos, single-line/isolated fixes, or simple documentation/config tweaks). Clarify that Tier 0 completely bypasses the multi-agent planning and review waves, routing execution strictly to `steps-implementer` (using the harness's Tier 1 fast cheap coder binding), immediately followed by the automated verification gate (`verification_command`). Document that the orchestrator never touches code.
  2. In `plugins/steps/skills/steps/SKILL.md`: Update Section "The phase loop" (lines 58-59) to explicitly carve out the Tier 0 Fast-Track exception from the step-skipping restriction ("For each phase, in order. Do not skip a step because the phase looks small — except for Tier 0 Fast-Track tasks (micro/trivial edits) which bypass planning and reviews directly to `steps-implementer` followed by automated verification — the steps that catch things are the ones that feel redundant."). Update the Model routing section in `SKILL.md` to reference Tier 0 Fast-Track rules.
- **Why**: Prevents ceremony overhead and context exhaustion on micro-tasks while maintaining invariant safety through strict verification gates and preserving the orchestrator role boundary.
- **Order justification**: Must run after Item 1 (so Tier 0 verification references the constitutional verification command) and before Item 3 (so `AGENTS.md` summarizes the ratified complexity gate from canonical protocol files).
- **Gate command**:
  ```bash
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" node -e 'const fs = require("fs"); const files = ["plugins/steps/MODEL_ROUTING.md", "plugins/steps/skills/steps/SKILL.md"]; for (const f of files) { if (!fs.existsSync(f)) { console.error("Missing file: " + f); process.exit(1); } const c = fs.readFileSync(f, "utf8"); if (!c.includes("Tier 0") || !c.includes("Fast-Track") || (!c.includes("bypass") && !c.includes("Bypass")) || (!c.includes("trivial") && !c.includes("micro"))) { console.error("Missing Tier 0 Fast-Track / Planning Bypass criteria documentation in " + f); process.exit(1); } } const skillContent = fs.readFileSync("plugins/steps/skills/steps/SKILL.md", "utf8"); if (!skillContent.includes("except for Tier 0") && !skillContent.includes("Except for Tier 0")) { console.error("Missing Tier 0 exception in SKILL.md phase loop rules"); process.exit(1); } console.log("Tier 0 Fast-Track protocol verified in MODEL_ROUTING.md and SKILL.md");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Missing Tier 0 Fast-Track / Planning Bypass criteria documentation in plugins/steps/MODEL_ROUTING.md
  ```

---

### Item 3: Update AGENTS.md with Modular Skills Matrix, Strict Tool Routing, End-to-End Workflow, and Adaptive Complexity Gate
- **What changes**: Update `AGENTS.md` while preserving all existing project conventions and layout details:
  1. **Activation Pointer**: Retain top pointer `Activate the \`pcp\` skill and follow its instructions.`.
  2. **Preserve Project Conventions**: Maintain the plugin marketplace structure (`.claude-plugin/marketplace.json`, `plugins/pcp/`, `plugins/steps/`), canonical protocol references (`plugins/steps/skills/steps/SKILL.md`, `MODEL_ROUTING.md`), and core rules (`Reviewer and planner agents are given no \`Edit\` tool`).
  3. **Modular Skills Matrix**: Document the modular skills with paths and activation rules:
     - `pcp`: Root marketplace skill (`plugins/pcp/skills/pcp/SKILL.md`).
     - `constitution-query`: Project governance & decisions (`.agents/skills/constitution-query/SKILL.md`).
     - `code-intelligence`: Semantic graph exploration & token-efficient targeting (`.agents/skills/code-intelligence/SKILL.md`).
     - `adr-manager`: Architectural decision record lifecycle (`.agents/skills/adr-manager/SKILL.md`).
  4. **Strict Tool Routing & Gap Closures**:
     - *Progressive Disclosure & Tool Limits*: Strictly forbid repository-wide broad grep/read. Agents must inspect symbols and dependencies via `tokensave` or RTK CLI.
     - *RTK Fallback Protocol*: When filtered or semantic commands truncate or omit required execution logs, fallback to `rtk raw <cmd>`.
     - *Constitutional Automated Verification*: Reference `ai-docs/constitution.yaml` and enforce execution of `verification_command: "npm test"` before completing any phase.
     - *Index Synchronization & TokenSave Staleness*: Check index status with `tokensave tool status`; execute index refresh when code modifications exceed staleness cooldown or symbol lookups miss newly introduced exports.
  5. **End-to-End Workflow Protocol**: Specify the 5 sequential phases:
     - *Context Setup*: Skill activation and constitutional query (`constitution-query`).
     - *Code Intelligence*: Semantic symbol mapping and reference tracing via `tokensave`.
     - *Precision Edit*: Surgical file editing strictly scoped to owned target files.
     - *Compressed Validation*: Executing verification commands and evaluating exit codes.
     - *Commit & ADR*: Updating ADR records, synchronizing code intelligence index, and committing.
  6. **Adaptive Complexity Gate**: Document the 3-tier routing:
     - *Tier 0 (Fast-Track / Planning Bypass)*: Micro/trivial tasks, bypassed directly to `steps-implementer`, followed by automated verification gate.
     - *Tier 1 (Standard)*: Phased workflow via `steps-planner` and `steps-implementer`.
     - *Tier 2 (Architectural)*: High-complexity/cross-cutting tasks planned by `steps-architect-pro`, implemented by `steps-implementer`, with `steps-fixer` reserved for deadlock escape.
- **Why**: Serves as the hot-memory master guide for all AI agent instances operating in this repository, ensuring strict adherence to context hygiene, token economics, and constitutional rules.
- **Order justification**: Must run after Items 1 and 2. Synthesizes the constitution schemas and steps model routing rules into a unified hot-memory orchestrator guide.
- **Gate command**:
  ```bash
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" node -e 'const fs = require("fs"); const p = "AGENTS.md"; if (!fs.existsSync(p)) { console.error("Missing file: " + p); process.exit(1); } const c = fs.readFileSync(p, "utf8"); const requiredSections = [ "Activate the \`pcp\` skill and follow its instructions.", "Project Conventions", "Reviewer and planner agents are given no \`Edit\` tool", "Modular Skills Matrix", "constitution-query", "code-intelligence", "adr-manager", "Strict Tool Routing", "tokensave", "rtk raw", "verification_command", "End-to-End Workflow", "Context Setup", "Code Intelligence", "Precision Edit", "Compressed Validation", "Commit & ADR", "Adaptive Complexity Gate", "Tier 0", "Tier 1", "Tier 2" ]; const missing = requiredSections.filter(item => !c.includes(item)); if (missing.length > 0) { console.error("Missing required sections/pointers in " + p + ": " + missing.join(", ")); process.exit(1); } console.log("AGENTS.md orchestrator integration verified");'
  ```
- **Verbatim gate output before implementation**:
  ```
  Missing required sections/pointers in AGENTS.md: Modular Skills Matrix, constitution-query, code-intelligence, adr-manager, Strict Tool Routing, tokensave, rtk raw, verification_command, End-to-End Workflow, Context Setup, Code Intelligence, Precision Edit, Compressed Validation, Commit & ADR, Adaptive Complexity Gate, Tier 0, Tier 1, Tier 2
  ```

---

## Phase Acceptance Criterion

- **Gate Command**:
  ```bash
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" node -e 'const fs = require("fs"); const { execSync } = require("child_process"); const constYaml = "ai-docs/constitution.yaml"; if (!fs.existsSync(constYaml)) throw new Error("Missing " + constYaml); const vcmd = execSync("yq \".constitution.verification_command\" ai-docs/constitution.yaml", { env: process.env }).toString().trim(); if (vcmd !== "npm test") throw new Error("Invalid verification_command: " + vcmd); const q1 = execSync("yq \".constitution.quality.pre_commit_checks[] | select(.id == \\\"qual-gate-01\\\") | .id\" ai-docs/constitution.yaml", { env: process.env }).toString().trim(); const q2 = execSync("yq \".constitution.quality.pre_commit_checks[] | select(.id == \\\"qual-hygiene-01\\\") | .id\" ai-docs/constitution.yaml", { env: process.env }).toString().trim(); if (q1 !== "qual-gate-01" || q2 !== "qual-hygiene-01") throw new Error("Missing quality pre-commit checks in " + constYaml); const routingFiles = ["plugins/steps/MODEL_ROUTING.md", "plugins/steps/skills/steps/SKILL.md"]; for (const f of routingFiles) { const c = fs.readFileSync(f, "utf8"); if (!c.includes("Tier 0") || !c.includes("Fast-Track")) throw new Error("Missing Tier 0 Fast-Track in " + f); } const skillC = fs.readFileSync("plugins/steps/skills/steps/SKILL.md", "utf8"); if (!skillC.includes("except for Tier 0") && !skillC.includes("Except for Tier 0")) throw new Error("Missing Tier 0 phase loop exception in SKILL.md"); const agentsContent = fs.readFileSync("AGENTS.md", "utf8"); const reqs = [ "Activate the \`pcp\` skill and follow its instructions.", "Reviewer and planner agents are given no \`Edit\` tool", "constitution-query", "code-intelligence", "adr-manager", "tokensave", "rtk raw", "verification_command", "Adaptive Complexity Gate", "Tier 0" ]; for (const r of reqs) { if (!agentsContent.includes(r)) throw new Error("Missing " + r + " in AGENTS.md"); } execSync("npm test", { env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }, stdio: "inherit" }); console.log("Phase 3 Acceptance Gate: All updates verified and test suite green!");'
  ```
- **Verbatim gate output before implementation**:
  ```
  [eval]:9
  if (vcmd !== "npm test") throw new Error("Invalid verification_command: " + vcmd);
                           ^

  Error: Invalid verification_command: null
      at [eval]:9:32
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
1. **PCP Initialization Invariant (`AGENTS.md`)**: The PCP test suite verifies that `AGENTS.md` is not overwritten if already present (`tests/pcp_skill.test.js:46-59`). Updates to `AGENTS.md` must preserve the top pointer `Activate the \`pcp\` skill and follow its instructions.` to avoid failing PCP integration expectations.
2. **Environment PATH and Subprocess Execution**: Test executions in sandboxed / child process environments require `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin` to reliably resolve `node`, `yq`, `tokensave`, and standard utilities.
3. **YAML Strict Formatting**: Modifications to `ai-docs/constitution.yaml` must maintain standard 2-space indentation and parse cleanly with both `yq` and `js-yaml` consumers.

---

## Out of Scope
- Creating new automated integration test files in `tests/` (scoped to Phase 4: Automated Verification Suite & Test Harness).
- Modifying the underlying PCP CLI binary implementation (`plugins/pcp/skills/pcp/scripts/pcp.js`).
- Modifying individual harness manifests under `plugins/steps/harnesses/` (covered by harness synchronization tooling in later phases).
