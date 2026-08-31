# Phase 1 — Implementation Review: conformance to plan, and gate integrity

**Lens.** Conformance to the reconciled `PLAN.md` v2, and whether any gate now checks less than it
did before the phase.

Every claim below was checked against the files on disk or by running the command quoted. Anchors,
signatures, `mustFail`/`mustPass` names and `max` caps were compared **mechanically**, not by eye —
see *Gates run*.

## Verdict

`approve`

- **Frozen-table divergences: 0.** All 16 mutations present; every anchor, every signature literal
  and every `max` occurs verbatim in `PLAN.md:126-153`. Three declared-`SURVIVED` negative controls
  present, all with `mustFail: []` and `max: 0`.
- **Assertions that got weaker: 1**, disclosed and plan-mandated (CRLF frontmatter tolerance).
  One further micro-relaxation (backticks optional around `Shortcode`/`Cluster` values) is
  undisclosed but net-strengthening; filed non-blocking.
- **The inversion did not recur.** The single artifact edit is Item 8's two lines, argued on the
  artifact's merits in `PLAN.md:734-748` and dispositioned `accept` at
  `RECONCILIATION.md:79,86`. `ai-docs/`, `.agents/` and `tests/pcp_skill.test.js` are byte-unchanged
  (`git diff --quiet HEAD -- ai-docs` / `.agents` / `tests/pcp_skill.test.js` all exit 0).
- **The decisive evidence:** the one place where editing the frozen table by one character would
  have turned the gate green — `path-stripped`'s `max: 20` at `tests/mutation-harness.mjs:246` —
  was **not** edited. The harness still exits 1 and the discrepancy is escalated verbatim in
  `GATE-OUTPUT.md:88-113`. That is the artifact-follows-gate move refused under the exact
  conditions that invited it.

One item remains outstanding and is **not** the implementer's to close: Item 9's acceptance gate
(`node tests/mutation-harness.mjs` → `exit=0`, `PLAN.md:834-838`) is still red at 15/16 pending the
orchestrator's ruling on the `path-stripped` cap.

## Frozen-table divergences

None. Verified field by field against `PLAN.md:126-153`:

| check | method | result |
|---|---|---|
| mutation count | table length | 16, matching `PLAN.md:110` |
| ids | set compare | all 13 positive + 3 negative controls present, no extras |
| anchors | `plan.includes(anchor)` for all 12 anchored ops | all 12 present verbatim (`benign-adr-prose-reflow`'s only after normalising the plan's markdown-escaped `` \` `` back to `` ` ``) |
| anchor uniqueness | `content.split(anchor).length - 1` against the live files | 1 for every anchored op; both `create` targets absent |
| signatures | `plan.includes(literal)` for all 13 | all 13 present verbatim, including the regex source `/bad file '[^']*constitution\.yaml': yaml:/` |
| replacements / new content | semantic compare against the plan's prose | all conform: `symmetric key pairs (HS256/HS512)` + `accept unsigned or RS256 tokens`; `must not use progressive disclosure` + `grep or full-file dumping is required`; `"Zx9!".repeat(200)` = 800 chars; `status: "bogus"` on both status mutations; rogue ADR carries `d-0002`; rogue skill carries `name: rogue`; `  - - bad` + a tab-indented continuation |
| `max` | value compare | `3,2,4,5,4,2,2,2,2,2,20,8,20,0,0,0` — identical to the plan |
| `mustFail` / `mustPass` | set compare vs plan wording | identical; `caveat-status-bogus`'s "all skill leaves" and `canary-*`'s "all skill leaves" are implemented as `SUITE3` (inventory leaf + six per-skill leaves), i.e. one leaf **broader** than the plan's wording, never narrower |
| leaf-name reality | every `mustFail`/`mustPass` string vs the 61 leaf names in a live TAP run | **0 unmatched** — no `mustPass` entry is a dead string |
| negative controls | `outcome === 'SURVIVED'` | 3: `benign-constitution-comment`, `benign-adr-prose-reflow`, `crlf-frontmatter`, each `mustFail: []`, `max: 0` |

