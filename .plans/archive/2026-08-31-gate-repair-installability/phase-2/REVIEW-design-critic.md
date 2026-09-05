# Phase 2 plan review — design and spec consistency (adversarial lens)

**Lens.** Is this the right instrument, and does it cohere with what the project already asserts
about itself? Not whether it runs (that is the gates lens) and not whether it covers everything
(that is the coverage lens).

Everything below was measured at `HEAD 1353460` on `steps/harness-portability`. `git status
--porcelain` at review time shows only `.plans/` dirty — `.agents/skills/`, `plugins/`, `tests/`,
`AGENTS.md` and `package.json` are clean, so the plan's "clean working tree" premise holds for
every path it measured.

## Verdict

**reject** — 5 blockers. Blocker 1 alone is disqualifying: the plan's frozen expected-result table,
which is its principal separation-of-duties device, is **unsatisfiable by any implementation**.

The plan is unusually good on the axis this project has failed on before. Its `path:line`
citations are near-perfect (I checked 34 and found one off-by-one), its goldens are genuinely
source-derived, and it correctly identifies and repairs two of the orchestrator's own measurement
errors. The blockers are not sloppiness; they are places where the *instrument* still cannot
distinguish a check that passed from a check that never ran.

---

## The cheapest conformant-but-wrong implementation

**I could build one, on paper, and it is cheap.**

**Shape:** implement every per-recipe "declared payload assertion" in `tests/fixtures/recipes.mjs`
as the *universal post-condition alone* — trimmed stdout non-empty; if it parses as JSON, no
top-level `/_count$/` key is `0` and no top-level array-valued field is empty — plus one added
clause for `ci-callees` (`output parses as a JSON array`). Delete every value-pinning assertion.

**Why it survives every gate in the plan:**

- **Item 2's gate** (`PLAN.md:615`) is
  `console.log(m.RUNNABLE_RECIPES.length, m.STATIC_BLOCKS.length, m.COMMAND_SPANS.length, m.RTK_VERBS.join(','))`
  → `14 8 9 proxy`. It reads **four scalars**. No gate anywhere in the phase ever reads the content
  of a single declared assertion. The narrowing is invisible to the instrument.
