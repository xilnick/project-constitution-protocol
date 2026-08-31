# IMPL-REVIEW — reuse, simplification, efficiency, dead state

Lens: reuse / simplification / efficiency / dead state. Read-only pass. Correctness and
plan-conformance are owned by the other two reviewers and are deliberately not covered here.

## Summary

The new code is in good shape for its age: the libraries are small, the golden fixtures are
honestly literal, and the harness's mechanics are clearly separated from its data table. The
findings below are almost entirely *subtraction* — two unreachable branches, a scatter of fields
and exports that nothing reads, and one 157-line driver that does four separable jobs. Nothing
here requires new abstraction. Two duplications that look like findings are not: the harness's
`CASES`/`SKILL_PATHS`/`CONSTITUTION` string constants restate values that also live in
`tests/fixtures/expected.mjs`, and `resolveTool` exists in both `tests/mutation-harness.mjs` and
`tests/lib/tools.mjs`. In both cases the duplicated site is the *instrument* and the other site is
*under measurement*; deriving the instrument's expectations from the artifact it measures is the
exact failure mode this rebuild exists to prevent, and drift fails loudly (`mustFail leaves did not
fail`) rather than silently. Leave both. On efficiency: measured, there is nothing worth changing —
see the Efficiency note below the findings.

## Findings

### 1. `tests/mutation-harness.mjs:438-594` — `main()` is 157 lines doing four separable jobs

**What.** `main()` parses argv (438-451), does tool/guard/clean-tree preflight (453-480), runs the
per-mutation apply→measure→judge→restore loop (482-574), and then does post-sweep verification and
reporting (576-593). The per-mutation body alone is 92 lines with a `try`/`catch`/`finally`, a
nested `throw new BlockedSignal()` used as control flow, and result-printing interleaved with
result-computation.

**Why it is worth changing.** This is the instrument that certifies everything else. The judging
logic at 532-549 — the part a reader must trust most — is buried 50 lines inside a function whose
first job was argv parsing. Extraction makes the judging rules readable as a unit without changing
one of them.

**Edit.** Pure extraction, no logic moved across a boundary:
- `function parseArgs(argv)` → `{ only, fullSweep, selected }`, retaining the two `process.exit(2)`
  paths verbatim.
- `function runMutation(m, ctx, guard, npmPath, fullSweep)` → the `try`/`catch`/`finally` body at
  488-566, returning `result`. The `finish(1)` on restore failure stays inside it (it already
  reaches `report`/`finish` through closure; pass them or keep this one as a nested function).
- `function printResult(m, result, label)` → 568-573.

`main()` then reads as: parse → preflight → loop → verify → report.

**Risk:** low. Mechanical; no assertion, threshold, or output string changes.

---

### 2. `tests/lib/markdown-sections.mjs` — five pieces of exported/attached surface nothing reads

**What.** Verified zero callers across all of `tests/`, `plugins/`, `.agents/`:
- `bodyOf` (`:95`) — exported, never imported.
- `doc.bodyOf` (`:69`) — attached to every parsed doc, never invoked.
- `heading.line` (`:56`) — never read. It is the sole consumer of `bodyOffsetLines`, which is the
  only non-trivial arithmetic in the parser (`:22`, `:28`).
- `doc.body` (`:63`) — read internally at `:32` before the object is built; the *field* is never
  read by a caller.
- `export` on `normalizeHeading` (`:11`) — used internally by `matchesSpec`; never imported.

The suite reads exactly `doc.frontmatter`, `doc.fenceStripped`, and `doc.headings[].level/.text`.

**Why it is worth changing.** ~15 lines, and it removes the one place in the parser where a reader
has to check off-by-one arithmetic (`text.slice(0, close + 5).split('\n').length - 1`) that no
assertion depends on. Smaller instrument, same guarantees.

**Edit.** Delete `bodyOf` and the `doc.bodyOf` line; delete `line: bodyOffsetLines + i + 1` from the
heading record and the `bodyOffsetLines` declaration and assignment; drop `body` from the returned
object (keep the local `body` variable); drop `export` from `normalizeHeading`. Keep `bodyLines`
(read by `bodyLinesAfter`) and `index` (read by `bodyLinesAfter`).

**Risk:** none for `bodyOf`/`doc.bodyOf`/`doc.body`/the `export` keyword. Low for `heading.line`
only in the sense that it is a plausible future diagnostic — if the plan wants a line number in a
future error message, keep `line` and drop the rest.

---

### 3. `tests/mutation-harness.mjs:389` and `:549` — two unreachable branches

