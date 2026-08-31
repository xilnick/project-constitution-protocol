# Phase 1 Plan Review — Coverage

## Lens

Does the plan repair the whole **class** of each defect, or only the reported instance? For every
defect it fixes, where else does that same class occur, and is there a mutation that would catch a
regression of it?

## Verdict

**reject** — 7 blockers.

The instrument (Item 1) and the sequencing are sound, and most of the plan's citations check out.
But three of the six declared defect classes are repaired at exactly the instance the audit named
and left live elsewhere in the same file, one shipped artifact is invisible to the gate entirely,
one previously-paid-for fix is silently dropped for the second time, and one artifact edit is
specified against a miscited line range that would damage the doc. The phase would end declaring
"the gate can now fail on six defect classes" while three of them remain reachable.

---

## Blockers

### B1 — A sixth, shipped `SKILL.md` is invisible to the gate, and Item 5 makes the two copies diverge

`tests/constitution_skills.test.js:207-233` hardcodes five skills. There are **six** `SKILL.md`
files in the repo:

```
$ find plugins .agents -name SKILL.md
plugins/pcp/skills/pcp/SKILL.md
plugins/steps/harnesses/droid/skills/steps/SKILL.md      <-- not in skillDefinitions
plugins/steps/skills/steps/SKILL.md
.agents/skills/{adr-manager,code-intelligence,constitution-query}/SKILL.md
```

The unlisted one is not scratch: it is a 17.5K file with valid frontmatter (`name: steps`,
`plugins/steps/harnesses/droid/skills/steps/SKILL.md:2`) and 15 headings, and it ships — the
`steps` plugin source is `./plugins/steps` (`.claude-plugin/marketplace.json:20`), so it is
installed with the plugin.

This is the **same class** as `adr-nested-rogue`: an artifact on disk that the gate's hardcoded
list never discovers. The plan applies set-equality-over-a-recursive-walk to `ai-docs/decisions/`
(Item 6.1-6.2) and does not apply it to skills. There is no mutation for it either — add a
seventh `SKILL.md`, or corrupt the frontmatter of the droid copy, and the sweep is all-green.

Worse, Item 5 makes it actively wrong. It inserts `## Separation of duties` and `### Review
lenses` into `plugins/steps/skills/steps/SKILL.md` only. The two `steps` docs already diverge
(`diff` reports `+187 / -148 / ~79` lines) and after Item 5 the gated copy asserts four headings
the shipped droid copy does not have and is never checked for.

**Right:** add a discovery step to the skills suite — walk `plugins/*/**/skills/*/SKILL.md` and
`.agents/skills/*/SKILL.md`, assert the discovered set equals the declared `skillDefinitions`
paths, and declare the droid copy's disposition (gated with its own heading table, or explicitly
excluded with a written reason). Add a `skill-unlisted` mutation that creates a rogue
`SKILL.md` and expects a set-equality failure.

### B2 — the `\r?\n` frontmatter tolerance was paid for once, dropped, flagged, and the plan drops it again

`tests/constitution_skills.test.js:241-242`:

```js
assert.ok(content.startsWith('---\n'), ...);
const closingIndex = content.indexOf('\n---\n', 3);
```

Exact-`\n`. The archived iteration accepted the fix and recorded the disposition:

```
.plans/archive/2026-08-31-105408-query-driven-constitution-skills/phase-2/RECONCILIATION.md:25
| 9 | executability-gates | Non-blocking 1 | Regex for frontmatter is fragile | accept |
  Updated frontmatter regex ... to /^---\r?\n([\s\S]*?)\r?\n---/ to support Windows and Unix line endings.
```

and the archived implementation review already caught that the shipped test threw it away:

```
.plans/archive/.../IMPL-REVIEW-audit-conformance.md:225
'---\n' / '\n---\n', dropping the \r?\n tolerance accepted at .plans/phase-2/RECONCILIATION.md:25 (#9).
```

