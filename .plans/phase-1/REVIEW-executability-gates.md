# Executability and Gates Review

**Lens:** executability-gates
**Verdict:** reject

### Blockers

1. **Phase Acceptance Gate (Bypass of Token Length Validation):** The token limit check will never trigger because the regex `split(/\\s+/)` contains a double backslash. In a Node script passed via Bash single quotes, `/\\s+/` is parsed as a regex literal matching a literal backslash followed by 's'. It fails to split on whitespace, resulting in an array of length 1, making the token count always `1.3` (which is `< 300`).
   - **Evidence:** `.plans/phase-1/PLAN.md:93` contains `const tokens = out.trim().split(/\\s+/).length * 1.3;` which evaluates to a literal backslash match.
   - **Fix:** Change the regex to `split(/\s+/)` to correctly match whitespace.

2. **Item 1 Gate (Incomplete Schema Verification):** The work item description mandates adding "engineering caveats (c-e9a2)" and "deferred tracks (l-e404)" to the constitution schema. The gate ignores them. A conformant-but-wrong implementation omitting caveats and deferred tracks would still pass.
   - **Evidence:** `.plans/phase-1/PLAN.md:24` verifies only `d-8f3a`, auth domain, and billing requirement.
   - **Fix:** Add `yq` checks for `c-e9a2` and `l-e404` to ensure all mandated sections are populated.

3. **Item 2 Gate (Weak Document Content Validation):** The item requires the ADR to contain detailed sections (Status, Context, Decision Drivers, Considered Options, Consequences), but the gate only checks for the strings "d-8f3a" and "Unified ESM". An empty file with only those two phrases would pass.
   - **Evidence:** `if (!c.includes("d-8f3a") || !c.includes("Unified ESM Execution Layer"))` at `.plans/phase-1/PLAN.md:45`.
   - **Fix:** Update the gate to verify the presence of the required structural headers (e.g., `c.includes("Status") && c.includes("Context")`).

4. **Item 3 Gate (Missing Domain Spec Fields Validation):** The item requires the spec to demonstrate domain-level query patterns for "endpoints" and "security invariants". The gate only checks `.spec.name` and `.spec.version`. A stub spec lacking endpoints and invariants would pass.
   - **Evidence:** `.plans/phase-1/PLAN.md:60` queries `"yq \".spec.name + \\\" | \\\" + .spec.version\" "`.
   - **Fix:** Enhance the gate's `yq` query to check for the presence of endpoints and/or security invariants fields in the YAML.

5. **Item 4 Gate (Weak Recipe Documentation Validation):** The item mandates documenting query recipes across both `yq` and `jq` for decisions, requirements, and security rules. The gate just checks if the README contains "yq", "d-8f3a", and ".constitution.security.rules". A README completely missing `jq` examples or requirements recipes would pass.
   - **Evidence:** `if (!c.includes("yq") || !c.includes("d-8f3a") || !c.includes(".constitution.security.rules"))` at `.plans/phase-1/PLAN.md:81`.
   - **Fix:** Include `"jq"` and a requirement-related string (e.g., `"billing"`) in the `includes()` assertions to cover the full scope of requested recipes.

### Non-blocking

- **Empty Query Outputs:** In the Phase Acceptance Gate, if a query returns only whitespace, `out.trim()` will be empty, and `if (!out.trim()) throw new Error(...)` will correctly catch it. 
- **yq String Concatenation:** Using `yq ".spec.name + \" | \" + .spec.version"` is correctly formatted for `yq v4` and will execute successfully.

### Verified

- The system `yq` is indeed version v4.53.2 (`yq (https://github.com/mikefarah/yq/) version v4.53.2`) as claimed by the plan.
- Escaping for `execSync` bash commands inside the `node -e` scripts is structurally sound. Bash single quotes pass the `\\\"` escapes correctly so Node parses them into `\"` for the `execSync` string.
- No global `CONSTITUTION.md` exists to violate.

### Unverified

- Cannot evaluate the precision of the `1.3` tokens-per-word heuristic against the actual underlying LLM, but it serves adequately as an enforcement mechanism for payload brevity.
