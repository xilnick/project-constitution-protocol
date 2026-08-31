# Phases: Query-Driven Context Retrieval & Modular Skills

## Ordered Phases

1. **Phase 1: Structured Constitution Schema & Retrieval Recipes**
   - Acceptance criterion: `node -e "const { execSync } = require('child_process'); execSync('yq --version || jq --version'); console.log('CLI query tooling available');"` && structured `ai-docs/constitution.yaml` queries return isolated valid payloads (< 300 tokens).
2. **Phase 2: Modular Skills Infrastructure**
   - Acceptance criterion: `.agents/skills/constitution-query/SKILL.md`, `.agents/skills/code-intelligence/SKILL.md`, and `.agents/skills/adr-manager/SKILL.md` exist with valid YAML frontmatter, strict tool definitions, and scoped actions.
3. **Phase 3: AGENTS.md Orchestrator & Workflow Integration**
   - Acceptance criterion: `AGENTS.md` provides thin hot-memory routing across the 4 workflow phases while adhering to PCP normalization invariants.
4. **Phase 4: Automated Verification Suite & Test Harness**
   - Acceptance criterion: `npm test` runs with all test suites passing, verifying retrieval queries, skill discovery, and schema conformance.

## Out of Scope

- Modifying existing core PCP CLI binary semantics (`plugins/pcp/skills/pcp/scripts/pcp.js`) unless required for interoperability.
- Monolithic documentation ingestion (all context retrieval must follow progressive disclosure).