Item 5's **Files** line claims `tests/constitution_skills.test.js (:207-262)`, which spans
`:241-242`, but no instruction in Item 5 mentions line endings, and the environment-pinning class
in this plan is scoped entirely to PATH. On a CRLF checkout every one of the five skill subtests
fails at `:241` before any heading is evaluated. That is the same class as `:8` (machine
assumption baked into the gate) and it is a *known, already-reconciled* instance.

**Right:** Item 2 or Item 5 restores `\r?\n` tolerance in the frontmatter delimiter check and in
`parseSkillDoc`'s frontmatter strip and heading regex; add it to the item's stated changes, not
just its line range.

### B3 — the ADR suite's structural heading checks are the *same* mention-counting defect as `:257`, and Item 6 does not touch them

`tests/constitution_skills.test.js:291-297`:

```js
assert.match(content, /## Context/, ...);
assert.match(content, /## Decision Drivers/, ...);
assert.match(content, /## Considered Options/, ...);
assert.match(content, /## Decision Outcome/, ...);
assert.match(content, /## Consequences/, ...);
assert.match(content, /### Positive/, ...);
assert.match(content, /### Negative \/ Caveats/, ...);
```

Unanchored (no `^`, no `m` flag), fence-blind, and **prefix-matching**: `## Context` →
`## Contextual` still matches; so does `## Consequences` → `## Consequential`; so does the string
appearing mid-paragraph or inside a fenced block. This is defect class 2 verbatim — the class the
plan says it repairs at `:257`.

Item 6 rewrites the fourth suite but its six enumerated changes are discovery, set equality,
duplicate shortcodes, status vocabulary, metadata comparison, and `GOLDEN_DECISIONS`. None of them
mentions `:291-297`. Item 5 builds exactly the right tool for this — `parseSkillDoc` /
`hasHeading`, fence-aware and frontmatter-aware (`tests/lib/markdown-sections.mjs`) — and the plan
never applies it to ADR files. `heading-renamed` mutates a *skill*, so no mutation covers this.

**Right:** Item 6 routes ADR structural sections through `hasHeading` from Item 5 (making Item 6
depend on Item 5, which reverses no other constraint), and the mutation table gains
`adr-heading-renamed` — `ai-docs/decisions/ADR-0001-unified-esm.md:9` `## Context` →
`## Contextual` — expecting `/required heading/`.

### B4 — `rule-inverted` is repaired for 1 of 7 semantic text fields; no mutation covers the other 6

`rtk proxy grep -c "length > 0" tests/constitution_skills.test.js` → **38**. Of those, ~24 are
"this semantic field is a non-empty string" and nothing more. Item 4's `GOLDEN` covers only the six
existing query cases. After Phase 1 the following fixture text can still be inverted with the suite
green:

| field | fixture line | current guard |
|---|---|---|
| `sec-data-01.rule` | `ai-docs/constitution.yaml:14` | `:48` non-empty string |
| `qual-gate-01.rule` | `ai-docs/constitution.yaml:20` | `:64` non-empty string |
| `qual-hygiene-01.rule` | `ai-docs/constitution.yaml:24` | `:64` non-empty string |
| `spec.description` | `ai-docs/specs/auth-spec.yaml:5` | `:129` non-empty string |
| endpoint `/api/v1/auth/refresh` (all fields) | `ai-docs/specs/auth-spec.yaml:12-16` | `:133-137` shape only |
| `inv-auth-jwt.rule` | `ai-docs/specs/auth-spec.yaml:19` | `:143` non-empty string |
| `inv-auth-revocation.rule` | `ai-docs/specs/auth-spec.yaml:21` | `:143` non-empty string |

The class is "constitution/spec prose has no declared expected value". The plan repairs the one
instance that happens to sit behind a query case. Note that the *only* target mutations touching
suite 1 are the two canaries, both of which already pass today — so after Phase 1, suite 1's ~24
semantic assertions have never been exercised by a single mutation.

