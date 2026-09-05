# Phase 2 plan reconciliation

Inputs: `.plans/phase-2/PLAN.md` (v1, 1064 lines) and three plan reviews, all `reject` —
`REVIEW-executability-gates.md` (5 blockers, 8 non-blocking), `REVIEW-coverage.md` (7 blockers,
7 non-blocking), `REVIEW-design-critic.md` (1 headline finding, 5 blockers + 1 sibling blocker filed
separately, 2 doc/gate contradictions, 1 derived-value finding, 11 non-blocking).

**48 findings in. 33 rows out** — overlapping findings are merged into one disposition and the row
names every reviewer who raised it. Every finding maps to exactly one row.

| disposition | rows | findings |
|---|---|---|
| `accept` | 21 | 33 |
| `accept-modified` | 11 | 14 |
| `reject` | 1 | 1 |

Reviewer keys: **G** = executability-gates, **C** = coverage, **K** = design-critic.
`G-B*` / `C-B*` / `K-B*` are blockers, `*-N*` non-blocking, `K-0` the critic's headline section,
`K-X*` its "Doc/gate contradictions found", `K-D*` its "Declared vs derived" finding.

Eight orchestrator rulings arrived after the first pass — **R-K** (nothing graph-dependent inside
`npm test`), the correction that four `PHASES.md` citations were stale, the withdrawal of **R-F**,
the on-merits argument for the `.spec` recipe change, the ratification of **D6**, the narrowing of
the partition boundary to "no binary the shipped suite already requires", the acceptance of **R4**
as an unowned residual, and the instruction to invert the `.spec` item's ordering. All are folded
in. R-K and the boundary narrowing change row **R26**'s remedy and the shape of the whole gate; the
citation correction was already row **R19**; the `.spec` argument strengthens row **R16**. See
*Rulings applied after the first pass* below.

---

## Dispositions

