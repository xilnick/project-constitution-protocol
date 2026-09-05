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

## Phase 1 — CLOSED

Committed as `1353460` on `steps/harness-portability`, working tree clean afterwards.
Gates re-measured by the orchestrator, not copied: `npm test` 66/66 (0 fail / 0 skipped / 0 todo);
`node tests/mutation-harness.mjs` 16/16 conformant, exit 0; all 16 mutations at 61 executed leaves
against a 61-leaf clean-tree baseline; `git status --porcelain` byte-identical either side of the
sweep. `ai-docs/` and `tests/pcp_skill.test.js` are byte-unchanged in the commit, as the mutation
table requires.

## Phase 2 — scouting digest (orchestrator, read-only, measured this session)

Supersedes the earlier Phase 2 digest above where they differ.

- **Correction to that earlier digest:** `adr-manager/SKILL.md` has **3** fenced blocks, not 1 —
  one YAML, one `node` block whose body is JavaScript, one other. Not every fenced block is a
  runnable shell recipe, so the plan must say how a block is classified and what happens to the
  ones that are not. Silently skipping them is how a gate's coverage gets quietly narrowed.
- Recipe inventory: `constitution-query` 6 fenced (`yq` ×15) + 2 inline; `code-intelligence`
  7 fenced (`tokensave` ×7) + 3 inline; `adr-manager` 3 fenced; `AGENTS.md` **0 fenced**, 5 inline
  (`npm` ×1, `tokensave` ×3, `rtk` ×1).
- **Two independent defects, both reproduced, and fixing one does not fix the other:**
  `tokensave tool find_exact_symbol name="executePhase"` → `{"name":"name=executePhase","count":0}`
  exit 0 (the `name=` text is swallowed as a positional; usage is `tokensave tool [NAME] [ARGS]...`).
  Correcting the flag — `--name executePhase` — still returns `count: 0`, because the cited symbol
  does not exist. This is precisely why the criterion demands a non-empty, non-`count: 0` payload
  and not merely exit 0.
- **`rtk raw` is confirmed non-existent and silent.** `rtk` itself is real
  (`/opt/homebrew/bin/rtk`, `0.42.1`); `raw` is not a subcommand, and `rtk raw <cmd>` prints an
  error and **exits 0**. `AGENTS.md:63` recommends it as the safe fallback.
- **The crux handed to the planner:** `AGENTS.md` has zero fenced blocks, so a fence-only extractor
  certifies it clean while the `rtk raw` defect sits untouched — the same shape as the whole-file
  substring scan Phase 1 removed. The check and the defect must live in the same space.
- **Graph-count drift is a rot risk for any `tokensave` recipe gate**: 45 files/436 nodes/110 edges
  recorded in the archived plan, 47/374/63 measured later. A gate pinned to a drifting number rots.

### Phase 2 — corrections to the orchestrator's own digest, from the planner

- **`rtk raw` exits 127, not 0. My digest was wrong and the planner caught it.** I measured
  `rtk raw --help 2>&1 | head -3; echo rc=$?` — which reports **`head`'s** exit code, not `rtk`'s.
  Re-measured without the pipe: `rtk raw echo hi` → `rc=127`. The defect is still real (`raw` is
  not an `rtk` subcommand) but it is **not** a member of the silent-exit-0 class, so the
  banned-string gate, not the execution gate, is what must catch it. Same lesson as the
  `diff | grep -c` gotcha already logged: never read an exit code through a pipe.
- **The silent/loud split is real and it matters more than the arg syntax.** Measured on the seven
  documented recipes exactly as written: `find_exact_symbol` → 0, `entities` → 0, `impact` → 0,
  `body` → 0 (all with empty or `count: 0` payloads); `callers` → 1, `callees` → 1. An exit-0-only
  gate would catch the two loud ones and **certify the four silent ones** — which is why
  `PHASES.md`'s "exit 0 **and** a non-empty payload that is not `count: 0`" is load-bearing and
  must not be relaxed to exit-code checking during implementation.
- **`PHASES.md:23`'s stated repair is wrong at one site.** `tokensave tool body` requires
  `--symbol`, not `--name` (verified: `Error: config error: missing required parameter --symbol for
  tool body`). Applying the phase's own "`name="X"` → `--name X`" rule literally there would
  manufacture a fresh instance of the very class the phase exists to remove. `callers`/`callees`/
  `impact` have no name-based form at all and need an in-band node-ID resolution.
- **Graph drift, third reading.** `tokensave tool status` now reports `node_count 466,
  edge_count 129`, after 436/110 and 374/63. Any gate pinned to a graph count rots by default.
- **The mutation harness cannot serve as a mid-phase gate here.** `.agents/skills/` is a
  `repo-guard` read path (`tests/mutation-harness.mjs:336-340`), so the guard refuses with exit 2
  as soon as an item dirties `code-intelligence/SKILL.md`. Phase 2 runs it post-commit instead.
  This is the D1 refusal-set ruling working as designed, not a defect.

