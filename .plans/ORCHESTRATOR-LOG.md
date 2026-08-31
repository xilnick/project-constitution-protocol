# Orchestrator Log

## Iteration: gate-repair-installability (2026-08-31)

Opened after a three-lens audit of the archived `query-driven-constitution-skills`
iteration. All three lenses returned `reject`; ten blockers, of which the orchestrator
independently reproduced six against the files and the live binaries.

### Cross-phase findings carried in

- **The deliverable was the gate.** `npm test` reports 49/49, but 26 are pre-existing pcp
  tests; of the 19 new ones, five of six realistic defect classes pass green under mutation.
  A green suite here is not evidence, and no number from the archived iteration may be
  copied forward without re-measurement.
- **Ownership: the section-string narrowing (audit B3/#1) is Phase 1's**, not Phase 2's,
  even though it reads as a doc problem. The plan's strings were replaced with looser ones
  to fit the artifacts; restoring them is a gate change, and Phase 2 must not "fix" it by
  editing the artifacts to match.
- **Silent exit-0 failure is one class, not three sites.** `tokensave tool X name="Y"`,
  `rtk raw`, and the `find_exact_symbol` misses all fail while reporting success. Phase 2
  must enumerate the whole class across the three skills and `AGENTS.md`, not patch the six
  cited lines. Reproduced: `tokensave tool find_exact_symbol name="executePhase"` →
  `{"name":"name=executePhase","count":0}`, exit 0.
- **Local install was stale, and is now a symlink.** `~/.agents/skills/{pcp,steps}` were
  hand copies predating phase 3 (no `$PCP` resolution, no Tier 0 gate) — the stale `steps`
  copy was the one running the audit session. Both now symlink into
  `plugins/*/skills/*`, so the working tree is the installed version. Consequence for
  Phase 3: an edit to a skill is live immediately, and a broken edit breaks the running
  session. Backup of the replaced copies: session scratchpad `skills-backup/`.
- **`MODEL_ROUTING.md` does not resolve for an installed `steps` skill.** It sits at the
  plugin root, one level outside the skill directory that gets symlinked. Same class as
  the `$PCP` problem; Phase 3 owns it.
- **Graph counts drift.** `phase-2/PLAN.md:15` recorded 45 files / 436 nodes / 110 edges;
  measured today 47 / 374 / 63. Any count written this iteration cites the command.

### Phase 1 — findings from the plan-review wave (orchestrator rulings)

- **A sixth SKILL.md exists and diverges.** `plugins/steps/harnesses/droid/skills/steps/SKILL.md`
  (17.5K) vs the canonical `plugins/steps/skills/steps/SKILL.md` (15.8K) — 103 diff lines,
  first divergence at line 22. Both carry valid `name: steps` frontmatter and both ship via
  `.claude-plugin/marketplace.json`. The suite's `skillDefinitions` table lists five files and
  misses this one. **Ruling: Phase 1 owns the gate change** (discover SKILL.md by walk, assert
  set-equality against the table, add a `skill-unlisted` mutation). **Phase 3 owns the
  divergence itself** — deciding whether the droid copy should be generated, symlinked, or
  deleted is an install/packaging question, and Phase 1 must not silently reconcile the texts.
- **Scope conflict resolved in favour of PHASES.md.** `.plans/PHASES.md:50-51` puts fixture-identity
  decoupling inside Phase 1 ("stop the tests from depending on fixture identity in a way that
  breaks consumers"); `phase-1/PLAN.md:672-675` filed it out of scope and increases the coupling.
  PHASES.md governs. The reviewer's amendment — hoist the fixture-coupled constants into
  `tests/fixtures/expected.mjs` — satisfies both this and the "golden value lives outside the
  artifact" requirement, and is the form to adopt.
- **Tooling gotcha, cost one wrong reading.** `grep` is hook-rewritten to `rg` in this
  environment; `diff A B | grep -c '^[<>]'` returned `0` for two files that differ on 103 lines.
  Count diff output with `wc -l`, or compare with `cmp`, when the answer decides a finding.

### Phase 1 — orchestrator rulings from the critic lens

- **Negative controls are mandatory (A1).** Every control the plan declares is a positive
  control: something that must go RED. A suite that simply rejects any change to these files
  therefore passes the harness, which is the original failure — a gate its own artifact can
  satisfy trivially — displaced one level up. At least one mutation must declare `SURVIVED` as
  its expected outcome, so the criterion becomes "goes red *iff* the property broke" rather
  than "goes red".
- **The mutation table is plan-owned and frozen.** Mutation semantics and their expected
  signatures are authored in `PLAN.md` before the harness exists; the implementer may not edit
  them to match what its code emits. This is separation of duties applied to the instrument,
  and unlike adding another gate, it does not recurse. If a signature turns out to be wrong,
  that is a reported decision back to the orchestrator, not a quiet edit.
- **D1 — no `--dirty-ok` flag.** An escape hatch on a gate gets used by habit, then by CI.
  Restore is a byte snapshot and never git, so tree-cleanliness is neither necessary nor
  sufficient. Correct form: refuse (exit 2) only when a *mutation target* path is dirty
  (`ai-docs/`, `tests/`, `package.json`, `plugins/steps/skills/steps/SKILL.md`), and assert
  byte-identical porcelain at exit. This also removes the 7-commit `.plans`-churn tax that
  the strict form would have manufactured.
- **D2 — approve 300→200 with the metric change**, conditional on pinning the estimator's own
  measured values. Otherwise the phase tightens a number while leaving the function that
  computes it ungated — the same defect one layer down.
- **D3 — approve the retirements; `Review lenses` moves to the retired column** with pcp's two.
  Retiring a string is a disclosed decision; silently swapping one for a looser one is not.
- **Item 5's two new headings in `plugins/steps/skills/steps/SKILL.md`: not adopted as written.**
  Adding a heading so a restored assertion can pass is the artifact-follows-gate inversion this
  iteration exists to correct. Either the artifact genuinely needs the section on its own merits
  — argued in the plan, independent of the test — or the string is retired per D3.

### Phase 2 — scouting digest (orchestrator, read-only, gathered while Phase 1 implements)

- Fenced shell blocks: `constitution-query` 6, `code-intelligence` 7, `adr-manager` 1, `AGENTS.md` **0**.
- Commands across those blocks: `yq` ×15, `tokensave` ×7, `node` ×1.
- **Consequence for Phase 2's gate design:** a recipe-extractor that only walks fenced blocks will
  never see `AGENTS.md:63`'s `rtk raw`, because that citation is inline prose in backticks, not a
  fenced block. The `rtk raw` defect is real and reproduced, so the gate needs a second form — a
  banned/unknown-command check over inline code spans — or it will certify `AGENTS.md` clean while
  the defect that motivated the phase sits untouched. Same shape as the whole-file substring scan
  Phase 1 is removing: the check and the defect must live in the same space.
- The 7 `tokensave` invocations are the `name="X"` form that exits 0 with `count: 0`; the 15 `yq`
  invocations were verified correct by the installability audit and are not in scope to change.

### Phase 1 — orchestrator rulings on the implementer's two escalations

- **`path-stripped` `max: 20` → enumerate `mustFail`, `max: 21`.** The cap was wrong, not the
  implementation. `20` was computed against the pre-phase suite's 12 yq-dependent leaves plus
  margin, before this phase's nine additional yq-dependent leaves were named. Verified
  derivation: six original suite-1 leaves + `tool resolution follows the inherited PATH` + the
  two `* matches the declared golden document` leaves = 9, plus all 12 suite-2 leaves = **21**.
  Reproduced independently by the orchestrator; the 21 names in the harness output match the
  derivation exactly.
  The repair is **not** `max: 21`, which would loosen a number to fit what ran. Under a hermetic
  PATH the failing set is fully enumerable and deterministic — it is exactly the yq-dependent
  leaves — so it becomes a *declared expected result*: all 21 names move into `mustFail` and the
  cap becomes `21`. With `mustFail ⊆ failing` and `|failing| ≤ 21`, the contract then pins the
  set exactly. That checks strictly more than `max: 20` did, which is the direction a gate change
  is allowed to move. `PLAN.md:110-180`'s frozen row is amended by this ruling, in the plan and in
  the harness, and the amendment is recorded here rather than made quietly.
- **Guard refusal set: accepted as implemented; D1 amended.** D1 named `ai-docs/`, `tests/`,
  `package.json`, `plugins/steps/skills/steps/SKILL.md` as the refusal set. That list was written
  before the item order existed and is wrong: no mutation in the frozen table targets `tests/`,
  `package.json` or `steps/SKILL.md`, and all three are necessarily dirty while the phase is in
  flight, so including them would make every per-item gate in the phase unrunnable. The correct
  rule is the one implemented — refuse on paths the suite reads **as data** and that no item edits
  (`ai-docs/`, `.agents/skills/`, `plugins/steps/skills/rogue/`). Exit-time byte-identical
  porcelain comparison over the read paths is unchanged and remains the real guarantee.

### Phase 1 — implementation review wave (3 lenses) and the fix ruling

Verdicts: conformance/gate-integrity `approve`; correctness/regression `approve-with-amendments`
(1 blocker); reuse/simplification 10 findings, none correctness.

- **Conformance is the good news and it is worth stating precisely.** Zero divergences between
  `tests/mutation-harness.mjs`'s table and the frozen table at `PLAN.md:126-153`; every anchor,
  signature literal and cap verbatim. `ai-docs/`, `.agents/` and `tests/pcp_skill.test.js`
  byte-unchanged. The one artifact edit (Item 8's heading in
  `plugins/steps/skills/steps/SKILL.md`) is argued on the artifact's own merits at
  `PLAN.md:734-748` and dispositioned `accept` at `RECONCILIATION.md:79,86` — which is what my
  earlier ruling required, so it stands. Decisive: the single character-edit that would have
  turned the gate green — `path-stripped`'s `max: 20` — was **not** made; the implementer escalated
  instead. The artifact-follows-gate move was refused under exactly the conditions that invited it.
- **Blocker: the meta-gate has no denominator.** `tests/mutation-harness.mjs:374,376` collect only
  `not ok` lines; nothing parses `ok`, `# tests`, `# pass` or `1..N`. Four conclusions are therefore
  drawn from absence — `mustPass` green (`:543-544`), `SURVIVED` (`:519-520`), the pcp invariant
  (`:539`), `|failing| ≤ max` (`:545`). A leaf that never executed satisfies all four. Reproduced by
  the orchestrator: `tests/constitution_skills.test.js:337` calls `parseYaml` at suite-4's **top
  level**, so under `path-stripped` and `canary-bad-yaml` six ADR-sync leaves never register and
  vanish from the stream rather than failing. `GATE-OUTPUT.md:60`'s "every mustPass set stayed
  green" overstates what was measured.
- **Ruling: the denominator fix and the `path-stripped` amendment land together, in that order.**
  Amending the cap first would pin the frozen table to a run in which six checks silently did not
  execute — fitting the instrument to a measurement known to be short. So the suite is repaired
  first (top-level throwing statements hoisted into their leaves, as a **class** sweep across all
  five suites, not just the cited line), the enumeration is re-measured, and only then does the
  `mustFail` set get written. The set is expected to grow past 21 for exactly the right reason.
  The fixer may not choose those numbers; it reports the measurement and the orchestrator amends
  `PLAN.md`.
- **No per-mutation escape hatch.** If an executed-leaf count still diverges from the clean-tree
  baseline after the suite repair, that is a reported decision, not an `expectedLeafDelta` field.
  An allowance on a gate gets used by habit, then by CI — same reasoning as the D1 `--dirty-ok`
  ruling.
- **`resolveTool` stays duplicated** between `tests/lib/tools.mjs` and the harness. The library copy
  is under measurement by `path-stripped`; merging them would make that mutation vacuous. Recorded
  here because it reads as obvious duplication and will be "fixed" by someone otherwise.
- **`mutation-harness.mjs:389`'s unreachable `>= 1200`: kept.** `:386` already pins the length to
  exactly 980, but the frozen table declares both preconditions "measured and asserted"; deleting
  one diverges from the table. Retained with an intent line.

**Deferred to a follow-up, not blocking Phase 1** (recorded so they are not rediscovered):
`main()` at `:438-594` is 157 lines and wants a pure extraction — deliberately not done mid-phase,
because churning the instrument while it is the thing under review costs more than it returns;
`process.exit()` in `finish()` can truncate piped stdout; `--only <id>` prints "1/1 conformant,
exit 0" for a mutation that is non-conformant in a full sweep, which is a real trap for anyone
using `--only` as a gate.

### Phase 1 — two corrections to the orchestrator's own record

- **Item 8: my earlier "not adopted as written" ruling was superseded and I restated it stale.**
  That ruling predates reconciliation. `PLAN.md:734-748` argues `## Separation of duties` on the
  artifact's own merits and `RECONCILIATION.md:79,86` dispositions it `accept`, retiring
  `Review lenses` instead — which is precisely the escape the original ruling demanded. The
  reviewer also established the fact that settles it: the **shipped** `HEAD` test already asserted
  the string `Separation of duties` for that file (`HEAD:tests/constitution_skills.test.js:231`)
  as a whole-file substring, satisfied vacuously by the frontmatter `description:` at `:3`. So the
  string was not restored to force an artifact edit; what changed is that `hasHeading` stopped
  accepting a frontmatter mention as a heading. The edit stands, and the heading is not
  artifact-follows-gate.
- **The `mustPass` existence hole is subsumed by the blocker fix already dispatched.** Reviewer's
  strongest non-blocking finding: `mustPass` names are not existence-checked at
  `tests/mutation-harness.mjs:543-544`, so a renamed subtest would disarm them silently for ever,
  while `mustFail` is self-checking. All 56 entries verified real today. This needs **no separate
  fix**: the blocker repair replaces that check with positive membership in the *passing* set, and
  a name that does not exist cannot be in `passing`, so the check begins failing loudly on a
  rename. Recorded here so it is not dispatched twice.

### Phase 1 — fix wave, area 2 (lib modules + package.json)

`State: DONE`. Nine dead symbols removed from `tests/lib/{markdown-sections,repo-guard}.mjs`, each
with a zero-caller grep re-run after all edits.

- **The class sweep found a tenth the review missed:** `export const DEFAULT_JOURNAL_PATH`
  (`tests/lib/repo-guard.mjs:13`) — same class as the `normalizeHeading` export, no importer
  (`tests/mutation-harness.mjs:10` imports `createGuard` only), and `PLAN.md:218` specs the
  module's API as `createGuard` alone. De-exported, still used internally. This is the second
  instance the rule predicts and the review did not find.
- **Kept deliberately though unread:** `restoreAll`'s `{restored, removedFiles, removedDirs}`
  report, on the reuse review's own recommendation (`IMPL-REVIEW-reuse-simplification.md:133-136`)
  as the diagnostic for the FATAL restore path. Flagged so nobody later counts it as live.
- **`npm test` now ends with `&& node tests/lib/repo-guard.mjs --selftest`** — a gate added, not
  swapped: both existing file arguments intact and in order, no glob narrowed, `test:mutation`
  untouched. The `&&` is deliberate — under a mutation run the suite fails first, so the selftest
  is skipped and the harness's TAP stream is unchanged; the selftest emits no `not ok N - ` line,
  so `parseFailures` could not mistake it for a leaf either way.
- **Not authoritative:** this agent's 66/66 was measured while area 1 was mid-edit on both test
  files. The orchestrator re-measures at verify. Its symbol removals are also racing area 1's
  additions; a consumer added after its final grep surfaces as a `ReferenceError` in the sweep.

### Phase 1 — fix wave, area 1 (the instrument), and two rulings

`State: DONE`. The blocker is closed and the sweep is 16/16, exit 0, with **every** mutation
executing exactly 61 leaves against a 61-leaf clean-tree baseline.

- **The evidence that counts is the falsification, not the green.** The fixer temporarily restored
  the top-level `parseYaml` and re-ran `--only path-stripped`: `55 executed, 21 failing`,
  `problem: 55 leaves executed, clean-tree baseline is 61`, `0/1 conformant`, `exit 1` — the
  harness now fails on precisely the defect it previously scored `[conformant]`. Then reverted. A
  green sweep alone would have been worth much less; this is the meta-gate proving it can detect
  its own former blind spot.
- **Ruling: `canary-bad-yaml`'s amendment is ratified.** The fixer flagged it as an edit to a frozen
  row beyond the explicit `path-stripped` ruling. It was in fact authorised — the brief said "same
  for `canary-bad-yaml` if its failing set changed" — and the treatment matches: 16 → 21 leaves for
  the same reason (the five suite-4 leaves now fail rather than vanish), enumerated in full with
  `max` = length, never a raised cap. Both rows are amended in `PLAN.md` by the orchestrator, with
  the enumerations recorded under *Frozen enumerations*; the fixer did not touch `PLAN.md`.
- **`path-stripped` is 26, not the 27 a naive count predicts.** `ADR structural headings are real
  headings` walks `ai-docs/decisions/` without consulting the constitution, so it survives every
  `yq` outage. Worth recording because the off-by-one looks like a bug and is not.
- **Ruling: `tests/pcp_skill.test.js:21-23` is NOT fixed in Phase 1, and is not assigned to Phase 2
  or 3.** The class sweep found a genuine second instance — `await cleanPlayground()` and two
  `await fs.mkdir(...)` run at that suite's top level, so an fs failure would abort registration of
  all 25 PCP leaves. Deferred for three reasons, stated rather than buried: (1) that file being
  **byte-unchanged** is load-bearing evidence for this phase, verified by the conformance review
  (`git diff --quiet` clean) and relied on by the across-every-mutation pcp invariant — editing it
  post-review un-verifies the phase's own control; (2) the defect is now **detected** rather than
  silent, because the pcp invariant switched to positive membership, so all 25 names would be
  absent from `passing` and the sweep would fail loudly; (3) it belongs to neither remaining
  phase's scope. It is a real known defect, currently caught, and it stays on this list until
  someone owns it.
- **Carried, unverified:** the `# tests === executed + topLevel` integrity identity has never been
  exercised against a run containing skipped or todo leaves, because this suite has none
  (`# skipped 0 / # todo 0`). If such a leaf is ever added the identity may need widening.