`tests/mutation-harness.mjs:139` adds a `precondition` hook for `payload-bloat` that the plan
describes but does not name as a field (`PLAN.md:130`: "Harness preconditions, both measured and
both asserted before the run"). `:386-400` asserts exactly the two declared numbers — 980 chars and
`estimateTokens === 677` — and throws a harness error otherwise. Conformant, not a divergence.

## Gate direction audit

Baseline is `git show HEAD:tests/constitution_skills.test.js` (328 lines, 49 leaves) and
`git show HEAD:package.json`. New line numbers are `tests/constitution_skills.test.js`.

### Suite 1 — Constitution Schema & Taxonomy

| assertion | direction | evidence |
|---|---|---|
| six original subtests, all bodies | **SAME** | old `:19-145` vs new `:25-151` — assertion text identical; only `parseYaml` changed from `execSync` under a pinned `PATH` (old `:8,11-14`) to `yqJson` (new `:20-21`, `tests/lib/tools.mjs:30-32`) |
| `tool resolution follows the inherited PATH` | **MORE** (new) | `:153-178` — two-sided: shadow-dir resolution *and* a throw on an empty PATH |
| `estimateTokens scores the declared reference strings` | **MORE** (new) | `:180-184` — 225 / 675 / 200, the three literals declared at `PLAN.md:521-522` |
| `estimateTokens is not invariant to whitespace removal` | **MORE** (new) | `:186-194` |
| two `* matches the declared golden document` | **MORE** (new) | `:196-210`, messages `golden document mismatch: <file>` |

### Suite 2 — Retrieval & budget

| assertion | direction | evidence |
|---|---|---|
| payload non-empty | **SAME** | old `:189` → new `:217` |
| `payload.includes(tc.expectedSnippet)` | **removed, MORE** | old `:190` deleted; superseded by `deepStrictEqual` against `GOLDEN_SLICES` at `:221-225`. The snippet is a substring of the golden in all six cases, so the golden subsumes it strictly. **Disclosed** at `PLAN.md:611-614` |
| token bound | **MORE** | old `:192-197` `Math.round(words*1.3) < 300` → new `:233-237` `estimateTokens(payload) < 200`. Strict tightening, verified from `tests/lib/token-estimate.mjs:4-28`: every maximal non-whitespace run costs ≥1, so `estimate ≥ words`; `estimate < 200 ⟹ words ≤ 199 ⟹ round(199×1.3) = 259 < 300`. Nothing can move red→green |
| character bound | **SAME** | old `:198-201` → new `:238-241`, still `< 1200` |
| one leaf → two leaves | **MORE** | `:215`/`:228` — the token assertion now executes first (`:233-237`) and is no longer masked by a content failure |

### Suite 3 — Skills

| assertion | direction | evidence |
|---|---|---|
| frontmatter opening delimiter | **LESS (disclosed, plan-mandated)** | old `:241` `content.startsWith('---\n')` (exact-LF) → new `:279` `doc.frontmatter !== null`, which normalises CRLF first (`tests/lib/markdown-sections.mjs:18,23`). Declared at `PLAN.md:438-441`, ruled in the archived iteration, and carries a standing regression control: `crlf-frontmatter` must SURVIVE, and the harness exits 1 if it goes red |
| closing delimiter | **SAME** | old `:242-243` → `markdown-sections.mjs:24-25` + `:279` |
| frontmatter `name` equals expected | **SAME** | old `:246,249-250` → new `:281-283` |
| `description` present and non-empty | **SAME** | old `:252-253` → new `:284-285` |
| required "sections" | **MORE** | old `:255-260` `content.toLowerCase().includes(section)` — a whole-file substring scan — → new `:287-292` `hasHeading`, which is level-aware, fence-aware, frontmatter-excluding and requires a **non-empty body** (`markdown-sections.mjs:80-93`) |
| inventory | **MORE** | old `:207-233` was five hardcoded paths. New: `SKILL_INVENTORY` of six (`tests/fixtures/expected.mjs:233-264`) plus a discovery-walk set-equality leaf at `:260-270`. The walk (`:247-258`) covers **all** of `plugins/` and `.agents/`, which is broader than the plan's `plugins/**/skills/*/SKILL.md` + `.agents/skills/*/SKILL.md` glob (`PLAN.md:458-459`) |
| leaf id keyed by path not name | **MORE** | `:274` — the two `name: steps` files no longer collide (`PLAN.md:202-204`) |
| `tokensave` (old `:216`), `.pcp` (old `:226`) | **retired, disclosed** | `PLAN.md:478,480` — unfalsifiable literals (14 and 18 occurrences). Not swapped for looser strings: both files gained *more* required headings than they lost |
| `Navigation` → `Navigation & Inspection Recipes`; `CLI` → `CLI MAINTENANCE SUBCOMMANDS` | **MORE** | old `:216,226` vs `expected.mjs:242,252` — a substring broadened into a real heading name |
| 7 headings added across 4 files | **MORE** | `expected.mjs:242,247,252,257,262`: `Tool Invocation Modes`, `Agent Operational Rules`, `Operational Guardrails`, `CORE OPERATIONAL INVARIANTS`, `LIFECYCLE DEVELOPMENT GUARDRAILS`, `Rules that were paid for`, `Separation of duties` |

Net for suite 3: the shipped test scanned 15 case-insensitive substrings across 5 files; the new
suite asserts 22 real, bodied headings across 6 files. `PLAN.md:487-488` claims exactly this and it
checks out.

### Suite 4 — ADR synchronisation

| assertion | direction | evidence |
|---|---|---|
| level-1 `# ADR-NNNN: <Title>` | **MORE** | old `:278` unanchored-ish `assert.match(content, /^# ADR-\d{4}:\s+.+/m)` → new `:374-377` over parsed headings (fence-aware) + a title-equality check at `:401-404` |
| `Shortcode` bullet | **MORE, with one formatting relaxation** | old `:281-283` required backtick delimiters. New `:328` matches `^- \*\*Shortcode\*\*:\s*(.*)$` and strips ticks at `:335`, so bare values now pass. Offset by: line-start anchoring, exactly-once (`:356`, `:393-398`) and fence-stripped extraction (`:329`). See non-blocking #2 |
| `Status`/`Date`/`Cluster`/`Deciders` presence | **MORE** | old `:285-288` presence-only → new `:392-399` presence **plus exactly-once**, which is what makes `adr-duplicate-status` catchable |
| `Date` format | **SAME** | old `:286` regex at the bullet → new `:407` equality with `d.date`, whose format is asserted at `:88` |
| seven structural headings | **MORE** | old `:291-297` seven unanchored, fence-blind `assert.match` calls (`## Contextual` satisfied `/## Context/`) → new `:378-383` `hasHeading` |
| `files.length > 0` | **removed, subsumed** | old `:304`. Subsumed by `:340-350` set equality against `decisions[].adr` plus the non-empty-decisions assertion at `:82`. **Disclosed** at `PLAN.md:663-664` |
| ADR discovery | **MORE** | old `:303` non-recursive `fs.readdir` → new recursive walk `:312-320`; `ai-docs/decisions/auth/…` is now visible in both directions |
| per-file `Shortcode` present | **MORE** | old `:310-312` → new `:356`, exactly-one |
| per-file `Status` present | **SAME (union)** | old `:314-316`. New coverage is split: every registered ADR gets presence+exactly-once at `:392-399`; every *un*registered ADR fails `:340-350`. No file escapes both |
| registered lookup + `registered.adr === fullPath` | **MORE** | old `:318-320` (`decisions.find` takes the first match silently) → new `:340-350` symmetric set equality + `:406` shortcode equality + `:352-369` uniqueness on both sides |
| ADR status ↔ constitution status | **SAME** | old `:321-325` → new `:442-449`, verbatim comparison retained |
| status vocabulary | **MORE** (new) | `:414-440` — `ADR_STATUSES` literal (`expected.mjs:221`) applied to `decisions`, `caveats`, `requirements` and every discovered ADR, plus a cross-check that `.agents/skills/adr-manager/SKILL.md:32` advertises the same four. `deferred[].status` stays pinned to the literal `'deferred'` at `:120`, as `PLAN.md:691-692` requires |
| golden registry | **MORE** (new) | `:452-464`, subset semantics as specified |
| one body → six sibling leaves | **MORE** | `:340,352,371,387,414,452` — which signature surfaces is no longer an accident of statement order |

### `package.json`

| change | direction | evidence |
|---|---|---|
| `test` script | **SAME** | byte-identical target list: `node --test tests/pcp_skill.test.js tests/constitution_skills.test.js`. No narrowed glob, no `--test-skip-pattern`, no file dropped |
| `test:mutation` | **MORE** (new) | `node tests/mutation-harness.mjs`, per `PLAN.md:791` |
| `engines: {node: ">=18"}` | **MORE** (new) | per `PLAN.md:659-661` |

**Skips and downgrades: none.** The live TAP run reports `# skipped 0` / `# todo 0`, and there is no
`skip`, `todo`, `only` or skip-list anywhere in the changed files. No test was rewritten to match
output: the six original suite-1 subtests and all 25 `tests/pcp_skill.test.js` subtests are
unchanged, and the latter file is byte-identical to `HEAD`.

## Item-by-item conformance

| item | done | its gate actually gates it |
|---|---|---|
| 1 `tests/lib/repo-guard.mjs` | yes | **I ran it**: `--selftest` → 15/15, `exit=0`. Exercises snapshot→write→restore by sha, create→restore with reverse-order `rmdir`, a stale journal producing exit 2, and a real `SIGINT` delivered to a child mid-write. Journal path is out-of-repo (`:13`) |
| 2 `tests/mutation-harness.mjs` | yes | **I ran the plan's first gate command**: 2 RED-with-signature + 2 SURVIVED, `exit=0`. No always-red and no always-green harness produces that pair. The second gate (full sweep) is Item 9's |
| 3 PATH portability | yes | `tests/lib/tools.mjs`; `ENV_PATH` gone; `execFileSync` with an absolute binary and **no `env` option** (`:27,31`); not memoised (`:9`); array-wrapped exprs (`expected.mjs:126-158`); `recipe` retained for Phase 2 |
| 4 one parser, one inventory | yes | `tests/lib/markdown-sections.mjs`; discovery walk + set equality; `requiredHeadings` only — **no `requiredLiterals`**, as `PLAN.md:464` requires |
| 5 token estimate | yes | `tests/lib/token-estimate.mjs`; three declared reference values pinned; token assertion first (`:233`), char second (`:238`); old `words*1.3` deleted |
| 6 declared expected values | yes | `tests/fixtures/expected.mjs`; see *Declared expected values* below; golden-slice message literal mandatory and present (`:224`); pre-existing shape assertions kept |
| 7 ADR sync | yes | six sibling leaves, all six names exactly as declared at `PLAN.md:205-209`; `engines` added |
| 8 `## Separation of duties` | yes | exactly two lines, inserted after line 9 / before line 10 (`plugins/steps/skills/steps/SKILL.md:10-11`), heading + blank line, nothing reordered. `### Review lenses` correctly **not** added |
| 9 sweep + entry point | partial, correctly so | `GATE-OUTPUT.md` records the **measured** 66/66 and the verbatim sweep; `test:mutation` added; `test` unchanged. The gate itself is red at 15/16 on the escalated cap |

Nothing was silently skipped and nothing was done differently.

## The inversion check

The one artifact edit is `plugins/steps/skills/steps/SKILL.md`, +2 lines:

```
## Separation of duties
<blank>
```

Facts, not inference:

- The **shipped** test already asserted the string `Separation of duties` for this file
  (`git show HEAD:tests/constitution_skills.test.js:231`) as a case-insensitive whole-file
  substring, and it passed only because of the frontmatter `description:` at `:3` — confirmed: on
  `HEAD` that line is the file's sole occurrence.
- So the string is **not** newly restored to force an artifact edit; what changed is that
  `hasHeading` will no longer accept a frontmatter mention.
- `PLAN.md:734-748` argues the heading from the document alone: `:10-11` is the protocol's central
  rule, sitting unheaded between `# steps` and `## Roles`, unreachable by heading-based retrieval.
  The insertion names existing prose; no prose is invented or moved.
- The orchestrator ruling at `ORCHESTRATOR-LOG.md:80-83` set the condition "argued in the plan,
  independent of the test, **or** retired". `RECONCILIATION.md:79` (`DC-A10`) and `:86` (`DC-D5`)
  both disposition this `accept`, and `RECONCILIATION.md:26,55` retire `Review lenses` instead.

Conclusion: this is the plan-approved half of a split verdict, not the inversion. **Flagged for the
orchestrator** only because the brief restated the ruling in its pre-reconciliation form: if the
intent is that `Separation of duties` be retired too, the repair is to drop it from
`tests/fixtures/expected.mjs:257` and revert the two lines — a change to the *plan*, not a defect in
the implementation.

No other artifact moved: `ai-docs/`, `.agents/`, `tests/pcp_skill.test.js` all `git diff --quiet`
clean against `HEAD`.

## Declared expected values

`tests/fixtures/expected.mjs` **is** literals-only, mechanically:

- Scanned for call expressions (`/[A-Za-z_$][A-Za-z0-9_$]*\s*\(/`): 20 hits, **every one inside a
  string literal** (`(RS256/ES256)`, `select(.domain == "auth")`, `(auth)` in case names, …). Zero
  call expressions in code position.
- Zero `import`, `require`, `readFile`, `readFileSync` or `yq` invocations. The file has no imports
  at all.

So the provenance rule at `PLAN.md:590-595` holds, and the property that matters holds with it: the
goldens cannot track the artifact, because nothing in the file reads the artifact.

**Are they *declared* or *generated-then-pasted*?** Honest answer: indistinguishable by inspection,
and `PLAN.md:872-876` says so in advance. Their shape is `yq -o=json` output verbatim — double-quoted
keys throughout `CONSTITUTION`, `AUTH_SPEC` and `GOLDEN_SLICES`, unquoted keys only in the two
hand-authored structures (`GOLDEN_DECISIONS`, `SKILL_INVENTORY`) — which is consistent with a
generate-and-paste. That is **not** a defect, and here is the mechanical reason: a generated golden
would still be killed by `rule-inverted-unqueried`, which inverts a rule **no query case reaches**;
only the whole-document golden can catch it, and it is declared RED and measured RED with the frozen
signature. A golden that tracked the artifact could not produce that result. The two benign controls
close the other direction — a byte or hash pin would turn `benign-constitution-comment` and
`benign-adr-prose-reflow` red, and I measured both SURVIVED myself.

Verdict on lens 5: **genuinely decoupled, provably; literal-authored, unprovable and not required
to be.**

## Blockers

None.

## Non-blocking findings

1. **`mustPass` names are not existence-checked, so a renamed subtest silently disarms them.**
   `tests/mutation-harness.mjs:543-544` computes `m.mustPass.filter(n => failing.includes(n))`. A
   `mustPass` string that names no real subtest can never appear in `failing`, so it passes
   vacuously — for ever. `mustFail` is self-checking (`:541-542` reports the missing name), so the
   asymmetry is one-sided. **Class enumeration:** this affects all 13 positive controls, 56
   `mustPass` entries in total. I verified all 56 against a live TAP run today — **0 unmatched** — so
   the gate is sound *now*; it is the future rename that is unguarded. Cheapest repair: assert at
   the end of the sweep that `union(mustFail ∪ mustPass)` is a subset of the leaf names observed in
   the clean-tree run.

2. **`Shortcode` and `Cluster` no longer require backtick delimiters.**
   Old `:281-283,287` matched `` - \*\*Shortcode\*\*:\s*`([^`]+)` ``; new
   `tests/constitution_skills.test.js:328` matches `^- \*\*<field>\*\*:\s*(.*)$` and strips ticks at
   `:335`. An ADR writing `- **Shortcode**: d-8f3a` bare now passes. **Class:** all five fields in
   `METADATA_FIELDS` (`:308`). Net direction is still MORE (line-anchored, exactly-once,
   fence-stripped), the value equality assertions are unchanged, and `PLAN.md:680-681` mandates the
   tick-stripping for `Cluster` — but the *relaxation for `Shortcode`* is not disclosed anywhere.
   Undisclosed, harmless, worth a line in the record.

3. **`--only` mode credits a signature that any sibling leaf could emit.** Per `PLAN.md:175-178`,
   `--only` checks outcome + signature + the pcp invariant, and *not* `mustFail`/`mustPass`/`max`.
   For `payload-bloat` the signature is the generic literal `token budget`
   (`tests/constitution_skills.test.js:236`), emitted by **any** of the six `bounds the *` leaves.
   So Item 5's own gate (`--only payload-bloat`, `PLAN.md:556`) would have been satisfied by the
   wrong leaf failing. Plan-declared and closed in the full sweep by `mustFail: [BOUNDS[1]]` +
   `mustPass:` the other five. **Class:** the same holds for `required heading: ## Context`
   (`adr-heading-fenced`) and `status not in declared vocabulary:` if a future id shares a prefix.
   Nothing to repair this phase; noting that per-item `--only` gates are weaker evidence than the
   sweep, exactly as the plan says.

