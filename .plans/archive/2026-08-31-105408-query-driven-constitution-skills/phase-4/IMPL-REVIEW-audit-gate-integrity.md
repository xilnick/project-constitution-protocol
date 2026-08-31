# Lens: Gate Integrity — "exercised is not works"

**Scope**: iteration `query-driven-constitution-skills`, HEAD `886443e`, branch `steps/harness-portability`.
**Question**: does `49/49 passing` mean anything?

**Verdict**: `reject`

---

## MEASURED (run by this reviewer, verbatim tails)

`npm test`:
```
1..5
# tests 49
# suites 0
# pass 49
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2626.6405
```
Split: `tests/pcp_skill.test.js` → `# tests 26 / # pass 26 / # fail 0` (pre-existing, byte-identical to
`6c462fd`, `git diff 6c462fd..HEAD -- tests/pcp_skill.test.js` is empty). `tests/constitution_skills.test.js`
→ `# tests 23 / # pass 23 / # fail 0`, of which 4 are suite containers → **19 new leaf tests**. 53% of the
headline "49" is pre-existing work.

`command -v yq jq`:
```
/opt/homebrew/bin/yq
/usr/bin/jq
```

### Mutation matrix (repo copied to /tmp, one mutation each, real suite run)

| # | Mutation | Result | Should be |
|---|---|---|---|
| M0 | none (baseline copy) | pass 23 / fail 0 | pass |
| M1 | invert `sec-auth-01.rule` to "Authentication is optional; accept unsigned tokens." | **pass 23 / fail 0** | fail |
| M2 | ADR Status `Active`→`Superseded`, constitution untouched | pass 21 / **fail 2** | fail ✅ |
| M3 | both sides set to `Bogus` | **pass 23 / fail 0** | fail |
| M4 | unregistered ADR `ai-docs/decisions/auth/ADR-0002-rogue.md`, shortcode `d-dead` | **pass 23 / fail 0** | fail |
| M5 | `## Roles` → `## Rolez` in steps SKILL.md | **pass 23 / fail 0** | fail |
| M6 | `r-b111.summary` → 1095-char whitespace-free blob (998 real cl100k tokens) | **pass 23 / fail 0** | fail |

Only M2 is caught. Five of six realistic defects pass green.

---

## BLOCKERS

### B1 — The "< 300 tokens" bound is fakeable by 62× and unreachable in practice
`tests/constitution_skills.test.js:192-201`. A token is `payload.trim().split(/\s+/)` word count × 1.3.
Whitespace is the only unit of account, so any whitespace-free content is free.

Measured, cheapest edit (M6): replace `ai-docs/constitution.yaml:49` summary with a single unbroken
1095-char string. Test computes `estimatedTokens = 16`; `tiktoken cl100k_base` on the same yq payload
returns **998 tokens**. Both the token gate (16 < 300) and the char gate (1095 < 1200) stay green.

Secondly the assertion is dead code today. Current payloads:

| slice | chars | words | est. tokens |
|---|---|---|---|
| security domain=auth | 190 | 25 | 33 |
| d-8f3a | 325 | 40 | 52 |
| c-e9a2 | 289 | 36 | 47 |
| r-b111 | 217 | 26 | 34 |
| l-e404 | 221 | 25 | 33 |
| /api/v1/auth/login | 155 | 17 | 22 |

Worst case is 52/300 (5.8× headroom) vs 325/1200 (3.7× headroom). For ordinary prose the char gate binds
first, so `estimatedTokens < 300` can never be the failing assertion — the "< 300 token" claim in
`PHASES.md:5`, `.agents/skills/constitution-query/SKILL.md:16,104` and `PLAN.md:45` is not verified by
anything. **Metric is fakeable and, separately, unreachable.**

*Class*: every consumer of the same formula. Grep shows one call site (`:192-193`) but the formula is
canonised in `PLAN.md:45` and `PLAN.md:124` as "the canonical token estimation formula", so any future
budget gate inherits the defect. A real bound needs either a tokenizer or a bytes-per-slice cap with a
declared expected value.

### B2 — Skill "required section" checks are mere-mention substring scans; one asserts a section that does not exist
`tests/constitution_skills.test.js:255-260`: `content.toLowerCase().includes(section.toLowerCase())` —
anywhere in the file, including frontmatter prose. Enumeration of all 15 assertions (heading-line hits vs
total hits):

