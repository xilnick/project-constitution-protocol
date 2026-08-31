# Phase 2 plan review — executability and gate integrity

Reviewed: `.plans/phase-2/PLAN.md` at HEAD `1353460`, branch `steps/harness-portability`.
Every measurement below was taken by me today, unpiped, in `/Users/purplelephant/projects/pcp`.

## Verdict

**reject** — 5 blockers.

Three of the five require edits to plan-owned frozen tables (Tables 1, 3, 4 and the frozen FAIL
set), which the implementer is forbidden to make. The design is sound and most of the plan's
measurements reproduce exactly; the defects are in the gate's own arithmetic and in two places
where the plan's stated closure property does not exist.

---

## Gate-by-gate

| item | gate command | measured now | can it fail? | evidence |
|---|---|---|---|---|
| 1 | the `parseDoc(...).fences` one-liner (`PLAN.md:586`) | exit 1, `TypeError: Cannot read properties of undefined (reading 'map')` | **yes** | reproduced verbatim; `tests/lib/markdown-sections.mjs:58-64` returns no `fences`/`codeSpans` |
| 1 (expected after) | `["markdown","yaml","bash"] 38` | **correct** | — | replicated the plan's fence state machine + span regex over `adr-manager/SKILL.md`: 3 fences (`markdown`,`yaml`,`bash`), **38** spans |
| 2 | `import('./tests/fixtures/recipes.mjs')` | `Cannot find module` | **yes** | file absent |
| 2 (expected after) | `14 8 9 proxy` | Table 1 = 14 rows, Table 2 = 8, Table 3 = 9 — arithmetic correct | weak gate (lengths only) | `PLAN.md:450-463`, `:472-479`, `:489-498` |
| 3 | `node tests/recipe-exec.test.js; echo "exit=$?"` | `Cannot find module`, `exit=1` | **yes** | reproduced |
| 3 (frozen FAIL set) | exit 1 with "exactly these 21 ids" | **inconsistent — see Blocker 1** | n/a | `PLAN.md:677-691` |
| 4 | `node … 2>&1 \| rg -n '^(FAIL\|BLOCKED)'` | n/a (runner absent) | yes, but pipe-blind — Blocker 5 | `PLAN.md:729` |
| 5 | same piped form | n/a | yes, pipe-blind | `PLAN.md:756` |
| 6 | same piped form | n/a | yes, pipe-blind | `PLAN.md:781` |
| 7 | same piped form | n/a | **cannot be closed by Item 7's edits — Blocker 2** | `PLAN.md:817-828` |
| 8 | same piped form, success = **zero** FAIL lines | n/a | **no — a crash satisfies it** | `PLAN.md:851,861` |
| 9 g1 | `node tests/recipe-exec.test.js; echo "exit=$?"` | `exit=1` | yes — this is the correct form | `PLAN.md:838` |
| 9 g2 | `node --test tests/pcp_skill.test.js tests/constitution_skills.test.js` | 66/66 (orchestrator-measured, not re-run — running it dirties the playground) | yes | — |
| 9 g4 | `node tests/mutation-harness.mjs` | post-commit only | yes, but late by construction (C1) | `tests/mutation-harness.mjs:336-340`, `tests/lib/repo-guard.mjs:105-115` |

Suite-A preconditions, all re-measured against the live binaries:

- **A1** — `yq`, `jq`, `tokensave`, `bash` all resolve. `resolveTool` (`tests/lib/tools.mjs:9-20`)
  throws on absence, so `BLOCKED` is reachable and is never a pass. ✅
- **A2** — `tokensave tool entities --file plugins/pcp/skills/pcp/scripts/pcp.js` → exit 0,
  `symbol_count: 50`; all six `PCP_SYMBOLS` present. Would be `ok` today. ✅
- **A3** — `TOKENSAVE_TOOL_PARAMS` (`PLAN.md:509-517`) matches `tokensave tool <n> --help` on all
  seven tools, **including `body → --symbol` and `callers/callees/impact → --node-id`**. ✅
- **A4** — `rtk --help` `Commands:` contains `proxy`, `run`, `git`, `npm`, `grep`; `raw` is absent.
  `RTK_VERBS` and `RTK_VERBS_FLOOR` both hold. ✅