**What.**
- `:389` `if (wrapped.length >= 1200) throw ...'payload reaches the character bound'` — line 386
  already threw unless `wrapped.length === 980`, and `980 >= 1200` is false. The branch cannot fire.
- `:549` `if (m.hermeticPath && result.measured === 'BLOCKED') result.conformant = false;` —
  `measured` is set to `'BLOCKED'` only at `:507`, which is immediately followed by
  `throw new BlockedSignal()` at `:511`. Control never reaches `:549` with `measured === 'BLOCKED'`;
  and `:509` already set `conformant = false` on that path.

**Why it is worth changing.** In a gate that was rebuilt because the previous one could not fail, a
condition that can never evaluate true reads as a live check to the next person auditing it. Both
are two-line deletions.

**Edit.** Delete `:389-391` and delete `:549`.

**Risk:** `:549` — none (provably unreachable, and its effect is already established at `:509`).
`:389` — medium *procedurally*, not technically: `payloadBloatPrecondition` sits next to the frozen
mutation table, so if the plan authored the character-bound assertion as a declared invariant it
should be escalated rather than deleted. Technically the deletion is behaviour-preserving.

---

### 4. Dead state — fields written and never read

**What.** Verified zero reads:
- `tests/mutation-harness.mjs:369,377-379,515,529` — `parseFailures` collects `rollups` into an
  array and the driver stores it as `result.rollups`; nothing ever reads it. Note the *distinction*
  between roll-up and leaf lines is load-bearing (the comment at `:365-366` is correct and should
  stay) — it is only the collected array that is dead.
- `tests/mutation-harness.mjs:530` — `result.pcpFailures`; the judging at `:539` uses the local
  `pcpFailures`, not the field.
- `tests/mutation-harness.mjs:487` — `notes` is stored on `result` but printed from the local at
  `:571`.
- `tests/lib/repo-guard.mjs:126,128,160,192` — `rec.written` is initialised, set `true` in `write()`
  and reset in `restoreAll()`, and never read.
- `tests/lib/repo-guard.mjs:215` — `report.porcelainChecked`; the harness reads only `.tolerated`
  and `.residue`.
- `tests/lib/repo-guard.mjs:268` — the `baselinePorcelain: () => [...baselinePorcelain]` accessor,
  and `repoRoot`/`journalPath` at `:260-261`, have no callers.

**Why it is worth changing.** Each one invites a reader to ask what consumes it. In the guard,
`rec.written` is the most misleading: it looks like restore bookkeeping, but `restoreAll` decides
what to restore by comparing sha256, not by reading it — so a reader may believe there is a
tracking mechanism that does not exist.

**Edit.** Drop `rollups` from `parseFailures`'s return and the `rollups` accumulation loop-arm;
delete `result.rollups`, `result.pcpFailures`, and `notes` from the `result` literal; delete
`rec.written` from both record constructors and both assignments; drop `porcelainChecked` from the
report literal; drop the three unread keys from the guard's returned object.

**Risk:** none for the harness items and `rec.written`. Low for the guard's returned keys —
`journalPath`/`repoRoot` are cheap, conventional handle fields and a case can be made for keeping
them as API; `baselinePorcelain()` has no such case.

