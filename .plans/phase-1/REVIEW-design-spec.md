# Review - design-spec

**Lens:** design-spec (design/spec consistency and protocol alignment)
**Verdict:** approve-with-amendments

## Blockers

1. **Incomplete taxonomy validation in Item 1 & Phase Acceptance:** Item 1 explicitly states that the root schema will include caveats (`c-e9a2`) and deferred tracks (`l-e404`). However, neither the Item 1 gate nor the Phase Acceptance Criterion actually verifies their existence. A conformant-but-wrong implementation could completely omit caveats and deferred tracks from `constitution.yaml` and the gate would still pass.
   - **Evidence:** Item 1 gate `const d = execSync(...) ... const s = execSync(...) ... const r = execSync(...) ... if (!d || !s || !r) throw new Error("Missing fields");` only checks for `d-8f3a`, an `auth` rule, and `billing`. The Phase Acceptance Criterion is similarly missing checks for `c-` and `l-` taxonomy keys.
   - **Fix:** Add `yq` extraction and validation checks for `c-e9a2` and `l-e404` to the node script in Item 1's gate and the Phase Acceptance Criterion.

2. **Missing query recipes for caveats and deferred tracks in Item 4:** Item 4 aims to document reproducible CLI query recipes across `yq` and `jq`. Its description and gate only require recipes for decisions by ID, requirements by cluster, and security rules by domain. Caveats (`c-xxxx`) and deferred tracks (`l-xxxx`) are completely omitted from the documentation requirement.
   - **Evidence:** Item 4 gate check: `if (!c.includes("yq") || !c.includes("d-8f3a") || !c.includes(".constitution.security.rules"))`
   - **Fix:** Update the description in Item 4 to explicitly require documenting retrieval recipes for caveats and deferred tracks, and update the gate command to enforce their presence in `ai-docs/README.md`.

## Non-blocking

1. **Item 2 ADR Structure Gate:** The gate for Item 2 only verifies that `ADR-0001-unified-esm.md` contains the ID and title (`d-8f3a`, "Unified ESM Execution Layer"). An implementation could write unstructured monolithic prose and still pass. Consider adding lightweight string checks for the structural headers (e.g., "Context", "Decision Drivers", "Consequences") to enforce progressive disclosure formatting.

## Verified

- Citations for `.pcp/_general.md:5-9` (`d-8f3a`) and `.pcp/_general.md:11-15` (`c-e9a2`) are accurate.
- Citations for `.pcp/MAP.json:20-31` correctly index the stated entries.
- The gate commands provided accurately fail on the current working directory as the required files do not exist yet.

## Unverified

- Exact BPE tokenizer counts (heuristic of `word_count * 1.3` was accepted on faith as safe under the 300 token limit).