- **A5** — implementable and true: `tokensave tool` prints an `[edit]` category containing exactly
  `ast_grep_rewrite, insert_at, insert_at_symbol, multi_str_replace, replace_symbol, str_replace`;
  disjoint from `TOKENSAVE_READONLY_TOOLS`. ✅

---

## The FAIL-set arithmetic

**Does not check out.** Three mutually inconsistent numbers, and the pre-Item-4 baseline is wrong
whichever reading you take.

- The enumeration at `PLAN.md:681-686` lists **19** ids: `B1 B2` (2), `C1..C6` (6), `C8` (1),
  `C9` (1), `D1..D6` (6), `E1 E3 E4` (3).
- `PLAN.md:677-678` says "**exactly these 21** ids".
- Item 4's stated closures (`PLAN.md:735-738`) are `B1`, `C1-C6`, `C8`, `D1-D6` = **14**, but its
  transition is `21 → 5` (`PLAN.md:731,733`), i.e. **16**.

The residual chain is self-consistent and correct: Item 4 → `B2 C9 E1 E3 E4` (5), Item 5 → `E1 E3
E4` (3), Item 6 → `E3 E4` (2), Item 7 → `E4` (1), Item 8 → 0. The subsets are disjoint. **Only the
frozen starting set is wrong**, and it is the gate for Items 4-8, so it must be re-derived before
Item 3 is implemented.

My derivation from the plan's own check definitions gives **22**, not 19 or 21 — see Blocker 1 for
the three ids at issue (`C7`, `D7`, `C10`).

Downstream inventory arithmetic **does** check out:

- Post-repair fences = 13 (`code-intelligence`) + 6 (`constitution-query`) + 3 (`adr-manager`) +
  0 (`AGENTS.md`) = **22** = `RUNNABLE_RECIPES` (14) ∪ `STATIC_BLOCKS` (8). ✅
- Today's extracted fence set = 7 + 6 + 3 + 0 = 16 ≠ 22, so `B1` genuinely fails today. ✅

---

## Blockers

### 1. The frozen FAIL set is internally inconsistent, and three checks it declares `ok` cannot pass today

`PLAN.md:677-691` enumerates 19 ids, asserts 21, and separately declares `C7`/`D7`/`C10` "`ok`
today — each verified above by direct execution."

**`C7` and `D7` cannot be `ok`.** `ci-status` is keyed `(code-intelligence, fenceIndex 12)`
(`PLAN.md:456`). `code-intelligence/SKILL.md` has **7** fences today, indices 0-6 — openers at
lines 34, 49, 64, 79, 95, 110, 125. There is no fence at index 12, so neither the static-shape
check nor the execution check has a block to read. The plan's "verified by direct execution" is a
verification of the *command* (`tokensave tool status` → exit 0, real payload — I reproduced it),
not of the *check*, which is keyed to a block that will not exist until Item 4 creates it.

**`C10` cannot be `ok`.** `C10` asserts every runnable-recipe line head is in
`ALLOWED_HEADS = ['yq','jq','tokensave','node']` (`PLAN.md:504,655,365-367`). Fence 0's body today
(`.agents/skills/code-intelligence/SKILL.md:35-44`) contains the non-comment, non-blank lines
`{`, `"tool": "find_exact_symbol",`, `"arguments": {`, `"name": "executePhase"`, `}`, `}` — six
heads, none allowed. The same holds for fences 1-5.

Adding `C7`, `D7`, `C10` to the 19 enumerated gives **22**. Item 4 then closes
`B1, C1-C7, C8, C10, D1-D7` = 17, and 22 − 17 = 5, which reproduces the correct post-Item-4 set.

**Why this is a blocker, not a nit.** The frozen set is Item 3's acceptance criterion and Items 4-8
are graded as deltas off it. An implementer who reaches 22 FAIL lines against a table declaring 21
must escalate (`PLAN.md:691`), stalling the phase; one who instead "fixes" it will do so by
softening the missing-fence path (`C7`/`D7`) or narrowing `C10` — both of which weaken the gate.