*Lowest-confidence item, listed for completeness:* `restoreAll`'s `{restored, removedFiles,
removedDirs}` report (`:182`, `:211`) is built and returned but never read by any caller. I would
**keep** it — it is the natural diagnostic for the FATAL restore path — but flag it so nobody
reports it as a live consumer.

---

### 5. `tests/constitution_skills.test.js:247-258` and `:313-320` — two hand-rolled walkers differing only in the filename predicate

**What.** `discoverSkillFiles` and `walkAdrFiles` are the same depth-first, per-directory
name-sorted walk. They differ in (a) the match — `entry.name === 'SKILL.md'` vs
`entry.name.endsWith('.md')` — and (b) `discoverSkillFiles` tolerates a missing root. Both are
declared inside their respective `test()` callbacks, so neither can see the other.

**Why it is worth changing.** Reuse within one file, ~8 lines saved, and it puts the
missing-root tolerance at the call site where it is a visible decision rather than buried in one of
two near-identical bodies. (`tests/lib/repo-guard.mjs:47` `listRecursive` is a *third* walker but
returns a different shape — directories with a trailing `/` — and should be left alone.)

**Edit.** One module-scope helper in the test file (no new file needed — `tests/lib/` would be a
rung too far for two callers in one module):

```js
function walkFiles(dir, match) {
  const found = [];
  for (const e of fsSync.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const child = path.join(dir, e.name);
    if (e.isDirectory()) found.push(...walkFiles(child, match));
    else if (match(e.name)) found.push(child);
  }
  return found;
}
```

Call sites: `const discoverSkillFiles = (root) => fsSync.existsSync(root) ? walkFiles(root, (n) => n === 'SKILL.md') : [];`
and `walkFiles(DECISIONS_DIR, (n) => n.endsWith('.md'))`. The `readdir({recursive:true})` comment at
`:310-311` explains why the walk is hand-rolled at all and should move onto `walkFiles`.

**Risk:** low. Identical traversal order and identical results; the missing-root guard is preserved
exactly at the one call site that had it, and the ADR walk keeps throwing on a missing
`ai-docs/decisions`.

---

### 6. `tests/mutation-harness.mjs:392-395,476-480,484` — the `token-estimate.mjs`-may-not-exist path is dead in the shipped tree

**What.** The harness dynamic-imports `tests/lib/token-estimate.mjs` behind an `existsSync` check,
threads the result through `ctx.estimateTokens`, and `payloadBloatPrecondition` has a
`ctx.notes.push('token precondition deferred: ... does not exist yet')` early return. The file now
exists and is part of this change set, so the deferral never fires.

**Why it is worth changing.** It is ~10 lines and one whole conditional-capability concept
(`estimateTokens` may be `null`) that the reader must carry through the driver, `ctx`, and the
precondition, to serve a tree state that no longer occurs. There is no instrument-independence
argument here: the precondition already asserts the *suite's* estimator returns 677, so the harness
is already coupled to that module semantically.

**Edit.** Replace with a static `import { estimateTokens } from './lib/token-estimate.mjs';` at the
top, delete the `let estimateTokens = null` / `existsSync` / dynamic-import block, drop
`estimateTokens` from `ctx`, delete the `estPath` deferral block in the precondition, and call
`estimateTokens(wrapped)` directly.

**Risk:** medium. Behaviour-identical for any tree containing `tests/lib/token-estimate.mjs`; it
differs only for a tree without it, where the harness would fail at module load instead of emitting
a note. That scenario cannot occur post-merge, but the deferral was plausibly authored by the plan
as a phase-ordering affordance — worth one line of sign-off before deleting.

---

### 7. `tests/mutation-harness.mjs:429-432,541,543` — `setDiff` has one caller and its complement is written inline

**What.** `setDiff(a, b)` is used exactly once, at `:541`, for the `mustFail` check. Two lines
later the mirror-image check for `mustPass` is written inline as
`m.mustPass.filter((n) => failing.includes(n))`. The two adjacent checks are expressed in two
different styles, and the helper name says less than the expression it wraps.

**Why it is worth changing.** The `mustFail`/`mustPass` pair is the heart of the judging logic;
having them read symmetrically matters more than the helper.

**Edit.** Delete `setDiff` and write `:541` as
`const missing = m.mustFail.filter((n) => !failing.includes(n));`.

**Risk:** none. Both lists are single-digit length; the `Set` was never a measurable win, and the
result is identical.

---

### 8. `tests/mutation-harness.mjs:317-328` vs `tests/lib/tools.mjs:9-24` — `resolveTool` exists twice; keep both, but say why

**What.** The two bodies are behaviourally identical (PATH split → `statSync().isFile()` →
`accessSync(X_OK)`) and differ only in the failure mode: the harness returns `null`, the library
throws.

**Why it is *not* a dedup.** `tests/lib/tools.mjs` is code under measurement — the suite's
`tool resolution follows the inherited PATH` subtest exercises it, and the `path-stripped` mutation
depends on its exact error string. An instrument that resolved its own `npm` through the module it
is measuring would go blind in exactly the mutation that matters. This is the same provenance rule
`tests/fixtures/expected.mjs:3-6` states for the goldens. `repo-guard.mjs` is a legitimate import
because nothing in the suite imports it.

**Edit.** Leave the duplication. Add one intent line above `:317` so the next reader does not
"fix" it, e.g. `// A private copy: the suite's resolveTool is under measurement, and the instrument
must not resolve npm through the module the path-stripped mutation blinds.` This is the only
change I would make here.

**Risk:** none (comment only).

---

### 9. Banner comments — `tests/mutation-harness.mjs:14,53,307,436`, `tests/lib/repo-guard.mjs:272`

**What.** Five rule-line section banners (`// ------------ leaf name sets`, `// ---- the frozen
table`, `// ---- mechanics`, `// ---- driver`, `// ---- self-test`).

**Why it is worth changing.** The project's comment standard bans banners explicitly. Note the
honest counter-argument: `mutation-harness.mjs` is 608 lines and genuinely bimodal (frozen data
table, then mechanics), which is the one case where a banner earns something. If finding 1 is taken
and `main()` is split, the function names do the navigating and the banners lose their last excuse.

