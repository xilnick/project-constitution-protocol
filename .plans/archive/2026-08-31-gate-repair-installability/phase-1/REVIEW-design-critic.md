# Phase 1 Plan Review — lens: critic ("what would a conformant-but-wrong implementation still pass?")

Reviewed: `.plans/phase-1/PLAN.md` @ branch `steps/harness-portability`, HEAD `886443e`.
Files opened to verify claims: `tests/constitution_skills.test.js`, `package.json`,
`ai-docs/constitution.yaml`, `ai-docs/decisions/ADR-0001-unified-esm.md`,
`.agents/skills/{constitution-query,code-intelligence,adr-manager}/SKILL.md`,
`plugins/{pcp,steps}/skills/*/SKILL.md`, `.plans/archive/*/PHASES.md`,
`.plans/archive/*/phase-4/PLAN.md`, plus live checks of `PATH`, `process.execPath` and symlink
targets.

## Verdict

**approve-with-amendments.** The architecture is right — instrument before repair, per-item gate,
survivor set captured as evidence — and the plan's reasoning is materially better than the
iteration it is repairing. But the acceptance criterion as written is **one-sided**: it verifies
that the suite goes red, and that it goes red with the right *message*, and never that it goes red
only for the *right input*. Under that criterion a suite consisting of two pinned file hashes
passes five of eight mutations. Amendment A1 is not negotiable; A2–A8 are concrete and cheap.

---

## 1. Conformant-but-wrong: the repaired suite, item by item

### 1.1 Item 3 — token estimator (Defect 1)

The algorithm is specified tightly enough that there is little freedom in `estimateTokens` itself.
The freedom is elsewhere: **nothing in the plan asserts anything about `estimateTokens` directly.**
Its only exercise is `payload-bloat`, which tests the *bound*, not the estimator's defining
property (non-invariance under whitespace removal). Cheapest wrong-but-passing edit: implement the
scanner per spec today, and a later "simplification" back to a word count still passes every gate
in this phase, because `payload-bloat`'s 800-char mixed-class string also blows the char bound
message ordering if the assertion order is ever flipped. The plan's own measured numbers
(900 letters → 225; 900 mixed-class → 601) are the missing unit test.

Second freedom: the plan orders `estimateTokens < 200` **before** `payload.length < 1200`, which is
correct and load-bearing, but the ordering is stated in prose only. Reversed, `payload-bloat` still
goes red — on the char bound — and `/token budget/` never appears. The `< 1200` harness precondition
catches this *only* because 967 < 1200; a mutation string of 1100 chars would defeat it.

### 1.2 Item 4 — golden retrieval content (Defect 4)