**Right:** extend the golden to the whole of `constitution.security.rules`,
`constitution.quality.pre_commit_checks` and `spec.{description,endpoints,security_invariants}`
(a `deepStrictEqual` against the parsed root of each file is one assertion and covers all of it),
and add a `rule-inverted-unqueried` mutation targeting `ai-docs/constitution.yaml:24`
(`qual-hygiene-01`), which no query case reaches.

### B5 — the declared status vocabulary is applied to `decisions` only

Item 6.4 declares `ADR_STATUSES` and asserts the ADR-side and constitution-side status of each
*decision*. But `status` is a required field on three more shortcode families, each guarded only by
non-emptiness:

- `caveats[].status` — `ai-docs/constitution.yaml:39` (`"active"`), asserted at `:92`
- `requirements[].status` — `ai-docs/constitution.yaml:48` (`"active"`), asserted at `:104`
- `decisions[].status` — `:80`, also non-empty-only in suite 1

(`deferred[].status` is correctly pinned to the literal `'deferred'` at `:114` — that one is fine.)

`c-e9a2 status: "bogus"` survives the post-repair suite. Same class as `adr-status-bogus`, and no
mutation covers it because the mutation mutates a decision.

**Right:** apply `ADR_STATUSES` membership to `decisions[]`, `caveats[]` and `requirements[]` in
the schema suite (Item 6.4 or a small addition to Item 4), and add a
`caveat-status-bogus` mutation on `ai-docs/constitution.yaml:39`.

### B6 — Item 5's `:64-74` citation is wrong, and the edit it specifies would break the ordered list

Item 5 change 3 says to insert `### Review lenses` "inside `## The phase loop` (`:56`) above the
lens list at `:64-74`", and claims "both sections are headings placed over text that already exists
and is currently unheaded."

`plugins/steps/skills/steps/SKILL.md:60-78` is a single ordered list, items `0.` through `8.`:

```
60  0. **Scout.** ...
62  1. **Plan.** ...
64  2. **Review the plan.** Two or three reviewers, **one lens each**, in a single wave. Typical lenses:
65     *design/spec consistency*, *executability and gates*, *coverage*. Each writes its own file and
67  3. **Reconcile.** ...
70  4. **Implement.** ...
71  5. **Review the implementation.** ...
74  6. **Run a code-review pass** ...
```

`:64-74` is **not a lens list** — it is phase-loop steps 2 through 6. The lenses are named inline on
`:65` alone. The text is not "unheaded"; it is under `## The phase loop` (`:56`) and inside a
numbered list. Inserting an `###` heading between `:63` and `:64` splits the list, restarting the
numbering at `2.` as a fresh list, and yields a `### Review lenses` section containing steps 2–8.

This is precisely the artifact-follows-gate inversion the plan invokes to *retire* `pcp`'s two
strings (`PLAN.md:625`, D3) and states as the phase's direction of repair (`PLAN.md:12`). It edits
a live doc — the plan's own Risks section confirms `~/.agents/skills/steps` symlinks into this
path, so the damage is immediate.

**Right:** retire `Review lenses` the same way `pcp`'s two strings are retired (the content exists
at `:65`; assert it as a labelled literal), or place the heading somewhere that does not sit inside
a list. Either way the `:64-74` citation must be corrected. Note `## Separation of duties` after
`:8-11` is fine — `:10-11` really is unheaded prose and the citation checks out.

### B7 — PHASES.md assigns fixture decoupling to Phase 1; the plan does the opposite and files it "Out of scope"

`.plans/PHASES.md:50-51`:

> Replacing the fictional `ai-docs/` fixtures (billing/webhooks/JWT) with real ones; **Phase 1 only
> has to stop the tests from depending on fixture identity in a way that breaks consumers.**

Only the *replacement* is out of scope. Reducing the identity coupling is explicitly Phase 1's.
`PLAN.md:672-675` files the whole thing under "Out of scope" and states the goldens "pin the
fixtures' current content, which increases coupling to them. That is intentional for this phase."

