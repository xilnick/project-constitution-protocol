# Phase 1 Review — executability and gate integrity

**Lens.** Is every work item's gate command real, runnable today, and able to go red at that item
for the right reason — and does the mutation harness's own gate exclude a conformant-but-wrong
harness?

**Verdict:** `reject`

Six blockers. Two of them (1, 2) mean a specified gate cannot pass as written; one (3) is a wrong
`path:line` that drives an edit to the live protocol document. Everything else in the plan that I
could execute reproduced exactly — the survivor evidence, the baseline, the payload table and both
canaries are all confirmed empirically (see **Verified**). A v2 is cheap; the defects are local.

---

## Blockers

### 1. `adr-status-bogus`'s constitution-side anchor is not unique — Item 6's gate can never pass

`PLAN.md:106` specifies the mutation as `ai-docs/constitution.yaml` `status: "active"` → `"bogus"`,
and `PLAN.md:76-77` requires the harness to assert the anchor occurs **exactly once**
(`split(anchor).length === 2`), treating anything else as a harness error rather than a mutation.

Evidence:
```
$ grep -n 'status:' ai-docs/constitution.yaml
30:    status: "active"     # decisions[0] d-8f3a
39:    status: "active"     # caveats[0] c-e9a2
48:    status: "active"     # requirements[0] r-b111
55:    status: "deferred"
```
Three occurrences. The harness aborts `adr-status-bogus` as a harness error, so Item 6's gate
(`PLAN.md:451`) returns a non-zero non-RED result forever, and Item 7's sweep can never reach exit 0.

**Right:** the anchor must be the multi-line `d-8f3a` block (`id: "d-8f3a"` … `status: "active"`,
i.e. lines 28-30 verbatim), which I confirmed is unique. I applied exactly that anchor in a scratch
copy and the mutation landed on line 30 only.

### 2. `resolveTool` is memoised, and Item 2's own new subtest requires it not to be

`PLAN.md:187-188` — "returns its absolute path, **memoised**". `PLAN.md:201-206` — the new subtest
sets `process.env.PATH` to a temp dir holding a symlinked `yq` and asserts `resolveTool('yq')`
returns the **temp** path, then sets `PATH` to an empty dir and asserts it throws.

Both assertions read a cache that was already populated by the 12 preceding `yq`-dependent subtests
in the same process (`node:test` runs the whole file in one process; `tests/constitution_skills.test.js:18`
is the first suite and the new subtest joins it). The first assertion gets `/opt/homebrew/bin/yq`,
not the temp path; the second gets a cache hit instead of a throw. Item 2's stated expected output
("`npm test` still green with 49 + 1 = 50 tests", `PLAN.md:229`) is unreachable.

**Right:** either drop memoisation (one `execFileSync` per call is not a cost problem — `npm test`
is 2.97 s total) or export a `_resetToolCache()` and call it in the subtest's `try`/`finally`. Say
which, in the plan, because it is the difference between the subtest passing and failing.

### 3. `PLAN.md:348` cites a "lens list at `:64-74`" that does not exist

`PLAN.md:346-350` inserts `### Review lenses` "inside `## The phase loop` (`:56`) above the lens
list at `:64-74`", and claims "both sections are headings placed over text that already exists and
is currently unheaded."

`plugins/steps/skills/steps/SKILL.md:60-80` is a single ordered list (`0.` Scout … `9.` Record).
There is no lens list. The lens *mentions* are embedded inside two separate numbered steps:
- `:64-66` — step **2**, "Review the plan… Typical lenses: *design/spec consistency*,
  *executability and gates*, *coverage*."
- `:71-73` — step **5**, "Review the implementation… one lens each: *correctness and regression*,
  *conformance to plan and gate integrity*."

`:64-74` therefore spans steps 2 through 6. Inserting a `###` heading above `:64` fragments the
phase loop's numbered sequence between item 1 and item 2 — in the document that is live-symlinked
as this session's protocol (see blocker 5 for the symlink chain). The text is not "currently
unheaded": it is already under `## The phase loop`, inside enumerated steps.

**Right:** retire `Review lenses` the way the other four archived strings are retired in D3
(`PLAN.md:618-628`) — its absence is a genuine absence, and D3's own rule is "retire when absent,
head when present-and-unheaded". If it must be restored, it needs a real subsection *after* the
loop that names the lenses, and the plan must say so, because "above the lens list" is not
executable.