4. **Signature matching is unscoped.** `:522-524` tests the signature against the whole `npm test`
   output rather than against the failing leaf that emitted it. Combined with #3 this is the residual
   "credits any red" surface. Mitigated in the sweep by the `mustFail` sets; not worth structural
   change.

5. **The pcp invariant depends on TAP blocks being contiguous per file.** `parseFailures`
   (`:367-380`) attributes a leaf to whichever top-level `# Subtest:` line preceded it, and the pcp
   check is `l.suite === 'PCP Skill Automation Suite'` (`:48,517`). `node --test` runs the two files
   in separate processes; if their TAP ever interleaved, a pcp leaf could be attributed to a
   constitution suite and the invariant would silently not fire. **Verified today**: the five
   `# Subtest:` markers appear at lines 6, 79, 158, 207, 250 of a live run — strictly contiguous, and
   `PCP Skill Automation Suite` is the exact name in `tests/pcp_skill.test.js`. Low risk, no repair.

6. **The guard's read-path set could have covered three more files at no cost.**
   `tests/mutation-harness.mjs:311-315` sets `READ_PATHS` to `ai-docs/`, `.agents/skills/` and
   `plugins/steps/skills/rogue/`. `GATE-OUTPUT.md:115-131` justifies excluding `tests/`,
   `package.json` and `plugins/steps/skills/steps/SKILL.md` — all three are necessarily dirty while
   the phase is in flight, and that reasoning holds. But the suite also reads
   `plugins/pcp/skills/pcp/SKILL.md` and `plugins/steps/harnesses/droid/skills/steps/SKILL.md`,
   which **no phase item edits** and which are clean in the working tree — they could have been
   guarded without breaking any gate, and the escalation does not mention them. Consequence today is
   nil (no mutation writes them, and the exit-time porcelain check would classify a stray edit as
   "tolerated" rather than fatal). The D1 wording is the orchestrator's call; this is only the
   observation that the escalation understates what was available.