### Phase 2 — orchestrator rulings on the planner's five decisions

- **D1 — ratified: follow the measured CLI, not `PHASES.md`'s stated repair.** Verified myself:
  `tokensave tool body` → `missing required parameter --symbol`. The blanket "`name="X"` →
  `--name X`" is correct only at `:36` and would write fresh same-class defects at `:66,81,97`
  (`--node-id`, no name form) and `:112` (`--symbol`). A roadmap bullet written before measurement
  loses to the measurement. `PHASES.md` is amended in place so the contradiction does not outlive
  this ruling.
- **D2 — accepted as written (`Tier 1.5 (Middle)`).** Low stakes; it is the only label that sorts
  the fourth class between Tier 1 and Tier 2 under the vocabulary `AGENTS.md:43-44` requires
  harness manifests to agree with. The alternative leaves `AGENTS.md` routing three ways while
  `MODEL_ROUTING.md` routes four.
- **D3 — accepted: the 300-vs-200 contradiction stays in scope, and it is ours.** Verified: the
  gate enforces **200** (`tests/constitution_skills.test.js:236`) while
  `constitution-query/SKILL.md:16,104` and `adr-manager/SKILL.md:88` still say 300. **Phase 1's own
  D2 ruling created this drift** — it tightened the bound and did not carry the change into the
  skill docs. A 250-token payload currently satisfies every skill doc while failing `npm test`.
  Leaving it would mean this iteration shipped a documented contract its own gate rejects.
- **D4 — accepted: archived artifacts stay as-is; `PHASES.md:52` governs over `:27`.** Both cited
  defects exist only under `.plans/archive/`; live `AGENTS.md:73-79` says five phases and
  enumerates five, and no live file states a graph count. A work item there would carry a gate that
  already passes, which is not a gate. No appended note either — the archived plan is accurate as a
  record of what was believed then, and the drift is recorded here instead. `PHASES.md:27` amended
  so the two sections stop contradicting each other.
- **D5 — accepted with a condition.** `tests/recipe-exec.test.js` joins `npm test` behind `&&` as a
  standalone non-TAP script: under every RED mutation the `node --test` step short-circuits first,
  so the runner contributes zero leaves and Phase 1's frozen table needs no amendment, while the
  three negative controls still execute it. **The condition:** this reasoning is an assumption
  until measured, so Item 9 must run the full sweep post-commit and confirm **16/16 with the frozen
  table unamended**. If the sweep moves, that is a reported decision back to the orchestrator, not
  a table edit. The runner must exit non-zero on any failure and print a pass/fail summary, or the
  `&&` makes it invisible.
- **Graph drift needs no decision** — the plan resolves it by asserting a key set plus `> 0` rather
  than any numeric count. Four distinct readings are now on record (436/110, 374/63, 466/129 twice).

### Phase 2 — plan review, executability/gates lens: `reject`, verified by the orchestrator

Three blockers reproduced independently before acting on them. All three hold.