- **Item 3's declared FAIL set** still comes out (once blocker 1 is repaired): `ci-find` fails on
  `matches: []`, `ci-entities` on exit 1 (fenceIndex 2 is today's `callers` fence), `ci-callers` on
  `node_count: 0`, `ci-callees` on "not an array", `ci-body` on "not JSON", plus the absent fences.
- **Items 4–8 gates** are `node tests/recipe-exec.test.js 2>&1 | rg -n '^(FAIL|BLOCKED)'`. Post-repair
  the weakened runner emits zero FAIL lines.
- **Item 9**: `npm test` exit 0.

**What it re-admits.** Precisely the defect the plan itself names at `PLAN.md:256-259`:
`All 0 ADR links synchronized.` is non-empty stdout and is not JSON, so the universal
post-condition passes it. The plan's own flagship example of the silent-success class ships green.
It also drops `.count === 1`, `.matches[0].file`, `PCP_SYMBOLS ⊆ symbols`, `::ensureDir`, and all
six `cq-*` shortcode anchors.

**Why Phase 1's analogous device held and this one does not.** Phase 1's frozen table
(`.plans/phase-1/PLAN.md:126-150`) is prose *containing verbatim literals* — signature strings,
leaf names, caps — that appear byte-identically in `tests/mutation-harness.mjs`, so the conformance
review could diff them mechanically ("zero divergences … every anchor, signature literal and cap
verbatim", `ORCHESTRATOR-LOG.md:128-131`). Phase 2's Table 1 assertion column is *descriptive
English* ("JSON; `.count === 1`; `.matches[0].kind === "function"`"). Some of it is literal, but
there is no artifact to diff and no gate that reads it. That is a strict weakening of the exact
mechanism that saved Phase 1, on the exact axis (`assertion strings quietly narrowed`) on which the
archived iteration failed.

**Minimal repair:** make Item 2's gate print something that binds the assertion content — e.g.
`JSON.stringify(RUNNABLE_RECIPES.map(r => [r.id, r.expectKeys, r.expectValues]))` with the expected
string frozen in the plan — or write Table 1's assertion column as literal JS the implementer copies
verbatim, the way Phase 1 wrote its signatures.

---

## Space mismatches (check vs defect, per assertion)

| check | lives in | defect lives in | mismatch |
|---|---|---|---|
| `C7`/`D7` (`ci-status`, fenceIndex 12) | post-repair fence index space | the plan's evidence is *doc line 127*, executed directly | **Blocker 1.** The plan verified the recipe, not the check. Pre-repair there is no fence 12. |
| `C10` "every runnable recipe line head is allowed" | ambiguous: extracted fence body, or the declared `commandLines` literal | doc fence bodies | **Blocker 2.** Under reading A it must FAIL today; under reading B it is a check on the plan's own table that can never fail. |
| `A5` "no runnable recipe may invoke a graph-mutating tokensave tool" | `TOKENSAVE_READONLY_TOOLS` ∩ binary `[edit]` category (`PLAN.md:645`) | a *doc recipe* naming an edit tool | The check never reads a recipe. The doc-side control described at `PLAN.md:366-368` ("any `tokensave tool <name>` must have `<name> ∈ TOKENSAVE_READONLY_TOOLS`") has **no check id** in Suites A–E. Non-blocking only because `B1` set-equality bounds what executes. |
| `E2` "`.pcp/` is not tracked" | `git check-ignore` — ignore-pattern space | the git **index** | `git check-ignore -q .pcp/MAP.json` exits 0 for a path that is ignored *and* for a path that is ignored but tracked anyway. The claim is about trackedness; `git ls-files --error-unmatch` is the check that lives in that space. Non-blocking. |
| universal post-condition (`PLAN.md:355-359`) | JSON **objects** with `/_count$/` keys and array-valued **fields** | `[]` (bare top-level array) and the bare key `count` | **Blocker 4.** Verified: `callers` and `callees` return bare arrays; `find_exact_symbol` returns `count`, not `*_count`. |
| `E4` token budget | regex occurrences | "the docs and the gate agree" | **Blocker 5.** Zero occurrences satisfies "every occurrence equals 200". |

Checks that **do** live in the right space, and I want that recorded: `B1`/`B2` set-equality closes
the fence/span inventory with plan-declared cardinalities (13 + 6 + 3 = 22 = 14 runnable + 8 static;
9 spans); `E3` compares two files to a declared third party rather than to each other; `A2` separates
"graph stale" (`BLOCKED`) from "doc wrong" (`FAIL`); Item 1's reuse of `parseDoc`'s CRLF
normalisation (`tests/lib/markdown-sections.mjs:18`) is the right call for the same reason the plan
gives.

---

## Declared vs derived expected values

Genuinely declared, verified against source — this section is the plan's strongest:

- `ENSUREDIR_CALLERS` — `ensureDir(` call sites confirmed at `pcp.js:264` (in `resolveTargetFile`,
  `:253`), `:345` (`handleInit`, `:343`), `:413` (`handleMint`, `:407`), `:451` (`handleActualize`,
  `:449`). All four exact.
- `ENSUREDIR_BODY_LINE` — `pcp.js:219` contains
  `await fs.mkdir(dirPath, { recursive: true });` verbatim inside a `try {}`; the assertion is
  "contains", so it holds.
- `PCP_SYMBOLS` — `pcp.js:218,449,343,407,70,253` all exact.
- `DECISION_ENTRY_KEYS` — `expected.mjs:49-56` is exactly `id,title,status,cluster,date,summary,adr`,
  and the `yaml` fence at `adr-manager/SKILL.md:82-89` declares the same seven keys in the same order.
- `ADR_TEMPLATE_HEADINGS` — all eight headings and levels match the `markdown` fence at
  `adr-manager/SKILL.md:29-59` exactly.
- `cq-*` anchors — `expected.mjs:17,49,60,70,79,96` all exact.
- `GOLDEN_DECISIONS` — `expected.mjs:223-231`, one entry, so `adr-verify` expects `All 1 …`, which
  matches the measured output.
- `TOKENSAVE_TOOL_PARAMS` — all seven tools' required/optional sets verified against
  `tokensave tool <name> --help`. The plan is right that `body` takes `--symbol`.

Derived from the thing under test, and the plan does not flag it:

- **Table 1's `commandLines` for 7 of 14 rows is the word "unchanged"** (`PLAN.md:457-463`). The
  column is defined as "the ordered list of non-comment, non-blank lines the fence body must
  contain, **verbatim**". For the six `cq-*` rows and `adr-verify` the plan declares no lines at
  all; the implementer must read them out of the artifact. This is mitigated only by the fact that
  the C-suite covers `ci-*` recipes exclusively (`PLAN.md:652`), so those seven rows' `commandLines`
  are never asserted — which means the field is dead weight rather than a tautology. Either way the
  table says something it does not mean. Non-blocking; state which.

Two-components-agreeing risk, correctly avoided: `E3` (files vs `COMPLEXITY_TIERS`, not vs each
other), `A3` (frozen table vs binary, and the doc compared to the frozen table not to the binary),
`adr-verify` (equality plus an independent `≥ 1` floor). The plan's self-assessment on this axis at
`PLAN.md:559` is honest and correct.

---

## Doc/gate contradictions found

Beyond the three the plan already owns (300-vs-200, complexity tiers, `Source of Truth`), the shape
recurs **inside the plan itself**:

1. `PLAN.md:274` states the recipe inventory "Matches the orchestrator's digest exactly."
   It does not. `ORCHESTRATOR-LOG.md:266` records `code-intelligence` as "7 fenced + **3** inline";
   the plan's Table 3 declares **2** command spans for that file. Measured: the third candidate is
   `code-intelligence/SKILL.md:26`, which carries two spans — `` `tokensave_<command>` `` and
   `` `tokensave: { tool: "<command>" }` ``. Whether they are "command spans" depends entirely on a
   filter predicate the plan never declares (see non-blocking 1).
2. `PLAN.md:539`'s comment `// must equal the bound at tests/constitution_skills.test.js:234`.
   Line 234 is `assert.ok(`; the `200` literal is at **:235**. The range cited at `PLAN.md:241`
   (`:234-237`) is correct. `ORCHESTRATOR-LOG.md:324` cites `:236`, also off. Cosmetic, but this is
   the one number the plan freezes as a cross-file contract.

Confirmed live and correctly scoped by the plan: the two shortcode registries disagree exactly as
measured (`d-60c9`, `d-8c65`, `d-a13d` only in `.pcp/MAP.json`; `r-b111`, `l-e404` only in
`ai-docs/constitution.yaml`; `.gitignore:2` ignores `.pcp/`); the three tier vocabularies diverge
exactly as measured; the three `300 tokens` doc sites are exactly three and no more (I ran the
plan's own E4 regexes — 3 hits, no false positives elsewhere in the three skill files).

---

## Blockers

### 1. The frozen FAIL set at `PLAN.md:677-691` is unsatisfiable, and its `ci-status` row is wrong

**What is wrong.** Table 1 keys every recipe by `(file, fenceIndex)` (`PLAN.md:442`), and Item 4
states the *post-repair* index layout: bash at 0,2,4,6,8,10,12 and json at 1,3,5,7,9,11
(`PLAN.md:711-712`). Pre-repair, `.agents/skills/code-intelligence/SKILL.md` has **7 fences,
indices 0–6**, all `bash`. Measured:

```
fences: [[0,"bash",34,45],[1,"bash",49,60],[2,"bash",64,75],[3,"bash",79,91],
         [4,"bash",95,106],[5,"bash",110,121],[6,"bash",125,128]]
```

So `ci-impact` (fenceIndex 8), `ci-body` (10) and `ci-status` (12) all address fences that **do not
exist today**. The plan declares `C5 C6 D5 D6` FAIL and `C7 D7` **`ok`** — three structurally
identical situations, two opposite verdicts. No uniform treatment of a missing fence produces the
declared set. `C8` compounds it: fenceIndices 7, 9, 11 are also absent and `C8` is declared FAIL.

The plan's stated evidence is the tell: `PLAN.md:690` says `C7`/`D7` were "verified above by direct
execution". What was executed is doc line `:127`'s `tokensave tool status` — the *recipe*. The
*check* addresses fence 12. **The check and the evidence live in different spaces**, which is the
project's own recorded lesson applied to the plan's own verification.

**Failure scenario.** Per `PLAN.md:691` and `ORCHESTRATOR-LOG.md:64-68`, a divergence from this set
is a reported decision, not a table edit. On day one the implementer hits a divergence it cannot
resolve by any correct implementation. The likely outcome is not escalation but a special case —
"missing fence ⇒ skip ⇒ `ok`" for `ci-status`, "missing fence ⇒ FAIL" elsewhere — chosen so the
number comes out. That is artifact-follows-gate applied to the instrument, and it reintroduces
"a check that never ran reads as a pass", the exact blocker Phase 1's implementation review found
(`ORCHESTRATOR-LOG.md:137-144`).

**Minimal repair.** Declare the treatment of an unresolvable key explicitly — "a `RUNNABLE_RECIPES`
or `STATIC_BLOCKS` entry whose `(file, fenceIndex)` does not resolve is a **FAIL**, never a skip"
— and re-derive the pre-repair FAIL set from the *pre-repair* fence layout. Under that rule the set
becomes 24, adding `C7`, `D7` and `C10` (blocker 2). Also state in Table 1 that fence indices are
post-repair, since pre-repair `ci-entities`/`ci-callers`/`ci-callees` address the `callers`/`impact`/
`status` fences respectively.

### 2. `C10` is specified in two incompatible ways, and both readings contradict the frozen set

**What is wrong.** `PLAN.md:655` gives `C10 every runnable recipe line head is allowed —
ALLOWED_HEADS`, with no subject. The Design section (`PLAN.md:364-366`) makes it a control over
executed content: "for each non-comment, non-assignment line, the first token must be in
`ALLOWED_HEADS = ['yq','jq','tokensave','node']`."

- **Reading A (extracted fence body).** Six pre-repair `bash` fences contain raw JSON. Measured, the
  body of fence 0 (`code-intelligence/SKILL.md:34-45`) has non-comment non-blank lines
  `tokensave tool find_exact_symbol name="executePhase"`, `{`, `"tool": "find_exact_symbol",`,
  `"arguments": {`, `"name": "executePhase"`, `}`, `}`. Heads `{` and `"tool":` are not in
  `ALLOWED_HEADS`, so `C10` **must FAIL today**. `PLAN.md:689` declares it `ok`.
- **Reading B (the declared `commandLines` literal).** The check compares the plan's frozen table to
  the plan's frozen constant. It cannot fail once written, and it never reads a document. It is
  `ok` today for the reason that makes it worthless.

**Failure scenario.** The implementer picks reading B, because it is the only one that matches the
frozen set. The stated safety control on shelling out to text read from markdown then does not
examine any markdown.

**Minimal repair.** Name the subject: `C10` evaluates the **extracted fence body** of every
`RUNNABLE_RECIPES` entry, and it is in the pre-repair FAIL set.

### 3. Item 9 makes `npm test` depend on a live `tokensave` index, and that dependency lands inside Phase 1's mutation gate

**What is wrong.** `tests/mutation-harness.mjs:382` runs `execFileSync(npmPath, ['test'], …)` — the
whole `&&` chain. After Item 9, `npm test` requires `tokensave` and `jq` on `PATH` and a graph that
indexes `pcp.js` (`A2`). Under a RED mutation `node --test` short-circuits, so this is invisible —
D5's reasoning is sound there and I am not re-litigating it. But under the **three declared
`SURVIVED` controls** the `node --test` step passes and the runner *does* execute. Verified those
three:

```
crlf-frontmatter            ops: .agents/skills/constitution-query/SKILL.md toCRLF   mustFail: []  max: 0
benign-constitution-comment ops: ai-docs/constitution.yaml replace                   mustFail: []  max: 0
benign-adr-prose-reflow     ops: ai-docs/decisions/ADR-0001… replace                 mustFail: []  max: 0
```

`mutation-harness.mjs:587` requires `run.status === 0` for a `SURVIVED` verdict. `A2`'s `BLOCKED`
exit **3** is a non-zero status. So a stale graph — the condition the plan documents as having
occurred **four times, twice inside its own planning session** (`PLAN.md:396-400`,
`ORCHESTRATOR-LOG.md:302-303`) — flips 3 of 16 mutations from `SURVIVED` to `RED (signature
MISMATCH)` and takes the sweep from 16/16 to 13/16.

**This is the precise statement of what would have to be true for D5's acceptance to be wrong.**
D5's argument concerns TAP leaves and is correct. What it did not examine is the converse: the only
mutations that *execute* the runner are the three that must stay green, so every non-hermetic
dependency the runner acquires becomes a dependency of Phase 1's conformance number. The plan's
own R1 concedes the sweep is unmeasured; it does not connect that to `A2`.

There is a coherence cost too. `AGENTS.md:66` makes `npm test` the project's `verification_command`
that every agent must run before committing, and `tests/lib/tools.mjs:1-2` records the suite's
design intent that "a pinned PATH makes the mandated `npm test` fail on any box whose yq lives
elsewhere". On a branch named `steps/harness-portability`, Item 9 adds a Rust binary and a
machine-local, drifting code index to that command's hard requirements. R4 notes the `jq` half and
calls it acceptable; the graph-freshness half is not noted at all.

**Failure scenario.** Item 9 gate 4 goes 13/16 post-commit, on a machine where nothing is wrong
except that nobody ran `tokensave sync` today. Per the plan's own rule that is a reported decision,
so the phase closes red for an environmental reason.

**Minimal repair.** Either (a) keep the runner out of `scripts.test` and gate it as a separate
`test:recipes` step, or (b) split the runner's exit contract so that graph-derived checks (`A2`,
`D1`–`D7`) exit 3 `BLOCKED` *without* failing `npm test`, while doc-shape checks (`B*`, `C*`, `E*`,
`D8`–`D14`) stay fatal. (b) keeps the `&&` and D5's TAP reasoning intact. If neither, Item 9 must at
minimum declare `tokensave sync` as a precondition of gate 4 and state that the three `SURVIVED`
rows now depend on it.

### 4. The universal post-condition does not cover the two payload shapes the acceptance criterion names

**What is wrong.** `PLAN.md:355-359`: "if it parses as JSON, no top-level key matching `/_count$/`
is `0` and no top-level array-valued field is empty. That is the `count: 0` rule from the acceptance
criterion, generalised so a recipe added later without a bespoke assertion still cannot pass on an
empty result."

Both halves are false against measured payloads:

- `/_count$/` does **not** match the bare key `count`. `tokensave tool find_exact_symbol` returns
  `{"name":…,"count":0,"matches":[]}` — verified. `count: 0` is the literal phrase the acceptance
  criterion uses, and the regex misses it. Only the empty `matches` array catches this recipe.
- "no top-level **array-valued field**" does not apply to a payload that *is* a top-level array.
  Verified: `tokensave tool callers --node-id …` and `callees` both return bare JSON arrays. `[]`
  is non-empty stdout and has no fields, so it passes the universal post-condition outright. Three
  of the seven flagship recipes have this shape.

**Failure scenario.** The plan cites this as defence mechanism (b) against "a runner that shells out
and checks exit 0" (`PLAN.md:412-415`) and as the safety net for recipes added later without a
bespoke assertion. A future `ci-*` recipe returning `[]` at exit 0 passes — the exact class the
phase exists to kill, admitted through the door the plan built to stop it.

**Minimal repair.** Extend the post-condition to: parsed value is not `[]`, not `{}`, and no
top-level key matching `/(^|_)count$/` is `0`, and no top-level array-valued field is empty.

### 5. `E4` has no denominator

**What is wrong.** `PLAN.md:852-856`: "every `\b(\d{2,4}) tokens?\b` and `sub-(\d{2,4}) token`
occurrence in the three skill files equals `TOKEN_BUDGET`, **and** `TOKEN_BUDGET` equals the numeric
literal in `tests/constitution_skills.test.js`'s token bound, extracted by
`/estimatedTokens\s*<\s*(\d+)/`."

Both sides are "every match equals X" with no declared match count. Measured today there are exactly
three doc matches and exactly one source match:

```
constitution-query/SKILL.md:16   sub-300 token
constitution-query/SKILL.md:104  300 tokens
adr-manager/SKILL.md:88          300 tokens
```

Delete the three doc sentences, or refactor `estimatedTokens < 200` into a named constant
(`estimatedTokens < TOKEN_LIMIT`), and the regex returns zero matches and `E4` passes vacuously.
This is `ORCHESTRATOR-LOG.md:137-144` — "a leaf that never executed satisfies all four" — reproduced
one layer down, in the same iteration, in a check written to close a Phase-1 drift.

**Failure scenario.** Phase 3 renames the bound to a constant. `E4` goes silently green while the
doc/gate contract it exists to enforce is no longer checked at all.

**Minimal repair.** Declare the counts as frozen values: `TOKEN_BUDGET_DOC_SITES = 3`,
`TOKEN_BUDGET_GATE_SITES = 1`, and make `E4` assert both cardinalities before comparing values.
Consider extending the same rule to `E1`'s and `E3`'s locators, which already have denominators via
set/array equality against non-empty declared lists.

---

## Non-blocking findings

1. **The `COMMAND_SPANS` filter predicate is undeclared.** Space B is "every backtick span whose
   first token is a known CLI" (`PLAN.md:295-296`), but Table 4 declares no `KNOWN_CLIS`. The
   9-entry declared table pins the predicate from both sides *for the current corpus* — narrower
   and B2 under-counts, wider and it over-counts — so the closure claim holds today. It does not
   hold for a span added later: `` `docker compose up` `` is invisible under any plausible
   predicate. Combined with the `:274` mis-claim (Doc/gate contradiction 1), the implementer's
   likely move is to tune the predicate until the count is 9. Declare the list.
2. **Item 8's gate is satisfied by a crash.** `node tests/recipe-exec.test.js 2>&1 | rg -n
   '^(FAIL|BLOCKED)'` with expected output "zero FAIL lines" is also the output of a runner that
   throws on its first line (the stack trace matches neither anchor). Only Item 9 gate 1 reads the
   exit code. Give Item 8 the same `; echo "exit=$?"` form as Items 3 and 9.
3. **`parseDoc` strips frontmatter before the fence pass** (`tests/lib/markdown-sections.mjs:22-27`,
   `:31`). The three `SKILL.md` files have 4-line frontmatter, so `fences[].startLine` and
   `codeSpans[].line` will be file-line minus 4. `AGENTS.md` has none, so it is off by zero — the
   inconsistency is the trap. Nothing is asserted on line numbers, but `PLAN.md:443` says they are
   "reported in failure messages", where a systematically wrong number is worse than none. Item 1
   should add the frontmatter offset back.
4. **`E3`'s "bold-label list" is unqualified.** `MODEL_ROUTING.md`'s `## Complexity gate` section
   contains a non-bullet bold span — `Implementation is **always** `steps-implementer`` at `:38` —
   so a naive `/\*\*(.+?)\*\*/g` yields five labels, not four. The plan's own measurement used
   `rg '^- \*\*'`, which is the correct extractor; say so.
5. **`A5`'s name does not match what it checks** (see Space mismatches). Consider renaming it and
   giving the doc-side `TOKENSAVE_READONLY_TOOLS` control its own check id, or state explicitly
   that `B1` is what bounds the executed set.
6. **`E2` checks the wrong space** (see Space mismatches). `git ls-files --error-unmatch
   .pcp/MAP.json` exiting non-zero is the check that matches the sentence Item 6 writes.
7. **`A3`'s parser will see a line the frozen table does not model.** Every
   `tokensave tool <name> --help` ends with `Reserved flags: --json, --project <path>, --args
   <json>, -h/--help`, which is prose, not a parameter row. A `--`-matching parser picks up four
   phantom optionals and `A3` FAILs today, contradicting `PLAN.md:689`. R3 flags help-scraping
   generally; this specific line is worth naming.
8. **Table 1's `commandLines` says "unchanged" for 7 rows** (see Declared vs derived). Either
   transcribe them as literals or state that the C-suite does not cover them and drop the column
   for those rows.
9. **Citation off-by-one.** `PLAN.md:539` cites `tests/constitution_skills.test.js:234` for the
   `200` literal; it is at `:235` (`:234` is `assert.ok(`).
10. **Item 4 does four separable jobs under one gate** — split fences, repair CLI arguments, repair
    MCP arguments, and fix the false prose at `:66`. Its gate is a 21→5 FAIL-set reduction, which
    cannot distinguish "three of four done". Given `.agents/skills/` is a `repo-guard` read path
    (`tests/mutation-harness.mjs:336-340`, confirmed), a partial Item 4 leaves the tree in a state
    where the harness also refuses. Splitting the MCP-argument repair into its own item, gated on
    `C8` alone, would cost nothing and isolate the largest edit.
11. **Reuse is well judged.** Extending `parseDoc` rather than writing a second fence machine is
    right, and `tests/lib/markdown-sections.mjs:1-3` is the correct authority for it; `resolveTool`
    (`tests/lib/tools.mjs:9`) is reused unchanged; `expected.mjs`'s provenance rule
    (`:1-6`) is inherited rather than restated. One new module (`recipes.mjs`) with one caller is
    justified on the stated separation-of-duties grounds. I have no reuse blocker.

---

## Risks / unverified

- **R-a.** I did not run the mutation sweep (instructed not to, and `PLAN.md`'s C1 constraint is
  verified: `READ_PATHS` at `tests/mutation-harness.mjs:336-340` includes `.agents/skills/`, and
  `tests/lib/repo-guard.mjs:105-115` refuses on a dirty read path). Blocker 3's claim that a
  `BLOCKED` exit flips the three `SURVIVED` rows is reasoned from `mutation-harness.mjs:382` and
  `:587`, both of which I read, plus the three mutation definitions, which I read. It is an
  argument, not a measurement — the same standing as the plan's own R1.
- **R-b.** Blocker 2's reading A assumes the implementer's "non-assignment line" test is shell
  assignment (`VAR=value`). If it were read as "any line containing `:`", `"tool": …` would be
  excluded and `{`/`}` would still fail. I could not rule out a reading under which `C10` is `ok`
  today, but I could not construct one either.
- **R-c.** I did not check whether any file outside this plan cites an `AGENTS.md` line number
  (the plan's own R8 raises this and leaves it open). Blocker in Item 7 stands regardless of the
  answer, since it concerns ordering, not line numbers.
- **R-d.** `tokensave` 7.9.0 and `rtk` 0.42.1 only. Every measurement above is single-version.
- **R-e.** `tokensave tool status` returned `node_count 466, edge_count 129, file_count 53` at
  review time — a fifth reading, consistent with the plan's drift claim. I did not re-run it later
  in the session to observe drift myself.

---

## Item 7 — the fourth blocker, filed here because it is small and specific

I am counting this within the five above; it is **blocker 2's sibling** and I list it separately
only so it is not lost.

**`AGENTS.md` is 87 lines long — `wc -l` → 87.** Item 7 (`PLAN.md:804-807`) says the new bullet is
inserted "between `Tier 1` and `Tier 2`, **or after `Tier 2`**", and justifies the choice with
"This inserts one line into `AGENTS.md` after line 87 — below every `AGENTS.md` citation in this
plan, so no other line number shifts." Inserting after line 87 appends at EOF, producing the order

```
Tier 0 (Fast-Track / Planning Bypass), Tier 1 (Standard), Tier 2 (Architectural), Tier 1.5 (Middle)
```

`E3` requires the extracted list to **deep-equal** `COMPLEXITY_TIERS`
(`PLAN.md:533-538`), which is ordered `Tier 0, Tier 1, Tier 1.5, Tier 2`. Array deep-equality is
ordered. So the insertion point the plan recommends is the one that makes its own `E3` fail, and
the only insertion point that satisfies `E3` is after line 86 — which shifts line 87, i.e. the
`AGENTS.md:85-87` citation the plan makes at `:39`.

**Minimal repair.** State the insertion point as "after `AGENTS.md:86`, between Tier 1 and Tier 2",
drop the "or after Tier 2" alternative, and amend the `:39` scope citation to `:85-88`. (If you
would rather `E3` be order-insensitive, say so explicitly and change `COMPLEXITY_TIERS`'s
comparison to a set — but ordered is the better check, since a routing table whose tiers are out of
order is a real defect.)

---

## Verified (already paid for; the reconciler need not re-check)

- HEAD is `1353460`; working tree clean outside `.plans/`.
- All four measured `tokensave` defects reproduced verbatim, including the exit-0/exit-1 split and
  the `body` → `--symbol` correction. The plan's corrections to the orchestrator's digest are right.
- `rtk raw echo hi` → exit **127**, `rtk proxy echo hi` → exit **0**; `raw` absent from
  `rtk --help`'s `Commands:`; `proxy`, `run`, `git`, `npm`, `grep` all present, so `RTK_VERBS` and
  `RTK_VERBS_FLOOR` are both satisfiable.
- All seven repaired recipes execute at exit 0 with non-empty payloads, including the in-band
  `NODE_ID=$(… | jq -r ".matches[0].id")` form. `impact` returns `node_count 7` with `main` present,
  so `ENSUREDIR_IMPACT` and the `≥ 5` floor hold today.
- `TOKENSAVE_TOOL_PARAMS` matches all seven `--help` outputs exactly.
- `TOKENSAVE_READONLY_TOOLS` is disjoint from the binary's `[edit]` category (`str_replace`,
  `multi_str_replace`, … all under `[edit]` at listing line 22; the seven declared tools sit under
  `[analysis]`/`[discovery]`), so `A5` is `ok` today.
- Fence inventories, all four files: `constitution-query` 6 × `bash`; `code-intelligence` 7 ×
  `bash`; `adr-manager` `markdown, yaml, bash`; `AGENTS.md` **0**. Item 1's expected gate output
  `["markdown","yaml","bash"] 38` is **correct** — I measured 38 spans for `adr-manager`, and its
  frontmatter contains no backticks, so frontmatter-stripping does not change the count.
- Span inventory: the five `AGENTS.md` spans Table 3 declares are at `:25, :61, :63, :68, :76`
  exactly, and `:63` is `rtk raw <cmd>`.
- `C11`/`C12` are genuinely `ok` today: the `markdown` fence's eight headings match
  `ADR_TEMPLATE_HEADINGS` exactly, and the `yaml` fence parses under `yq` despite its 3-space
  indentation, yielding top-level `["decisions"]` and entry keys `= DECISION_ENTRY_KEYS`.
- `E2`'s command works: `git check-ignore -v .pcp/MAP.json` → `.gitignore:2:.pcp/` exit 0. The two
  registries disagree exactly as the plan measured.
- `E4`'s doc-side regexes yield exactly three hits, all `300`, at the three cited lines; there are
  no other `\d{2,4} tokens?` occurrences in the three skill files.
- `package.json:11` is verbatim as quoted; `"type": "module"` at `:5`.
- `resolveTool` is at `tests/lib/tools.mjs:9`; `parseDoc` CRLF normalisation at
  `tests/lib/markdown-sections.mjs:18`; the fence state machine at `:35-57`; module intent comment
  at `:1-3`. All as cited.
- `parseTap`'s regexes (`tests/mutation-harness.mjs:395-420`) require a digit after `ok`/`not ok`,
  so the plan's `ok   <id> — <name>` report shape is invisible to it. **C2 is sound.**
- The 16-mutation table has exactly three `outcome: 'SURVIVED'` rows, all with `mustFail: []` and
  `max: 0`; the other 13 fail `node --test` and short-circuit. **D5's TAP-leaf argument is sound.**
- `pcp.js` goldens: every one of the 12 cited line numbers is exact.