**Minimal repair.** Re-derive the set from the check definitions and re-freeze it, and state two
things the plan currently leaves undefined:
(a) a declared recipe whose `fenceIndex` has no matching fence **FAILs** (it must not crash the
runner and must not be skipped);
(b) whether `C10` reads the extracted fence body or the declared `commandLines` — it must be the
extracted body, since `C10` is the pre-execution safety control.

### 2. Item 7's edits cannot close `E3` as `E3` is specified

`E3` requires the bold-label lists of both files to **deep-equal** `COMPLEXITY_TIERS`
(`PLAN.md:819-822`), whose order is `Tier 0, Tier 1, Tier 1.5 (Middle), Tier 2`
(`PLAN.md:533-538`). Deep equality of arrays is order-sensitive.

Measured — `plugins/steps/MODEL_ROUTING.md`, `## Complexity gate` (heading at `:26`), bullets
matching `^- \*\*`:

```
30: Tier 0 (Fast-Track / Planning Bypass)
31: Tier 1 (Standard)
32: Tier 2 (Architectural)
35: Middle
```

Item 7 changes only the **label** at `:35` (`PLAN.md:803`). The resulting order is
`T0, T1, T2, Tier 1.5` — not equal to `COMPLEXITY_TIERS`. `E3` stays red after the item that
exists to close it.

`AGENTS.md` has the same problem by permission rather than omission: `PLAN.md:804-805` allows the
new bullet "between `Tier 1` and `Tier 2`, **or after `Tier 2`**". Measured, `## Adaptive
Complexity Gate` bullets are at `AGENTS.md:85,86,87` in order T0, T1, T2; the second option yields
`T0, T1, T2, Tier 1.5` and fails `E3`.

**Minimal repair.** Item 7 must also move `MODEL_ROUTING.md:35`'s bullet above `:32`, and must
mandate the AGENTS.md insertion between Tier 1 and Tier 2. Alternatively declare `E3` set-based —
but that is a disclosed weakening and should be a recorded decision, not an implementation choice.

### 3. Half the runnable recipes have no declared `commandLines`, so the C-suite does not cover them — and the plan's safety argument is false as stated

Table 1 gives literal `commandLines` for the seven `ci-*` rows and writes "**unchanged**" for
`cq-security`, `cq-decision`, `cq-caveat`, `cq-requirement`, `cq-deferred`, `cq-spec` and
`adr-verify` (`PLAN.md:457-463`). `PLAN.md:652` scopes the static-shape suite to "`C1..C7` per
`ci-*` runnable recipe". Seven of fourteen executed recipes therefore have their **bodies pinned by
nothing**: `B1` is keyed on `(file, index, info)` only (`PLAN.md:648`), and layer 3 checks only the
declared payload anchor.

`PLAN.md:363-366` states the control as: "the primary control is that the runnable set is
plan-declared and set-equal — **nothing executes that is not in the frozen table**". That is true
of the *set* and false of the *content*.

Concretely: `adr-manager/SKILL.md:99-112` is a `node -e '<JS program>'` fence, `node` is in
`ALLOWED_HEADS`, and its declared assertion is `stdout matches /^All (\d+) ADR links
synchronized\.$/` with the captured integer equal to `|GOLDEN_DECISIONS|` — a string the program
itself prints. Once Item 9 lands, `npm test` — the command `AGENTS.md:68` mandates before every
commit — executes whatever JavaScript is in that markdown fence, checked only by its own output.
The same holds for the six `cq-*` `yq` bodies.

**Minimal repair.** Declare `commandLines` literally for all 14 rows (the bodies are short and I
have them: three `yq`/`jq` lines for `cq-security`, three for `cq-decision`, two for `cq-caveat`,
three for `cq-requirement`, two for `cq-deferred`, two for `cq-spec`, and the 12-line `node -e`
block for `adr-verify`), and extend the static-shape suite to `C1..C14`. This costs Table 1 seven
cells and makes the plan's stated safety property true.

### 4. Space B's filter is undeclared, so `B2`'s closure property does not exist

The plan's anti-narrowing claim is that "a skip-list is structurally impossible, because omitting
something from the declared table breaks set-equality" (`PLAN.md:300-302`).