Cheapest wrong implementation that satisfies the literal wording ("a `GOLDEN` constant declared
inline in the test file"):

```js
const GOLDEN = {
  'Architectural decision slice (d-8f3a)': yqJson('.decisions[] | select(.id == "d-8f3a")',
                                                  'ai-docs/constitution.yaml'),
  // …
};
```

Declared inline ✓, one object per case ✓, `deepStrictEqual` ✓ — and `rule-inverted` survives,
because both sides move together. This is the *identical* defect class to the ADR two-sided
comparison the phase exists to kill, reintroduced at the retrieval layer. The plan quotes the
literal rule text, which suggests the intent, but nothing states the constraint.

Second, worse freedom: **`rule-inverted` has no specified signature.** The mutation table says
"the golden-content assertion for the `sec-auth-01` slice". `assert.deepStrictEqual` with no message
emits `Expected values to be strictly deep-equal:` — which matches *any* `deepStrictEqual` failure
anywhere in the suite, including Item 6's `GOLDEN_DECISIONS`. So the natural implementation of
`expectSignature` for `rule-inverted` is a regex that proves nothing about which property broke.
Same hole for `adr-nested-rogue` ("unregistered ADR / set-equality failure" — no literal given).

### 1.3 Item 5 — heading-anchored sections (Defects 2, 3)

Three independent wrong-but-passing implementations:

1. **`requiredLiterals` is entirely ungated.** No mutation touches it. An implementer can implement
   it as the *existing* `content.toLowerCase().includes(section)` — frontmatter included — and every
   gate in the phase stays green. This matters specifically because `requiredLiterals` is where the
   two previously-narrowed strings land (`tokensave`, `.pcp/`). The audit's finding B3/#1 is that
   strings were narrowed to fit the artifacts; the plan's remedy relocates two of them into a field
   with zero gate coverage and a one-line comment as its only discipline.
2. **Fence-awareness is asserted in prose and by nothing else.** Verified: the naive
   `line.startsWith('```')` tracker and a CommonMark-correct one give *identical* answers on all
   five files today — `.agents/skills/adr-manager/SKILL.md` has 3-space-indented fence markers at
   `:81` and `:90` which a naive tracker misses in a matched pair, so the toggle stays balanced by
   luck and `## Operational Guardrails` (`:116`) is still correctly outside. `heading-renamed`
   mutates `plugins/steps/skills/steps/SKILL.md`, which has exactly two unindented, balanced fences
   (`:205`, `:220`) and no headings inside them. So no mutation can distinguish the two parsers, and
   the plan says so itself ("`heading-renamed` alone would not catch that") without adding a
   mutation. The hole it names is real — `.agents/skills/adr-manager/SKILL.md:37,40,45,50,53,55,58`
   are inside the fence at `:28-60`, and `plugins/pcp/skills/pcp/SKILL.md:31,35` are inside the
   fence at `:30-38` (both verified) — and it stays ungated.
3. **Sixteen of seventeen asserted headings are ungated.** `heading-renamed` mutates one heading in
   one file. `hasHeading` correct for `steps` and quietly wrong (or absent) for the other four
   skills passes the phase.

### 1.4 Item 6 — ADR sync (Defect 5)

The plan names the right wrong-implementation (compare ADR status against the *skill doc* instead of
a test-local constant) and forecloses it. Two it misses:

1. **`GOLDEN_DECISIONS` derived from the artifacts** — same attack as 1.2, and here it is more
   attractive because there is exactly one fixture ADR, so `GOLDEN_DECISIONS = decisions[0]` reads
   as reasonable maintenance hygiene and makes `adr-status-bogus` survive completely.
2. **Item 6 is one monolithic subtest.** `assert` throws at the first failure. Item 3's order
   justification identifies exactly this masking and fixes it by splitting a subtest — and then
   Item 6 stacks vocabulary, set-equality, duplicate-shortcode, metadata and golden checks in a
   single body. Under `adr-status-bogus` the declared signature is
   `status not in declared vocabulary`; if the `GOLDEN_DECISIONS` subset check happens to execute
   first, the run dies on a `deepStrictEqual` diff and that literal never appears. The gate then
   reports `RED (signature MISMATCH)` — and the obvious "fix" is to loosen the regex.

### 1.5 Item 2 — PATH inheritance (Defect 6)

Two verified executability defects, not just blindness:

- **"an executable regular file" is wrong on this machine.** `/opt/homebrew/bin/yq` →
  `../Cellar/yq/4.53.2/bin/yq`; `~/.local/bin/{node,npm}` → `~/.hermes/node/bin/*`. All three PATH
  entries are symlinks. `lstatSync().isFile()` returns false for every one. An implementer reading
  "regular file" and reaching for `lstat` produces a `resolveTool` that cannot find `yq` at all.
- **Memoisation contradicts the item's own new subtest.** `resolveTool` is specified as memoised,
  and the new subtest sets `process.env.PATH` to a temp dir and asserts `resolveTool('yq')` returns
  the *temp* path. Whichever runs first wins: if any earlier `parseYaml` primed the cache the
  assertion fails; if the subtest primes it, every later `yq` call resolves into a deleted temp dir.
  As written the item cannot go green.

Blindness proper: nothing asserts that `yqJson`/`yqRaw` pass no `env` at all. An implementation that
keeps `env: {...process.env, PATH: resolvedPathString}` satisfies "inherited, never overridden" in
spirit and reintroduces a pinned PATH in a new place. `path-stripped` would still catch it only if
the pinned string is derived at call time rather than at module load.

---

## 2. Conformant-but-wrong: the mutation harness itself

**The harness that passes its own acceptance criterion while proving nothing is not a stub — it is
an honest harness pointed at an over-strict suite.** Item 7's gate is: eight mutations RED with
matched signatures, clean `npm test` green before and after, porcelain unchanged. Add this to
`tests/constitution_skills.test.js`:

```js
await t.test('pinned fixtures', () => {
  assert.equal(sha256(read('ai-docs/constitution.yaml')), PIN_A,
    'token budget / golden mismatch / status not in declared vocabulary');
  assert.equal(sha256(read('plugins/steps/skills/steps/SKILL.md')), PIN_B, 'required heading');
});
```

Outcome: `rule-inverted`, `adr-status-bogus`, `payload-bloat`, `heading-renamed`,
`canary-missing-key`, `canary-bad-yaml` all RED, every signature matched, one failing subtest each
(any `maxFailingTests ≥ 1` satisfied), clean tree green, porcelain clean. Six of eight, from two
lines, with the token estimator, the golden slices, the heading parser and the ADR vocabulary all
absent. Add a `readdirSync` hash over `ai-docs/decisions/` and `adr-nested-rogue` falls too. Only
`path-stripped` resists, because Item 2 does real work that a hash cannot fake.

Now attacking the plan's stated defences one at a time:

| defence | holds? | why |
|---|---|---|
| two canary controls RED today with exact signatures | **holds, partially** | Excludes "always exits 1" and proves the mutate→run→detect mechanism against an assertion (`:28`) written in a previous iteration by a different agent. Says nothing about the six target signatures. |
| per-mutation `expectSignature` | **decoration as specified** | Two of eight signatures have no literal (`rule-inverted`, `adr-nested-rogue`); one contradicts itself across the plan (see 3.6); the implementer authors both the assertion message and the regex in the same phase. A signature is only evidence if the string is plan-owned and tied to a *specific* assertion. |
| `maxFailingTests` | **decoration** | No values declared anywhere. Worse, it is arithmetically wrong at 1: once Item 4's golden pins `summary`, `payload-bloat` necessarily fails *two* subtests (`retrieves d-8f3a` on golden **and** `bounds the d-8f3a payload` on token budget); once it pins `status`, `adr-status-bogus` fails that plus Item 6's vocabulary plus `GOLDEN_DECISIONS` — three or four. The per-item `--only` gates in Items 3 and 6 would fail against a tight cap and be satisfied by a vacuous one. |
| anchor-occurs-exactly-once | **holds** | Verified `## Roles` occurs once in `steps/SKILL.md` (`:13`; `:99`/`:103` are prose "roles"). Cheap, mechanical, un-fakeable. |
| post-write-bytes-differ | **holds** | Same character: mechanical, no judgment. |
| `BLOCKED` for `path-stripped` | **holds, at a cost** | Honest, but it makes the phase's acceptance criterion unreachable on any machine with `yq` in `/usr/bin`, with no recorded escape. See A6. |
| in-memory byte snapshot + sha256 restore + porcelain equality | **holds** | The strongest thing in the plan. No `git stash`/`checkout`/`reset`/`clean`, writes only to self-snapshotted paths, `finally`-scoped restore, hash-verified. This is genuinely un-fakeable and cannot lose work. |
| the `< 1200` char precondition on `payload-bloat` | **holds narrowly** | Correct for the specific 800-char string; not a general property. |

### Load-bearing defence

**The byte-snapshot / sha256 / porcelain-equality restore is the one defence that actually holds** —
it is purely mechanical, has no judgment surface, and is what makes running the harness safe at all.
Anchor-once and bytes-differ are the same species and also hold.

But the defence that would make the *grade* trustworthy does not exist. **Single point of failure:
every declared control is a positive control.** All eight mutations must be RED; none must be GREEN.
Consequently the harness cannot distinguish "the suite detects these six specific defect classes"
from "the suite rejects any change to these files." That single absence makes `expectSignature`,
`maxFailingTests`, the canaries and the `< 1200` precondition all vacuous simultaneously, because
one over-broad assertion carrying a multi-literal message satisfies every one of them at once. This
is the same shape as the failure being repaired — a gate whose criterion its own artifact can
satisfy trivially — displaced exactly one level up, which is what this review was asked to look for.

---

## 3. The regress

**The canaries are a real stop, but not for the thing that needs stopping.**

They stop the regress for the harness *mechanism*: `canary-missing-key` expects
`Missing root key: deferred`, a string that exists in committed code at
`tests/constitution_skills.test.js:28`, authored in the previous iteration, which this phase's
implementer must not touch. A harness that cannot turn that red is broken, and no self-grading can
hide it. That is genuine external evidence and it is the correct place for the mechanism regress to
end — going further (a gate grading the canaries) buys nothing, because the canary's expected
signature is fixed by history, not by this phase.

They do **not** stop the regress for signature–property *correspondence*. That is authored fresh, by
one agent, on both sides at once. A grading regress cannot close it — a fourth gate would have the
same property. It has to be closed by something that is not another gate. Two things can do it, and
the plan has neither:

1. **A negative control.** A mutation whose declared expected outcome is `SURVIVED`. It is not a
   gate grading a gate; it is a *second, opposite* measurement, and it is what converts "the suite
   goes red" into "the suite goes red *iff* the property broke." One-sided controls can be satisfied
   by over-strictness; two-sided controls cannot be satisfied by either over- or under-strictness.
   This is where the regress legitimately stops, because specificity + sensitivity together pin the
   assertion to the property with no third measurement required.
2. **Ownership separation on the mutation table.** The signatures and mutation semantics are authored
   by the planner (a different agent, before the code exists) and frozen; the implementer may not
   edit them. That is separation of duties applied to the instrument, which is the protocol's own
   answer to self-grading and does not recurse.

Answer: the regress stops at **plan-owned mutation table + two-sided controls**. Canaries alone
relocate it.

---

## 4. Decisions

### D1 — clean-tree strictness / `--dirty-ok`

**Committed answer: neither the strict default nor a `--dirty-ok` flag. Make porcelain *equality*
the unconditional invariant, plus a hard refusal on dirty *targets*.**

The clean-tree refusal buys almost nothing here, precisely because of the plan's own best decision:
the harness never restores via git. Restoration is byte-snapshot + sha256. Given that, the property
that matters is "porcelain at exit == porcelain at entry", which is already asserted, and "no
mutation target is already modified", which is the plan's own sketched `--dirty-ok` condition. A
clean tree is neither necessary nor sufficient for either.

Cost of the strict default is real and verified: `git status --porcelain | wc -l` → **28** right now.
Seven per-item gate runs means seven commits of `.plans/` churn manufactured solely to run a test.
That is friction the phase does not need, and worse, it trains the habit of committing to unblock a
gate — which is the reflex this iteration exists to break.

Reject the *flag* form: `--dirty-ok` is an escape hatch, and an escape hatch on a gate will be passed
by habit and then by CI. Make the safe behaviour the only behaviour. Refuse (exit 2) if any of
`ai-docs/`, `tests/`, `package.json`, `plugins/steps/skills/steps/SKILL.md` appears in porcelain;
otherwise proceed and assert byte-identical porcelain at exit. No flag, no weakening, no commit tax.

### D2 — token bound 300 → 200, metric changed

**Approve.** Strictly tighter on all six measured payloads (worst is 123 under the new metric),
reachable (900 whitespace-free letters → 225, 900 mixed-class → 601, both under the 1200-char bound),
and the retirement of the archived `< 300` figure is disclosed. Verified the citation: archived
`PHASES.md:5` is the Phase 1 heading and `:6` carries `(< 300 tokens)` — the plan's correction is
right.

One condition: the new metric is only as good as the estimator, and the estimator has no direct
assertion. Pin the plan's own measured values as unit tests (A4). Without that, D2 tightens a number
while leaving the function that computes it ungated.

### D3 — section-string dispositions

**Approve the retirements, with one reclassification.** `code-intelligence`'s substitution of the
file's real heading names (`Tool Invocation Modes` `:22`, `Navigation & Inspection Recipes` `:30` —
both verified) for two strings with zero repo-wide occurrences is right, and asserting `tokensave`
as a labelled literal is honest about what it is. `pcp`'s retirement of `CLI Commands` and
`Runtime Directory (.pcp)` is right, and the reasoning is right: the content exists at
`plugins/pcp/skills/pcp/SKILL.md:24,27,64-67` under other headings (verified), so a new heading would
duplicate it. Reclassification: `Review lenses` belongs in this retired column too — see below.