### 4. `rule-inverted`'s `expectSignature` is unpinnable — the plan's own defence #3 is void for it

`PLAN.md:539-543` (defence #3) rests on "the failing output must contain the specific assertion
message". Items 3, 5 and 6 each pin a literal (`token budget` `PLAN.md:253`, `required heading`
`PLAN.md:345`, `status not in declared vocabulary` `PLAN.md:425`). Item 4 does not:
`PLAN.md:302-304` is `assert.deepStrictEqual(slice, GOLDEN[tc.name])` with **no message argument**,
and `PLAN.md:104` describes the signature only as "the golden-content assertion for the
`sec-auth-01` slice".

Node emits the generic `Expected values to be strictly deep-equal:` for that, plus a diff that is
elided for large values. So the only available regex matches *any* content mismatch in *any* of the
six slices — including one caused by a broken `yqJson`, a fixture edit, or a wrong `GOLDEN` entry.
Item 4's gate (`--only rule-inverted` → exit 0) is satisfiable by a suite that is red for a
different reason entirely.

**Right:** Item 4 passes a message containing a unique literal per case, e.g.
`golden slice mismatch: ${tc.name}`, and `PLAN.md:104` records the regex verbatim
(`/golden slice mismatch: sec-auth-01/`).

### 5. The restore path is not signal- or crash-safe, and the file it mutates every sweep is the live installed `steps` skill

`PLAN.md:86` is titled "**Restore strategy and why it cannot lose work**" and `PLAN.md:91` rests the
guarantee on "the restore runs in a `finally`". A `finally` does not run on `SIGINT`, `SIGTERM`,
`SIGKILL`, an OOM abort, or a terminal hang-up. `npm test` is ~3 s and the sweep ~30 s of foreground
output — Ctrl-C is the single most likely interruption.

The exposure is not theoretical. Verified symlink chain:
```
~/.claude/skills/steps -> /Users/purplelephant/.agents/skills/steps
~/.agents/skills/steps -> /Users/purplelephant/projects/pcp/plugins/steps/skills/steps
```
`heading-renamed` (`PLAN.md:105`) rewrites `## Roles` in that file on **every** sweep. A Ctrl-C
inside that mutation's `npm test` window leaves the running orchestrator's protocol document with a
corrupted heading and no record that it happened. `PLAN.md:588-592` discloses the live-symlink
hazard for Item 5's *deliberate, insert-only* edit — which is adequate for that edit — and says
nothing about the harness's transient rewrite of the same file, which is the more dangerous of the
two because it is invisible.

**Right:** (a) `process.on('SIGINT'|'SIGTERM'|'SIGHUP')` → restore, then re-raise with the default
disposition; (b) before the first write, persist a journal (target path + sha256 + the snapshot
bytes) **outside the repo** — `.gitignore` is only `.pcp/`, so a journal inside the tree would break
the harness's own porcelain-equality assertion — and delete it after the verified restore;
(c) at start-up, refuse with exit 2 if a stale journal exists, naming the file to restore.

### 6. Clean-tree strictness makes every per-item gate unrunnable at the moment the item is complete

`PLAN.md:93` refuses with exit 2 on non-empty `git status --porcelain`. Items 2-6 each modify
`tests/constitution_skills.test.js`, so at the instant an item is finished its own gate is
guaranteed to refuse. The implementer must commit the item's work *before* any evidence that the
item works exists. `PLAN.md:94-96` acknowledges the friction but only for `.plans/` churn; the
sharper consequence is that the plan's stated per-item outputs (`exit=0`) are not reproducible in
the state each item leaves the tree in.

Confirmed dirty today: `git status --porcelain | wc -l` → `29`, all `.plans/*`.

`PLAN.md:609-614` (D1) already contains the fix and declines to plan it. Adopt it as Item 1b, with
two corrections to the sketch: match porcelain entries by **path prefix**, not string equality
(untracked directories appear as a single `?? ai-docs/decisions/auth/` entry, which an equality
check on `ai-docs/decisions/auth/ADR-0002-rogue.md` would miss), and refuse on dirtiness in *any
file the suite reads* — not just mutation targets — because a locally-modified
`.agents/skills/adr-manager/SKILL.md` (read by Item 6 point 4) or `ai-docs/specs/auth-spec.yaml`
changes what the mutations mean.