Measured, replicating the plan's own span regex (`PLAN.md:577`) over the four in-scope files
outside fences: `adr-manager` **38**, `code-intelligence` **24**, `constitution-query` **23**,
`AGENTS.md` **81** — **166** spans. Table 3 declares **9** (`PLAN.md:489-498`). The predicate that
takes 166 → 9 is described only as "every backtick span whose first token is a known CLI"
(`PLAN.md:295-296`), and **no known-CLI set is declared anywhere in Table 4**. `REQUIRED_TOOLS` and
`ALLOWED_HEADS` (`PLAN.md:503-504`) contain neither `rtk` nor `npm`, both of which Table 3 needs.

Three consequences:

1. The filter **is** the skip list, and the implementer authors it. That is precisely the device
   the plan claims cannot exist.
2. The cheapest conformant filter — "extract spans whose text is in `COMMAND_SPANS`" — makes `B2`
   and `C9` tautologies. A future `rtk raw` written anywhere in these four files would not be
   extracted, would not be compared, and would not fail. The defect that motivated the phase would
   be undetectable the day after it is fixed.
3. Table 3 may be unsatisfiable as written, because real borderline spans exist today and their
   classification is a coin flip: `tokensave_<command>` and `tokensave: { tool: "<command>" }`
   (both `code-intelligence/SKILL.md:25`) and three bare `pcp` spans in `AGENTS.md`. Include any of
   them and the extracted multiset has more than 9 members and `B2` fails after Item 5.

**Minimal repair.** Add `KNOWN_CLIS` to Table 4 (at minimum `['yq','jq','tokensave','rtk','npm',
'node','pcp']` — or justify each exclusion), and state the tokenisation rule precisely enough that
a reader can reproduce the 9-row table by hand from the four files.

### 5. Items 4-8's gate reads the runner through a pipe and cannot distinguish green from a crash

The gate for Items 4, 5, 6, 7 and 8 is
`node tests/recipe-exec.test.js 2>&1 | rg -n '^(FAIL|BLOCKED)'`
(`PLAN.md:729, 756, 781, 817, 851`). It discards the runner's exit code — the exact gotcha
`ORCHESTRATOR-LOG.md:286-290` records as having already cost this iteration one wrong reading.

Item 8's success criterion is "the gate exits **0** with zero FAIL lines" but the command shown
cannot observe the exit code; what it observes is *zero output*. A runner that throws during module
load, or during Suite A before any report line is written, produces zero output and satisfies the
criterion. The phase's final item would then be certified by a runner that never ran a check.

Items 4-7 are partially protected because they expect a *non-empty* reduced set, so a crash reads
as wrong — but only by luck, and only if the reviewer counts lines.

**Minimal repair.** Use the form Item 9 gate 1 already uses (`PLAN.md:838`) throughout:
`node tests/recipe-exec.test.js; echo "exit=$?"`, and declare the expected exit per item
(`1` for Items 4-7, `0` for Item 8) alongside the expected FAIL set.

---

## Non-blocking findings

1. **The universal post-condition misses the key the acceptance criterion names.** `PLAN.md:356-358`
   fails a payload when a top-level key matching `/_count$/` is `0`. The measured silent failure is
   `{"name":"executePhase","count":0,"matches":[]}` — key `count`, which `/_count$/` does not match.
   It is caught here only by the sibling clause (empty top-level array), so `{"count":0}` with no
   array would pass. Repair: `/(^|_)count$/`.