Note a numeric slip: the archived plan specifies **16** strings, not 14
(`.plans/archive/*/phase-4/PLAN.md:56-60` — 3+3+3+3+4, verified), so the retirement is 4 of 16. The
"more, in every skill" conclusion is unaffected and correct.

### Item 5's two new headings — repairing the artifact to satisfy the gate, or legitimate scope?

**The case for legitimate:** the archived `phase-4/PLAN.md:60` specified `Review lenses` and
`Separation of duties` as `steps` sections *before* the artifact was written, by a different agent.
The artifact never grew them and the previous implementer loosened the gate instead — narrowing to a
substring that `plugins/steps/skills/steps/SKILL.md:3` (the frontmatter `description:`) satisfies.
Verified: `separation of duties` occurs exactly once in that file, on line 3, inside frontmatter, and
no such section exists. Here the *gate* is the senior document; making the artifact match it honours
the original intent rather than bending to a test.

**The case for inversion:** the plan's own stated direction is "the artifacts are not bent to fit the
gate," and D3 rejects this exact move for `pcp` in these words — "adding a heading purely to satisfy
a plan string would duplicate content — the artifact-follows-gate inversion this phase exists to
stop." The plan offers "no prose is invented" as the distinguishing criterion, but that does not
distinguish: for `pcp` the content also already exists. As written, the same fact pattern gets
opposite treatments in the same item.