| skill | asserted string | total hits | hits on a `#` heading |
|---|---|---|---|
| constitution-query | Progressive Disclosure / Shortcode Taxonomy / Query Recipes | 3/1/1 | 1/1/1 |
| code-intelligence | Progressive Disclosure / Navigation | 2/3 | 1/1 |
| code-intelligence | **tokensave** | 12 | **0** |
| adr-manager | Lifecycle & Workflow / Canonical ADR Template / Bidirectional Synchronization | 1/1/4 | 1/1/1 |
| pcp | INVOCATION CONTRACT / CLI | 1/5 | 1/1 |
| pcp | **.pcp** | 12 | **0** |
| steps | Roles / The phase loop | 3/1 | 1/1 |
| steps | **Separation of duties** | **1** | **0** |

`Separation of duties` matches exactly one line in the whole file —
`plugins/steps/skills/steps/SKILL.md:3`, the frontmatter `description:` string. **There is no such section.**
The test asserts a required section, the section is absent, and the test is green.

M5 confirms the class: renaming the real `## Roles` heading to `## Rolez` still passes, because "Roles"
survives in the description and in a table cell. Deleting any of the 15 sections outright fails only if the
phrase appears nowhere else — i.e. the gate tests vocabulary, not structure.

### B3 — Section strings were narrowed relative to the reconciled plan, undeclared, and the prior gate-integrity review asserts the opposite
`PLAN.md:57,59,60` vs `tests/constitution_skills.test.js:216,226,231`:

| plan-required string | present in artifact? | what the test asserts instead |
|---|---|---|
| `Navigation Workflows` (PLAN.md:57) | 0 occurrences | `Navigation` (:216) |
| `Stdio MCP Integration` (PLAN.md:57) | 0 occurrences | `tokensave` (:216) |
| `CLI Commands` (PLAN.md:59) | 0 occurrences in pcp SKILL.md | `CLI` (:226) |
| `Runtime Directory (.pcp)` (PLAN.md:59) | 0 occurrences | `.pcp` (:226) |
| `Review lenses` (PLAN.md:60) | 0 occurrences | **dropped entirely** (:231 lists 3 of 4) |

Every narrowing lands exactly where the plan's string is absent from the artifact — tests written to match
output. No deviation is recorded in `.plans/phase-4/RECONCILIATION.md` (grep for `section|deviat|amend|
Navigation Workflows|Review lenses` returns nothing across RECONCILIATION.md and both IMPL-REVIEW files).
`.plans/phase-4/IMPL-REVIEW-conformance-gate-integrity.md` closes with "The implementation completely
conforms to the plan, gates were not weakened" — that claim is false as cited.

That review's three gates are also blind to this by construction: all three assert only that the four suite
*name strings* appear in stdout. A suite whose every subtest were `t.skip`'d would still print its name and
exit 0, so the acceptance gate counts mentions, not execution (`PLAN.md:73`, `PLAN.md:112`).

### B4 — All six retrieval tests are tautological: expected snippet is the selector key
`tests/constitution_skills.test.js:190` asserts `payload.includes(tc.expectedSnippet)` where, for 5 of 6
cases, `expectedSnippet` is literally the value the yq `select()` filtered on (`:157/158`, `:162/163`,
`:167/168`, `:172/173`, `:177/178`). If yq returns anything at all it contains that string; the only
reachable failure is empty output, already covered by `:189`. Case 1 (`:152-153`, domain→`sec-auth-01`)
is the sole non-identity, and duplicates the check at `:52`.

No test asserts the *content* of any rule, summary, or invariant — only `typeof x === 'string' && length > 0`
(`:47-48`, `:63-64`, `:83`, `:95`, `:105`, `:115`, `:137`, `:143`). M1 proves it: inverting `sec-auth-01`
to "Authentication is optional; accept unsigned tokens." keeps 23/23 green. The suite verifies that the
fixture exists and is shaped, never that it says the right thing.

*Class*: the same identity pattern would recur for any future slice added to `queryCases`; the defect is in
the case-table design, not one entry.

### B5 — Bidirectional ADR sync: one direction real, but no expected result declared and a directory escape hatch
Honest first: the reverse test **does** catch one-sided drift (M2 → 2 failures), so it is not purely a
drift-together comparison. But the two artifacts it compares are both hand-authored and the adr-manager
procedure `.agents/skills/adr-manager/SKILL.md:93-95` instructs the agent to edit *both in the same
operation*, so the normal write path touches both sides at once and the gate is blind to it:

