# Implementation Review — Audit: Conformance to Reconciled Plans (Phases 1–4)

**Lens:** conformance of delivered work to reconciled `PLAN.md` v2 + `RECONCILIATION.md`, all four phases
**Scope:** branch `steps/harness-portability`, HEAD `886443e` (b0adb4d, 32c9c5c, 9460262, 886443e)
**Verdict:** `reject`
**Blockers:** 4 · **Divergences:** 2 · **Unreproducible numbers:** 1

---

## Blockers

### BL-1 — Phase 4 skill-section gate rewritten to match the artifacts; divergence undisclosed
`.plans/phase-4/PLAN.md:56-60` fixes the required section list per skill. `tests/constitution_skills.test.js:207-233`
ships a different list. Every divergence is exactly a plan string that does not exist in the artifact:

| Skill | PLAN.md v2 requires | Delivered test | Plan string present in artifact? |
|---|---|---|---|
| `constitution-query` | PLAN.md:56 `Progressive Disclosure`, `Shortcode Taxonomy`, `Query Recipes` | test:211 identical | yes (SKILL.md:10,19,28) |
| `code-intelligence` | PLAN.md:57 `Progressive Disclosure`, **`Navigation Workflows`**, **`Stdio MCP Integration`** / `tokensave` | test:216 `['Progressive Disclosure','Navigation','tokensave']` | **no** — `grep -nE "Navigation Workflows|Stdio MCP"` → 0 matches |
| `adr-manager` | PLAN.md:58 `Lifecycle & Workflow`, `Canonical ADR Template`, `Bidirectional Synchronization` | test:221 identical | yes (SKILL.md:10,24,72) |
| `pcp` | PLAN.md:59 `INVOCATION CONTRACT`, **`CLI Commands`**, **`Runtime Directory (.pcp)`** | test:226 `['INVOCATION CONTRACT','CLI','.pcp']` | **no** — pcp SKILL.md:88 is `## 6. CLI MAINTENANCE SUBCOMMANDS`; no `Runtime Directory` header |
| `steps` | PLAN.md:60 `Roles`, `The phase loop`, **`Review lenses`**, `Separation of duties` | test:231 drops `Review lenses` | **no** — `grep -c "Review lenses" plugins/steps/skills/steps/SKILL.md` → 0 |