On the brief's specific question: `--dirty-ok` **cannot** let the harness run against a tree that
already contains the mutation it thinks it is applying, provided the prefix-matching fix above is
made — a pre-applied file mutation makes the target differ from HEAD and therefore appear in
porcelain, and `adr-nested-rogue`'s create refuses when the path exists (`PLAN.md:90`). The hole is
the *neighbouring* dirty file, not the target.

---

## Amendments

1. **Item 1's gate is not machine-checkable.** `node tests/mutation-harness.mjs; echo "exit=$?"`
   (`PLAN.md:126`) exits 1 both when the harness is correct and when it is the always-exit-1 stub
   that `PLAN.md:531-534` says the canaries exclude — the exclusion lives in prose the reader must
   compare by eye. Add a second, exit-0 gate: `node tests/mutation-harness.mjs --only
   canary-missing-key --only canary-bad-yaml; echo "exit=$?"` → `exit=0`.
2. **Pin `maxFailingTests` per mutation, and define the counting rule.** Measured in a scratch copy:
   `canary-missing-key` produces `# fail 5` (3 leaf subtests + 2 suite roll-ups), not 1. A naive
   `maxFailingTests: 1` misclassifies the canary; an unspecified value invites `999`, which voids
   the second half of defence #3 (`PLAN.md:541-543`). State whether the count is leaf `not ok` lines
   or the `# fail` summary.
3. **`canary-bad-yaml`'s signature must be pinned to yq's stderr, not the command string.** Measured
   today: `Command failed: yq -o=json "ai-docs/constitution.yaml"` + `Error: bad file
   'ai-docs/constitution.yaml': yaml: … did not find expected '-' indicator`. Item 2 replaces that
   command with an absolute-path `execFileSync`, so a signature written against `Command failed: yq`
   silently stops matching at Item 2 and the failure surfaces only at Item 7's sweep — contradicting
   `PLAN.md:524-525` ("no item's failure is deferred to the end of the phase"). Pin
   `/bad file .*yaml:/`.
4. **`### Review lenses` aside, `## Separation of duties`'s insertion point is self-contradictory.**
   `PLAN.md:346-348` puts it "immediately after the intro at `:8-11`, holding the rule already
   stated there … `:10`". After `:11` the next line is `## Roles` (`:13`), so the new section holds
   nothing; to hold `:10-11` it must be inserted *before* `:10`. Name the line.
5. **`hasHeading` is satisfied by a body-less heading.** Which is exactly what amendment 4's
   ambiguity would produce. Add a non-empty-body assertion per required heading (≥1 non-blank line
   before the next heading of same-or-higher level), or Item 5's new gate cannot tell a real section
   from a bare `##` line — and D3's whole artifact-integrity argument rests on the difference.
6. **`adr-nested-rogue`'s restore leaves a directory the harness cannot see.** It must create
   `ai-docs/decisions/auth/` (verified absent today: `ls -R ai-docs/decisions` → only
   `ADR-0001-unified-esm.md`). `PLAN.md:89-90` deletes only "a file it created", and `git status
   --porcelain` does not report empty directories, so the porcelain-equality assertion
   (`PLAN.md:84`) passes over the residue. Record created directories and `rmdir` in reverse order,
   then assert absence directly — this is the case where the byte-snapshot strategy genuinely does
   not apply, since there are no snapshot bytes for a file that did not exist.
7. **Item 7's gate cannot print `0` while Item 7's artifact is unstaged.** `PLAN.md:492` ends with
   `git status --porcelain | wc -l` expecting `0`, but the item's deliverables are `package.json` and
   a new `.plans/phase-1/GATE-OUTPUT.md`. Spell the order: commit `package.json` → run the gate →
   write `GATE-OUTPUT.md` from the captured output → commit it.
8. **Scope the porcelain comparison, or whitelist `tests/playground`.** `tests/pcp_skill.test.js:11`
   sets `playgroundDir = tests/playground` and creates/removes it per test. Today it cleans up
   (verified: `ls tests/` → the two test files only; porcelain unchanged after `npm test`), but one
   interrupted run leaves residue that the harness will report as a *restore failure* and fail the
   whole gate for an unrelated reason. Distinguish "a target path differs" (fatal) from "an
   unrelated path appeared" (reported, non-fatal).