The plan is not wrong that a declared expected value is required to kill `rule-inverted` — but it
resolves a scope statement against itself without saying so. As written, a consumer replacing
`ai-docs/` must now hunt fixture-specific literals through 300+ lines of `node:test` code
(`GOLDEN`, `GOLDEN_DECISIONS`, `queryCases`, `skillDefinitions`, plus the pre-existing `:52,53,68,69`
`ruleIds.includes('sec-auth-01')` etc.) rather than edit one place.

The plan's own stated property — "the golden lives in the test, not in a second artifact, so a
single edit to `ai-docs/` cannot move both sides" (`PLAN.md:313-314`) — is preserved just as well
by a test-owned file as by an inline constant.

**Right:** put `GOLDEN`, `GOLDEN_DECISIONS`, `queryCases` and `skillDefinitions` in one
`tests/fixtures/expected.mjs`, header-commented as the single file a consumer re-declares when
swapping fixtures, and say so in the plan. One line of movement; satisfies `PHASES.md:51` instead of
contradicting it.

---

## Missing mutations, by defect class

| class | covered by | class-level gap |
|---|---|---|
| 1 tautological assertion | `rule-inverted` (`sec-auth-01` only) | **no mutation** for unqueried prose: `constitution.yaml:14,20,24`, `auth-spec.yaml:5,12-16,19,21` (B4) |
| 2 mention-counting | `heading-renamed` (skills only) | **no mutation** for ADR structural headings `:291-297`; `## Context`→`## Contextual` survives (B3). Also unmutatable by construction: the surviving `requiredLiterals` (`tokensave`, `.pcp/`) |
| 3 two-sided comparison | `adr-status-bogus` (decisions) | **no mutation** for `caveats[].status` / `requirements[].status` (B5) |
| 4 partial traversal | `adr-nested-rogue` (`ai-docs/decisions/`) | **no mutation** for an unlisted `SKILL.md` (B1); **no mutation** for a duplicate `- **Status**:` or `- **Shortcode**:` bullet *within* one ADR — `content.match()` at `:282,314` takes the first, and Item 6.3's `Map<shortcode, string[]>` only detects duplicates *across* files |
| 5 environment pinning | `path-stripped` (PATH) | **no mutation** for CRLF (B2); **no mutation** for cwd — every path in the suite is repo-root-relative (`:20,23,120,123,152-177,209,214,219,224,229,302`) and the harness runs `npm test` with `cwd: repoRoot`, so it structurally cannot detect this. Correctly Phase 3's, but the plan's out-of-scope note (`PLAN.md:666`) enumerates only `:209,214,219` and omits `:224,229` and every `ai-docs/` path |
| 6 fixture coupling | — | no mutation possible; B7 is the plan-level finding |

The two highest-value additions are `skill-unlisted` (B1) and `adr-heading-renamed` (B3): both
target a class the plan claims to have closed, using a tool the plan already builds.

---

## Non-blocking

1. **`select(.domain == "auth")` is a set query pinned to a single-object golden.** Item 4 does
   `assert.deepStrictEqual(yqJson(tc.expr, tc.file), GOLDEN[tc.name])` with a single object for
   `sec-auth-01`. `yq -o=json` emits *concatenated* documents on multi-match — verified:
   `yq -o=json '.constitution.security.rules[] | select(.enforcement == "strict")' ai-docs/constitution.yaml`
   prints two `{...}` objects, which `JSON.parse` rejects. Works today (one auth rule) but a
   legitimate second auth rule fails as a `SyntaxError`, not a golden mismatch. Suggest
   `[.constitution.security.rules[] | select(...)]` and an array golden.
2. **`:303`'s `.filter(f => f.endsWith('.md'))` is preserved verbatim by Item 6.1** ("returns every
   `*.md`"). A `.markdown` / `.MD` ADR remains invisible in both directions. Minor.
3. **`ai-docs/decisions/` has exactly one ADR** (`ADR-0001-unified-esm.md`), so `GOLDEN_DECISIONS`
   with one entry is currently the *whole* registry; the "subset check so a new ADR needs no golden
   edit" rationale (Item 6.6) has no live case to exercise it.