| id | reviewer(s) | finding | disposition | how / evidence |
|---|---|---|---|---|
| R01 | G-B1, K-B1 | Frozen FAIL set internally inconsistent (19 enumerated / 21 asserted / 16 implied by Item 4's delta) and unsatisfiable: `ci-status` is keyed to fence 12, which does not exist pre-repair, yet declared `ok`; the treatment of an unresolvable `fenceIndex` is undefined. | accept-modified | Both reviewers are right that the set is wrong and that the cause is a check keyed to a post-repair index. v2 states normatively that **Tables 1-2 indices are post-repair** and that an unresolvable `(file, fenceIndex)` is a **FAIL, never a skip, never a crash**, then re-derives the whole set from the pre-repair layout: **35** FAILs of **100** checks, with a one-line reason per id. Neither reviewer's count survives (G said 22, K said 24) because v2's check set is different — per command line, per file, a fifth file, and a two-runner partition. Verified pre-repair layout: 7 fences at `:34,49,64,79,95,110,125`, so `ci-entities`(2)/`ci-callers`(4)/`ci-callees`(6) address today's `callers`/`impact`/`status` fences and 8/10/12 plus all six `ci-mcp-*` do not resolve. |
| R02 | G-B1(b), C-B6, K-B2 | `C10`'s subject is undefined (extracted body vs declared `commandLines`); under the body reading it must FAIL today, contradicting the frozen "ok"; and it fails `adr-verify`, whose body is a 12-line JS program whose heads are `for`, `if`, `console.log(`, `}`. | accept-modified | Verified `adr-manager/SKILL.md:99-112` — the body is exactly as C describes. v2 dissolves `C10` into `C:<recipeId>`, whose subject is stated as the **extracted fence body**, and adds one declared **script-recipe rule**: a fence whose first command's head is `node` with `-e` is a single script command, head-checked once, body pinned verbatim by `commandLines`. That is one rule, not a per-recipe exemption, and it is why the exemption is safe. The head check also recurses into `$( … )` and splits on `\|` (see R11). |
| R03 | G-B2, K-B6 | Item 7 cannot close `E3`: relabelling `MODEL_ROUTING.md:35` in place leaves `T0, T1, T2, Tier 1.5`, and the plan's permitted `AGENTS.md` insertion "after line 87" is end-of-file. Both fail order-sensitive deep-equality. | accept | Verified: `MODEL_ROUTING.md` bullets at `:30,31,32,35` (Tier 2 spans `:32-34`, Middle `:35-36`); `wc -l AGENTS.md` → **87**, Tier 2 bullet at `:87`. v2's Item 8 **moves** the Middle bullet above Tier 2 and mandates insertion **after `AGENTS.md:86`**, dropping the "or after Tier 2" alternative; the Scope citation is restated as `:85-87` pre-repair, `:85-88` after. `E3` remains order-sensitive by decision, stated in v2. |
| R04 | G-B3, K-D1, K-N8 | `commandLines` reads "unchanged" for 7 of 14 rows, so their bodies are pinned by nothing; the C suite covers `ci-*` only; the plan's stated safety property ("nothing executes that is not in the frozen table") is true of the set and false of the content. | accept | Verified the concrete case: after wiring, `npm test` would execute the JavaScript in `adr-manager/SKILL.md:99-112` checked only by a string that program prints. v2 declares every command line verbatim for **all 20** runnable recipes (35 executions) and the C suite covers all 20 — and `C:<id>` is a document check for every row, including the seven whose *execution* is live, so the content pin sits inside `npm test` even where the execution does not. |
| R05 | G-B4, C-B5, K-N1, K-X1 | Space B's filter is undeclared, so `B2`'s set-equality closes over an implementer-chosen set; the cheapest filter (`text ∈ COMMAND_SPANS`) makes `B2`/`C9` tautologies; the two spans at `code-intelligence:26` sit on the boundary; and `PLAN.md:274`'s "Matches the orchestrator's digest exactly" is false — the digest records 3 inline for that file, the plan declares 2. | accept-modified | Verified `ORCHESTRATOR-LOG.md:265-267` records `code-intelligence` "7 fenced + **3** inline"; the plan declared 2. v2 declares `COMMAND_SPAN_CLIS = ['yq','jq','tokensave','rtk','npm','node']` with the tokenisation rule stated (first whitespace-delimited token, trailing `:;,.` stripped, exact membership), which selects `tokensave: { tool: "<command>" }` and rejects `tokensave_<command>` — reproducing the digest's 3 exactly. `pcp` is excluded with a stated reason. **The tautology is closed by a new check `B3`, not by the declared list**: `B3` runs the extractor over a frozen synthetic document containing `` `rtk raw <cmd>` `` and asserts the extraction equals a frozen expectation, so a predicate defined as membership in `COMMAND_SPANS` returns nothing there and fails. A per-file total-span census was considered and rejected — `B2`'s set-equality already fails on a newly matching span, and a census would go red on any prose edit. Two factual corrections to G-B4: there are **four** bare `pcp` spans in `AGENTS.md` (`:3,11,25,52`), not three; and the total span count across the now-five in-scope files is 180, not 166. |
| R06 | G-B5, K-N2 | Items 4-8's gate is `node … 2>&1 \| rg '^(FAIL\|BLOCKED)'`, which reports `rg`'s status; Item 8's "zero FAIL lines" criterion is satisfied by a runner that crashes before printing. | accept | Orchestrator ruling R-B, and independently correct. Every gate in v2 is `node <runner>; echo "exit=$?"` with a declared expected exit (`1` for Items 4-9, `0` for Item 10) **and** a declared expected FAIL-id list; Items 10 and 11 additionally declare the expected report-line count (100 / 81), which is what distinguishes green from a runner that printed nothing. |
| R07 | G-N1, K-B4, C-N1 | The universal post-condition misses the payload shapes the acceptance criterion names: `/_count$/` does not match the bare key `count`; `callers`/`callees` return **bare** top-level arrays, so a rule about "array-valued fields" never sees `[]`; and `No … found.` at exit 0 passes. | accept | All three shapes verified in the reviews and consistent with the measured `find_exact_symbol` payload in the plan's own defect table. v2's post-condition: non-empty trimmed stdout; not `/^No .* found\.$/`; and if JSON, the root is neither `[]` nor `{}` and no top-level `/(^\|_)count$/` key is `0`. |
| R08 | G-N2 | The "no empty top-level array field" rule is machine-dependent: `tokensave tool status` has a top-level `sibling_projects` array, populated from neighbouring projects, empty on a box with no siblings. | accept-modified | Verified: `sibling_projects` is a top-level array with 5 entries here. Accepted the defect; **rejected the reviewer's second option** ("exempt `ci-status` explicitly"), which is a skip-list entry. v2 drops the blanket array rule entirely and replaces the generalisation it was reaching for with a stronger layer-1 rule: **every declared command must carry at least one declared assertion**, so a recipe added later with no bespoke assertion cannot exist rather than cannot pass. |
| R09 | G-N3 | `rtk` is a hard dependency of `A4` but absent from `REQUIRED_TOOLS`, and after wiring that makes `npm test` unrunnable on a box without it — undisclosed, on a branch named `harness-portability`. | accept | The reviewer was right about the dependency and right about why it matters; ruling R-K then removed it from `npm test` altogether. v2 splits the tool set: `DOC_TOOLS = ['yq','git','sh','node']` resolved by `A1` as a document check, `LIVE_TOOLS = ['tokensave','rtk','jq']` resolved by `A6` as a live check. `git` is on the document side for the reason the reviewer gave for `rtk` — `E2` shells to it — and because it is already required inside `npm test` (`tests/lib/repo-guard.mjs:96`). |
| R10 | G-N4, K-N3 | `parseDoc` strips frontmatter before the scanning loop, so `fences[].startLine` and `codeSpans[].line` will be short by the frontmatter length in every failure message — 4 for the three `SKILL.md` files, 0 for `AGENTS.md`. | accept | Verified by running the extraction: `adr-manager` fences report body-relative openers 20/73/91 against file-relative 24/77/95. v2's Item 1 requires file-relative numbers and its gate 1 declares the expected output `[["markdown",24],["yaml",77],["bash",95]] 38`, explicitly noting that printing 20/73/91 is the bug. |
| R11 | G-N5, C-N6 | `ALLOWED_HEADS` exempts assignment lines, and three of the plan's own repaired recipes are `NODE_ID=$(tokensave … \| jq …)`, so the head check never sees the command inside the substitution. | accept | v2's head check strips a leading `VAR=` prefix, recurses into every `$( … )`, and splits on `\|`, checking every resulting segment's head. Folded into `C:<recipeId>` together with the script-recipe rule (R02) and the read-only-tool clause. |
| R12 | G-N6, K-N9, K-X2 | Two citation slips: `PLAN.md:723` puts the false comment at `code-intelligence/SKILL.md:66`, it is at `:65`; `PLAN.md:539` pins `TOKEN_BUDGET` to `constitution_skills.test.js:234`, the literal is at `:235`. | accept | Both verified by opening the files. `:234` is `assert.ok(`, `:235` is `estimatedTokens < 200,`, `:236` is the message string (which is what `PHASES.md:32` cites, and which also contains `200`). `code-intelligence/SKILL.md:65` is the comment, `:66` the command. v2 cites `:235` and `:65` and notes the `:236` variant so the next reader does not "correct" it back. |
| R13 | G-N7 | Item 7's claim that "no other line number shifts" is wrong about the plan's own Scope citation `AGENTS.md:85-87`; separately, no file outside `.plans/` cites an `AGENTS.md` line number, so v1's R8 is resolved in the plan's favour. | accept | Both halves folded: v2's Item 8 states the citation moves to `:85-88` and records the `rg -n --hidden -g '!.plans' -g '!.git' 'AGENTS\.md:[0-9]+' .` → nothing result inline, which retires v1's open risk R8. |
| R14 | G-N8 | The CRLF assumption (v1's R2) is discoverable pre-commit: copying the files to a temp directory and converting there dirties no repo path, so `repo-guard` does not refuse. | accept | v2's Item 1 gains **gate 2**, which does exactly that and compares the LF and CRLF fence/span inventories. v1's R2 is retired; C5 now says the control is measured, not reasoned. |
| R15 | C-B1 | The gate's unit is the fence while the class's unit is the command: 15 `yq` commands sit behind 6 assertions, 9 can degrade to empty output with the gate green, and `constitution-query:55` is guarded by nothing at all. | accept | Orchestrator ruling R-J, and the reviewer's reproduction is exact — I re-ran the degradation and got exit 0 / anchor present / two recipes returning nothing. v2 asserts **per command line**: 20 recipes, 35 executions, each with its own declared assertion plus a `maxTokens` bound. One factual correction: `:55` is not unguardable — its output is `ai-docs/decisions/ADR-0001-unified-esm.md` (41 bytes), which is the literal `GOLDEN_DECISIONS['d-8f3a'].adr` in `tests/fixtures/expected.mjs`, and v2 declares it as that command's anchor. |
| R16 | C-B2 | Item 8 manufactures a new instance of the class it repairs: after rewriting `:104` to 200, the file documents at `:95` a recipe returning 255 tokens, and `E4` — which compares numerals only — is green either way. | accept-modified | Measured independently with `tests/lib/token-estimate.mjs`: `yq '.spec' ai-docs/specs/auth-spec.yaml` → **255** tokens, 750 bytes; every other one of the 15 `cq` and 12 `rd` commands is ≤ 145. Accepted the defect. **Modified the repair**: the reviewer proposed adding a per-command token check that "goes RED on `:95` today, which forces the real decision". v2 adds the per-command `maxTokens TOKEN_BUDGET` check *and* takes the decision — `:95` and `ai-docs/README.md:74` become `yq '.spec \| keys'` (**23** tokens, measured), with the comments corrected. **The stated reason is no longer the bound.** Verified: `ai-docs/constitution.yaml:24` (`qual-hygiene-01`, `enforcement: strict`) prohibits "broad repository-wide grep or full-file dumping", and `tests/mutation-harness.mjs`'s `rule-inverted-unqueried` mutation anchors that sentence verbatim, so it is load-bearing text. `yq '.spec'` is a full dump of the spec file; the recipe was already non-conformant on the artifact's own merits, and the token bound is corroborating evidence. Items 9 and 10 and decision D3 now lead with the rule, because on the token argument alone this is the artifact-follows-gate inversion the iteration exists to correct. The alternative — a prose exception to both the bound and the rule — is a skip-list in prose and is offered as D3 rather than written. |
| R17 | C-B3 | `ai-docs/README.md` holds a second, executable copy of the whole class — 12 duplicate `yq` command lines, four `300 token` sites, and a recipe at `:86-102` that enforces 300 using the `words × 1.3` estimator Phase 1 deleted — and v1 disposes of it in one out-of-scope clause without disclosing any of it. | accept-modified | Verified every element: `:7`, `:84`, `:96` (`* 1.3`), `:98` (`> 300` throw), `:100`; 7 fences; the recipe runs at exit 0 and reports 107 tokens for the payload the enforced estimator scores 255. The reviewer's premise that the byte-freeze forbids editing it is **superseded by orchestrator ruling R-A**, so v2 does not stop at "extend `E4`'s scan and let it go red". `ai-docs/README.md` is a full member of the corpus: 6 declared runnable recipes (`rd-*`), 12 declared command lines, 3 declared spans, `B1`/`B2` closure, and Item 10 deletes the validation fence outright and replaces it with prose pointing at `npm test`. The replacement is prose and not a fence because a runnable `npm test` fence would be executed by the runner that `npm test` invokes — stated in v2 as the reason. It dirties the `ai-docs/` read path, so the sweep stays post-commit, which Item 11 already required. |
| R18 | C-B4 | Item 7's third edit (`steps/SKILL.md:116`) is checked by nothing, and the same file carries the old vocabulary again at `:92`; the label class is wider than three files — `plugins/steps/README.md:61` and `plugins/steps/agents/steps-architect-pro.md:3,15` are undisclosed. | accept-modified | Verified all six canonical sites by sweep: `MODEL_ROUTING.md:35`, `steps/SKILL.md:92,116`, `plugins/steps/README.md:61`, `steps-architect-pro.md:3,15` — count **6**; harness copies count **8**. v2's Item 8 edits all six plus `AGENTS.md`. The reviewer's proposed check (extend `E3` to `steps/SKILL.md`'s bullet) does not fit — `:113-117` is prose, not `- **Label**` bullets — so v2 uses a **residual census** instead: `E3c` asserts `CANONICAL_LABEL_RESIDUAL = 0` outside `harnesses/` and `HARNESS_LABEL_RESIDUAL = 8` inside it. The harness deferral is therefore counted, not ignored: adding a site fails, and silently closing them all also fails, forcing the Phase 3 decision to be taken deliberately. |
| R19 | C-B7 | Four `PHASES.md` citations are stale — the file was amended in place after the digest — and two of the plan's five decisions argue against text it no longer contains. | accept | Verified line by line against the current 59-line `PHASES.md`: `:23-26` states the corrected `tokensave` repair and cites ruling D1 by name; `:30-32` names **both** the Middle-vs-Tier label and the 300-vs-200 bound; the `pcp.js` clause is `:55`, not `:48`; the archive clause is `:59`, not `:52`. Every `PHASES.md` citation in v2 was re-read against the current file: `:23-26`, `:30-32`, `:32-35`, `:36`, `:42-47`, `:55`, `:59`. The arguments that existed only to justify diverging from amended text were **dropped, not preserved as errata** — v1's D1 ("`PHASES.md:23`'s stated repair is wrong at two of its six cited lines") and D3 ("Item 8 is a scope extension `PHASES.md` does not authorise") are restated as ratified, and v1's D4 is gone because `PHASES.md:32-35` now carries ruling D4 itself. One correction to the reviewer's description: current `:52` is a blank line, not "inside Phase 3's acceptance criterion" (that is `:48-51`); the substance — the clause moved to `:59` — is right. |
| R20 | C-N2 | The plan miscounts its own defect: "five silent, two loud" contradicts its own table, which records `status` as exit 0 with a valid payload. Measured: four silent, two loud, one correct. | accept | Confirmed from v1's own table at `PLAN.md:120-126`: `find_exact_symbol`, `entities`, `impact`, `body` are exit 0 with an empty or non-JSON payload — four. v2 says four throughout, in the Goal and in the defect section. |
| R21 | C-N3 | Four further runnable fences in live shipped docs are undisclosed: `pcp/procedures/{actualize,init,prune}.md` (`node $PCP …`) and `README.md:45-47` (`npm test`, no info string). | accept-modified | Verified the fences (`actualize.md:5-7`, `init.md:9-11`, `prune.md:5-8`, `README.md:45-47`) and the reviewer's finding that they are not silent-class. Disclosed in v2's Out of scope with the argument: the `$PCP` resolution question is `PHASES.md:42-47`, i.e. Phase 3, and bringing `README.md:45-47` in would require declaring `npm test` as a runnable recipe, which after Item 11 is `npm test` invoking itself. That second reason is mine, not the reviewer's, and it is why the deferral is not merely convenient. |
| R22 | C-N4 | Info-string-less fences are outside the classifier's declared domain; none is in the in-scope files today, but live files elsewhere have them. | accept | Verified: all 7 `ai-docs/README.md` fences are `bash`, so the claim still holds with the fifth file in scope; `README.md:9,28,45` and `steps/SKILL.md:207` are the live bare fences. v2's classification rule says explicitly that an **empty** info string fails, and states that failing closed on a legitimate shape is the intended direction. |
| R23 | C-N5 | `AGENTS.md:66`'s `verification_command: "npm test"` is outside Space B, so a rename of the `test` script would be caught at `:25` and missed at `:66`. | **reject** | The defect it names is already caught. `X6` checks `AGENTS.md:25`'s `` `npm test` `` span against `Object.keys(package.json.scripts)`; a rename of the `test` script fails that check, so the class — a documented command that does not exist — is closed. `:66` names no additional command; its span's first token is `verification_command:`, and extending the predicate to reach inside quoted values would also select every other quoted fragment in the corpus, including `` `tokensave: { tool: "<command>" }` ``'s inner `"<command>"`. Recorded in v2's Out of scope with that reason, per the rule that a rejection on scope grounds must be argued in the plan. |
| R24 | C-N7 | Runner diagnostics are unconstrained: under the three negative controls the runner executes inside the captured `npm test` stream and may print recipe stdout, which `parseTap` could read as a leaf. | accept | Verified `parseTap`'s five shapes at `mutation-harness.mjs:395-420`. v2's constraint C2 now binds diagnostics as well as report lines: every diagnostic line is prefixed `#recipe ` — a `#` followed by a non-space character, matching none of the five — on **every** line of multi-line captured output. |
| R25 | K-0 | Table 1's assertion column is descriptive English; no gate anywhere reads it; Item 2's gate reads four scalars. An implementation that replaced every declared assertion with the universal post-condition alone passes every gate in the phase. This is a strict weakening of the mechanism that saved Phase 1. | accept | The single most consequential finding in the wave, and it needs no bad faith. v2 makes assertions **structured data from a closed vocabulary** (`contains`, `maxTokens`, `jsonEq`, `jsonSuperset`, …), never prose, and Item 2's gate prints `<recipeId>.<n> <JSON of the assertion>` for all **35** executions plus seven scalars including `LIVE_CHECKS.length`. The plan freezes that printout as the expected output, so a narrowed or substituted assertion is visible in the gate itself — the same device Phase 1 used, restored. |
| R26 | K-B3 | Wiring the runner into `npm test` makes it depend on a live `tokensave` index, and because the only mutations that execute the runner are the three declared `SURVIVED`, `A2`'s `BLOCKED` exit 3 flips them and takes Phase 1's sweep from 16/16 to 13/16 on a machine where nothing is wrong but a stale graph. | accept | **Closed by design, not disclosed.** My first pass accepted the finding but rejected both remedies and settled for disclosure plus a `tokensave sync` precondition; that was wrong, and ruling R-K corrected it. Verified before applying: `git ls-files .tokensave/` → **0** tracked files, `.tokensave/` globally gitignored at `~/.gitignore_global:5`, zero `tokensave` references in either `npm test` file, `resolveTool('yq')` as the shipped suite's only binary dependency, and `ai-docs/constitution.yaml:5` declaring `verification_command: "npm test"` with `:20`'s `qual-gate-01` requiring it to return 0. A dependency absent from a fresh clone cannot sit inside the command the constitution names. v2 adopts the reviewer's remedy (a) in the shape the ruling specifies: `npm test` runs **`node tests/recipe-exec.test.js --hermetic`** (69 report lines), `npm run test:recipes` runs the unflagged full 100 and stays mandatory, and Items 4-11 gate on the full run so the residual chain is unaffected. Remedy (b) — splitting the exit contract so graph checks do not fail `npm test` — stays rejected as an allowance on a gate. Three controls stop `--hermetic` becoming one: the mode selects the frozen `LIVE_CHECKS` complement rather than applying a filter; it is the runner's only accepted argument, any other `argv` exiting 3 `BLOCKED` (Item 3 gate 3 measures this); and `B4` runs in both modes asserting the partition, that `LIVE_CHECKS` is non-empty, and both cardinalities. Item 11 gate 3 runs the hermetic mode under a `PATH` built from `DOC_TOOLS` only. |
| R27 | K-B5 | `E4` has no denominator: both sides are "every match equals X", so deleting the three doc sentences, or renaming `estimatedTokens < 200` to a named constant, makes it pass vacuously. | accept | Measured today: **7** doc sites (v1 said 3, because it scanned three files; `ai-docs/README.md` adds four) and exactly **1** gate site. v2 declares `TOKEN_BUDGET_DOC_SITES = 5` (post-repair, after Item 10 deletes `:98` and `:100` with the fence) and `TOKEN_BUDGET_GATE_SITES = 1`, and `E4` asserts both cardinalities **before** comparing any value. |
| R28 | K-N4 | `E3`'s "bold-label list" is unqualified; `MODEL_ROUTING.md:38` contains a non-bullet bold span, so a naive `/\*\*(.+?)\*\*/g` yields five labels, not four. | accept | Verified `:38` reads `Implementation is **always** \`steps-implementer\``, inside the `## Complexity gate` section. v2 declares the extractor as the per-line `/^- \*\*(.+?)\*\*/` the plan's own measurements used, and says so. |
| R29 | K-N5 | `A5`'s name does not match what it checks — it compares the table to the binary and never reads a recipe — and the doc-side control at `PLAN.md:366-368` has no check id in any suite. | accept | v2 renames `A5` to "the declared read-only tool set is disjoint from the binary's `[edit]` category" and states explicitly that it is a check on the table. The doc-side control (`tokensave tool <name> ∈ TOKENSAVE_READONLY_TOOLS` in any executed recipe) is given an owner: it is the third clause of `C:<recipeId>`, so it runs once per runnable recipe — and, because it compares against a frozen literal, it runs inside `npm test` while `A5` does not. |
| R30 | K-N6 | `E2` checks the wrong space: `git check-ignore` answers an ignore-pattern question and exits 0 for a path that is ignored *and* tracked anyway, while the sentence Item 6 writes is about trackedness. | accept | Measured both: `git check-ignore -q .pcp/MAP.json` → 0; `git ls-files --error-unmatch .pcp/MAP.json` → 1. v2's `E2` asserts both conditions, so the check now lives in the space the prose claim lives in. |
| R31 | K-N7 | `A3`'s parser will see `Reserved flags: --json, --project <path>, --args <json>, -h/--help`, pick up four phantom optionals, and FAIL today — contradicting the frozen "ok". | accept-modified | The underspecification is real and accepted; the factual claim is not. `A3` does not fail today under a correct parser — v2 declares the parser (lines strictly between `Parameters:` and the first `^Reserved flags:` or blank line, matching `/^\s+--(\S+)\s+\S+\s+(required\|optional)\b/`) and I ran it against all seven tools: it reproduces `TOKENSAVE_TOOL_PARAMS` exactly, `status` included as empty. `A3` stays `ok` in the frozen set, and the `Reserved flags:` line is named in v2 so nobody writes the naive parser. |
| R32 | K-N10 | Item 4 does four separable jobs — split fences, repair CLI arguments, repair MCP arguments, fix false prose — behind a single FAIL-set delta that cannot distinguish "three of four done"; splitting the MCP repair would cost nothing and isolate the largest edit. | accept | v2 splits it: **Item 4** splits the fences and repairs the CLI recipes (closes `B1.code-intelligence`, `C:ci-*`, `D:ci-*` — 15 checks); **Item 5** repairs the six MCP argument objects (closes `S1..S6` — 6 checks). Each has its own runner gate and its own artifact-level secondary gate. Item count goes from 9 to 11. |
| R33 | K-N11 | Reuse is well judged: extending `parseDoc` rather than writing a second fence machine, reusing `resolveTool`, inheriting `expected.mjs`'s provenance rule, one new module with one caller justified on separation-of-duties grounds. No reuse blocker. | accept | Confirmed and carried into v2. The one addition R-K forces — a `--hermetic` mode on the gate — is disclosed as a cost in risk R7, with three named controls: the mode selects a frozen declared set, it is the runner's only accepted argument, and `B4` asserts the partition in both modes. One runner file, no duplicated logic. |

---

## Rulings applied after the first pass

**R-F — withdrawn by the orchestrator; my pushback was upheld.** No action. The `ci-*` indices are
the post-repair layout, and v2 states that explicitly. R-F's second half — every declared index
validated, a non-resolving one a loud FAIL and never a silent skip — was adopted in the first pass
and stands.

**R-K — nothing graph-dependent inside `npm test`.** Verified before applying: `.tokensave/` is
globally gitignored (`~/.gitignore_global:5`) with `git ls-files .tokensave/` → **0** tracked files,
so the graph does not exist on a fresh clone or in CI; `npm test` today has zero `tokensave`
coupling; the shipped suite resolves exactly one binary, `resolveTool('yq')` at
`tests/constitution_skills.test.js:155,162,169` and `tests/lib/tools.mjs:27,31`; and
`ai-docs/constitution.yaml:5` declares `verification_command: "npm test"` while `:20`'s
`qual-gate-01` requires that command to return 0 before phase completion. The ruling is correct and
I did not implement around it. It becomes constraint **C4** and reshapes the gate — see the table
below. Row R26 carries the disposition.

The mechanism is the one the ruling specified: **one runner with a declared `--hermetic` mode**, not
two files. My first attempt used two runner files for the same partition; the ruling asked twice for
a flag, the declared-set requirement is satisfied either way by `LIVE_CHECKS` + `B4`, and a single
file removes the risk of two entry points drifting. The control I wanted from two files — "no flag
exists to abuse" — is recovered by making `--hermetic` the runner's *only* accepted argument, with
any other `argv` exiting 3 `BLOCKED` and Item 3 gate 3 measuring that.

**The `.spec` recipe changes on the artifact's own merits, and Item 9 now says so first.** Verified:
`ai-docs/constitution.yaml:24` carries `qual-hygiene-01`, `enforcement: strict`, and
`tests/mutation-harness.mjs`'s `rule-inverted-unqueried` mutation anchors that exact sentence, so
negating it must turn `npm test` red — the repository already spends a mutation slot defending it.
`yq '.spec'` is a full-file dump of the spec, which the rule prohibits.

My first application put this argument *second*, after the token bound, which is the
artifact-follows-gate reading with the order reversed rather than removed. Item 9's rationale now
opens with **"Why `:95` changes"** — the rule, its location, its mutation anchor, and the statement
that the recipe would be non-conformant if no token bound existed anywhere in this repository — and
only then reaches **"Why the three prose lines change, and why the bound is corroboration rather
than the reason"**. The 255 → 23 measurements and the mutation-table safety note are kept where they
were. Item 10's `:74` bullet and decision D3 already led with the rule and are unchanged.

Two judgements were needed that the ruling did not make. Both have since been ruled on, and both
went the same way — **the invariant is the failure mode, not the artifact**:

- **The `tokensave`/`rtk` binaries are treated like the graph** (v2's **D6**, ratified). Ruling R-K
  named the graph; `X3,X4,X5,X7,X8,X9,X10` need only the binary. But neither binary exists on a
  fresh clone either, so leaving them in `npm test` reintroduces exactly the
  `BLOCKED`-inside-a-`SURVIVED`-control failure the ruling exists to remove. The banned-string
  property is unaffected: `B2.AGENTS`, which is what actually notices `rtk raw <cmd>`, is a
  **document** check and runs in `npm test`.
- **`jq` moves live too, and the boundary is restated.** My first pass admitted `jq` into `npm test`
  on the criterion "a binary reading in-repo frozen data, exactly `yq`'s situation". That was the
  wrong test, and D6 is what shows why: `jq` resolving at `/usr/bin/jq` here says nothing about the
  next machine, and its absence produces the identical break by a different route. The boundary is
  now **"`npm test` gains no binary dependency the shipped suite does not already require"**.
  Verified that set is `['yq','git','sh','node']`: `yq` via `resolveTool('yq')`
  (`tests/constitution_skills.test.js:155,162,169`, `tests/lib/tools.mjs:27,31`) and `git` via
  `execFileSync('git', ['status','--porcelain'])` at `tests/lib/repo-guard.mjs:96`, already reached
  by `package.json:11`'s `--selftest` clause — and `git`, `node`, `npm` and `sh` are all in Phase 1's
  own hermetic PATH set, `needed = ['node','npm','sh','env','git']` at
  `tests/mutation-harness.mjs:459`. `jq` appears nowhere in `tests/`, so it is live.

  **The interpreter changed with it.** My first application of this boundary kept `bash -c` while
  claiming `npm test` gained no new binary, which was false: `bash` is not in Phase 1's hermetic set
  either. Rather than assert POSIX equivalence, all 25 distinct declared executions were re-run
  under `/bin/bash`, `/bin/sh` and `/bin/dash` with exit code and trimmed stdout compared
  byte-for-byte: **24 identical**. The 25th, `ci-status.1`, differs — and differs between two
  consecutive `/bin/bash` runs too, on `nodes_by_kind` and `files_by_language`, because
  `tokensave tool status` serialises those objects with nondeterministic key order. That is graph
  nondeterminism, not a shell effect, and it vindicates `ci-status`'s declared assertion being a key
  set plus `> 0` with no pinned value or ordering. `dash` carries the portability claim, since
  `/bin/sh` on the measuring machine is bash 3.2 in POSIX mode.
  **A correction to two of my earlier reports: there are ten `yq -o=json … | jq …` command lines,
  not eight** — `constitution-query` `:42,52,65,78,88` and `ai-docs/README.md` `:26,36,47,57,67`,
  counted by regex over the declared command lines. **This narrows nothing**: all ten still execute
  under `npm run test:recipes` and still must pass, and their `commandLines` and payload assertions
  stay pinned by `C:cq-*`/`C:rd-*` inside `npm test` — exactly as they do for the seven `ci-*`
  recipes whose execution has been live since R-K.

**Stale `PHASES.md` citations.** Already row **R19**, and handled as instructed rather than as
errata: every `PHASES.md` citation in v2 was re-read against the current 59-line file, and the two
plan arguments that existed only to justify diverging from since-amended text were dropped. v1's D1
and D3 are restated as ratified; v1's D4 is gone entirely, because `PHASES.md:32-35` now carries
ruling D4 itself.

---

## Where v2's tables changed shape

Everything below is newly frozen, and the implementer is bound by it.

1. **The corpus is five files, not four.** `ai-docs/README.md` joins as a full member: 6 runnable
   recipes, 12 command lines, 3 command spans, `B1`/`B2` closure. (R17, ruling R-A.)
2. **Table 1 is keyed per command line, not per fence.** 20 runnable recipes, **35 executions**,
   every command line declared verbatim, every execution carrying its own structured assertion set
   plus `maxTokens` where applicable. The word "unchanged" appears nowhere. (R04, R15, ruling R-J.)
3. **Table 1's assertion column is a closed vocabulary of structured data**, not English, and
   Item 2's gate prints all 35 of them. (R25.)
4. **Table 2 gains check ids `S1..S8`.** Content unchanged.
5. **Table 3 grows from 9 rows to 13**, gains check ids `X1..X13` and a per-row `gate` column, and
   gains the `code-intelligence:26` MCP-form span and two `ai-docs/README.md` spans (one of which,
   `npm test`, Item 10 creates). (R05, R17, R-K.)
6. **Table 4 gains fifteen constants:** `DOC_TOOLS`, `LIVE_TOOLS`, `LIVE_CHECKS`, `DOC_CHECK_COUNT`,
   `FULL_CHECK_COUNT`, `COMMAND_SPAN_CLIS`, `LABEL_RESIDUAL_RE`, `CANONICAL_LABEL_RESIDUAL`,
   `HARNESS_LABEL_RESIDUAL`, `TOKEN_BUDGET_DOC_SITES`, `TOKEN_BUDGET_GATE_SITES`, and the anchor
   names `SEC_RULE_ID`/`DECISION_ADR`/`SPEC_SECTION`/`SPEC_ENDPOINT`. `REQUIRED_TOOLS` is gone,
   replaced by the two-way split. `TOKENSAVE_TOOL_PARAMS`, `COMPLEXITY_TIERS`, the `pcp.js` goldens
   and `ADR_TEMPLATE_HEADINGS` are unchanged.
7. **Table 5 is new** — `SELFTEST_DOC` / `SELFTEST_EXPECTED`, the frozen synthetic document that
   check `B3` runs the extractor over. It is the anti-tautology device for Space B. (R05.)
8. **The check universe is enumerated, counted and partitioned: 100 checks, 65 `ok`, 35 FAIL, of
   which 19 are live.** `B1` and `B2` are split per file (5 + 5); `C10` is dissolved into
   `C:<recipeId>`; `C9` becomes `X1..X13`; `E3` becomes `E3a`/`E3b`/`E3c`; `A1` splits into `A1`
   (doc tools) and `A6` (live tools); `B3` and `B4` are new. The FAIL set is stated once, with a
   one-line derivation per id, and separately for each runner.
9. **The runner has two declared modes.** `node tests/recipe-exec.test.js --hermetic` (`B4` + 68
   document checks = 69 report lines) is what `npm test` gains; the unflagged invocation (`B4` + all
   99 = 100 lines) is the `PHASES.md:36` acceptance criterion, is `npm run test:recipes`, and is what
   Items 4-11 gate on. `LIVE_CHECKS` is 31: the graph precondition and drift detectors, the seven
   `tokensave` recipe executions, the ten `yq | jq` executions, and the nine
   `tokensave`/`rtk`/`jq` span checks. `DOC_TOOLS` is `['yq','git','sh','node']` — a subset of the
   binaries `npm test` requires today, and the execution layer is `sh -c`, re-measured under
   `bash`/`sh`/`dash` rather than assumed equivalent. `B4` runs in both modes and asserts the partition against the frozen
   `LIVE_CHECKS` literal plus both cardinalities, so a check cannot migrate to make `npm test` green.
   `--hermetic` is the only argument the runner accepts; any other `argv` exits 3 `BLOCKED`, which
   Item 3 gate 3 measures. Item 11 gate 3 runs the hermetic mode under a `PATH` containing only
   `DOC_TOOLS`, which measures the hermeticity claim instead of asserting it. (R-K, R26.)
10. **Item ordering changed, and the closures were re-checked.** 9 items → **11**. Item 4 split into
    4 (fences + CLI) and 5 (MCP); the old Item 8 split into 9 (skill docs + the `cq` `.spec` recipe)
    and 10 (`ai-docs/README.md`); the old Items 5-7 shifted to 6-8; the old Item 9 is now 11. Three
    residual chains are declared — full `35 → 20 → 14 → 12 → 11 → 8 → 6 → 0`, document
    `27 → 19 → 13 → 12 → 11 → 8 → 6 → 0`, live `8 → 1 → 1 → 0` — the seven closure subsets are
    disjoint and sum to 35, and each item can fail before the next starts: every item has a runner
    gate with a declared expected exit code and FAIL list, **and** an artifact-level secondary gate
    with its current measured output, runnable today before either runner exists.
11. **No gate reads an exit code through a pipe**, and no gate was made easier. Every amendment above
    adds checks or tightens an existing one. Three scope reductions exist anywhere, all argued in
    v2's Out of scope: `pcp`'s exclusion from `COMMAND_SPAN_CLIS`; the deferral of the eight
    `plugins/steps/harnesses/**` label sites, which `E3c` *counts* rather than ignores; and R-K's
    move of 19 checks out of `npm test`, which is a move to a gate Item 11 enforces, not a removal.

---

## Flagged for orchestrator attention

**A. Closed — R-F was withdrawn.** My objection to its first half was upheld; its second half was
already adopted. Recorded here only so the trail is complete.

**B. R4 — accepted as an unowned residual, and verified unclosable here.** The 31 live checks are
enumerated, frozen, protected by `B4`, and gated by Item 11 gate 1 before the phase closes — but
after that, someone who runs only `npm test` will not learn that a `tokensave` or `jq` recipe has
rotted. Verified there is **no CI in this repository**: no `.github/workflows`, no workflow file
anywhere, so there is nothing to schedule the full gate into and inventing one is outside this
phase. Stated plainly as v2's risk R4 and in "routes that remain open", named there as the largest
hole v2 knowingly leaves. Not papered over and not grown into a work item; the orchestrator carries
it in `STATUS.md` alongside the `tests/pcp_skill.test.js:21-23` defect.

**C. Closed — D6 ratified and the `jq` boundary taken.** Both judgements went the same way and are
now v2's D5 and D6. `npm test`'s binary requirement after Item 11 is a subset of what it is today:
`yq`, `git`, `node`, `sh`. The hermetic subset is 68 of 99 checks — smaller than the 80 it was
before `jq` moved, and still neither empty nor trivial: it retains all 20 static-shape checks, all
11 `B` checks, all 8 `S` validators, all 6 `E` checks, and 18 of the 35 executions.

**D. D3 needs your ruling only if you disagree with the repair, not with the scope.**
`PHASES.md:30-32` authorises the 300→200 change outright, so Items 9 and 10 are in the phase's own
list. What is new is that closing it honestly requires changing two documented *recipes*: at 200,
the corpus's own `yq '.spec'` recipe breaches the bound it states (255 tokens, measured, in two
files). v2 changes them to `yq '.spec | keys'` (23 tokens). The alternative is a prose exception to
the bound, which is a skip-list in prose; I declined to write it.

**E. One finding of mine, raised because nobody did and it is load-bearing.** A runnable fence
containing `npm test` inside the corpus would be executed by
`node tests/recipe-exec.test.js --hermetic`, which `npm test` itself runs. This is why Item 10's replacement for `ai-docs/README.md`'s validation
section is prose with an inline `` `npm test` `` span rather than a fence, and it is a second reason
`README.md:45-47` stays out of scope. It is stated in v2 at both sites.