## What a conformant-but-wrong implementation would still pass

Answering the brief's question directly, beyond what `PLAN.md:840-880` already enumerates:

- **A `hasHeading` that is correct for the two mutated files and wrong for the other four.** Only
  `.agents/skills/adr-manager/SKILL.md` (`skill-heading-renamed`) and
  `ai-docs/decisions/ADR-0001-unified-esm.md` (`adr-heading-fenced`) are exercised; 16 of the 22
  asserted headings are ungated. Named openly at `PLAN.md:862-869`; the mitigation (all six files
  through one parser) is structural, and I confirmed there is exactly one parser
  (`tests/lib/markdown-sections.mjs`) with no per-file branching.
- **A `SKILL.md` outside `plugins/` and `.agents/`.** `discoverSkillFiles` (`:247-258`) is called on
  those two roots only. A skill installed at, say, `skills/` at repo root would be invisible to the
  inventory gate in both directions.
- **A future golden regeneration.** Nothing in the gate distinguishes a golden re-derived from a
  changed artifact from a hand-declared one; only the negative controls and
  `rule-inverted-unqueried` make it *currently* impossible for the shipped goldens to be derived.
  `PLAN.md:872-876` files this as Phase 4's.
- **A weakened `mustPass` set** — see non-blocking #1. This is the one hole in the *harness* itself
  and it is the same class the phase exists to close, one level further up.

