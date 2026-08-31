# Phase 2 plan review — lens: coverage

## Lens

Does the plan repair the whole class — "a documented command that reports success while returning
nothing / while stating a contract the tooling does not honour" — or only the cited instances?

Repo `/Users/purplelephant/projects/pcp`, branch `steps/harness-portability`, HEAD `1353460`,
tree clean at review time except `.plans/`. Reviewed `.plans/phase-2/PLAN.md` (1064 lines).

## Verdict

**reject** — 7 blockers.

The plan's design is stronger than `PHASES.md` asked for and its `code-intelligence` repair is
correct and verified. It is rejected on coverage: **its unit of measurement is the fenced block,
while the class's unit is the command line.** 34 command lines live in the 14 runnable fences; the
gate declares 14 assertions. It also stops at four files while a complete second copy of the
recipe class — including an *executable* recipe that enforces the very 300-token bound Item 8
exists to retire — sits at `ai-docs/README.md:87-101` and is never disclosed.

---

## My independent enumeration

### Method (re-runnable)

Fence/span extraction with a state machine matching `parseDoc`'s
(`tests/lib/markdown-sections.mjs:33-57`) — CRLF-normalise, `/^ {0,3}(`{3,}|~{3,})(.*)$/`, close on
same char + bare info; inline spans matched per line **outside** fences with the plan's own regex
(PLAN.md:577). Script: `scratchpad/enum.mjs`. Every fence body then split into non-blank,
non-`#`-comment lines and each line executed individually via `execSync(line, {cwd: repoRoot})`,
exit code and trimmed byte count recorded (`scratchpad/runcmds.mjs`). Exit codes were **never read
through a pipe**. `grep` invocations prefixed `TOKENSAVE_DISABLE_GREP_HOOK=1`.

### The four in-scope files

| file | fences | runnable (`bash`) | **command lines inside fences** | all inline spans | spans in command shape |
|---|---|---|---|---|---|
| `constitution-query/SKILL.md` | 6 | 6 | **15** (`yq` ×12, `yq\|jq` ×3) | 23 | 2 (`yq`, `jq`, both `:30`) |
| `code-intelligence/SKILL.md` | 7 | 7 | **7** CLI lines + 6 embedded JSON objects | 24 | 2 declared (`:8`, `:25`) **+ 2 undeclared at `:26`** |
| `adr-manager/SKILL.md` | 3 | 1 | **12** (one `node -e` JS body) | 38 | 0 |
| `AGENTS.md` | 0 | 0 | 0 | 81 | 5 (`:25`, `:61`, `:63`, `:68`, `:76`) |
| **total** | **16** | **14** | **34** | **166** | **9 declared / 11 candidate** |

Fence counts, span counts and the `adr-manager` figure `["markdown","yaml","bash"] 38` (PLAN.md:596)
all reproduce exactly. The plan's fence inventory is correct.

### Class surface outside the plan's four files (live, shipped, undisclosed)

| location | what it is |
|---|---|
| `ai-docs/README.md:21-78` | **6 `bash` fences, 12 `yq`/`jq` command lines** — a near-verbatim duplicate of `constitution-query`'s recipe set |
| `ai-docs/README.md:86-102` | **an executable verification recipe** that throws above **300** tokens and prints `All queries verified under 300 tokens.` |
| `ai-docs/README.md:7,84,98,100` | four more live `300 token` statements |
| `plugins/pcp/skills/pcp/procedures/{init,actualize,prune}.md` | 4 `node $PCP …` command lines in 3 `bash` fences |
| `README.md:45-47` | a `npm test` fence with **no info string** |
| `plugins/steps/skills/steps/SKILL.md:207-222`, `README.md:9-13,28-41` | further info-string-less fences |
| `plugins/steps/skills/steps/SKILL.md:92`, `plugins/steps/README.md:61`, `plugins/steps/agents/steps-architect-pro.md:3,15` | further `middle-complexity` label sites Item 7 does not reach |

### Measured exit/payload behaviour