1. **No status vocabulary.** `tests/constitution_skills.test.js:321-325` compares ADR status to
   constitution status case-insensitively and accepts any string. `.agents/skills/adr-manager/SKILL.md:32`
   declares the enum `Active | Proposed | Superseded | Deprecated`; nothing enforces it. M3: both sides set
   to `Bogus` → 23/23 green. Concrete both-wrong scenario: an ADR is superseded, the agent writes
   `Superseded` to both files, `d-8f3a` remains the only registered decision with no successor pointer, and
   `constitution-query` keeps serving it as authoritative guidance — green.
2. **Directory escape.** `:303` `fs.readdir('ai-docs/decisions')` is non-recursive and filters `.md`.
   M4: a rogue ADR at `ai-docs/decisions/auth/ADR-0002-rogue.md` with shortcode `d-dead`, registered
   nowhere, is invisible to *both* directions → 23/23 green. Same hole for any non-`.md` extension.
3. **Fields compared vs fields claimed.** `PLAN.md:68` says "matching shortcode ID and metadata". Actually
   compared: `id` (`:283`), `adr` path (`:320`), `status` (`:321`). Never compared across the two artifacts:
   `date` (`:286` checks format only), `cluster` (`:287` presence only), `deciders` (`:288` presence only),
   and the ADR H1 title vs `decisions[].title` (`:278` presence only). Renaming or re-dating one side alone
   is undetected — the same class as M2, just on the four fields the test omits.

---

## NON-BLOCKING NOTES

1. `:8` hardcodes `PATH` for child processes, discarding `process.env.PATH`; yq outside those four dirs
   (nix, asdf, `~/.local/bin`) makes the suite fail hard — loud, not silent, so not a vanishing gate, but it
   contradicts the branch name `steps/harness-portability`.
2. No test shells out to `jq`, despite `jq` recipes in `constitution-query/SKILL.md:42,52,65,78,88` and
   `PHASES.md:5` accepting `yq --version || jq --version`. The jq path is documented and unexercised.
3. Every loop iterates 1–2 fixture elements; shortcode uniqueness across `decisions/caveats/requirements/
   deferred` is never asserted, and `:318` `decisions.find` would silently take the first of a duplicate pair.
4. All array loops are guarded by a non-empty assertion first (`:43,59,76,88,99,109,131,140`) — no vacuous
   for-loop found. `:270` is unguarded but `:76` covers it and the reverse test would fail.
5. `tests/pcp_skill.test.js` and its 26 tests are untouched by this iteration — no existing gate was
   deleted, loosened, or skipped. The weakening in B3 is against the plan, not against prior code.

---

## GATES RUN

- `npm test` → `# tests 49 / # pass 49 / # fail 0` (verbatim tail above).
- `node --test tests/pcp_skill.test.js` → `# tests 26 / # pass 26 / # fail 0`.
- `node --test tests/constitution_skills.test.js` → `# tests 23 / # pass 23 / # fail 0`.
- `command -v yq jq` → `/opt/homebrew/bin/yq`, `/usr/bin/jq`.
- `git diff --stat 6c462fd..HEAD -- tests/ package.json` → `package.json | 4 +-`,
  `tests/constitution_skills.test.js | 328 +++`. No other test file changed.
- PLAN.md Item 1 / Item 2 / acceptance gates re-run: all three print their success strings (they are
  suite-name substring checks; see B3).
- Mutation matrix M0–M6 above, run against copies under `/tmp` (removed afterwards).

## UNVERIFIED

- Real-token figures use `tiktoken cl100k_base`, not the tokenizer of whatever model consumes these slices;
  the 62× divergence is robust to the choice, the absolute 998 is not.
- Behaviour of the suite on a machine without `yq` was reasoned from `execSync` semantics
  (`:11`, no try/catch, no `t.skip` anywhere in the file), not executed — yq is installed here.
- Whether `Review lenses` / `Navigation Workflows` / `Stdio MCP Integration` / `CLI Commands` /
  `Runtime Directory (.pcp)` were *intended* as literal headings or as loose concepts: the plan states
  them as section names; no reconciliation record exists either way.