**Edit.** Delete the five banner lines. `// ---- self-test` in `repo-guard.mjs` is the weakest of
the five to keep, since `if (process.argv[1] && ...)` at `:369` already marks the boundary.

**Risk:** none.

---

### 10. `tests/constitution_skills.test.js:81,93,104,114` — four comments that paraphrase the assertions beneath them

**What.** `// Decisions: id matches ^d-, requires title, status, cluster, date, summary, adr` and
its three siblings each restate, in prose, the exact list of `assert` calls that follow. They carry
over unchanged from `HEAD` but the file is rewritten, so they are in scope for the same pass.

**Why it is worth changing.** They are the standard's textbook case: a refactor preserving purpose
would force each to change, so they describe mechanics. They also decay — the comment is now the
second place the required-field list is written, and nothing checks the two agree.

**Edit.** Delete all four. The `for (const d of parsed.decisions)` loop and its assertion messages
already say everything the comment says.

**Risk:** none.

---

## Efficiency — measured, nothing worth changing

I measured rather than guessed, since the brief flags the ~90s sweep:

- `npm test` (both files): **2.73s** wall. `node --test tests/constitution_skills.test.js` alone:
  **0.41s**. The remaining ~2.3s is `tests/pcp_skill.test.js`, which is out of scope and unchanged.
- A `yq` spawn on this machine costs **~10ms**. The suite spawns `yq` roughly 30 times per run
  (7 `parseYaml` calls, 18 in the query-case loop, 2 golden-document comparisons) — about 300ms.
- The full sweep is 16 mutations + 2 clean runs = 18 `npm test` invocations ≈ **49s** of the total,
  and it is dominated by the out-of-scope PCP suite plus `npm`'s own startup.

The obvious candidate — memoising `parseYaml` per file path — is safe (the artifact does not change
mid-run; under `path-stripped` every call throws so no stale value could be cached) but would
recover at most ~60ms per run, ~1s across the sweep. That is below the noise floor. **Do not do
it.** Note for whoever is tempted later: memoising *tool resolution* rather than parse results
would be actively wrong, and `tests/lib/tools.mjs:7-8` already says so correctly.

Per-mutation work outside `npm test` is already minimal: the guard is constructed once,
`listRecursive` and the porcelain baseline are read once, the journal write is a few KB, and no
mutation re-reads anything it does not mutate. I found nothing that re-reads or re-spawns
needlessly per mutation.

## Clean

- `tests/lib/token-estimate.mjs` — 29 lines, one job, no dead state, comment carries the *why*
  (the word-count estimator it replaces). Nothing to change.
- `tests/fixtures/expected.mjs` — literal by construction and correctly so; the provenance comment
  at `:3-6` is the highest-value comment in the change set. Its overlap with the harness's string
  constants is deliberate (see Summary). Nothing to change.
- `tests/lib/tools.mjs` — 32 lines, three functions, both comments carry *why*. Nothing to change
  beyond the comment proposed in finding 8, which lands in the harness, not here.
- `package.json` — two scripts, correct. Nothing to change.
- `tests/lib/repo-guard.mjs` outside findings 4 and 9 — the snapshot/journal/restore split is tight,
  the signal handling is correct in shape, and `prefixMatch` (`:31-37`) and the empty-directory
  note (`:231-232`) are exactly the kind of comment the standard asks for.

## Risks / unverified

- **Not verified:** whether `.plans/phase-1/PLAN.md` explicitly specifies `payloadBloatPrecondition`'s
  character-bound assertion (finding 3), the `token-estimate.mjs` deferral (finding 6), or the
  harness's `resolveTool` copy (finding 8). I read only the files in scope. All three are flagged as
  needing plan-owner sign-off rather than being applied unilaterally.
- **Not verified:** that no consumer outside `tests/`, `plugins/`, and `.agents/` imports
  `tests/lib/markdown-sections.mjs` (finding 2). I searched those three trees; a `.plans/` document
  or external tooling referencing `bodyOf` would not have been found.
- **Not run:** I did not execute `npm run test:mutation` (it mutates the working tree and this was a
  read-only pass), so the ~49s sweep figure is 18 × the measured single-run cost, not an end-to-end
  measurement. Guard, journal, and restore overhead are excluded from it.
- **Unmeasured:** the claim in finding 1 that extraction is purely mechanical assumes `finish`,
  `report`, and `guard` are threaded rather than duplicated. I sketched the split but did not write
  it, so the exact parameter list may need one more argument than listed.
- I did not evaluate whether any of these edits interact with findings from the correctness or
  conformance reviewers; if `main()` is restructured by another finding, apply finding 1 last.
