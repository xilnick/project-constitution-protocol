# AI Docs Context Retrieval System

This directory houses the structured constitution schema, modular Architectural Decision Records (ADRs), and domain specifications for progressive disclosure context retrieval.

## Design Goals

- **Token Economy**: AI agents query isolated schema slices (typically < 200 tokens) instead of loading monolithic documentation into context windows.
- **Strict Taxonomy**: Follows standard PCP shortcodes:
  - `d-xxxx`: Architectural Decisions
  - `c-xxxx`: Engineering Caveats & Constraints
  - `r-xxxx`: Functional & Non-Functional Requirements
  - `l-xxxx`: Deferred Tracks & Backlog Items
- **Zero-Dependency CLI Querying**: Accessible via standard CLI tools (`yq` and `jq`).

---

## Retrieval Recipes

### 1. Retrieve Security Rules by Domain
Query active security rules for a specific domain (e.g. `auth`):
```bash
# Using yq
yq '.constitution.security.rules[] | select(.domain == "auth")' ai-docs/constitution.yaml

# Using yq + jq
yq -o=json ai-docs/constitution.yaml | jq '.constitution.security.rules[] | select(.domain == "auth")'
```

### 2. Retrieve Decision by ID (`d-8f3a`)
Fetch the metadata and summary for a decision:
```bash
# Using yq
yq '.decisions[] | select(.id == "d-8f3a")' ai-docs/constitution.yaml

# Using jq
yq -o=json ai-docs/constitution.yaml | jq '.decisions[] | select(.id == "d-8f3a")'
```
*Note: Follow the linked ADR path in `.adr` (e.g. `ai-docs/decisions/ADR-0001-unified-esm.md`) for full architectural context.*

### 3. Retrieve Engineering Caveat by ID (`c-e9a2`)
Fetch engineering constraints and operational caveats:
```bash
# Using yq
yq '.caveats[] | select(.id == "c-e9a2")' ai-docs/constitution.yaml

# Using jq
yq -o=json ai-docs/constitution.yaml | jq '.caveats[] | select(.id == "c-e9a2")'
```

### 4. Retrieve Requirements by Cluster (`billing`)
Extract all functional requirements belonging to a domain cluster:
```bash
# Using yq
yq '.requirements[] | select(.cluster == "billing")' ai-docs/constitution.yaml

# Using jq
yq -o=json ai-docs/constitution.yaml | jq '.requirements[] | select(.cluster == "billing")'
```

### 5. Retrieve Deferred Tracks (`l-e404`)
Inspect deferred architecture or feature tracks:
```bash
# Using yq
yq '.deferred[] | select(.id == "l-e404")' ai-docs/constitution.yaml

# Using jq
yq -o=json ai-docs/constitution.yaml | jq '.deferred[] | select(.id == "l-e404")'
```

### 6. Retrieve Domain Specification (`auth-spec`)
Inspect a domain specification slice:
```bash
# List the spec's top-level sections
yq '.spec | keys' ai-docs/specs/auth-spec.yaml

# Querying specific endpoint
yq '.spec.endpoints[] | select(.path == "/api/v1/auth/login")' ai-docs/specs/auth-spec.yaml
```

---

## Payload Size Validation Suite

All retrieval recipes above return concise payloads designed to fit well within sub-200 token limits.

The bound is enforced in one place: `tests/constitution_skills.test.js` measures every query
payload with the repository's own character-class estimator and fails it above the 200-token
bound. Run it with `npm test` — there is no second copy of the bound to keep in sync.