9. **`payload-bloat` needs a lower precondition as well as an upper one.** `PLAN.md:108` asserts the
   mutated payload is `< 1200` chars so the char bound cannot be the cause. Add the symmetric
   assertion that `estimateTokens(mutatedPayload) > 200` by a stated margin — otherwise the
   mutation's redness depends on an unspecified character mix. 800 *letters* score exactly 200
   under Item 3's scanner (`ceil(800/4)`), i.e. one character-class choice away from the `< 200`
   bound not firing on the bloat alone.
10. **`resolveTool` must `stat`, not `lstat`.** Item 2's own subtest symlinks `yq` into a temp dir
    (`PLAN.md:202-204`); "an executable **regular file**" (`PLAN.md:187`) implemented with `lstat`
    rejects the symlink and the subtest fails for a reason unrelated to what it tests.

---

## Verified

Everything below I executed. Read-only checks ran in the working tree; every mutation ran in a
scratch copy at `/tmp/pcp-scratch` (`tar`-cloned, `.git` excluded). **No file in the repo was
modified** — final `git status --porcelain | wc -l` is `29`, the same 29 `.plans/*` entries present
at start.

**Baseline (`PLAN.md:18-29`) — exact.**
```
# tests 49 / # pass 49 / # fail 0 / duration_ms 2758.6      real 0m2.967s
```
`package.json:8` → `node --test tests/pcp_skill.test.js tests/constitution_skills.test.js`.
No `node_modules`, no declared deps. `node v22.22.3`, `npm 10.9.8`. `yq` only at
`/opt/homebrew/bin/yq`; `/usr/bin/yq` and `/bin/yq` do not exist. `node`/`npm` co-located in
`/Users/purplelephant/.local/bin` (so `path-stripped`'s override keeps `npm` working — the risk at
`PLAN.md:593-598` does not bite on this machine).

**All six SURVIVED predictions (`PLAN.md:146-173`) — reproduced by execution, not by reading.**
The plan states at `PLAN.md:599-603` that these were read-derived; they are now measured. Each
mutation applied in the scratch copy, `npm test` run, then reverted:

| mutation | applied as | result |
|---|---|---|
| `rule-inverted` | `constitution.yaml:10` rule → symmetric/HS256/accept inverse | **SURVIVED** 49/49 |
| `heading-renamed` | `steps/SKILL.md` `^## Roles$` → `## Rolez` | **SURVIVED** 49/49 |
| `adr-status-bogus` | `ADR-0001:4` `Active`→`Bogus` + `constitution.yaml:30` `"active"`→`"bogus"` | **SURVIVED** 49/49 |
| `adr-nested-rogue` | created `ai-docs/decisions/auth/ADR-0002-rogue.md`, shortcode `d-0002` | **SURVIVED** 49/49 |
| `payload-bloat` | `d-8f3a` summary → 800 whitespace-free mixed chars; payload **966** chars | **SURVIVED** 49/49 |
| `path-stripped` | `PATH=$(dirname $(which node)):/usr/bin:/bin` | **SURVIVED** 49/49, `yq_rc=1` |

The audit is right on all six. `payload-bloat`'s payload measured 966 chars against the plan's
predicted ~967 — one byte, and comfortably inside the `< 1200` precondition.

**Both canaries are RED today, with the predicted signatures.**
- `canary-missing-key` (deleted the `deferred:` block, lines 51-56): `# fail 5`, and the output
  contains verbatim `error: 'Missing root key: deferred'` — `tests/constitution_skills.test.js:28`
  as cited. Also fails `deferred must be a non-empty array` (`:109`) and the `l-e404` retrieval
  subtest.
- `canary-bad-yaml` (appended two invalid lines): red across all five `parseYaml` subtests plus the
  fourth suite, with `Command failed: yq -o=json "ai-docs/constitution.yaml"` and
  `Error: bad file 'ai-docs/constitution.yaml': yaml: … did not find expected '-' indicator`.
- Anchor uniqueness spot-checks: `deferred:` occurs once (`:51`); `^## Roles$` occurs once;
  `- **Status**: Active` occurs once in `ADR-0001`. Only `adr-status-bogus`'s constitution-side
  anchor fails (blocker 1).

**Payload/token table (`PLAN.md:52-60`) — reproduced exactly** with a from-scratch implementation of
Item 3's scanner: `sec-auth-01 190/25/33/64`, `d-8f3a 325/40/52/123`, `c-e9a2 289/36/47/100`,
`r-b111 217/26/34/72`, `l-e404 221/25/33/79`, `login-ep 155/17/22/58`, worst new = 123,
900 letters → 225. (900 mixed-class → 720 with my mix, vs the plan's 601; the figure depends on the
unspecified mix string, both are ≫200 — noted below, not a defect.)