## Gates run — verbatim

```
$ node tests/lib/repo-guard.mjs --selftest; echo "exit=$?"; git status --porcelain | wc -l
ok   journal exists after writeJournal()
ok   write() changed the file
ok   write() refuses restoring the snapshot bytes as an edit
ok   write() refuses an un-snapshotted path
ok   restore returned the exact bytes
ok   journal removed after verified restore
ok   create() made the file
ok   create() refuses an existing path
ok   created file removed
ok   created dirs removed in reverse order
ok   stale journal refuses with exit 2 — exit=2
ok   refusal names the held file
ok   child died from the signal, not a clean exit — code=null signal=SIGINT
ok   SIGINT handler restored the file — key: value
other: 1

ok   SIGINT handler removed the journal

15/15 guard self-test checks passed
exit=0
      37
```

```
$ node tests/mutation-harness.mjs --only canary-missing-key --only canary-bad-yaml \
    --only benign-constitution-comment --only benign-adr-prose-reflow; echo "exit=$?"
mutation harness — 4 mutation(s), --only mode

clean tree (before): npm test PASS

canary-missing-key           RED (signature matched)    [conformant]  ai-docs/constitution.yaml
                             failing leaves: 4 — ai-docs/constitution.yaml exists, is readable, and contains root keys | taxonomy shortcodes conform to required attributes and patterns | ai-docs/constitution.yaml matches the declared golden document | retrieves Deferred track slice (l-e404)
canary-bad-yaml              RED (signature matched)    [conformant]  ai-docs/constitution.yaml
                             failing leaves: 16 — ...
benign-constitution-comment  SURVIVED                   [conformant]  ai-docs/constitution.yaml
                             failing leaves: 0
benign-adr-prose-reflow      SURVIVED                   [conformant]  ai-docs/decisions/ADR-0001-unified-esm.md
                             failing leaves: 0

clean tree (after):  npm test PASS
porcelain: no divergence on read paths

4/4 mutations conformant (--only mode)

exit 0
exit=0
      37
```