**Committed answer: split them. `Separation of duties` is legitimate; `Review lenses` is the
inversion and must be dropped.**

The criterion that actually distinguishes them, and which I propose the reconciler adopt: *a heading
may be added only over an existing, contiguous, currently-unheaded block of prose whose subject is
exactly that heading.*

- `Separation of duties` **passes** it. `plugins/steps/skills/steps/SKILL.md:10-11` is precisely the
  separation-of-duties rule ("The central rule: **the agent that writes a thing never reviews it.**
  Everything else here follows from that…"), it sits unheaded between `# steps` (`:6`) and
  `## Roles` (`:13`), and heading it changes no meaning. But the plan's insertion point is wrong:
  "immediately after the intro at `:8-11`" places the heading *below* the rule, yielding an empty
  section — a heading added purely to satisfy the gate, i.e. the inversion, produced by accident.
  It must go **after `:9`, before `:10`**, so `:10-11` becomes its body.
- `Review lenses` **fails** it, and the plan's citation is wrong. It says the heading goes "inside
  `## The phase loop` (`:56`) above the lens list at `:64-74`." Verified: `:64-74` is **not** a lens
  list — it is numbered steps 2 through 6 of the phase loop (`2. Review the plan`, `3. Reconcile`,
  `4. Implement`, `5. Review the implementation`, `6. Run a code-review pass`). The only lens content
  is a sub-clause of step 2 at `:64-66`. Inserting `### Review lenses` above `:64` would (a) label
  steps 2–6 as "Review lenses", which is false, and (b) split the ordered list 0–9 in two, restarting
  numbering. There is no unheaded lens section to head; the section would be manufactured for the
  gate. Retire the string with a reason, exactly as `pcp`'s two are retired. That also restores D3's
  internal consistency — one criterion, applied uniformly, five dispositions.

Consequence, and a benefit: this reduces the live-skill edit to **one heading over existing text**,
which materially shrinks the hazard the brief flagged. `~/.claude/skills/steps` symlinks to this
directory, so the edit is live in the executing session immediately; a single heading inserted above
an existing paragraph cannot change the protocol's meaning, whereas mislabelling five phase-loop
steps and breaking their numbering could — while the orchestrator is reading them.

---

## 5. Amendments (for the reconciler)

1. **A1 (non-negotiable).** Add ≥2 `expect: SURVIVED` negative controls to the mutation table, and
   make the harness exit 1 if any goes RED: e.g. `benign-prose-reflow` (rewrap a sentence inside
   `ADR-0001-unified-esm.md`'s `## Context`) and `benign-heading-rename`
   (`plugins/steps/skills/steps/SKILL.md:30` `## Starting` → `## Getting started`, a heading no
   assertion names). Without a two-sided control the acceptance criterion is satisfiable by pinned
   file hashes and every other defence is vacuous.
2. **A2.** State the goldens' provenance rule: `GOLDEN`, `GOLDEN_DECISIONS` and `ADR_STATUSES` must
   be literal values only — no read, parse, `yq`, `require` or `import` of `ai-docs/` in their
   construction. Add a suite-level assertion that the test file's golden block contains no call
   expressions, or simply state it as a reviewable constraint.
3. **A3.** Declare every `expectSignature` as an exact literal owned by this plan, and give each
   assertion an explicit message containing it. Missing today: `rule-inverted` (propose
   `golden mismatch: <case name>` on every retrieval `deepStrictEqual`) and `adr-nested-rogue`
   (propose `ADR registry mismatch`). Add: the implementer may not edit the mutation table;
   any change requires a recorded justification in `.plans/phase-1/GATE-OUTPUT.md`.
4. **A4.** Add a unit subtest for `estimateTokens` pinning the plan's measured values
   (900 `[A-Za-z]` → 225; 900 mixed-class → 601; and a whitespace-invariance case: a string and its
   whitespace-stripped form must not score equally). Also state the assertion order inside
   `bounds the <name> payload` — token bound **before** char bound — as a requirement, not prose.
5. **A5.** Fix Item 2's `resolveTool` spec: resolve with `fs.statSync` (follow symlinks) +
   `fs.accessSync(p, fs.constants.X_OK)`, never `lstat` — verified that `/opt/homebrew/bin/yq`,
   `~/.local/bin/node` and `~/.local/bin/npm` are all symlinks on this machine. And reconcile
   memoisation with the PATH-mutating subtest: export a `_resetToolCache()` (or accept
   `{cache:false}`) and call it in the subtest's setup and `finally`.
6. **A6.** Make `path-stripped` hermetic instead of machine-dependent: build a temp dir containing
   symlinks to the resolved `node`, `npm`, `env` and `sh` only, and set `envOverride.PATH` to that
   dir alone. `yq` is then guaranteed absent on every machine and the `BLOCKED` branch disappears.
   Keep the two preconditions as a fallback; if `BLOCKED` is ever emitted it must be recorded in
   `GATE-OUTPUT.md` as an environmental exception, never silently accepted as a pass.
   (Note: the plan's evidence for npm colocation cites `~/.local/bin/{node,npm}`, but
   `process.execPath` resolves to `~/.hermes/node/bin/node`; `npm` does live there, so the
   conclusion holds on different evidence than stated.)
7. **A7.** Declare `maxFailingTests` per mutation in the table, derived from the goldens — with
   Item 4's golden pinning `summary` and `status`, `payload-bloat` necessarily fails 2 subtests and
   `adr-status-bogus` 3–4. Recompute after Items 4 and 6 land and record the measured values.
8. **A8.** Split Item 6 into sibling subtests (set equality / duplicate shortcodes / status
   vocabulary / metadata comparison / `GOLDEN_DECISIONS` subset), for the same reason Item 3 splits
   the retrieval subtest: `assert` throws first, and a monolithic body makes which signature appears
   an accident of statement order.
9. **A9.** Reconcile the `heading-renamed` signature: the mutation table says `required section` /
   `Roles`; Item 5 and its expected output say `required heading`. Pin `required heading`.
10. **A10.** Item 5: insert `## Separation of duties` **after line 9, before line 10** (so `:10-11`
    becomes its body, not an empty section). **Drop `### Review lenses` entirely** — from the
    artifact and from the heading table — and retire the string with a reason beside `pcp`'s two.
    Adopt the uniform criterion: a heading may be added only over an existing, contiguous,
    currently-unheaded block whose subject is exactly that heading.
11. **A11.** Add one mutation covering the fence/frontmatter hole the plan names but does not gate:
    rename `## Operational Guardrails` (`.agents/skills/adr-manager/SKILL.md:116`) and, separately,
    a control that a fenced heading cannot satisfy an assertion — e.g. mutate `## Canonical ADR
    Template` (`:24`) to `## Canonical ADR Templat` and require RED, given the fence at `:28-60`
    contains `## Context` etc. Specify the fence matcher as CommonMark:
    `/^ {0,3}(`{3,}|~{3,})/`, closing fence at least as long as the opening. Verified that the
    indented fence markers at `:81`/`:90` are missed by a naive `startsWith('```')` tracker in a
    matched pair, so today's answers agree **by luck**.
12. **A12.** Give `requiredLiterals` at least one mutation (delete the sole `.pcp/`-bearing line, or
    the `tokensave` mention), or drop the field and assert those two as headings/nothing. An ungated
    field is where the previously-narrowed strings go to hide.
13. **A13.** Correct the archived-plan string count: 16, not 14; retirement is 4 of 16.

---

## 6. Non-blocking

- Item 7's 56-test projection is honestly labelled an estimate; A7's cap recomputation should land
  in the same measurement pass.
- `Shortcode Taxonomy` (`constitution-query:19`) is an `###`, not `##`; harmless since the plan does
  not assert levels, but the table reads as if all are `##`.
- `hasHeading`'s leading-`N.`-ordinal stripping is required for `pcp` (`## 1. INVOCATION CONTRACT`
  `:10`, `## 2. …` `:42`, `## 6. …` `:88` — verified) and is correctly specified.
- Every remaining citation I checked was exact: `:8` PATH override, `:10-16` `parseYaml`,
  `:190` tautology, `:192-193`/`:200` bounds, `:257` whole-file scan, `:303` non-recursive readdir,
  `:318` silent `.find`, `:321-325` two-sided status, `ai-docs/constitution.yaml:5`,
  `ADR-0001:4`/`:6`, `adr-manager:32` status vocabulary, `adr-manager:94-95` the two edit steps,
  `steps/SKILL.md:3` frontmatter-only match, archived `PHASES.md:6`, archived
  `phase-4/PLAN.md:56-60`. The plan's own three disputed-citation corrections are all right.
- The "Out of scope" section's coupling check on `tests/pcp_skill.test.js` is the kind of evidence
  that makes the porcelain-equality assertion credible; worth keeping verbatim into v2.