**The `300 → 200` move is strictly a tightening — proved, not assumed.** For any payload,
`estimateTokens` charges ≥1 per whitespace-separated run, so `estimateTokens ≈ words` for runs of
≤4 letters and ≥ words otherwise. Hence `estimateTokens < 200 ⟹ words < 200 ⟹ round(words*1.3) <
260 < 300`: nothing that passes the new bound could have failed the old one. No payload can slip
from red to green. `payload.length < 1200` is retained (`PLAN.md:252`).

**Does any item weaken an existing check? No — every touched gate checks strictly more.**
- `tests/constitution_skills.test.js`: `deepStrictEqual` on the full slice ⊃ `payload.includes(filterKey)`
  (the snippet is a substring of the golden in all six cases); heading+fence+frontmatter matching ⊃
  whole-file `toLowerCase().includes()`; two-way set equality ⊃ the one-way "each file is registered"
  loop at `:318-320`, and subsumes `assert.equal(registered.adr, fullPath)` (`:320`) and
  `files.length > 0` (`:304`); the vocabulary + `GOLDEN_DECISIONS` are additive to the retained
  two-sided status compare. `ENV_PATH` (`:8`) is removed but it was a pin, not a check, and Item 2
  adds two new assertions in its place.
- `ai-docs/**`: untouched by every item. Confirmed against the plan's own out-of-scope statement.
- Section-string coverage per skill is a superset of the shipped list in all five cases: `Navigation`
  ⊂ `Navigation & Inspection Recipes`, `CLI` ⊂ `CLI MAINTENANCE SUBCOMMANDS`, `.pcp` ⊂ `.pcp/`.

**Item 5's heading inventory — every cited line correct** (`grep -n '^#'` per file):
`constitution-query` `:10,:19,:28`; `code-intelligence` `:10,:22,:30`; `adr-manager`
`:10,:24,:72,:116`; `pcp` `:10,:42,:88` (all three carry `N.` ordinals, which `hasHeading`'s
ordinal-stripping handles); `steps` `:13,:56`. The fenced-template hazard is real as described:
`.agents/skills/adr-manager/SKILL.md:28` opens a ```` ```markdown ```` fence and `:37` is `## Context`
inside it. Same class exists in `plugins/pcp/skills/pcp/SKILL.md:30-38` (`# Project Agent
Instructions` `:31`, `## Project Conventions` `:35`) — not asserted, but the fence tracker must
survive it.

**Item 7's non-recursion premise:** `ai-docs/decisions/` contains exactly `ADR-0001-unified-esm.md`,
no subdirectories.

**`tests/pcp_skill.test.js` isolation (`PLAN.md:659-663`) — confirmed, with one correction.**
`grep -c 'ai-docs'` → `0`; `grep -c '\.agents/skills'` → `1`, at `:424`, inside a comment. It uses
`promisify(exec)` (a shell), not `execSync`, and resolves `node` via PATH — which is why
`path-stripped` leaves it green (measured). `ls -a tests/` → the two test files only; porcelain
unchanged after two `npm test` runs.

**The plan's three disputed citations — all three corrections are right.**
`.plans/archive/…/PHASES.md:6` carries `(< 300 tokens)`; `:5` is the Phase 1 heading.
`CLI Commands` occurs exactly once repo-wide outside `.plans/`, at
`.agents/skills/code-intelligence/SKILL.md:25`, and the archived plan assigned it to `pcp`
(`…/phase-4/PLAN.md:59`) where it has zero. `.agents/skills/adr-manager/SKILL.md:94-95` are the two
edit instructions; `:93` introduces them.

**Item 5's core claim about `Separation of duties`** — verified: the only occurrence in
`plugins/steps/skills/steps/SKILL.md` is `:3`, inside `description:`. `roles` occurs at `:13`
(heading), `:99` and `:103` — so `content.toLowerCase().includes('roles')` (`:257`) indeed cannot
fail when `:13` is renamed. Both of the shipped test's blindnesses for `steps` are exactly as
described.

**Is Item 5 "fixing the artifact to fit the gate"?** Split verdict, and the plan should say so:
- `## Separation of duties` — **legitimate.** The rule is the file's own declared central rule, in
  prose at `:10-11`, currently reachable by the gate only through frontmatter. Putting a heading
  over existing prose is documentation, and it is what makes the restored assertion honest.