All 15 `constitution-query` commands: exit 0, non-empty (min 41 bytes at `:55`, max 906). The
archived audit's claim that the `yq` recipes are correct **is verified**, not inherited.

`adr-manager` fence 2 runs as a unit (exit 0, `All 1 ADR links synchronized.`); its 12 lines are a
single `node -e` JS body and are not independently executable.

`code-intelligence` as documented, re-measured: `find_exact_symbol` 0 / empty, `entities` 0 / empty,
`callers` 1, `callees` 1, `impact` 0 / empty, `body` 0 / non-JSON miss text, `status` 0 / valid.
Four silent, two loud, one correct — matching the orchestrator's measured facts.

---

## What the plan missed

Ordered by how much of the class each omission leaves unrepaired.

1. **The gate's unit is the fence; the class's unit is the command.** 15 `yq`/`jq` commands are
   covered by 6 substring assertions, and in every fence the anchor is produced by more than one
   command. 9 of the 15 can degrade to zero-byte output with the gate green.
2. **`ai-docs/README.md` is a second, executable copy of the entire class** — 12 duplicate `yq`
   command lines plus a recipe that *enforces 300*. Not in scope, and not disclosed either.
3. **Item 8 manufactures a new instance of the class it repairs**: after it, `:104` claims every
   payload is under 200 tokens while `:95`'s own recipe returns 255.
4. **Space B's extraction filter is undeclared**, so B2's set-equality closes over a set the
   implementer chooses. `code-intelligence:26`'s two `tokensave`-bearing spans sit exactly on that
   boundary and are neither declared nor excluded.
5. **`C10` as specified fails on `adr-verify`**, contradicting the plan's own frozen "C10..C12 ok
   today"; the cheap reconciliation weakens the only content-safety control.
6. **Item 7's third edit is ungated** and leaves `plugins/steps/skills/steps/SKILL.md`
   self-inconsistent at `:92` vs `:116`.
7. **Four `PHASES.md` citations are stale**, and two of the plan's five decisions argue against text
   that file no longer contains.

---

## Blockers

### 1. Fence-level assertions leave 9 of 15 `yq` commands unguarded — the silent class survives inside a repaired file

**What is wrong.** PLAN.md:457-462 declares one assertion per `constitution-query` fence
(`stdout contains "<shortcode>"`), and the execution layer runs `bash -c <whole fence body>`
(PLAN.md:352). Measured, each fence's anchor is produced by more than one of its commands:

```
fence0 :36 anchor=sec-auth-01 present=true    fence3 :72 anchor=r-b111 present=true
fence0 :39 anchor=sec-auth-01 present=true    fence3 :75 anchor=r-b111 present=true
fence0 :42 anchor=sec-auth-01 present=true    fence3 :78 anchor=r-b111 present=true
fence1 :49 anchor=d-8f3a      present=true    fence4 :85 anchor=l-e404 present=true
fence1 :52 anchor=d-8f3a      present=true    fence4 :88 anchor=l-e404 present=true
fence1 :55 anchor=d-8f3a      present=FALSE   fence5 :95 anchor=/api/v1/auth/login present=true
fence2 :62 anchor=c-e9a2      present=true    fence5 :98 anchor=/api/v1/auth/login present=true
fence2 :65 anchor=c-e9a2      present=true
total commands=15  commands whose own output lacks the fence anchor=1
```

`constitution-query/SKILL.md:55` (`… | .adr`) is guarded by **nothing at all** — its 41-byte output
contains no anchor and no other declared value.

**Failure scenario, reproduced.** Degrade two of `cq-security`'s three commands to zero-result
queries, keep the first:

```
$ bash -c "yq '.constitution.security.rules[] | select(.domain == \"auth\")' ai-docs/constitution.yaml
yq '.constitution.security.NOPE' ai-docs/constitution.yaml
yq -o=json ai-docs/constitution.yaml | jq '.constitution.security.rules[] | select(.domain == \"NOPE\")'"
exit=0   contains sec-auth-01: 1   bytes=195
```

Exit 0 ✓, trimmed stdout non-empty ✓, universal post-condition inapplicable (not JSON) ✓,
declared assertion `stdout contains "sec-auth-01"` ✓ — **`D8` passes** while two documented recipes
return nothing. Independently confirmed that this is the live failure mode:

```
$ yq '.decisions[] | select(.id == "d-NOPE")' ai-docs/constitution.yaml         → exit 0, 0 bytes
$ yq '.doesnotexist' ai-docs/constitution.yaml                                  → exit 0, "null"
$ yq -o=json ai-docs/constitution.yaml | jq '.decisions[] | select(.id=="d-NOPE")' → exit 0, 0 bytes
```

This is the phase's own defining defect — exit 0, empty payload — surviving inside the file the
phase certifies. The orchestrator's binding ruling is that the class is enumerated, not the sites;
the plan enumerates 14 blocks and asserts 14 times against 34 command lines.

**Minimal repair.** Make the declared unit the command line, not the fence: extend Table 1 so each
`commandLines` entry carries its own assertion, execute each line individually (the `ci-callers`
two-line recipes stay a unit — declare them as one entry with two lines and one assertion), and
apply the universal post-condition per command. Any command with no declarable payload — `:55` is
the only one — is an explicit, argued entry, not an omission.

### 2. Item 8 writes a contract that `constitution-query/SKILL.md`'s own recipe violates, and `E4` certifies it green

**What is wrong.** Item 8 (PLAN.md:842-844) rewrites `constitution-query/SKILL.md:104` from
"under 300 tokens" to "under 200 tokens". `E4` (PLAN.md:852-856) then asserts only that the doc's
*numerals* equal `TOKEN_BUDGET` and that `TOKEN_BUDGET` equals the suite's bound. It never measures
a payload. Measured, using the suite's own estimator (`tests/lib/token-estimate.mjs:4`) against the
six documented recipes:

```
Q1 (:36) 64   Q2 (:49) 123   Q3 (:62) 100   Q4 (:72) 72   Q5 (:85) 79
Q6 `yq '.spec' ai-docs/specs/auth-spec.yaml`  (:95)  →  255   ← over the 200 bound
```

`tests/constitution_skills.test.js` never covers this query: `QUERY_CASES`
(`tests/fixtures/expected.mjs:123-…`) case 6 is the *endpoint* slice
(`Domain spec endpoint slice (/api/v1/auth/login)`, `tests/mutation-harness.mjs:23`), not `.spec`.
So nothing measures it today and nothing measures it after Phase 2.

**Failure scenario.** Post-Item-8 the file says at `:104` "Every individual query payload must
remain under 200 tokens" and documents at `:95` a recipe returning 255. Today, at 300, the file is
self-consistent — **Item 8 creates the contradiction**, and `E4` is green either way. This is
exactly the defect D3 was accepted to remove, displaced one level down.

**Minimal repair.** Add to the runnable-recipe assertions a per-command
`estimateTokens(stdout) < TOKEN_BUDGET` check for every `cq-*` command (import the estimator; do not
re-implement it). It goes RED on `:95` today, which forces the real decision — re-scope `:104`'s
wording to the slice queries the bound governs, or replace/qualify the `.spec` recipe — instead of
shipping a false sentence under a green gate.

### 3. `ai-docs/README.md` holds a second, *executable* copy of the class, and E4's three-file scope certifies the contradiction resolved

**What is wrong.** PLAN.md:852-853 scopes `E4` to "the three skill files". Live, outside that scope:

- `ai-docs/README.md:7` — "typically < 300 tokens"
- `ai-docs/README.md:84` — "fit well within sub-300 token limits"
- `ai-docs/README.md:98` — `if (tokens > 300) throw new Error(...)`
- `ai-docs/README.md:100` — `console.log("All queries verified under 300 tokens.")`

The recipe at `:87-101` runs today:

```
$ bash -c "$(sed -n '87,101p' ai-docs/README.md)"
exit=0
Query 1 payload: ~33 tokens … Query 6 payload: ~107 tokens
All queries verified under 300 tokens.
```

