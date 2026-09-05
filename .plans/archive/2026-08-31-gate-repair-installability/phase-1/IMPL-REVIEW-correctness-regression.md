# Phase 1 implementation review — correctness and regression of the test instrument

**Lens:** correctness and regression of the instrument (`tests/mutation-harness.mjs`,
`tests/lib/*`, `tests/fixtures/expected.mjs`, `tests/constitution_skills.test.js`).

## Verdict

`approve-with-amendments`

The instrument is sound in the places it was most likely to be wrong: anchors are unique, the
goldens are literals, restore is byte-exact and crash-safe, and the negative controls are real. One
amendment is required before the harness's conformant/non-conformant verdict can be trusted as
stated: **the harness has no denominator.** It infers four separate properties from the *absence*
of evidence and never checks that the leaves it claims stayed green actually ran.

---

## Blockers

### 1. Every "stayed green" conclusion is drawn from absence, and two mutations already make six leaves vanish from the run

**Evidence.**

`tests/constitution_skills.test.js:337` calls `parseYaml('ai-docs/constitution.yaml')` at the *top
level* of the suite-4 callback, before any `t.test` is registered. When that throws, suite 4 emits
one unindented roll-up and **zero** leaves — its six subtests are never defined, never run, and
never appear in the TAP stream.

`tests/mutation-harness.mjs:367-380` (`parseFailures`) collects only `not ok` lines. The harness
never parses `# tests`, `# pass`, `# fail`, or `1..N` (verified: no such token anywhere in the
file). Consequently, at `tests/mutation-harness.mjs:543-544`, `mustPass` is asserted as
`mustPass ∩ failing = ∅` — a leaf that never executed satisfies it.

Reproduced (I ran this myself, single mutation, not the sweep):

```
path-stripped                RED (signature matched)    [conformant]  (no file changed)
                             failing leaves: 21 — ...
```

All 21 named leaves are from suites 1 and 2. Zero are from
`Bidirectional ADR Synchronization & Structural Headers`, because that suite aborted at
`:337` under the hermetic PATH. The true denominator for that run was 55 executed leaves, not 61;
the harness printed no trace of the 6 that disappeared. `canary-bad-yaml` triggers the same path.

**Honest scope.** No `mustPass` entry is vacuous *today* — `path-stripped` and `canary-bad-yaml`
both declare `mustPass` sets drawn from suite 3, which does execute. So no mutation is currently
mis-scored. The defect is that the instrument cannot distinguish "passed" from "never ran", and the
trigger for that ambiguity fires twice in every full sweep. `.plans/phase-1/GATE-OUTPUT.md:60`
states "every `mustPass` set stayed green"; what was measured is "no `mustPass` name appeared among
the failures", which is a weaker claim.

**Class enumeration — every place the harness reasons from absence:**

| line | property | absence-based? |
|---|---|---|
| `tests/mutation-harness.mjs:519-520` | `SURVIVED` | yes — exit code 0 only; no check that any test ran |
| `tests/mutation-harness.mjs:539` | zero `pcp_skill` failures | yes — a pcp leaf that never ran contributes 0 |
| `tests/mutation-harness.mjs:543-544` | `mustPass` green | yes — as above |
| `tests/mutation-harness.mjs:545` | `|failing| ≤ max` | yes — a cap with no denominator; fewer leaves running makes it *easier* to satisfy |
| `tests/mutation-harness.mjs:522-524` | signature | no — presence-based, correct |

`mustFail` (`:541-542`) is fail-safe: a name that never ran is reported as "did not fail".

**Minimal repair.** In `parseFailures`, additionally collect `/^\s+ok \d+ - (.+)$/` (excluding
`# SKIP` / `# TODO` directives) and the `# tests` / `# pass` / `# fail` summary. Capture the
executed leaf-name set once from the clean-tree run at `:468`, then per mutation assert
(a) `mustPass ⊆ passing`, not `mustPass ∩ failing = ∅`; (b) `executed == cleanExecuted`, or record
the shortfall as a declared, named part of the mutation's expected result. This touches no value in
the frozen table.

**Bearing on the escalated `path-stripped max: 20 → 21`.** The 21 is exactly the yq-dependent leaf
set of suites 1 and 2 (9 + 12; `tool resolution follows the inherited PATH` is the 9th, since it
calls `resolveTool('yq')` at `tests/constitution_skills.test.js:155`). Raising the cap to 21 is
correct arithmetic. But a cap raised without the denominator fix is being fitted to a run in which
six leaves silently did not execute — the two should land together.

---

## Non-blocking findings

1. `tests/mutation-harness.mjs:461-464` — `finish()` calls `process.exit()` immediately after
   `process.stdout.write`. Writes to a pipe are asynchronous in Node, so `node tests/mutation-harness.mjs | tee`
   can truncate the final summary. The exit code is still correct. Repair: set `process.exitCode`
   and return.
