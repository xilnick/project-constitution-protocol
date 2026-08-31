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

## Retrieval

The query recipes live in exactly one place: `plugins/pcp/skills/constitution-query/SKILL.md`.
Every recipe there is executed against the files in this directory by the test suite, so a second
copy kept here would be a second thing to keep true.

`constitution.execution` in `constitution.yaml` declares the execution tier ladder, the stages each
tier runs, and the escalation triggers; `plugins/steps/MODEL_ROUTING.md` is that block's prose.

---

## Payload Size Validation Suite

The constitution-query recipes return concise payloads designed to fit well within sub-200 token
limits.

The bound is enforced in one place: `tests/constitution_skills.test.js` measures every query
payload with the repository's own character-class estimator and fails it above the 200-token
bound. Run it with `npm test` — there is no second copy of the bound to keep in sync.
