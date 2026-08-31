# Review - design-spec

1. **Lens** — design-spec (design/spec consistency, protocol alignment, PCP normalization invariants)
2. **Verdict** — `reject`
3. **Blockers**

1. **Orchestrator Code Execution Violation**: Item 2 proposes allowing the "hot-seat agent" (the orchestrator) to perform direct execution for Tier 0. This violates the core protocol invariant that the orchestrator must never touch code.
   - **Evidence**: `plugins/steps/skills/steps/SKILL.md:15` ("You are the orchestrator. You do not write the plan, the implementation, or the review.") and `SKILL.md:28` (Orchestrator writes "phase list, log, commits", never does "Touch code").
   - **Fix**: Remove "or hot-seat agent" from Item 2. Require Tier 0 execution to strictly route to `steps-implementer`.

2. **Protocol Contradiction on Step Skipping**: Item 2 adds Tier 0 Fast-Track documentation (bypassing the planning/review ceremony) but fails to address existing rules in `SKILL.md` that strictly forbid skipping steps. A conformant implementation would just append the Tier 0 documentation, leaving the file contradicting itself.
   - **Evidence**: `plugins/steps/skills/steps/SKILL.md:58-59` ("Do not skip a step because the phase looks small — the steps that catch things are the ones that feel redundant.").
   - **Fix**: Update Item 2 and its gate to require explicitly amending the rule on line 58 to carve out an exception for Tier 0.

3. **Weak Gate in Item 3 Allows Convention Loss**: The gate for Item 3 only checks for the presence of new pointers and the PCP activation pointer. An implementation could overwrite `AGENTS.md` and accidentally delete all existing critical project conventions while still passing the gate.
   - **Evidence**: `AGENTS.md:30-45` contains required conventions (e.g., "Reviewer and planner agents are given no Edit tool", "MODEL_ROUTING.md is canonical").
   - **Fix**: Update the Item 3 gate to also assert that key existing conventions (e.g., `Reviewer and planner agents are given no Edit tool`) are preserved in the file.

4. **Acceptance Gate Environment Mismatch**: The Phase Acceptance Criterion gate hardcodes an incorrect `PATH` for the final `npm test` execution, stripping out `/opt/homebrew/bin`. This guarantees a test execution failure, contradicting the plan's own Risk #2.
   - **Evidence**: Acceptance Gate `execSync("npm test", { env: { ...process.env, PATH: "/usr/local/bin:/usr/bin:/bin" }...` versus Risk #2 ("Test executions... require `/opt/homebrew/bin`").
   - **Fix**: Update the `PATH` in the Phase Acceptance Gate to include `/opt/homebrew/bin` so it matches the individual item gates and Risk #2.

4. **Non-blocking**
- **Per-Harness Bindings Context**: Item 2 should clarify whether the "Per-harness bindings" section in `MODEL_ROUTING.md` needs to be updated to explicitly map Tier 0 to a model, or if Tier 0 implicitly uses the `steps-implementer` binding.

5. **Verified**
- The top pointer invariant in `AGENTS.md` (`Activate the pcp skill...`) is properly protected by the Item 3 gate and Acceptance Gate.
- The 4 gap solutions are successfully mapped to `AGENTS.md` as required by the Phase 3 goal.
- `ai-docs/constitution.yaml` exists and currently lacks the verification and pre-commit checks, matching the provided gate outputs.
- `npm test` passes in the sandbox when run with the correct path.

6. **Unverified**
- N/A