```
$ npm test 2>&1 | tail -8
# tests 66
# suites 0
# pass 66
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2815.605291
```

Mechanical cross-checks (scripts run from the repo root against the live table):

```
mutations: 16 | leaf names not present in the clean run: 0
declared SURVIVED: benign-constitution-comment, benign-adr-prose-reflow, crlf-frontmatter
anchor uniqueness: 12/12 anchored ops occur exactly once; both create targets absent
anchors + signatures found verbatim in PLAN.md: 12/12 anchors, 13/13 signatures
```

```
$ git diff --quiet HEAD -- tests/pcp_skill.test.js; echo $?   ->  0
$ git diff --quiet HEAD -- ai-docs;                echo $?   ->  0
$ git diff --quiet HEAD -- .agents;                echo $?   ->  0
```

I did **not** re-run the full sweep (the orchestrator had already reproduced it) and I edited no
file other than this report.

## Risks / unverified

- **The full sweep's `mustFail`/`mustPass`/`max` results are taken from `GATE-OUTPUT.md:45-70`, not
  re-measured.** I independently verified the *inputs* to that contract — every leaf name is real,
  every anchor is unique, every cap matches the plan — but the 15/16 outcome itself is the
  implementer's captured output plus the orchestrator's reproduction, not mine.
- **`crlf-frontmatter`, `skill-heading-renamed`, `skill-unlisted`, `path-stripped` and the five ADR
  mutations were not run by me.** Their conformance is reported, not verified here. I did verify
  statically that `.agents/skills/constitution-query/SKILL.md` contains zero `\r` bytes today, which
  is `crlf-frontmatter`'s stated precondition.
- **`estimateTokens` is a self-consistent heuristic, not a tokenizer.** The 200 bound is a claim
  about this metric only. Named in `PLAN.md`'s Risks; unchanged by this review.
- **Item 9's acceptance gate has not passed.** `node tests/mutation-harness.mjs` exits 1 at 15/16 on
  the escalated `path-stripped` cap. The phase is complete in every other respect; whether 21 leaves
  is a plan arithmetic slip or a real over-broad failure is the orchestrator's ruling to make, and I
  have not second-guessed it. `GATE-OUTPUT.md:105-111`'s derivation of 21 (nine yq-dependent suite-1
  leaves + twelve suite-2 leaves) is arithmetically consistent with the leaf inventory I extracted
  from the live TAP run.