- `### Review lenses` — **gate-fitting**, and structurally damaging. See blocker 3. It has no
  section to head; the plan must invent structure inside a numbered list to create one. Retiring it
  is the internally consistent choice, and it costs one table row.

**Can each item fail before the next starts?** Yes, once blockers 1, 2, 4 and 6 are fixed. Item 2 →
`--only path-stripped` goes red only when `resolveTool` throws; Item 3 → `--only payload-bloat` only
when the new estimator binds; Item 4 → `--only rule-inverted` only when a golden mismatches
(currently unpinnable, blocker 4); Item 5 → `--only heading-renamed` plus a `grep` for two real
headings; Item 6 → both ADR mutations (currently unreachable, blocker 1); Item 7 → the sweep. No
item is misordered, and `3` before `4` is correctly justified: `assert` throws at the first failure,
so a combined subtest would let `payload-bloat` go red on content with the token bound never
evaluated.

**Attacks on the six defences (the brief's question 3).**
- *Pass while mutating nothing* — excluded. A no-op harness reports `SURVIVED`, and Items 2-6 each
  demand `exit=0` from a `--only` run. The post-write-bytes-differ and anchor-exactly-once
  assertions close the drifted-anchor variant. `path-stripped` is the exception (no file write, so
  neither assertion applies), but its two preconditions plus the `BLOCKED` outcome cover it, and I
  confirmed both preconditions hold on this machine.
- *Pass while mutating something irrelevant* — mostly excluded, but blocker 4 is exactly this hole:
  with a generic `deepStrictEqual` signature, a mutation that broke an unrelated slice would satisfy
  `rule-inverted`'s gate. Amendments 2 and 3 close the two adjacent variants.
- *Pass while the restore silently fails* — excluded for edits (sha256 per file + porcelain
  equality). **Not excluded for creates**: see amendment 6, the empty `auth/` directory is invisible
  to both checks. And the byte snapshot does not "cover" the create case at all — the create case is
  covered by an unlink whose success only `existsSync` can confirm, which the plan does not specify.
- *Crash between write and restore* — **not covered**; blocker 5.

---

## Unverified

- **The harness itself** does not exist, so every claim about its behaviour is a claim about a
  specification. I verified its *inputs* (anchors, preconditions, signatures, survivor set) and its
  *gate arithmetic*, not its code.
- **Post-repair redness.** I could not confirm that any mutation goes RED after its repair, because
  the repairs are unwritten and I may not modify the suite. The predicted signatures are checkable
  only against Items 2-6 as delivered.
- **`estimateTokens` against a real tokenizer.** No tokenizer in the tree, no `npm install`
  available. The plan is honest about this at `PLAN.md:581-587`; I add only that I reproduced its
  scanner and its numbers, which makes the metric self-consistent, not validated. The plan's
  "900 whitespace-free mixed-class chars -> 601" is not reproducible as stated — the mix string is
  unspecified and mine scored 720. Both are ≫200; the figure should either name the string or be
  dropped.
- **`path-stripped` on a machine where `npm` is not beside `node`.** Same limitation the plan
  declares (`PLAN.md:593-598`). True here, untested elsewhere.
- **Whether `--dirty-ok` (D1) is safe as *implemented*** — I could only attack the sketch at
  `PLAN.md:611-614`, which is three clauses of prose.

---

## Non-blocking

1. The mutation table's line numbers (`PLAN.md:104-111`) go stale the moment Item 5 inserts headings
   above `## Roles` (`:13` → `:15`); harmless since the harness keys on anchors, worth a note in the
   table so a later reader does not "fix" them.
2. `PLAN.md:59` writes "900 whitespace-free letters -> 225" — correct, and the only one of the three
   synthetic figures that is reproducible without the source string.
3. Item 6's set equality compares repo-root-relative walk output against `decisions[].adr`; both are
   cwd-relative, which is consistent today and is explicitly Phase 3's problem (`PLAN.md:664-667`).
4. `PLAN.md:410` justifies the hand-written walk by Node 18 compatibility while `package.json`
   declares no `engines` — fine, but adding `"engines"` would make the constraint checkable rather
   than aspirational.
5. `PLAN.md:481` estimates 56 tests and says the implementer records the measured value; good, and
   the estimate should not be carried into `GATE-OUTPUT.md`.