2. `tests/mutation-harness.mjs:389-390` — unreachable: `wrapped.length !== 980` already threw at
   `:386`, so `>= 1200` can never hold. `:392-395` is likewise dead now that
   `tests/lib/token-estimate.mjs` exists.
3. `--only` mode is silently weaker than a sweep. `node tests/mutation-harness.mjs --only path-stripped`
   prints `1/1 mutations conformant` and `exit 0` for a mutation that is NON-CONFORMANT in the full
   sweep. Plan-declared behaviour, but the per-mutation line should say which contract checks were
   skipped, or the escalated item can be "re-verified" green.
4. `tests/mutation-harness.mjs:374` — `/^\s+not ok \d+ - (.+)$/` matches any indentation ≥ 1, so a
   subtest nested two deep would be counted twice (its parent roll-up is also indented). Not
   triggered today: every `ok`/`not ok` line in the current output sits at indent 0 or 4.
5. `tests/mutation-harness.mjs:372-375` — suite attribution assumes each file's top-level block is
   contiguous in the stream. `node --test` runs the two files concurrently (observed: the
   constitution suites are emitted before `PCP Skill Automation Suite` despite pcp being listed
   first). Interleaving would misattribute `l.suite` and could void the pcp invariant at `:539`.
   Fail-safe in practice — a pcp leaf failure would still land in `failing` and blow `max`.
6. `tests/mutation-harness.mjs:317-328` duplicates `tests/lib/tools.mjs:9-24` with inverted failure
   semantics (returns `null` vs. throws). Intentional (the harness must not import the module under
   measurement), but undeclared.
7. `node tests/lib/repo-guard.mjs --selftest` passes 15/15, but is not in `package.json`'s `test`
   script. The module that owns every write the harness performs is itself ungated.
8. `tests/lib/markdown-sections.mjs:104` — `parseFrontmatter` reads one line per key, so a folded
   scalar (`description: >`) would set `description` to the literal `>` and satisfy the non-empty
   check at `tests/constitution_skills.test.js:285`.
9. `tests/lib/markdown-sections.mjs:80-86` — a spec without a `#` prefix matches any heading level.
   All six `SKILL_INVENTORY.requiredHeadings` entries are bare, so a demotion of `## Roles` to
   `###### Roles` passes. `STRUCTURAL_HEADINGS` are level-pinned and unaffected.
10. `tests/mutation-harness.mjs:311-315` — `READ_PATHS` omits `plugins/pcp/skills/pcp/SKILL.md`,
    `plugins/steps/skills/steps/SKILL.md` and `plugins/steps/harnesses/droid/skills/steps/SKILL.md`,
    all of which the suite reads. Concretely, right now `plugins/steps/skills/steps/SKILL.md` is
    modified-and-uncommitted, and the guard did not refuse my `--only` run — the sweep measured
    uncommitted content. Supporting evidence for the already-escalated D1 item; not re-raised as a
    blocker.
11. `tests/mutation-harness.mjs:584` — `entr(y|ies)` is emitted literally.

---

## Regression check on `tests/constitution_skills.test.js`

Compared line by line against `git show HEAD:tests/constitution_skills.test.js`.

**Strengthened:** the reverse-sync walk is now recursive (`:312-320`, the defect `adr-nested-rogue`
targets); structural headings are checked for every ADR on disk, not only registered ones
(`:371-385`); substring heading scans became fence-aware, frontmatter-aware, level- and
body-checked (`hasHeading`); metadata bullets are counted rather than `match()`-ed first-hit-wins
(`:324-333`); the pinned `PATH` constant at old `:8` is gone.

**Subtracted, all plan-sanctioned at `.plans/phase-1/PLAN.md:475-482`:** the substring checks for
`tokensave` (code-intelligence), `.pcp` and `CLI` (pcp), and `assert.ok(files.length > 0)` for
`ai-docs/decisions`. Each retirement is argued in the plan's table, and the last is covered by
`GOLDEN_DECISIONS` at `tests/fixtures/expected.mjs:223-231`. I found no assertion that previously
caught something and now catches nothing.

**Goldens are declared, not read back.** `tests/fixtures/expected.mjs` contains **zero** parentheses
outside string literals and comments (checked by tokenising the file), so its "no call expressions"
claim holds — nothing in it can import or query `ai-docs/`. The `bounds the * payload` leaves assert
declared constants (`< 200` tokens, `< 1200` chars) at `tests/constitution_skills.test.js:235,239`,
and `estimateTokens` is pinned to the plan's reference values at `:181-183` (I reproduced 225 / 675
/ 200, and 600 for the bloat string).