Aggravating facts:
- `tests/constitution_skills.test.js:255-260` matches `content.toLowerCase().includes(section.toLowerCase())` —
  case-insensitive, anywhere in the file, not as a header. This reverses the phase-2 accepted disposition
  `.plans/phase-2/RECONCILIATION.md:24` (#8: "Removed `toLowerCase()` … enforced case-sensitive matching")
  in the only durable gate.
- **Metric-gaming construction (cheapest edit):** rename any header in `plugins/pcp/skills/pcp/SKILL.md` or
  `.agents/skills/code-intelligence/SKILL.md`. Assertions `'CLI'`, `'.pcp'`, `'Navigation'`, `'tokensave'`,
  `'Roles'` survive nearly any rewrite — 5 of 17 section assertions are effectively vacuous, so the suite
  reports "skill discoverability verified" while checking almost nothing.
- Nothing in `.plans/phase-4/RECONCILIATION.md:14-21` dispositions this change, and
  `.plans/phase-4/IMPL-REVIEW-conformance-gate-integrity.md` states *"The implementation completely conforms
  to the plan, gates were not weakened"* — false against the table above.

**Class:** every plan-declared string list folded into a permanent test. Same pattern must be checked for the
query cases (`tests/constitution_skills.test.js:149-180` — those match PLAN.md:38-43 exactly, clean) and for
the ADR header assertions (test:291-297 match PLAN.md:67 exactly, clean). Only sub-suite 3 diverges.

### BL-2 — Phase 3 `accept`/`accept-modified` amendments that never landed in the gate they name
- `.plans/phase-3/RECONCILIATION.md:24` (EG-4, `accept-modified`): "Added verification of Tier 0 criteria
  tokens (**"micro", "trivial", "typo", "bypass"**) across `MODEL_ROUTING.md` and `SKILL.md`."
  Landed gate `.plans/phase-3/PLAN.md:45` checks only `Tier 0`, `Fast-Track`, `bypass|Bypass`,
  `trivial|micro`. **`typo` is absent from the gate** — and materially so:
  `grep -c typo plugins/steps/skills/steps/SKILL.md` → `0` (MODEL_ROUTING.md → `1`). Had the accepted
  amendment landed as written, the gate would have failed. It was silently dropped, not re-dispositioned.
- `.plans/phase-3/RECONCILIATION.md:18` (DS-3, `accept`): "Added assertions verifying that existing
  marketplace conventions and layout pointers (e.g. …, `MODEL_ROUTING.md`) are preserved in `AGENTS.md`."
  Landed gate `.plans/phase-3/PLAN.md:82` `requiredSections` contains no `MODEL_ROUTING.md` entry and no
  `.claude-plugin/marketplace.json` entry. The convention survives in `AGENTS.md:19,43` by luck, not by gate.

**Class:** all 10 phase-3 dispositions that name a concrete gate string were checked. EG-1, EG-2, EG-3, EG-5,
DS-1, DS-2, DS-4, DS-5 landed verifiably (PLAN.md:28, :95, :45, :82). Two of ten under-landed, both in the
direction of a weaker gate.

### BL-3 — Phase 2 deliverable's tool recipes do not execute (Phase 2 acceptance criterion "strict tool definitions")
Every CLI recipe in `.agents/skills/code-intelligence/SKILL.md` uses `key="value"`; `tokensave tool` requires
`--key value`. The wrong form does not error — it returns a **silently empty result**:

```
$ tokensave tool find_exact_symbol name="executePhase"
{ "name": "name=executePhase", "count": 0, "matches": [] }
$ tokensave tool entities path="plugins/pcp/skills/pcp/scripts/pcp.js"
{ "file": "path=plugins/pcp/skills/pcp/scripts/pcp.js", "symbol_count": 0, "symbols": [], "has_doc": false }
$ tokensave tool body name="generateShortcode"
No symbol named 'name=generateShortcode' found.
$ tokensave tool entities --path plugins/pcp/skills/pcp/scripts/pcp.js
Error: config error: missing required parameter `--file` for tool `entities`
```

**Class — all six recipes plus their MCP twins:** SKILL.md:36 (`find_exact_symbol`), :51 (`entities`, also wrong
parameter name — the tool takes `--file`, not `path`), :66 (`callers`), :81 (`callees`, `depth=1`), :97
(`impact`), :112 (`body`), and the JSON shapes at :39-44, :54-59, :69-74, :83-90, :100-105, :115-120.
Separately, **all four example symbols do not exist in the graph**:
`sqlite3 .tokensave/tokensave.db "select name from nodes where name in ('actualize','executePhase','normalizeAgentsMd','generateShortcode')"` → 0 rows
(and `tokensave tool find_exact_symbol --name <each>` → `count: 0`).
`.plans/PHASES.md:8` requires "strict tool definitions"; the phase-2 gates (`PLAN.md:42`, `:70`) only
string-match the tool *names*, so a recipe set that returns nothing for every documented invocation passed.

### BL-4 — `AGENTS.md` mandates a non-existent command, and the phase-3 gate hard-codes it
`AGENTS.md:63`: "agents must fallback to `rtk raw <cmd>` to inspect complete output safely."

```
$ rtk raw --help
[rtk: No such file or directory (os error 2)]
```

`rtk --help` lists no `raw` subcommand; the real escape hatches are `rtk proxy <cmd>` (track, no filter) and
`rtk run <cmd>` (raw `sh -c`). The string originates in `.plans/phase-3/PLAN.md:65` and is asserted by the
Item 3 gate `.plans/phase-3/PLAN.md:82` and the phase acceptance gate `:95`, so the error is now gate-locked:
fixing the doc breaks the recorded gate. Delivered-as-planned, wrong-as-delivered.

---

## Divergences from a stated acceptance criterion

### DV-1 — Phase 3 criterion says four workflow phases; five were delivered
`.plans/PHASES.md:10`: "`AGENTS.md` provides thin hot-memory routing across **the 4 workflow phases**".
Delivered `AGENTS.md:71-79` defines **five**: Context Setup, Code Intelligence, Precision Edit, Compressed
Validation, Commit & ADR. `.plans/ORCHESTRATOR-LOG.md:17` records "5-phase sequential workflow".
`.plans/phase-3/PLAN.md:7` cites `PHASES.md:9-10` while paraphrasing the criterion with the count removed
("across the workflow phases"), and `.plans/phase-3/RECONCILIATION.md` records no amendment to the criterion.
The criterion as written does not hold; the count was changed by paraphrase, not by disposition.

### DV-2 — Phase 3 introduced a doc-vs-doc disagreement in the complexity gate it renamed
- `plugins/steps/MODEL_ROUTING.md:30-36`: renamed *Standard*→`Tier 1 (Standard)` and
  *Architectural*→`Tier 2 (Architectural)`, but left the fourth routing class **`- **Middle**`** (line 35)
  unrenumbered. "Tier" now denotes two different things in one file: the model tier of the Roles table
  (`MODEL_ROUTING.md:14-24`) and the complexity class (line 31 reads "Tier 1 (Standard) … `steps-planner`
  (Tier 1)").
- `AGENTS.md:81-87` presents the gate as three tiers and omits *Middle* entirely, while `AGENTS.md:32-34`
  and `MODEL_ROUTING.md:8-10` declare `SKILL.md`/`MODEL_ROUTING.md` canonical and derived docs bound to agree.
- Tier 0 itself agrees across the three files on substance:
  `MODEL_ROUTING.md:30` ≡ `AGENTS.md:85` (criteria, bypass of planning+review waves, route to
  `steps-implementer` as Tier 1 fast cheap coder, verification gate, orchestrator never touches code);
  `plugins/steps/skills/steps/SKILL.md:58` and `:111-116` state the same rule more briefly (no
  `verification_command` reference, no orchestrator clause). No contradiction on Tier 0 — only the
  incomplete tier enumeration above.

---

## Per-phase work-item delivery (not-fully-delivered only)

- **Phase 1** — all 4 items delivered; nothing partial. (`ai-docs/constitution.yaml`,
  `ai-docs/decisions/ADR-0001-unified-esm.md`, `ai-docs/specs/auth-spec.yaml`, `ai-docs/README.md` all exist and
  pass their own gates; README recipes at `ai-docs/README.md:23,26,33,36,44,47,54,57,64,67,74,77` re-run clean.)
- **Phase 2** — Items 1 and 3 delivered. **Item 2 partially delivered**: file, frontmatter, and all six recipe
  headings exist, but the recipe *bodies* are non-executable and the example symbols are fictional (BL-3).
- **Phase 3** — all 3 items delivered as text. Item 3 delivered content diverges from the criterion count (DV-1)
  and ships an invalid command (BL-4); Item 2 delivered but its reconciled gate under-landed (BL-2).
- **Phase 4** — Item 2 delivered exactly (`package.json:7-9`). **Item 1 partially delivered**: sub-suites 1, 2, 4
  match PLAN.md:25-45 and :61-68 line for line; sub-suite 3 diverges (BL-1).

## Reconciliation rows checked (`accept` / `accept-modified`)

- Phase 1 — 8/8 landed. DS-1/EG-2 → `PLAN.md:24` (`c-e9a2`, `l-e404` extractions); DS-2/EG-5 → `:81`
  (`jq`, `billing`, `c-e9a2`, `l-e404`); DS-3/EG-3 → `:45`; EG-1 → `:93` regex is `/\s+/`, token check live;
  EG-4 → `:60`.
- Phase 2 — 10/10 landed. #1 citation corrected to `AGENTS.md:35-37` (verified accurate); #2 `body` at `:42`;
  #3 `Decision Drivers`/`Considered Options` at `:57`; #6 content-parsing acceptance gate at `:70`;
  #8 no `toLowerCase()` at `:27`; #9 `/^---\r?\n([\s\S]*?)\r?\n---/` in all four gates.
  Caveat: #8 and #9 were later reversed in the durable suite (BL-1, NB-2).
- Phase 3 — 8/10 landed; **EG-4 and DS-3 under-landed** (BL-2).
- Phase 4 — 6/6 landed. DS-1 → test:35-36 regexes; DS-2 → test:321-325 case-normalized status;
  DS-3 → test:10-16 `yq -o=json` + `JSON.parse`; EG-1 → PLAN.md:73; EG-2 → PLAN.md:99; EG-3 → PLAN.md:112.

## Acceptance criteria, re-checked now

| Phase | `.plans/PHASES.md` criterion | Result |
|---|---|---|
| 1 | line 6 | **holds** — gate output verbatim below |
| 2 | line 8 | **holds literally** (files, frontmatter, scoped actions) but "strict tool definitions" is satisfied only as text; the definitions do not execute (BL-3) |
| 3 | line 10 | **fails as written** — "the 4 workflow phases" vs five delivered (DV-1); the plan's own gates pass |
| 4 | line 12 | **holds** — `npm test` green, 49/49; but sub-suite 3 verifies materially less than the plan committed (BL-1) |

## Gates run (verbatim)

```
$ node -e '<phase-1 Item 1 gate>'
Constitution Schema Validated: Unified ESM Execution Layer | Zero-Dependency Runtime Constraint | All external requests must validate JWT signatures with asymmetric key pairs (RS256/ES256) and reject unsigned or HS256 tokens. | r-b111 | Multi-Region Active-Active Data Replication

$ node -e '<phase-1 Item 2 gate>'
ADR-0001 verified

$ node -e '<phase-1 Item 3 gate>'
Spec verified: auth-spec v1.0.0 (endpoints: 2, invariants: 2)

$ node -e '<phase-1 Item 4 gate>'
Retrieval documentation verified

$ node -e '<phase-1 acceptance gate>'
All retrieval recipes verified under 300 tokens!

$ node -e '<phase-2 acceptance gate>'
Phase 2 Acceptance Gate: All 3 modular skills verified and command tooling functional!

$ node -e '<phase-3 Item 1 gate>'
ai-docs/constitution.yaml verification passed

$ node -e '<phase-3 Item 2 gate>'
Tier 0 Fast-Track protocol verified in MODEL_ROUTING.md and SKILL.md

$ node -e '<phase-3 Item 3 gate>'
AGENTS.md orchestrator integration verified

$ PATH=/opt/homebrew/bin:... npm test
# tests 49
# suites 0
# pass 49
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2762.726125

$ node -e '<phase-4 acceptance gate>'
Phase 4 Acceptance Gate: npm test successfully executed all test suites!

$ tokensave tool status
{ "node_count": 374, "edge_count": 63, "file_count": 47, ... }   # tokensave 7.9.0
```

## Numbers in `.plans` — reproducibility

| Claim | Source | Re-measured |
|---|---|---|
| "49 tests passing, 0 failures" | `ORCHESTRATOR-LOG.md:24` | **reproduced** (`# tests 49 / # pass 49 / # fail 0`) |
| "49/49 tests green" | `STATUS.md:9` | **reproduced** |
| "isolated retrieval payloads under 300 tokens" | `ORCHESTRATOR-LOG.md:10` | **reproduced** (phase-1 acceptance gate) |
| "TokenSave v7.9.0 indexed over 45 files, 436 nodes, 110 edges" | `.plans/phase-2/PLAN.md:15`, ratified by `.plans/phase-2/RECONCILIATION.md:20` as a *correction to current state* | **not reproducible** — today `node_count 374`, `edge_count 63`, `file_count 47`. Version ✓. Edge count off by ~43%; node count fell while file count rose, so drift alone is a weak explanation. |
| "5-phase sequential workflow" | `ORCHESTRATOR-LOG.md:17` | reproduced in the artifact, but contradicts `PHASES.md:10` (DV-1) |
| "the 26 existing pcp_skill tests" | `.plans/phase-4/IMPL-REVIEW-correctness-regression.md` | runner prints `1..25` under `PCP Skill Automation Suite`; 26 only when the parent test node is counted — imprecise, not wrong |

## Non-blocking

- **NB-1 — citation ranges are asserted, not measured (class).** Every `1-N` range in `.plans/phase-4/PLAN.md`
  overshoots the file by exactly one line: `:9` `1-57` (56), `:11` `1-39` (38), `:12` `1-107` (106), `:13`
  `1-136` (135), `:14` `1-120` (119), `:15` `1-117` (116), `:16` `1-261` (260). Also `.plans/phase-2/PLAN.md:12`
  `1-46` (45 at the time) and `:14` `ai-docs/README.md:1-85` (102). `.plans/phase-3/PLAN.md:119` cites
  `tests/pcp_skill.test.js:46-59` for the no-overwrite invariant; that test (`1c`) actually spans 51-60.
  Verified-accurate citations: phase-2 `PLAN.md:11`→`AGENTS.md:35-37`; phase-3 `RECONCILIATION.md:16`→
  `SKILL.md:15,28`; phase-3 `PLAN.md:10`→`MODEL_ROUTING.md:26-40`; phase-3 `PLAN.md:11`→`SKILL.md:56`.
- **NB-2 — CRLF tolerance lost in the durable gate.** `tests/constitution_skills.test.js:241-242` uses literal
  `'---\n'` / `'\n---\n'`, dropping the `\r?\n` tolerance accepted at `.plans/phase-2/RECONCILIATION.md:25` (#9).
- **NB-3 — phase-1..3 `IMPL-REVIEW` files report "Unverified: None" on narrative evidence.**
  `.plans/phase-3/IMPL-REVIEW-correctness-regression.md` claims Tier 0 is "accurately and consistently
  documented" across three files with no command output; DV-2 and BL-4 were both missed.
- **NB-4 — repo root has `AGENTS.md` but no `CLAUDE.md` symlink** (`ls: CLAUDE.md: No such file or directory`);
  outside every phase plan, noted for the orchestrator.
- **NB-5 — `AGENTS.md:68` tells agents to run `tokensave tool status`**, which is correct and works; it is the
  only tokensave invocation in the delivered docs that does.

## Unverified

- Historical `tokensave tool status` output at phase-2 execution time (2026-08-31 01:39) — not recoverable;
  only today's value could be measured.
- Whether the pre-implementation "verbatim gate output" blocks recorded in each `PLAN.md` were genuinely
  captured before the edits — the working tree is post-implementation, so these are unfalsifiable claims.
- MCP-side behaviour of the JSON call shapes in `.agents/skills/code-intelligence/SKILL.md` — only the CLI
  form was executed; the tool names used there (`find_exact_symbol`, `entities`, …) resolve in this session as
  `mcp__tokensave__*`, which the skill documents loosely at `SKILL.md:26`.