It uses the `words × 1.3` estimator that Phase 1 removed precisely because it is fakeable
(`tests/lib/token-estimate.mjs:1-3`: "A whitespace-invariant word count (`words * 1.3`) cannot bind
a dense payload"). On the same six payloads its verdict and the suite's differ by 2-2.4×
(Q6: README 107, suite 255). It is a shipped verification recipe that certifies payloads the
enforced gate rejects — the strongest instance of the class in the repository, and it is
*executable*, which the three prose lines Item 8 fixes are not.

The plan's Out-of-scope section (PLAN.md:1044-1045) disposes of `ai-docs/**` in one clause —
"Byte-unchanged, per the brief. Nothing in this plan writes to either" — and never discloses that
the file contains 7 recipe fences and 4 more instances of the contradiction. Every argument in D3
(PLAN.md:1057-1061 and `ORCHESTRATOR-LOG.md`'s D3 ruling: "Leaving it would mean this iteration
shipped a documented contract its own gate rejects") applies to `ai-docs/README.md:98` a fortiori.

**Failure scenario.** Phase 2 closes with `E4` green, `PHASES.md`'s 300-vs-200 repair marked done,
and an agent that follows `ai-docs/README.md` verifying its payloads against a bound the repo
abandoned, with an estimator the repo deleted.

**Minimal repair.** The byte-unchanged constraint forbids editing it in this phase; it does not
forbid *reading* it. Extend `E4`'s scan to `ai-docs/README.md` and declare the four sites in the
plan. `E4` then goes RED, which is correct — and the orchestrator decides whether that is a Phase 2
item (accepting the C1 consequence that `ai-docs/` is a `repo-guard` read path,
`tests/mutation-harness.mjs:336-340`) or a recorded, owned deferral. Silence is the one option the
class rule excludes.

### 4. Item 7's third edit has no gate, and leaves the file it edits self-inconsistent

**What is wrong.** Item 7 (PLAN.md:803-810) edits three files. `E3` (PLAN.md:819-822) checks two:
`MODEL_ROUTING.md`'s `## Complexity gate` (verified present, `plugins/steps/MODEL_ROUTING.md:26`)
and `AGENTS.md`'s `## Adaptive Complexity Gate` (verified present, `AGENTS.md:81`). The third edit —
`plugins/steps/skills/steps/SKILL.md:116`, "middle-complexity phases" → `Tier 1.5 (Middle)` — is
checked by nothing in this plan and nothing in `tests/constitution_skills.test.js`.

Worse, the same file carries the old vocabulary a second time at `:92`:

```
plugins/steps/skills/steps/SKILL.md:92:| Review plan | `steps-plan-reviewer` (2-3, one lens each;
  `steps-architect-pro` may join as a critic lens on middle-complexity phases) | `REVIEW-<lens>.md` |
plugins/steps/skills/steps/SKILL.md:116:  middle-complexity phases plan cheap and then get …
```

Item 7 touches `:116` only. Its stated goal is "one vocabulary across three live files"; it ships
one file using two vocabularies, and no check can see it. The label class is also wider than the
plan's three files — `plugins/steps/README.md:61` and the canonical, marketplace-shipped
`plugins/steps/agents/steps-architect-pro.md:3,15` carry it too. (The droid copy is correctly
disclosed as Phase 3 at PLAN.md:1036-1042; these four sites are not disclosed at all.)

**Failure scenario.** An implementation that edits `MODEL_ROUTING.md` and `AGENTS.md` and forgets
`steps/SKILL.md:116` entirely passes `E3` and closes the item.

**Minimal repair.** Extend `E3` to assert the label vocabulary in
`plugins/steps/skills/steps/SKILL.md`'s complexity-gate bullet against `COMPLEXITY_TIERS`; add
`:92` to Item 7's edit list; disclose `plugins/steps/README.md:61` and
`plugins/steps/agents/steps-architect-pro.md:3,15` as in- or out-of-scope with an argument.

### 5. Space B's extraction filter is undeclared, so `B2`'s set-equality closes over an implementer-chosen set

**What is wrong.** PLAN.md:291-292 defines Space B as "Every backtick span whose first token is a
known CLI", and PLAN.md:298-302 rests the whole anti-narrowing claim on it: "Nothing falls between
them, because both spaces are closed by set-equality … a skip-list is structurally impossible."
Table 4 (PLAN.md:502-517) declares `REQUIRED_TOOLS`, `ALLOWED_HEADS`, `RTK_VERBS`,
`TOKENSAVE_VERBS` — **no constant defines "known CLI"**. The predicate that decides what enters the
set is the one thing not frozen, so the set-equality is `f(implementer's filter) == frozen table`,
not `extracted == frozen`.

The boundary is not hypothetical. `code-intelligence/SKILL.md:26` holds two spans the plan does not
declare:

```
:26  `tokensave_<command>`
:26  `tokensave: { tool: "<command>" }`
```

PLAN.md:270 lists two spans for that file and PLAN.md:274 asserts "Matches the orchestrator's digest
exactly" — the digest records `tokensave` ×3 for that file, at lines 8, 25 **and 26**. A prefix-style
filter admits `:26`, `B2` stays red after Item 5, and the cheapest green is to narrow the filter. A
strict-equality filter drops them silently. Both are conformant.

**Failure scenario (the tautology).** Nothing in the plan forbids
`isCommandSpan(text) => COMMAND_SPANS.some(s => s.text === text)`. `B2` then passes on day one,
passes after Item 5, and passes for ever — including after someone re-adds `rtk raw <cmd>` to
`AGENTS.md`, because the reintroduced span is not "known" and never enters the extracted set. That
is the cheapest edit that keeps the coverage number at 9/9 while reducing real coverage to zero.

**Minimal repair.** Freeze the predicate in Table 4 — e.g. `COMMAND_SPAN_CLIS = ['yq','jq',
'tokensave','npm','rtk','node','pcp']`, matched on the span's first whitespace-delimited token with
trailing punctuation stripped — and add a check that no *undeclared* span's first token resolves to
an executable on `PATH` via `resolveTool`. Declare `code-intelligence:26`'s two spans in Table 3
with their checks, or exclude them with a stated reason.

### 6. `C10` as specified fails `adr-verify`, contradicting the plan's own frozen FAIL set

**What is wrong.** PLAN.md:364-366 specifies the content-safety control: "for each non-comment,
non-assignment line, the first token must be in `ALLOWED_HEADS`", `ALLOWED_HEADS = ['yq','jq',
'tokensave','node']` (PLAN.md:504). `adr-verify`'s `commandLines` are declared "unchanged"
(PLAN.md:463) — the fence body is a 12-line `node -e '…'` JavaScript program
(`.agents/skills/adr-manager/SKILL.md:99-112`), whose non-comment, non-assignment lines begin:

```
for (const adr of adrs) {
  if (!fs.existsSync(adr)) {
    console.error("Missing ADR file referenced in constitution.yaml: " + adr);
    process.exit(1);
  }
}
console.log("All " + adrs.length + " ADR links synchronized.");
'
```

None of `for`, `if`, `console.error(…)`, `process.exit(1);`, `}`, `console.log(…)`, `'` is in
`ALLOWED_HEADS`. `C10` must therefore FAIL. PLAN.md:689-690 freezes the opposite: "`C7`/`D7` …,
`C10..C12` and `E2` are `ok` today — each verified above by direct execution."