- **The `fenceIndex` defect is systematic, not a single bad cell — worse than reported.** The
  reviewer said `ci-status`'s `fenceIndex 12` does not exist. It does not, but the cause is that
  **all seven `ci-*` rows are keyed 0,2,4,6,8,10,12** — the plan counted every ` ``` ` delimiter
  line, openers and closers alike, instead of counting fences. Measured: the file has 7 fences,
  openers at `:34,49,64,79,95,110,125`, so the valid indices are 0-6. Meanwhile the six `cq-*` rows
  use 0-5 and `adr-verify` uses 2 — the *correct* scheme. **Table 1 mixes two indexing conventions
  in one table**, and the plan's own definition (`PLAN.md:442`, "0-based order of fences within the
  file") makes the `ci-*` half wrong. Every `ci-*` row must be re-keyed, not just `ci-status`.
- **The frozen FAIL set is inconsistent three ways.** `PLAN.md:677` asserts 21; the enumeration at
  `:681-686` contains **19** (counted mechanically); Item 4's stated closures total 14 against a
  declared 21→5 transition of 16. Since Items 4-8 are gated by residuals off that starting set,
  a wrong starting set makes five gates wrong. The residual chain itself (5→3→2→1→0) is
  self-consistent and the subsets are disjoint — only the frozen head is wrong.
- **Items 4-8's gate reads an exit code through a pipe.** `PLAN.md:729,756,781` (and the sibling
  items) specify `node tests/recipe-exec.test.js 2>&1 | rg -n '^(FAIL|BLOCKED)'`. That is the
  gotcha already recorded in this log, which had already produced one wrong `rtk raw` reading this
  phase. Item 8's success criterion is *zero FAIL lines*, which a runner that crashes before
  printing anything satisfies perfectly. Item 9's gate 1 already uses the correct unpiped form, so
  the plan contradicts itself.
- **A conformant-but-wrong implementation exists and needs no bad faith.** Execute the *declared*
  `commandLines` rather than the extracted fence body — `PLAN.md:352` never defines "body" — and
  every `D*` check passes by construction while the six `constitution-query` fences and the
  `adr-manager` `node -e` block may contain anything. Combined with Table 1 leaving `commandLines`
  "unchanged" for 7 of 14 runnable recipes, `npm test` would execute un-pinned JavaScript out of a
  markdown fence after Item 9.
- **D5's reasoning was checked against the code and holds** (`mutation-harness.mjs:380-383,395-432,
  578-610`; `repo-guard.mjs:274`): under RED the `&&` short-circuits so the runner adds no leaves;
  under the three SURVIVED controls it runs, and a non-zero exit makes `run.status != 0`, which
  `:587` requires to be 0, so `:605` reports "declared SURVIVED, measured RED". The negative
  controls cover it for free and no table amendment is implied. **Still not measured** — the
  post-commit confirmation condition on D5 stands.

### Phase 2 — all three plan-review lenses returned `reject`; scope amended

Gates 5 blockers, coverage 7, critic 9, with heavy overlap (undeclared Space-B filter, the piped
gate, and `commandLines` "unchanged" each raised by two or three lenses). Two reviewers independently
built a working conformant-but-wrong implementation of v1. Reconciliation is therefore a rewrite of
the frozen tables, not v1 plus errata.

- **Ruling R-A — `ai-docs/README.md` is in scope, and my own byte-frozen instruction was too broad.**
  I told every agent `ai-docs/**` was frozen. That freeze exists for what the mutation table mutates
  and the suite reads *as data*: `constitution.yaml`, `specs/`, `decisions/`. Verified that
  `ai-docs/README.md` is neither — no mutation op targets it, and no test or fixture references it.
  Meanwhile `ai-docs/README.md:86-101` is a fenced **executable** `node -e` recipe that uses
  `words × 1.3` — the exact fakeable estimator Phase 1 removed — and enforces the **300**-token
  bound D3 retires. It is a live second copy of the class, in a file the plan never looked at.
  The coverage lens found it; the freeze I wrote is what nearly hid it. Frozen set narrowed
  accordingly.
- **The three rulings that close the conformant-but-wrong routes** (R-C, R-D, R-E): the runner must
  execute the **extracted fence body**, never the declared `commandLines` — `PLAN.md:352` never
  defined "body", and executing the declared lines makes every payload check pass by construction;
  Space B's filter must be a declared predicate (measured **166** spans across the four files —
  23/24/38/81 — against 9 declared, so the undeclared filter *is* the skip-list the plan claimed was
  structurally impossible); and `commandLines` must be declared for all 14 runnable recipes, since
  "unchanged" for 7 of them would have `npm test` executing un-pinned JavaScript out of
  `adr-manager/SKILL.md:99-112`.
- **R-B — no gate reads an exit code through a pipe.** Third time this gotcha has bitten this
  project, and the first time it appeared inside a *plan* rather than an ad-hoc command.
- **R-J — the unit of measurement is the command line, not the fence.** 34 command lines live in
  the 14 runnable fences; v1 declared 14 assertions. The coverage lens's framing is right: the
  gate's unit must match the class's unit.

### Phase 2 — ruling R-K: `npm test` must stay hermetic (partially reverses D5)

The design-critic found the converse of D5 that the gates lens did not examine, and it is the most
consequential finding of the wave because it threatens a **committed** phase.

The three SURVIVED negative controls are the *only* mutations that execute the recipe runner
(`mutation-harness.mjs:382` runs `npm test`; `:587` requires status 0 for SURVIVED). So any
environmental failure of the runner takes Phase 1's sweep from 16/16 to **13/16** — a committed,
verified result broken by an unrelated external artifact.

Measured, which turns this from theoretical to certain:
- `.tokensave/` is gitignored globally (`~/.gitignore_global:5`) with **zero tracked files**
  (`git ls-files .tokensave/` → 0). It does not exist on a fresh clone or in CI.
- `npm test` today has **zero** tokensave coupling — no match for `tokensave` in either test file.
- The graph has now produced five distinct readings across sessions: 436/110, 374/63, 466/129
  twice, with `file_count` 45 → 47 → 53.

**Ruling.** Hermetic checks may live inside `npm test`; graph-dependent execution may not.
Extraction, block classification, banned strings and static-shape checks read only in-repo files
and stay. Executing `tokensave` recipes and asserting their payloads moves to its own gate outside
`npm test`, which Item 9 and CI still run. This is a **move, not a removal** — a disclosed decision,
and the execution gate remains mandatory. `yq`-dependent checks stay: `yq` is a binary and
`ai-docs/constitution.yaml` is in-repo and frozen, which is already the shipped suite's situation.
The thing that cannot sit inside a deterministic gate is the drifting, untracked *graph*.

D5's TAP-leaf reasoning was sound and remains so; what it did not examine was the environmental
path. Both halves of the ruling now stand together, and Item 9's post-commit 16/16 confirmation is
what proves it.

### Phase 2 — four stale `PHASES.md` citations are the orchestrator's doing

The coverage lens flagged `PHASES.md:23,:27,:48,:52` as stale in the plan. Cause: **I amended
`PHASES.md` in place** after the planner wrote v1, to carry rulings D1 and D4 into the roadmap. The
plan therefore argues against text the file no longer contains — `:23-26` now states the corrected
per-subcommand repair and `:30-32` already authorises the 300-vs-200 fix. Recorded because the same
trap recurs whenever the orchestrator edits a document a live agent is citing: amend upstream and
the downstream argument silently becomes errata. The reconciler was told to re-derive against the
current file rather than preserve the arguments.

### Phase 2 — reconciliation, and three rulings on what it flagged back

48 findings in, 33 rows out: accept 21, accept-modified 11, reject 1. v2 grows the corpus to five
files, re-keys Table 1 **per command line** (20 recipes, 35 executions, every line declared
verbatim, no "unchanged" cells), replaces the English assertion column with structured data from a
closed vocabulary, adds Table 5 (a frozen synthetic document for the extractor's own self-test),
and splits 9 items into 11. Suite enumerated at 98 checks, 63 ok, 35 FAIL, residual chain
35→20→14→12→11→8→6→0, subsets disjoint and summing.

- **R-F was wrong and I withdraw it.** I inferred the `ci-*` indices 0,2,4,6,8,10,12 were a
  delimiter count. They are the **post-repair** layout — Item 4 interleaves six `json` MCP blocks,
  giving 13 fences, and Table 2 keys those at the odd indices, which cannot come from counting
  delimiters in a pre-repair file that contains no `json` fences at all. `PLAN.md:519-524` now
  states this explicitly. The reconciler pushed back with better evidence than my ruling had, which
  is what the pushback channel is for. R-F's second half — validate every declared index, a
  non-resolving one is a loud FAIL and never a silent skip — was the part that mattered and is
  adopted; thirteen such FAILs sit in the frozen set today.
- **D3's recipe change is accepted, on a stronger ground than the token bound.** Measured with the
  shipped estimator: `yq '.spec'` → **255**, `yq '.spec | keys'` → **23**. Taken alone, editing a
  documented recipe so it fits a bound is the artifact-follows-gate inversion this iteration
  exists to correct. What makes it legitimate: `ai-docs/constitution.yaml` carries the rule
  *"Context exploration must use progressive disclosure … full-file dumping is prohibited"* — the
  anchor of Phase 1's `rule-inverted-unqueried` mutation — and `yq '.spec'` **is** a full dump of
  the spec. The recipe was already wrong on the artifact's own merits; the bound merely revealed
  it. That reasoning goes in the plan, or the change reads as the inversion.
- **R-K stands; disclosure is not a substitute for a ruling.** v2 wired the whole graph-dependent
  runner into `npm test` (`PLAN.md:1417`) and disclosed R26 instead. Moving the execution is not
  one of the weakening remedies the reconciler rightly rejected — `test:recipes` already exists
  from Item 3, so the execution gate survives either way. The decisive fact is absence, not drift:
  `.tokensave/` is gitignored with zero tracked files, so a fresh clone would fail
  `ai-docs/constitution.yaml:5`'s own declared `verification_command`, and Phase 1's committed
  16/16 would read 13/16 — a verified committed result broken by an artifact not in the repository.
  Required shape: Item 11 wires a **declared hermetic subset** into `npm test`; `test:recipes` runs
  everything. This preserves what D5 actually bought — the three SURVIVED controls still execute
  the runner, so a byte-pinning or crash-on-start runner is still caught for free.

### Phase 2 — R-K applied; the partition, and three follow-on rulings

The reconciler split the gate into two runners over one table module, one extractor and one set of
check implementations: `tests/recipe-doc.test.js` (hermetic, what `npm test` gains) and
`tests/recipe-exec.test.js` (everything, `npm run test:recipes`, the `PHASES.md:36` criterion).
100 checks, 65 ok, 35 FAIL — the FAIL set is unchanged, split 27 document / 8 live.

- **`B4` is the right device and worth naming.** A partition is a place to hide things, so `B4`
  runs in **both** runners and asserts `DOC_CHECKS ∪ LIVE_CHECKS` is the whole universe, the two are
  disjoint, `LIVE_CHECKS` matches its frozen literal, and the running runner has its declared
  cardinality. Reclassifying a live check to make `npm test` green fails `B4`. Item 11 gate 3 then
  runs the document runner under a `DOC_TOOLS`-only PATH, reusing `mutation-harness.mjs:466-473`, so
  hermeticity is **measured before the commit rather than argued**.
- **D6 accepted — and my R-K wording was imprecise.** I named "the graph"; the invariant is the
  failure mode. Neither the `tokensave` nor the `rtk` binary exists on a fresh clone either, so a
  binary check inside `npm test` reproduces the same BLOCKED-inside-a-SURVIVED-control break. The
  reconciler's classification is the faithful reading of the ruling, not a departure from it.
- **`jq` moves to the live runner; the boundary is now stated exactly.** `npm test` gains **no
  binary dependency the suite does not already require** — today that set is exactly `yq`. My
  earlier criterion ("a binary reading in-repo frozen data") was the wrong test, and D6 is what
  exposed it: `jq` is present on this machine, which is irrelevant, because on a machine without it
  the identical failure arrives by a different binary. Coverage is not narrowed — the eight
  `yq -o=json | jq` executions stay mandatory in `test:recipes`, and their static-shape and content
  checks remain in the document runner, exactly as for the seven `ci-*` recipes.
- **R4 accepted as a residual and carried in `STATUS.md`.** Verified there is no CI in this
  repository — no `.github/workflows`, no workflow file anywhere — so there is nothing to schedule
  `npm run test:recipes` into, and inventing CI is outside this phase. R-K's cost, stated plainly:
  graph-dependent recipe rot will not surface until someone runs that gate by hand.
- **Amendment 2 was half-applied and sent back.** `PLAN.md:1462-1471` led with the 200-token bound
  and reached the full-dump argument third, as "also" — which *is* the artifact-follows-gate
  reading: a documented recipe edited because a test rejects it. The item must lead with the
  constitution's progressive-disclosure rule (the anchor of Phase 1's `rule-inverted-unqueried`
  mutation, so load-bearing text), with the bound labelled as corroborating evidence that revealed
  a recipe already non-conformant on its own merits.

## Phase 3 — scouting digest (orchestrator, read-only, measured while Phase 2 reconciles)

- **The delivery gap is real and total.** `.claude-plugin/marketplace.json` ships exactly two
  sources, `./plugins/pcp` and `./plugins/steps`. The three skills this iteration has been repairing
  — `adr-manager`, `code-intelligence`, `constitution-query` — live in `.agents/skills/`, which is
  **outside both plugin roots**. A `pcp` or `steps` install therefore delivers none of them.
- **`MODEL_ROUTING.md` sits one level above the skill that cites it.** The file is at
  `plugins/steps/MODEL_ROUTING.md`; `plugins/steps/skills/steps/SKILL.md:107` calls it "at the
  plugin root". When the skill is installed as a bare directory, the plugin root is not present, so
  the reference does not resolve. Same class as the delivery gap, and Phase 3 owns it.
- **The pattern to adopt already exists in this repo.** `plugins/pcp/skills/pcp/SKILL.md:18-22`
  resolves a path through three fallbacks — `${CLAUDE_PLUGIN_ROOT}/skills/pcp/scripts/pcp.js`,
  then `$HOME/.claude/skills/pcp/scripts/pcp.js`, then the vendored `pcp/scripts/pcp.js`. Phase 3
  should generalise that rather than invent a scheme.
- **Cwd-relative path sites, measured (`.agents/skills|ai-docs/|plugins/`):** adr-manager 16,
  code-intelligence 2, constitution-query 19, `AGENTS.md` 9, `ai-docs/README.md` 19 — **65 total**.
  `PHASES.md` estimates "~52"; the estimate is low, and `ai-docs/README.md` is the reason, since it
  was outside scope when that number was written (see ruling R-A). Phase 3's plan must re-measure
  rather than inherit either number.
- **Phase 3 also owns the sixth `SKILL.md`.** `plugins/steps/harnesses/droid/skills/steps/SKILL.md`
  diverges from the canonical `plugins/steps/skills/steps/SKILL.md` by 103 diff lines and both ship
  via the marketplace. Phase 1 made the divergence *detectable* (inventory set-equality plus the
  `skill-unlisted` mutation); deciding whether the droid copy is generated, symlinked or deleted is
  the packaging question Phase 3 answers.
- **Carry into Phase 3 planning:** the local install is now a symlink into the working tree, so an
  edit to a skill is live immediately and a broken edit breaks the running session. Any Phase 3
  gate must install into a throwaway `HOME` — as `PHASES.md`'s criterion already requires — and no
  test may `cd` into the repo.

### Phase 2 — the hermetic flag, and one ruling that had to be pressed twice

v2 collapsed the two-runner design into one runner with two modes. `PLAN.md:1599` wires
`node tests/recipe-exec.test.js --hermetic` into `scripts.test`; the unflagged run is
`npm run test:recipes` and remains the `PHASES.md:36` acceptance criterion. Hermetic subset: 80 of
99 checks plus `B4` = 81 report lines. `LIVE_CHECKS` is a 19-entry frozen literal and `--hermetic`
selects its **complement**, so it is not a predicate the implementer writes.

- **A mode flag is a worse starting position than two files, and the three controls are the answer.**
  The flag selects a frozen declared set rather than filtering; it is the runner's **only** accepted
  argument, any other `argv` exiting 3 `BLOCKED` before a check runs, with Item 3 gate 3 measuring
  exactly that; and `B4` runs in both modes asserting the partition, that `LIVE_CHECKS` is
  non-empty, and both cardinalities. Item 11 gate 3 then runs hermetic mode under a `DOC_TOOLS`-only
  PATH. That is a stronger design than the one I asked for.
- **The `.spec` item now leads with the rule, not the bound.** `ai-docs/constitution.yaml:24` is
  `qual-hygiene-01`, `enforcement: strict`, and `rule-inverted-unqueried` anchors that sentence
  verbatim — load-bearing text. The 255 → 23 measurement is demoted to corroboration, with an
  explicit sentence that the recipe would still be wrong had the numbers come out the other way.
  That sentence is what makes it not the inversion.
- **`jq` had to be pressed twice, and the process point is worth more than the ruling.** It was left
  in `DOC_TOOLS` (`PLAN.md:725,897`) after an explicit ruling, and — unlike R-F, where the pushback
  was immediate, evidenced and correct — it was neither applied nor disputed. I caught it only by
  re-reading the file. **A disagreement the orchestrator cannot see is one it cannot adjudicate**,
  which makes silent non-application strictly worse than refusal. Said so, and repeated that
  disputing with evidence is a legitimate outcome.
- **The substance, restated once:** the objection was that dropping the eight `yq -o=json | jq`
  lines narrows coverage. It would, but the ruling moves them to the live set rather than dropping
  them — they still run in `test:recipes`, and their `C:<recipeId>` content pins stay hermetic,
  exactly the treatment the seven `ci-*` recipes already get. `jq` is the only genuinely new
  requirement: `yq` is required by the shipped suite, and `git`/`bash`/`node` are already de-facto
  (`git` sits in Phase 1's own hermetic PATH at `tests/mutation-harness.mjs:466-473`). On a box
  without `jq`, `A1` BLOCKs and Phase 1's committed 16/16 reads 13/16 — D6's lesson exactly, reached
  by a different binary.

### Phase 2 — reconciliation closed; implementation dispatched

All four rulings applied and the arithmetic is self-consistent, verified by the orchestrator against
the file rather than the report: `DOC_TOOLS = ['yq','git','bash','node']` — exactly what `npm test`
requires today — and `LIVE_TOOLS = ['tokensave','rtk','jq']`, at both declaration sites;
`LIVE_CHECKS` 19 → 31; hermetic 81 → **69** report lines against 100 for the full run, and
69 + 31 = 100. The residual chain sums to the frozen head: 15+6+2+1+3+2+6 = **35**.

- **Process note worth keeping.** Three of the last four completion notices from the reconciler were
  stale re-sends describing earlier state, and twice I began to act on one before checking. The rule
  that saved it each time is the protocol's own: **verify against the file, not the report.** Once I
  wrongly concluded a ruling had been ignored when the file was simply mid-write — `PLAN.md` had
  been touched 29 seconds earlier. Checking `ListAgents` for `running` vs `idle` before judging
  non-compliance is the cheap discriminator, and it is what distinguished the `jq` case (genuinely
  unapplied) from the R-K case (applied, read too early).
- **Implementer dispatched** with strict ownership. `tests/lib/markdown-sections.mjs` is
  **additive only** — it is imported by `tests/constitution_skills.test.js`, so any change to an
  existing export moves Phase 1's leaf counts and breaks its frozen mutation table. `ai-docs/README.md`
  is the single carve-out inside `ai-docs/`; the rest stays frozen.
- **Item 11's post-commit sweep is the orchestrator's, not the implementer's.** `repo-guard` refuses
  with exit 2 while `ai-docs/` or `.agents/skills/` is dirty, which they are throughout the work.
  The implementer runs gates 1-5 and does not commit.

### Phase 2 — correction to this log: ten `jq` command lines, not eight

Earlier entries in this log say "the eight `yq -o=json | jq` executions". That count came from the
reconciler, which gave it twice and then corrected itself by counting with a regex over the declared
command lines: there are **ten** — `constitution-query/SKILL.md:42,52,65,78,88` and
`ai-docs/README.md:26,36,47,57,67`. `LIVE_CHECKS` is therefore 31, not 29: the ten executions plus
the two bare `jq` spans `X2`/`X12`, on top of the original 19. Document checks are 68 and the
hermetic run prints 69 report lines — `B4` plus the 68, since `B4` runs in **both** modes, which is
why 68 and 31 overlap to 100 rather than summing to it. None of the twelve moved checks is a FAIL
today, so the frozen FAIL set stays 35 / 27 / 8 and all three residual chains are unchanged.

`git` was checked rather than assumed, which was the right instinct and closes the last doubt about
the boundary: `tests/lib/repo-guard.mjs:96` already runs `execFileSync('git', ['status',
'--porcelain'])` inside the `--selftest` clause that `npm test` already invokes, so `git` is not a
new prerequisite and `E2` stays hermetic. `jq` appears nowhere in `tests/`. It really was the only
new binary, which is what made the ruling worth pressing twice.

### Phase 2 — correction to ruling R-K's boundary: `bash` was the new binary, not `jq` alone

The reconciler surfaced a flaw in my own ruling rather than letting it ride, and it was right.

I stated the boundary as "`npm test` gains no binary dependency the suite does not already require",
and justified `git`/`bash`/`node` as de-facto requirements by citing Phase 1's hermetic PATH.
Verified: `tests/mutation-harness.mjs:459` is `const needed = ['node', 'npm', 'sh', 'env', 'git']`
— **`sh`, not `bash`** — and `bash` appears nowhere in `tests/`. So `bash -c` in `DOC_TOOLS` was
itself a new named tool, and the boundary as written was false, just not in the direction I was
policing.

**Ruling: `sh -c`.** It makes the boundary literally true rather than nearly true, and `sh` is not
merely POSIX-safe here but demonstrably already required, since Phase 1's own hermetic PATH resolves
it. Spot-checked by the orchestrator: `sh -c 'NODE_ID=$(yq -o=json … | jq -r .adr); echo …'` → exit
0, correct output.

**With one condition: re-measure, do not assert equivalence.** "Every construct is POSIX so `sh`
behaves identically" is the exact shape of reasoning this project keeps getting burned by. Every
declared output in the plan was measured under `bash`; shipping under `sh` without re-running leaves
an unmeasured gap, however small. My spot-check covers one shape, not the ten `jq` pipelines or the
`node -e` blocks.

Two process notes worth keeping:

- **This is the disagreement channel working.** After the `jq` round I said that a disagreement I
  cannot see is one I cannot adjudicate. The reconciler then produced a correction *against my own
  ruling*, with citations, unprompted — the hardest direction to push back in, and the most useful.
- **The stale-read mechanism is identified and fixed at source.** The reconciler wrote `PLAN.md`
  incrementally, one write per substitution, so any read landing between substitutions caught a
  partial file. That is what produced my two false "unapplied" readings. It is batching to a single
  write; I check `ListAgents` for `running` before alleging non-compliance. Worth remembering
  whenever an orchestrator polls a file an agent is actively writing.

### Phase 2 — `sh -c` applied, and the re-measurement condition paid for itself

`DOC_TOOLS = ['yq','git','sh','node']`, `LIVE_TOOLS = ['tokensave','rtk','jq']`, verified at both
declaration sites. `tests/mutation-harness.mjs:459` supplies `sh`, `git` and `node` in one place, so
`DOC_TOOLS` is now a **strict subset** of what `npm test` already requires — no exceptions, not
"nearly true".

**The condition was the point, not a formality.** I required re-measurement rather than an
equivalence assertion. The reconciler ran all 25 distinct declared executions under `/bin/bash`,
`/bin/sh` and `/bin/dash`, comparing exit code and trimmed stdout byte-for-byte. **24 of 25 were
byte-identical** — every declared anchor and token count unchanged, including `.spec | keys` at 23.

**The 25th is the find.** `ci-status.1` differs under `dash` *and between two consecutive runs of
the same shell*. Reproduced independently by the orchestrator:

```
$ a=$(tokensave tool status); b=$(tokensave tool status); [ "$a" = "$b" ] || diff …
two consecutive runs: DIFFER   →  nodes_by_kind key ordering moves ("const", "function",
                                  "type_alias", "file", "class" reorder between runs)
```

So it is **graph serialisation nondeterminism, not a shell difference**, and it independently
vindicates a choice already in the plan: `ci-status`'s declared assertion is a key set plus `> 0`,
pinning no value and no ordering. Had the plan pinned that payload — the obvious thing to do — this
is the check that would have started flapping, and it would have been diagnosed as flaky infra
rather than as a real property of the tool. This is "two components agreeing is not agreement"
inverted: the declared expected result had to be *weaker* than a byte pin to be correct.

**The caveat bounds the claim correctly, and I verified it.** `/bin/sh` on this machine is
`BASH_VERSION=3.2.57(1)-release` — bash in POSIX mode — so the `sh` column proves less than it
appears. `/bin/dash` is present at `/bin/dash` and is what actually carries the portability result.
Recorded in C4 with the verbatim comparison.

Reconciliation is closed: `PLAN.md` 1954 lines, `RECONCILIATION.md` 243 lines, written in a single
batched write so there is no intermediate state to misread.

### Phase 2 — implementation complete; one blocker the implementer's own gates could not see

Implementer reports 11/11 done, nothing committed. Acceptance gates reproduced by the orchestrator:
`npm test` 66/66 (0 fail / 0 skipped / 0 todo); `node tests/recipe-exec.test.js` **exit 0, 100 lines,
100 ok, zero FAIL/BLOCKED**; `--hermetic` **exit 0, 69 lines**.

**The behaviour the phase was built to produce actually happened.** Four discrepancies between a
frozen declared value and reality were **reported, not fixed** — Item 4's declared residual of 20
against a measured 19 (`S1`/`ci-mcp-find` closes at Item 4 because `find_exact_symbol`'s MCP block
already carried the correct key set), Item 2's gate expecting a stale `19/81` where the tables
declare `31/69`, Item 1's gate-1 expected triple being body-relative while the item's normative text
says file-relative, and an inaccurate `D:ci-*` derivation at `ci-callees`. Not one frozen value was
edited to make a number come out. That is the separation-of-duties device working as designed.

**Blocker found by the orchestrator's own gate, invisible to the implementer's.** Building a PATH
from the plan's declared `DOC_TOOLS` (`yq`, `git`, `sh`, `node`) and running hermetic mode returns
**exit 3**:

```
BLOCKED A1 — required tool 'bash' not found on PATH
```

`PLAN.md:770,945` declare `DOC_TOOLS = ['yq','git','sh','node']` with an `sh -c` execution layer;
`tests/fixtures/recipes.mjs:24` declares `['yq','git','bash','node']` and `tests/recipe-exec.test.js:380`
spawns `bash`. The implementer built against the pre-amendment plan — the `sh -c` ruling landed in
`PLAN.md` while it was already writing.

Two things make this worth more than one word:

- **It defeats the ruling it violates.** The entire purpose of `DOC_TOOLS` is that `npm test` — the
  constitution's declared `verification_command` — acquires no binary the shipped suite does not
  already require. Phase 1's hermetic set is `['node','npm','sh','env','git']`
  (`tests/mutation-harness.mjs:459`); `bash` appears nowhere in `tests/`. As implemented, a machine
  without `bash` fails `npm test` and Phase 1's committed 16/16 reads 13/16.
- **Item 11 gate 3 structurally cannot catch it.** It builds its hermetic PATH from the
  *implementation's own* `DOC_TOOLS` rather than the plan's declared list — a gate validating the
  code against itself, which is this project's signature defect one more level down. Whether that
  self-reference is the plan's specification or the implementer's construction is now a review
  question.

Seeded into the conformance lens with the instruction to **enumerate the class** — every declared
value carried from a superseded plan revision — rather than fix the instance.

### Phase 2 — the `bash`/`sh` blocker is closed, and the fix produced a stronger proof

The implementer amended it on being told: `tests/fixtures/recipes.mjs:24` is now
`['yq','git','sh','node']` and `tests/recipe-exec.test.js:380` spawns `sh`. Re-verified by the
orchestrator under a PATH containing only `yq`, `git`, `sh`, `node`, with `bash`, `tokensave`, `rtk`
and `jq` each confirmed unresolvable by `command -v`:

```
exit=0   69 report lines   69 ok   0 FAIL/BLOCKED
```

That is a **direct demonstration** that `npm test` requires none of those four binaries, which is
stronger than the argument the ruling rested on. Three `bash` strings correctly survive as markdown
**info strings** naming a fence's language — `RUNNABLE_INFOS = ['bash','sh']` at
`recipe-exec.test.js:605` and two selftest fence entries — not as interpreters.

The implementer also re-measured rather than assuming, across all 35 declared executions extracted
**from the documents** rather than from the declared `commandLines`, under `bash`/`sh`/`dash`:
34 byte-identical, 1 differing, and it independently reproduced that the 1 is
`tokensave tool status` key-order nondeterminism rather than a shell effect — two consecutive `bash`
runs differ on the same two keys. It adjusted no declared value. Its 35 and the reconciler's 25 are
consistent: 35 executions over 25 distinct command texts, since `cq-*` and `rd-*` share lines.

**What the episode is really evidence of.** The divergence existed because a ruling landed in
`PLAN.md` while the implementer was mid-write — the same class of trap as my own in-place amendment
of `PHASES.md` under a live planner. It was caught not by any gate in the phase but by the
orchestrator constructing the hermetic PATH **from the plan's declared list rather than the
implementation's**. Item 11 gate 3 built its PATH from the implementation's own `DOC_TOOLS`, so it
passed throughout. Fixing the value does not fix the gate's shape, and that remains open for the
conformance lens to rule on: if `PLAN.md` specifies the self-reference it is a plan defect, and if
the implementer constructed it, it is a conformance finding.