**The one two-sided comparison is backstopped.** `ADR metadata equals the constitution entry` and
`ADR files and constitution decisions are the same set` would both stay green if a defect moved both
sides together — that is exactly what `adr-status-bogus` demonstrates. The declared expected result
exists: `ai-docs/constitution.yaml matches the declared golden document` and
`registered decisions match the declared golden registry` are one-sided against literals.
`status values on both sides…` reads its vocabulary from `.agents/skills/adr-manager/SKILL.md:32`
but then asserts it equals `ADR_STATUSES`, so the doc cannot drift with the artifacts.

---

## Things I checked that are correct

- **Anchor uniqueness.** All 11 `replace`/`truncateFrom` anchors occur exactly once in their target
  today (`content.split(anchor).length - 1 === 1`, all 11 verified); both `create` targets are
  absent. `applyOp` (`tests/mutation-harness.mjs:334-346`) throws a *harness error* on any other
  count, and a harness error sets `conformant = false` (`:552-555`) — it can never be scored
  `SURVIVED`.
- **Declared leaf names all exist.** Cross-checking every `mustFail`/`mustPass` string (27 distinct)
  against the 61 leaf names in a real TAP run: **zero orphans**. Had one been a typo, `mustFail`
  would fail loudly but `mustPass` would have been silently vacuous.
- **Restore.** `repo-guard.mjs:181-212` restores by sha and re-verifies; created files are unlinked
  and created directories `rmdir`-ed in reverse (`:195-207`); a mutation that deletes a snapshotted
  file is recreated (`:185-187`). Two ops on the same file share one snapshot record and each
  `applyOp` reads current disk, so `adr-heading-fenced`'s replace-then-append composes correctly.
  `restoreAll()` runs in the `finally` for every path including `BlockedSignal` and harness errors,
  and a restore failure retains the journal, prints `FATAL`, and exits 1. Self-test: 15/15.
- **Symlinks.** There are **no symlinks inside the repo** (verified with `find -type l`). The live
  symlinks are external — `~/.agents/skills/pcp` and `~/.agents/skills/steps` point *into*
  `plugins/{pcp,steps}/skills/*`. No mutation targets either file, and `skill-unlisted` creates a
  *sibling* of `plugins/steps/skills/steps`, which the directory-level symlink does not expose. The
  plan's live-symlink hazard is honoured.
- **Negative controls are genuine.** `benign-constitution-comment` prepends a comment that `yq -o=json`
  discards — it kills any byte- or hash-pinning suite. `benign-adr-prose-reflow` breaks a line in
  ADR prose carrying no declared value. `crlf-frontmatter` is the only one whose target leaf is
  narrow (one skill leaf), but it is a real control for `parseDoc`'s CRLF normalisation at
  `tests/lib/markdown-sections.mjs:18`, which is the property it exists to protect. A suite that
  deleted all assertions would pass all three — and fail all thirteen positive controls, so the
  two-sided criterion holds.
- **Non-zero `npm test` is distinguishable from a harness error.** `runNpmTest` (`:355-363`)
  rethrows any error without a numeric `status` (spawn failure, `maxBuffer` overrun, kill-by-signal),
  which surfaces as `HARNESS ERROR`, never as `SURVIVED`. A non-test-related non-zero exit becomes
  `RED (signature MISMATCH)`.
- **TAP roll-up separation.** Measured on a live run: 5 `ok` lines at indent 0 (the roll-ups) and 61
  at indent 4 (the leaves), `# tests 66`. The unindented/indented split the plan relies on is real.
  A leaf name containing ` - ` is parsed correctly (greedy `(.+)$` after the first ` - `).
- **Plan citations.** All 22 heading line numbers in `.plans/phase-1/PLAN.md:477-482` resolve to the
  right headings on disk. The three for `plugins/steps/skills/steps/SKILL.md` (`:13/:56/:125`) are
  pre-Item-8 numbers and are now `:15/:58/:127`, which the plan itself states at `:471-473`.

---

## Risks / unverified

- I did not re-run the full 16-mutation sweep (instructed not to). For the 15 mutations I did not
  run individually, I relied on `.plans/phase-1/GATE-OUTPUT.md`. I independently reproduced
  `npm test` (66/66) and `--only path-stripped`.
- Symlink snapshot/restore semantics are untested because no symlink exists inside the repo. If one
  is ever added under a mutation target, `fs.writeFileSync` in `repo-guard.mjs:159,187` follows the
  link and rewrites the *target*, preserving the link — correct, but unexercised.
- SIGKILL / journal-recovery was verified only through `repo-guard.mjs --selftest` (SIGINT), not by
  killing a real sweep mid-mutation.
- TAP stream contiguity across the two concurrently-executed test files was observed in one sample,
  not proven deterministic (finding 5).
- `assertPorcelainUnchanged` reported "1 unrelated entr(y|ies) changed" during my run; I attribute
  that to a parallel reviewer writing under `.plans/`, but did not prove it.
