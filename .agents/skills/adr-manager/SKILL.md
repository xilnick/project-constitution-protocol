---
name: adr-manager
description: "Architecture Decision Record (ADR) lifecycle management, canonical structure enforcement, shortcode generation (d-xxxx), and bidirectional synchronization with ai-docs/constitution.yaml."
---

# ADR Manager Skill

Manage the lifecycle of Architectural Decision Records (ADRs) and enforce bidirectional synchronization between `ai-docs/decisions/` markdown documents and `ai-docs/constitution.yaml`.

## Lifecycle & Workflow

ADRs capture significant architectural decisions, trade-offs, and design mandates. Every architectural decision is recorded in two places:
1. **Full Narrative ADR**: A markdown document located in `ai-docs/decisions/ADR-XXXX-<slug>.md`.
2. **Compact Constitution Entry**: A metadata record in `ai-docs/constitution.yaml` under `decisions`.

### Lifecycle Stages
1. **Draft / Proposed**: Architecture decision under review or in development.
2. **Active / Accepted**: Formally accepted decision enforced across the repository.
3. **Superseded**: Replaced by a newer ADR (links to replacement).
4. **Deprecated / Rejected**: No longer in effect.

---

## Canonical ADR Template

All ADR files in `ai-docs/decisions` must adhere to the standard template structure:

```markdown
# ADR-XXXX: <Title>

- **Shortcode**: `d-xxxx`
- **Status**: Active | Proposed | Superseded | Deprecated
- **Date**: YYYY-MM-DD
- **Cluster**: `<domain-cluster>`
- **Deciders**: <Team or Agent Roles>

## Context
<Background problem, technical landscape, limitations, or requirements motivating the decision.>

## Decision Drivers
- <Key constraint 1>
- <Key objective 2>
- <Non-functional requirement 3>

## Considered Options
1. **<Option 1>**: Description, pros, and cons.
2. **<Option 2>**: Description, pros, and cons.
3. **<Option 3 (Selected)>**: Description, pros, and cons.

## Decision Outcome
Adopt **<Selected Option>**. <Summary rationale and execution mandate.>

## Consequences

### Positive
- <Benefits and improvements>

### Negative / Caveats
- <Trade-offs, limitations, or operational precautions>
```

---

## Shortcode Generation (`d-xxxx`)

Every ADR is assigned an immutable 4-hex shortcode prefix (`d-xxxx`, e.g. `d-8f3a`).
- Shortcodes must be unique across all `d-xxxx`, `c-xxxx`, `r-xxxx`, and `l-xxxx` entries.
- Source code implementing or respecting the decision is tagged with `@pcp:d-xxxx`.

---

## Bidirectional Synchronization

Maintaining bidirectional synchronization between `ai-docs/decisions` and `ai-docs/constitution.yaml` ensures consistent progressive disclosure.

### 1. Adding a New ADR
When creating `ai-docs/decisions/ADR-0002-<name>.md`:
1. Generate unique shortcode `d-xxxx`.
2. Populate the ADR markdown with required sections: `Status`, `Context`, `Decision Drivers`, `Considered Options`, `Consequences`.
3. Add the corresponding entry to `ai-docs/constitution.yaml`:
   ```yaml
   decisions:
     - id: "d-xxxx"
       title: "<Title>"
       status: "active"
       cluster: "<cluster>"
       date: "YYYY-MM-DD"
       summary: "<One-sentence summary under 300 tokens>"
       adr: "ai-docs/decisions/ADR-XXXX-<slug>.md"
   ```

### 2. Updating ADR Status
When an ADR status changes (e.g. from `Proposed` to `Active` or `Superseded`):
1. Update `- **Status**:` in `ai-docs/decisions/ADR-XXXX-<slug>.md`.
2. Synchronize `status:` in `ai-docs/constitution.yaml`.

### 3. Verification Recipe
Verify synchronization integrity between `ai-docs/constitution.yaml` and `ai-docs/decisions`:
```bash
node -e '
const fs = require("fs");
const { execSync } = require("child_process");
const adrs = execSync("yq \".decisions[].adr\" ai-docs/constitution.yaml").toString().trim().split("\n").filter(Boolean);
for (const adr of adrs) {
  if (!fs.existsSync(adr)) {
    console.error("Missing ADR file referenced in constitution.yaml: " + adr);
    process.exit(1);
  }
}
console.log("All " + adrs.length + " ADR links synchronized.");
'
```

---

## Operational Guardrails
- **No Orphan ADRs**: Every file in `ai-docs/decisions` must have an entry in `ai-docs/constitution.yaml`.
- **No Broken Links**: Every `adr` reference in `ai-docs/constitution.yaml` must point to an existing file.
- **Progressive Disclosure**: `ai-docs/constitution.yaml` entries should carry compact summaries so agents need not read the full ADR file unless investigating deep rationale.
