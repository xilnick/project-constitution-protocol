# Status

- **Iteration**: `gate-repair-installability`
- **Current Phase**: Phase 1 — **complete and committed**; Phase 2 next
- **Done**: Phase 1 (gate made able to fail). Gates re-measured by the orchestrator:
  `npm test` 66/66 (0 fail / 0 skipped / 0 todo); `node tests/mutation-harness.mjs`
  16/16 conformant, exit 0; all 16 mutations at 61 executed leaves; porcelain byte-identical
  across the sweep.
- **Pending**: Phase 2 (make every documented recipe execute), Phase 3 (make the skills reachable
  when installed).
- **Protocol answers (apply to every remaining phase)**: one commit per phase on
  `steps/harness-portability`, no push; run all three phases this pass.
- **Open, owned by nobody yet**: `tests/pcp_skill.test.js:21-23` runs `cleanPlayground()` and two
  `fs.mkdir` at suite top level — same abort-on-throw class Phase 1 fixed in the constitution
  suite. Now *detected* by the positive-membership pcp invariant, deliberately not fixed in
  Phase 1; see `ORCHESTRATOR-LOG.md` for why.
