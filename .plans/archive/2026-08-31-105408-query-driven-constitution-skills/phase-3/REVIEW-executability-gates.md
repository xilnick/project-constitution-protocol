# Lens: executability-gates

## Verdict: reject

## Blockers
1. **Item 1 gate fails to check exact criteria**: It verifies the existence of `quality.pre_commit_checks[0].id` but does not check for the actual required rules (`qual-gate-01` and `qual-hygiene-01`). A conformant-but-wrong implementation that adds a single dummy rule (e.g., `id: foo`) will pass. Update the gate to check for the specific required values. Evidence: `.plans/phase-3/PLAN.md:24` where `qrule` only checks for existence.
2. **Phase Acceptance Gate omits checks for Item 1**: The Phase Acceptance Gate completely omits verification for `quality.pre_commit_checks`, missing a core requirement of Item 1. A conformant-but-wrong implementation could omit the pre-commit checks entirely and still pass the Acceptance Gate. Add checks for `qual-gate-01` and `qual-hygiene-01` to the Phase Acceptance Gate. Evidence: `.plans/phase-3/PLAN.md:81`.
3. **Contradiction with Risk 2 (Resiliency)**: The Phase Acceptance Gate contradicts its own Risk 2 definition by overriding `PATH` for `npm test` to `"/usr/local/bin:/usr/bin:/bin"`, explicitly excluding `/opt/homebrew/bin` which the plan states is required for resilient subprocess execution. Update the `PATH` in the acceptance gate's `execSync` to include `/opt/homebrew/bin`. Evidence: `.plans/phase-3/PLAN.md:81` and `.plans/phase-3/PLAN.md:106`.

## Non-blocking
1. **Loose documentation checks in Item 2**: The gate only checks for strings "Tier 0" and "Fast-Track", without checking that the specific criteria for bypassing (e.g., "micro", "trivial", "typos") were actually documented.
2. **Loose structural checks in Item 3**: The gate checks for exact string matches without checking their structural placement (e.g., `tokensave` could be mentioned anywhere, not necessarily under "Strict Tool Routing & Gap Closures").

## Verified
- The gates for Items 1, 2, and 3 are correctly formatted as Node shell scripts and fail correctly in the current state.
- The Phase Acceptance Gate script executes correctly up to the first failing condition.
- Citations for files (`ai-docs/constitution.yaml`, `plugins/steps/MODEL_ROUTING.md`, `plugins/steps/skills/steps/SKILL.md`, `AGENTS.md`) point to valid locations with accurate content.

## Unverified
- None.
