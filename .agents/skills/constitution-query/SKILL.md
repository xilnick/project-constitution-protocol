---
name: constitution-query
description: "Query-driven rule extraction from the structured constitution schema and ADRs via yq and jq. Enforces progressive disclosure to prevent token bloat."
---

# Constitution Query Skill

Extract targeted architectural rules, constraints, requirements, and domain security policies from `ai-docs/constitution.yaml` and domain specifications using structured CLI queries.

## Progressive Disclosure

AI agents must avoid loading full documentation files into context windows. Monolithic reads waste context tokens and degrade reasoning accuracy.

Instead, apply **progressive disclosure**:
1. Query only the relevant slice or shortcode required for the immediate task.
2. Verify all extracted payloads fit well within isolated sub-300 token boundaries.
3. If an architectural decision requires deep context, follow its referenced ADR path (`.adr`) directly rather than parsing unreferenced documents.

### Shortcode Taxonomy
The structured constitution and source code anchors follow the four standard shortcodes:
- `d-xxxx`: Architectural Decisions (e.g. `d-8f3a`)
- `c-xxxx`: Engineering Caveats and Constraints (e.g. `c-e9a2`)
- `r-xxxx`: Functional and Non-Functional Requirements (e.g. `r-b111`)
- `l-xxxx`: Deferred Tracks and Backlog Items (e.g. `l-e404`)

---

## Query Recipes

All queries operate against `ai-docs/constitution.yaml` or domain specifications under `ai-docs/specs/` using `yq` (v4+) and `jq`.

### 1. Security Rules by Domain
Query active `security.rules` for a specific domain (e.g. `auth` or `data`):
```bash
# Using yq
yq '.constitution.security.rules[] | select(.domain == "auth")' ai-docs/constitution.yaml

# Alternative yq path query
yq '.constitution.security.rules' ai-docs/constitution.yaml

# Using yq with jq
yq -o=json ai-docs/constitution.yaml | jq '.constitution.security.rules[] | select(.domain == "auth")'
```

### 2. Architectural Decisions (`d-xxxx`)
Query decision metadata and summary by ID:
```bash
# Using yq
yq '.decisions[] | select(.id == "d-8f3a")' ai-docs/constitution.yaml

# Using jq
yq -o=json ai-docs/constitution.yaml | jq '.decisions[] | select(.id == "d-8f3a")'

# Extract the ADR markdown path
yq '.decisions[] | select(.id == "d-8f3a") | .adr' ai-docs/constitution.yaml
```

### 3. Engineering Caveats & Constraints (`c-xxxx`)
Query operational constraints and engineering caveats:
```bash
# Using yq
yq '.caveats[] | select(.id == "c-e9a2")' ai-docs/constitution.yaml

# Using jq
yq -o=json ai-docs/constitution.yaml | jq '.caveats[] | select(.id == "c-e9a2")'
```

### 4. Requirements by Cluster or ID (`r-xxxx`)
Query functional and non-functional requirements by cluster or shortcode:
```bash
# Query by cluster (e.g. billing)
yq '.requirements[] | select(.cluster == "billing")' ai-docs/constitution.yaml

# Query by requirement ID (r-xxxx)
yq '.requirements[] | select(.id == "r-b111")' ai-docs/constitution.yaml

# Using jq
yq -o=json ai-docs/constitution.yaml | jq '.requirements[] | select(.id == "r-b111")'
```

### 5. Deferred Tracks & Backlog (`l-xxxx`)
Query deferred feature tracks and blueprints:
```bash
# Using yq
yq '.deferred[] | select(.id == "l-e404")' ai-docs/constitution.yaml

# Using jq
yq -o=json ai-docs/constitution.yaml | jq '.deferred[] | select(.id == "l-e404")'
```

### 6. Domain Specifications
Query domain spec slices from `ai-docs/specs/*.yaml`:
```bash
# Inspect entire spec definition
yq '.spec' ai-docs/specs/auth-spec.yaml

# Query specific endpoint or section
yq '.spec.endpoints[] | select(.path == "/api/v1/auth/login")' ai-docs/specs/auth-spec.yaml
```

---

## Invariants & Guardrails
- **Payload Constraint**: Every individual query payload must remain under 300 tokens.
- **Source of Truth**: `ai-docs/constitution.yaml` is the canonical registry for shortcodes.
- **No Direct Mutation**: Never edit shortcodes or security rules directly without running validation procedures.