2. **`ci-status`'s universal post-condition is machine-dependent.** Measured, `tokensave tool
   status` has a top-level array `sibling_projects` (5 entries on this box, populated from
   neighbouring initialised projects). On a machine with no siblings it is `[]`, and the "no empty
   top-level array" rule fails `D7` for a reason that has nothing to do with the document. Repair:
   apply the empty-array rule to declared fields only, or exempt `ci-status` explicitly.
3. **`rtk` is a hard dependency of `A4` but is absent from `REQUIRED_TOOLS`** (`PLAN.md:503`). `A4`
   is in Suite A so a missing `rtk` yields `BLOCKED`/exit 3 rather than a false pass — the design
   holds — but after Item 9 that makes `npm test` unrunnable on any box without `rtk`, and unlike
   `jq` (R4) this is not disclosed. `rtk` and `tokensave` are both per-user binaries in an
   iteration named `gate-repair-installability`.
4. **Item 1's reported line numbers will be body-relative, not file-relative.** `parseDoc` strips
   frontmatter before the scanning loop (`tests/lib/markdown-sections.mjs:22-33`), and the loop's
   index `i` counts `body` lines. `startLine`/`endLine`/`codeSpans.line` will be short by the
   frontmatter length in every failure message. Not asserted (`PLAN.md:444-445`), so cosmetic — but
   the messages will point at the wrong line.
5. **`ALLOWED_HEADS` exempts assignment lines, and three repaired recipes are assignments.**
   `PLAN.md:365` checks "each non-comment, non-assignment line"; `ci-callers`, `ci-callees` and
   `ci-impact` are `NODE_ID=$(tokensave … | jq …)` (`PLAN.md:452-454`). The head check never sees
   the command inside the substitution. Combined with Blocker 3 this is most of layer 2's defence.
   Repair: check the head inside `$( … )` too.
6. **Two citation slips, neither asserted by line number.** `PLAN.md:723` puts the comment
   `# CLI Recipe (by symbol name or node ID)` at `code-intelligence/SKILL.md:66`; it is at `:65`
   (`:66` is the command). `PLAN.md:539` pins `TOKEN_BUDGET` to
   `tests/constitution_skills.test.js:234`; the literal `estimatedTokens < 200` is at `:235`
   (`PLAN.md:241`'s range `:234-237` does contain it). `E4`'s regex is line-independent, so neither
   affects the gate.
7. **Item 7's "no other line number shifts" is wrong about the plan's own citation.**
   `PLAN.md:807-808`. Inserting the bullet between Tier 1 and Tier 2 — which Blocker 2's repair
   requires — shifts `AGENTS.md:87` to `:88`, and `PLAN.md:39` cites `AGENTS.md:85-87` in Scope.
   R8 is otherwise resolved in the plan's favour: `rg -n --hidden -g '!.plans' -g '!.git'
   'AGENTS\.md:[0-9]+' .` returns **nothing**, so no file or test outside `.plans/` cites an
   `AGENTS.md` line number.
8. **R2 (CRLF) is discoverable pre-commit more cheaply than the plan assumes.** The plan defers it
   to post-commit gate 4. Copying the four files into a temp directory, converting to CRLF and
   running the extractor there dirties no repo path, so `C1`'s guard refusal does not apply. This
   turns the phase's most-cited unverified assumption into a five-second check inside Item 1.

---

## What a conformant-but-wrong implementation would still pass

The plan's own list (`PLAN.md:864-903`) is honest and most of it holds — layers 1 and 3 really do
kill the exit-0-only runner, and `B2` really would kill a fence-only runner **if** Blocker 4 is
fixed. Adversarially, here is the cheapest implementation I can build that satisfies every gate as
written while leaving real defects in place:

1. **Execute the declared `commandLines` instead of the extracted fence body in layer 2.**
   `PLAN.md:352` says "`bash -c <body>`" without defining `body`. Executing the declared lines is
   the more deterministic reading and an implementer would plausibly choose it. Every `D*` then
   passes by construction — I verified all seven repaired `ci-*` commands return exit 0 with rich
   payloads, and the `cq-*`/`adr-verify` lines already work. The only thing then tying the document
   to reality is the static-shape suite — which by Blocker 3 covers 7 of 14 recipes. Result: the
   six `constitution-query` fences and the `adr-manager` `node -e` block can contain **anything**
   and the gate is green. This is the single cheapest way to pass Phase 2 while leaving recipes
   broken, and it needs no bad faith at all.
2. **Define "known CLI" as membership in `COMMAND_SPANS`.** `B2` and `C9` become tautologies (both
   directions of a set compared against itself). Everything is green today, including after Item 5's
   `rtk raw` → `rtk proxy` edit, and the check is permanently blind to any command span added later.
3. **Let a missing `fenceIndex` throw.** The runner dies before printing, Items 4-8's piped gate
   shows zero FAIL lines, and Item 8's criterion is satisfied exactly (Blocker 5).
4. **Emit `ok` for `C7`/`D7`/`C10` unconditionally** to reach the declared 21 (Blocker 1). This is
   the specific artifact-follows-gate move the frozen-table rule exists to prevent, and the plan's
   own text invites it by asserting those three are `ok` today.

Fixing Blockers 1, 3, 4 and 5 closes all four routes. I could not find a fifth after that.

---

## Verified

Re-measured or re-read; the reconciler does not need to pay for these again.

- **All seven repaired `ci-*` recipes execute and satisfy their declared payload assertions.**
  `find_exact_symbol --name ensureDir` → `count: 1`, `kind: "function"`,
  `file: "plugins/pcp/skills/pcp/scripts/pcp.js"`;
  `callers --node-id …` → JSON array, length **4**, names exactly `ENSUREDIR_CALLERS`;
  `callees --node-id <handleInit> --max-depth 1` → array length 1, `["ensureDir"]`;
  `impact --node-id …` → `node_count: 7` (≥ 5), `edge_count: 6`, all six `ENSUREDIR_IMPACT` names
  present; `body --symbol ensureDir` → `match_count: 1`, `qualified_name` ends `::ensureDir`;
  `entities --file …` → `symbol_count: 50`, all six `PCP_SYMBOLS` present; `status` → real payload.
- **`TOKENSAVE_TOOL_PARAMS` is exact** against `tokensave tool <n> --help` for all seven tools,
  including D1's ratified corrections (`body → --symbol`, `callers/callees/impact → --node-id`,
  `entities → --file`).
- **`rtk`**: `raw` absent from `Commands:`; `proxy` present ("Execute command without filtering but
  track usage"); `RTK_VERBS_FLOOR = ['proxy','run','git','npm','grep']` all present.
- **`A5` is implementable and passes**: `tokensave tool` prints an `[edit]` category with exactly
  the six tools `PLAN.md:367-369` names, disjoint from `TOKENSAVE_READONLY_TOOLS`.
- **Fence inventory**: `code-intelligence` 7 (all `bash`), `constitution-query` 6 (all `bash`),
  `adr-manager` 3 (`markdown`, `yaml`, `bash` — the `yaml` opener at `:81` is indented three
  spaces, inside `FENCE`'s ` {0,3}` allowance), `AGENTS.md` **0**. Matches the plan.
- **The `adr-manager` static validators pass today.** The `yaml` block parses under `yq` despite its
  three-space indent; top-level keys `["decisions"]`; entry keys exactly `DECISION_ENTRY_KEYS`.
  The `markdown` block's headings are exactly `ADR_TEMPLATE_HEADINGS`, in order.
- **`E2` passes**: `git check-ignore -q .pcp/MAP.json` → exit 0.
- **`E4`'s inputs**: exactly three `NN token(s)` occurrences exist across the three skill files —
  `adr-manager/SKILL.md:88`, `constitution-query/SKILL.md:16`, `:104`, all `300`. The enforced bound
  is `estimatedTokens < 200` at `tests/constitution_skills.test.js:235`; the plan's extraction regex
  `/estimatedTokens\s*<\s*(\d+)/` matches it and nothing else.
- **Every `pcp.js` golden is real.** `ensureDir` at `:218`, body line `await fs.mkdir(dirPath, {
  recursive: true });` at `:219`; call sites `:264` (`resolveTargetFile`, `:253`), `:345`
  (`handleInit`, `:343`), `:413` (`handleMint`, `:407`), `:451` (`handleActualize`, `:449`);
  `main` at `:70` calls `handleInit` at `:86`.
- **Every `expected.mjs` citation is real**: `sec-auth-01` `:17`, `d-8f3a` `:49`, `c-e9a2` `:60`,
  `r-b111` `:70`, `l-e404` `:79`, `/api/v1/auth/login` `:96`; decision entry key order at `:49-56`
  is `DECISION_ENTRY_KEYS`; `GOLDEN_DECISIONS` at `:223-231` has length 1, matching the recipe's
  current `All 1 ADR links synchronized.`; the provenance-rule header is at `:1-6`.
- **Every `AGENTS.md` citation is real**: `npm test` `:25`, model-routing agreement `:43-44`,
  `tokensave` `:61`, `rtk raw <cmd>` `:63`, `tokensave tool status` `:68`, five phases `:73-79`,
  tiers `:85-87`.
- **Every `code-intelligence/SKILL.md` citation is real**: `:8`, `:25`, `:36`, `:51`, `:66`, `:81`,
  `:97`, `:112`, `:127`, MCP `callers` block `:69-74`, sections `:32-121` and `:123-128`.
- **`constitution-query`** `:16`, `:30` (both `yq` and `jq` spans), `:104`, `:105`; **`adr-manager`**
  `:67`, `:88`, `:99-112`.
- **C2 is correct.** `parseTap` (`tests/mutation-harness.mjs:395-420`) matches exactly the five
  shapes the plan names; `tests/lib/repo-guard.mjs:274` emits `ok  ` / `FAIL ` with no digit, which
  is why the existing selftest is invisible to it. The runner's mandated shape is safe.
- **C3/D5's mechanism is sound as far as the code goes.** `package.json:11` is verbatim what the
  plan quotes. `runNpmTest` (`tests/mutation-harness.mjs:380-383`) spawns the whole `&&` chain and
  the harness reads `run.status`. Under a RED mutation `node --test` fails first, so the runner is
  never reached and contributes no leaves. Under the three declared-`SURVIVED` controls
  (`:294`, `:308`, `:322`) `node --test` passes, the runner runs, and a non-zero exit makes
  `run.status !== 0`, which `:587` requires to be 0 for `SURVIVED`; `:605` then reports
  `declared SURVIVED, measured RED`. The negative controls do cover the runner, and no table
  amendment is implied. `crlf-frontmatter` targets `.agents/skills/constitution-query/SKILL.md` and
  `parseDoc` normalises CRLF at `tests/lib/markdown-sections.mjs:18` before any scanning, so the
  reasoning at `PLAN.md:82-87` is structurally correct.
- **C1 is correct**: `READ_PATHS` at `tests/mutation-harness.mjs:336-340` includes
  `.agents/skills/`, and `tests/lib/repo-guard.mjs:105-115` refuses on a dirty prefix match. The
  harness genuinely cannot serve as a mid-phase gate.
- **R8 is resolved**: no file outside `.plans/` cites an `AGENTS.md` line number.

---

## Risks / unverified

- **The full mutation sweep.** Not run — the tree must stay clean and `.agents/skills/` untouched.
  My C3/D5 conclusion is read off `mutation-harness.mjs:380-383, 395-432, 578-610` and
  `repo-guard.mjs:274`; it is an argument from the code, not a measurement. What would have to be
  true for it to be wrong: the runner emitting a line matching `^\s*(not )?ok \d+ - `, `^1\.\.\d+$`
  or `^# (tests|pass|fail) \d+$` — including inside an echoed payload in a failure message — or a
  negative control changing something a recipe reads. `benign-constitution-comment` adds a YAML
  comment (the `cq-*` `yq` queries are unaffected), `benign-adr-prose-reflow` reflows ADR prose
  (`adr-verify` counts links, not lines), and `crlf-frontmatter` is normalised away. I judge all
  three safe but did not observe them.
- **`npm test` 66/66** — not re-run; running it exercises a playground directory and I was told to
  leave the tree clean. Cited from the orchestrator's measurement.
- **Help-text scraping (`A3`, `A4`)** verified against `tokensave 7.9.0` and `rtk 0.42.1` only, as
  the plan's R3 says.
- **Blocker 1's count of 22** is my derivation from the plan's check definitions, not an
  observation — the runner does not exist. The *inconsistency* (19 enumerated vs 21 asserted vs 16
  implied by Item 4's delta) is arithmetic on the plan text and is not in doubt; which of 21 or 22
  is right depends on how the plan resolves `C10`'s subject, which is itself undefined.
- **`Item 2`'s gate output `14 8 9 proxy`** — the counts are arithmetically right against Tables
  1-3, but Table 3's count of 9 is only stable once Blocker 4's filter is declared.
