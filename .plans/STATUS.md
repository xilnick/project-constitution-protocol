# Status

- **Iteration**: `gate-repair-installability`
- **Current Phase**: Phase 3 — **complete and verified**; Iteration complete
- **Done**:
  - Phase 1 (gate made able to fail). Gates re-measured: `npm test` 66/66; `node tests/mutation-harness.mjs` 16/16 conformant.
  - Phase 2 (make every documented recipe execute). Gates re-measured: `npm test` 66/66 (0 fail / 0 skipped / 0 todo) + hermetic runner (69/69 ok); `npm run test:recipes` 100/100 checks ok (0 fail / 0 blocked); `node tests/mutation-harness.mjs` 16/16 conformant.
  - Phase 3 (make skills reachable when installed). Gates re-measured: `bash tests/install-smoke.sh` 5/5 skills discovered & recipes executed in throwaway HOME; all harnesses aligned with Tier 1.5 (Middle) and dynamic workflow escalation.
- **Pending**: None (all phases in iteration complete).
- **Protocol answers (apply to every remaining phase)**: one commit per phase on
  `steps/harness-portability`, no push; run all three phases this pass.
- **Open, owned by nobody yet**:
  - Nothing in the repository schedules `npm run test:recipes`. Verified there is no CI at all —
    no `.github/workflows`, no workflow file anywhere — so Phase 2 cannot wire it. `npm test` stays
    hermetic by ruling R-K, which means recipe rot in the graph-dependent checks will not surface
    until someone runs the recipes gate by hand. Named as risk R4 in `phase-2/PLAN.md`.
  - `tests/pcp_skill.test.js:21-23` runs `cleanPlayground()` and two
  `fs.mkdir` at suite top level — same abort-on-throw class Phase 1 fixed in the constitution
  suite. Now *detected* by the positive-membership pcp invariant, deliberately not fixed in
  Phase 1; see `ORCHESTRATOR-LOG.md` for why.