4. **`assert.match(content, /- \*\*Status\*\*:\s*(.+)/)` at `:285` and `:314` is fence-blind too** —
   an ADR containing a template block would match the template's bullet. Same tool (Item 5) fixes it.
5. **The `d-8f3a` shortcode appears in the adr-manager skill doc as `d-xxxx`, not the fixture value**,
   so B7's coupling is confined to `tests/` and `ai-docs/` — the skills themselves are already
   fixture-agnostic. That is the shape B7 asks the tests to adopt.

---

## Verified (already paid for — do not re-check)

- Every citation in the plan's **Disputed citations** section is itself correct: archived
  `PHASES.md:6` does carry `(< 300 tokens)` (line 5 is the Phase 1 heading);
  `.agents/skills/adr-manager/SKILL.md:94-95` are the two edit instructions, `:93` the introducer;
  `CLI Commands` occurs once at `.agents/skills/code-intelligence/SKILL.md:25`, zero times in `pcp`.
- Item 5's heading table, all 17 entries, checked against `grep -n '^#'` on each of the five files:
  `constitution-query` `:10,19,28`; `code-intelligence` `:10,22,30`; `adr-manager`
  `:10,24,72,116`; `pcp` `:10,42,88` (ordinal-prefixed `## 1.` / `## 2.` / `## 6.`, handled by the
  plan's ordinal stripping); `steps` `:13,56`. All correct.
- The fenced-heading hazard is real in **two** files, not one: `.agents/skills/adr-manager/SKILL.md:28-60`
  (fence opens `:28`, `## Context` `:37`) as the plan says, and also
  `plugins/pcp/skills/pcp/SKILL.md:30-38` (```` ```markdown ````, `# Project Agent Instructions`
  `:31`, `## Project Conventions` `:35`). Item 5's fence tracking covers both.
- `heading-renamed`'s SURVIVED prediction: `plugins/steps/skills/steps/SKILL.md:99` ("the roles are
  the protocol") and `:103` ("its nine roles") both match `includes('roles')`. Correct.
- `'Separation of duties'` occurs exactly once in `plugins/steps/skills/steps/SKILL.md`, at `:3`
  inside `description:`. Correct.
- All shipped-test citations: `:8` PATH override, `:10-16` `parseYaml`, `:153,158,163,168,173,178`
  `expectedSnippet`, `:190` tautology, `:192-193` word formula, `:198-201` char bound, `:211-231`
  `requiredSections`, `:255-260` substring loop, `:270` forward-sync loop, `:303` non-recursive
  readdir, `:318` silent `.find`, `:321-325` two-sided status. All correct.
- `package.json` declares no dependencies and `scripts.test` is
  `node --test tests/pcp_skill.test.js tests/constitution_skills.test.js` — the plan's
  "no `npm install`" and "`test` script must stay the fast suite" constraints hold.
- The schema/spec checks at `:31,40,56,72,119` are **not** the two-sided class: `:34,37,49,52,53,65,68,69,114,126,128,134,135`
  compare against literals or regexes declared in the test file. They are weak (shape-only, B4) but
  they are one-sided. The brief's suspicion here does not hold.

## Unverified

- **No mutation was executed.** I did not create `tests/mutation-harness.mjs` and did not modify any
  fixture, so every SURVIVED claim in this review — like every SURVIVED claim in the plan — is
  derived from reading the suite, not from running the mutation. The exceptions are B3's
  prefix-match (`/## Context/` matching `## Contextual` is a property of the regex, not of a run)
  and the `yq` multi-document output in Non-blocking 1, which I ran.
- **`estimateTokens`'s calibration.** Same limitation the plan declares; I have no tokenizer either
  and did not attempt to validate the 200 bound. Item 3's arithmetic is internally consistent with
  the plan's own measurements.
- **CRLF behaviour was not reproduced** — I did not create a CRLF checkout. B2 rests on reading
  `:241-242` and the archived disposition, both quoted verbatim.
- **Whether the droid `steps` harness copy is intended to be gated** is a product question I cannot
  settle; B1 asks for a written disposition either way, not necessarily for coverage.