**Failure scenario.** The implementer meets a check that cannot both be implemented as written and
match the frozen expectation. The cheapest reconciliation — apply the head check only to the fence's
*first* line — silences it and simultaneously exempts every continuation line of every future
recipe from the allowlist, which is the plan's second layer of defence for executing document text.

**Minimal repair.** Amend the classification: a runnable fence whose first line's head is `node`
with an `-e` script argument is a **single** command whose head is checked once; declare that
explicitly in the plan (it is one rule, not a per-recipe exemption), and restate the frozen `C10`
expectation accordingly. Alternatively declare `adr-verify` a `STATIC_BLOCKS`-adjacent "script
recipe" with its own declared shape check. Either way it is a plan decision, not an implementer's.

### 7. Four `PHASES.md` citations are stale, and two of the plan's five decisions argue against text that no longer exists

**What is wrong.** `PHASES.md` was amended in place by the orchestrator after the scouting digest
("`PHASES.md` is amended in place so the contradiction does not outlive this ruling";
"`PHASES.md:27` amended" — both in `ORCHESTRATOR-LOG.md`'s Phase 2 rulings). The plan was written
against the pre-amendment file and states its citations as verbatim fact
(PLAN.md:4-7: "Nothing is copied from `PHASES.md` … without re-measurement").

| plan says | current `PHASES.md` |
|---|---|
| `:23` says "`name="X"` → `--name X` across `…:36,51,66,81,97,112`" (PLAN.md:134-135, 148-150, 1049-1053) | `:23-26` states the **corrected** repair and cites ruling D1 by name |
| `:27` "names two doc contradictions and this is not one of them" (PLAN.md:861-862) | `:30-32` names the Middle-vs-Tier label **and** the 300-vs-200 bound explicitly |
| `:48` "places `pcp.js` out of scope" (PLAN.md:407, 1046) | `:48` is Phase 3's acceptance criterion; the `pcp.js` clause is `:55` |
| `:52` "archived artifacts stay as-is" (PLAN.md:1029, 1035) | `:52` is inside Phase 3's acceptance criterion; the archive clause is `:59` |

**Failure scenario.** D1 asks the orchestrator to "ratify a divergence from the phase's own written
repair list" that `PHASES.md:23-26` already prescribes. D3 presents Item 8 as a scope extension
"`PHASES.md` does not authorise" when `PHASES.md:30-32` authorises it in terms. An implementer
reading D1 could reasonably conclude `PHASES.md` still contradicts the plan and try to reconcile it.

**Minimal repair.** Re-cite against the current file (`:23-26`, `:30-32`, `:55`, `:59`) and restate
D1 and D3 as *ratified* rather than *proposed*. Nothing in the work changes.

---

## Non-blocking findings

1. **The universal post-condition does not generalise as claimed.** PLAN.md:355-359 and 723-727 say
   it means "a recipe added later without a bespoke assertion still cannot pass on an empty result".
   Measured, two shapes pass it:
   `tokensave tool body --symbol doesNotExistAnywhere` → exit 0, `No symbol named
   'doesNotExistAnywhere' found.` — non-empty, not JSON, no `*_count`, no array field;
   and a top-level empty JSON array (`callers`/`callees` return top-level arrays, verified) is not a
   "top-level array-valued *field*". Suggest: add "if it parses as JSON and the root is an array, it
   must be non-empty" and "stdout must not match `/^No .* found\.$/`".
2. **The plan miscounts its own defect.** PLAN.md:13-14 ("Five of them exit 0 and return an empty
   payload; two exit 1") and PLAN.md:130 ("Five of the seven recipes are silent") contradict the
   plan's own table at PLAN.md:126, which records `status` as exit 0 with a valid, non-empty payload.
   Measured: **four** silent, two loud, one correct. The framing sentence overstates by one.
3. **Four further runnable fences in live shipped docs are undisclosed** —
   `plugins/pcp/skills/pcp/procedures/actualize.md:5-7`, `init.md:9-11`, `prune.md:5-8`
   (`node $PCP …`), `README.md:45-47` (`npm test`). Verified *not* silent-class: all four `$PCP`
   subcommands are real (`plugins/pcp/skills/pcp/scripts/pcp.js:85,88,98,101` and `printUsage`), and
   an unset `$PCP` fails loudly. The `$PCP` resolution question is `PHASES.md`'s Phase 3. Worth one
   disclosed line so it is not rediscovered.
4. **Info-string-less fences are outside the classifier's declared domain.** PLAN.md:322-328
   enumerates `{bash,sh}` / `{markdown,yaml,json}` / else-fail. Live files contain fences with an
   empty info string (`README.md:9,28`, `plugins/steps/skills/steps/SKILL.md:207`). None is in the
   four in-scope files today, so the rule holds — but it means the classifier fails closed on a
   legitimate shape, which will surface the first time someone adds a bare fence to a skill.
5. **`AGENTS.md:66`'s `verification_command: "npm test"` is outside Space B.** Its first token is
   `verification_command:`, so the verb-position filter never sees the `npm test` inside it, while
   `AGENTS.md:25`'s bare `npm test` span is checked against `package.json.scripts`. A rename of the
   `test` script would be caught at `:25` and missed at `:66`.
6. **`ALLOWED_HEADS` exempts assignments, and the plan's own repair introduces one.**
   `NODE_ID=$(tokensave tool find_exact_symbol …)` (PLAN.md:420) is an assignment, so the head check
   never inspects the command substitution. The frozen-table control still holds; noting it because
   the exemption exists specifically to accommodate recipes this plan writes.
7. **Diagnostic output from the runner is unconstrained.** C2 (PLAN.md:61-67) constrains the *report*
   lines. Under the three negative controls the runner executes inside the captured `npm test` stream
   and may print recipe stdout on failure; `parseTap` (`tests/mutation-harness.mjs:395-421`) would
   read a `not ok N - ` or `1..N` line appearing there as a leaf. Low likelihood, cheap to close by
   prefixing all diagnostics.

---

## What a conformant-but-wrong implementation would still pass

Concretely, from this lens, an implementation that satisfies every word of the plan still passes
with:

- **Any 9 of the 15 `constitution-query` commands returning nothing** (Blocker 1, reproduced).
  This is the phase's own defect class, inside a file the phase certifies.
- **`constitution-query/SKILL.md:55` broken in any way that keeps exit 0 and any output** — it is
  guarded by no declared value at all.
- **A documented 255-token payload under a documented 200-token bound** (Blocker 2).
- **`ai-docs/README.md` still enforcing 300 with the estimator Phase 1 deleted** (Blocker 3).
- **`plugins/steps/skills/steps/SKILL.md` using two routing vocabularies at once** (Blocker 4).
- **`B2` reduced to a tautology** by defining "known CLI" as membership in `COMMAND_SPANS`
  (Blocker 5) — the cheapest edit that holds the declared coverage number at 9/9 while making
  Space B blind to any span, including a re-added `rtk raw`.
- **A future `tokensave tool body` recipe naming a symbol that does not exist** — exit 0, non-empty,
  non-JSON, passes the universal post-condition (Non-blocking 1).
- **The prose above every fence**, which the plan states plainly and correctly at PLAN.md:731-733.
  `:66`'s false comment is repaired by name; nothing prevents the next one.

---

## Verified (paid for — the reconciler need not re-check)

- Fence inventory 6 / 7 / 3 / 0 and the post-repair 13-fence layout for `code-intelligence`; Table 1
  ∪ Table 2 = 22 = 13 + 6 + 3, and `14 8 9` (PLAN.md:622) is internally consistent.
- Item 1's expected gate output `["markdown","yaml","bash"] 38` — reproduced with the plan's own
  span regex (PLAN.md:577); whole-document and per-line application both yield 38, and no span
  crosses a newline, so the regex's `[\s\S]` is currently harmless.
- All 15 `yq`/`jq` commands: exit 0, non-empty. **The archived audit's claim is true**, verified by
  execution rather than inherited.
- `adr-manager`'s static blocks: the `yaml` block parses under `yq` despite its 3-space indent,
  top-level keys `["decisions"]`, entry keys exactly `id,title,status,cluster,date,summary,adr` =
  `DECISION_ENTRY_KEYS`; the `markdown` block's 8 headings match `ADR_TEMPLATE_HEADINGS` exactly.
  `C11`/`C12` are `ok` today as declared.
- Every repaired `code-intelligence` recipe in Table 1 executes with a payload satisfying its
  declared assertion: `find_exact_symbol --name ensureDir` → `count: 1`, kind `function`, file
  `plugins/pcp/skills/pcp/scripts/pcp.js`; `entities --file …` → `PCP_SYMBOLS` ⊆ names (missing: none);
  `callers --node-id` → `["resolveTargetFile","handleInit","handleMint","handleActualize"]`;
  `callees --node-id --max-depth 1` → `["ensureDir"]`; `impact` → `node_count 7` ⊇ `ENSUREDIR_IMPACT`;
  `body --symbol ensureDir` → `match_count 1`, qualified name ends `::ensureDir`, body contains
  `ENSUREDIR_BODY_LINE`; `status` → all counts > 0.
- The node-ID resolution failure mode is **loud**: an unresolvable name yields `NODE_ID=null` and
  `tokensave tool callers --node-id null` exits **1**; the fence exits 1.
- `rtk raw echo hi` → exit **127** (measured without a pipe), `[rtk: No such file or directory
  (os error 2)]`. `raw` absent from `rtk --help`; `RTK_VERBS_FLOOR = proxy, run, git, npm, grep` all
  present. `tokensave tool`'s `[edit]` category lists exactly the six tools PLAN.md:367-369 names,
  disjoint from `TOKENSAVE_READONLY_TOOLS`, so `A5` is implementable.
- Source citations, all opened and correct: `tests/mutation-harness.mjs:336-340` (`READ_PATHS`),
  `:395-421` (`parseTap`), `:424-433` (`tapIntegrity`), `:586` (`run.status === 0` for `SURVIVED`);
  `tests/lib/repo-guard.mjs:103-116`; `tests/lib/markdown-sections.mjs:1-3,18,33-57`;
  `tests/constitution_skills.test.js:233-237` (`estimatedTokens < 200`); `package.json:11`;
  `tests/lib/tools.mjs:9`; `tests/fixtures/expected.mjs:3-6,17,49-55,~222-231`;
  `pcp.js:70,86,218,219,253,264,343,345,407,413,449,451` — all twelve exact;
  `AGENTS.md:43-44,63,73-79,81,85-87`; `MODEL_ROUTING.md:26,30,31,32,35`;
  `plugins/steps/skills/steps/SKILL.md:113-117`; `.gitignore:2`;
  `constitution-query/SKILL.md:16,104,105`; `adr-manager/SKILL.md:67,88`.
- C2's TAP-invisibility argument holds: `ok   <id> — <name>` does not match
  `/^\s*(not )?ok \d+ - /` (two spaces before the id, no digit).
- The mutation table's negative controls and their targets, read at
  `tests/mutation-harness.mjs:294-330`; no mutation anchors a string on any line Items 4-8 edit.
  `skill-heading-renamed` anchors `\n## Operational Guardrails\n` in `adr-manager/SKILL.md`, which
  Item 8 does not touch (`:88` is inside the yaml fence at `:81-90`).
- Baselines re-measured today: `npm test` → exit 0, `# tests 66 / # pass 66 / # fail 0 /
  # skipped 0 / # todo 0`, `15/15 guard self-test checks passed`.

## Risks / unverified

- **The mutation sweep was not run** — the brief forbids `node tests/mutation-harness.mjs`. The
  plan's C3/C1 reasoning (PLAN.md:69-87, R1, R2) is untested here as it is in the plan. Item 9
  gate 4 remains the only place it becomes a measurement.
- **`.pcp/MAP.json` divergence** (PLAN.md:196-210, Item 6) was not re-derived; `.pcp/` is
  git-ignored (`.gitignore:2` confirmed) and machine-local, so its contents are not a stable fact
  and Item 6's `E1`/`E2` do not depend on them.
- **`ai-docs/README.md`'s recipes were executed read-only**; I did not enumerate whether any of its
  12 duplicate command lines diverges semantically from `constitution-query`'s. Blocker 3 rests on
  the four `300` sites and the executable recipe, all of which I ran.
- **`tokensave`/`rtk` help-text scraping** (`A3`, `A4`) was checked only against the installed
  `tokensave 7.9.0` / `rtk 0.42.1`; the plan's R3 stands unchanged.
- **`jq` portability** (plan R4) not checked beyond this machine (`/usr/bin/jq`).
- I did not attempt to determine whether the fence-per-command change in Blocker 1's repair moves any
  Phase 1 frozen enumeration; the runner contributes no TAP leaves either way (C3), so it should not,
  but that is an argument, not a measurement.
