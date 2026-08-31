# Phase 2 Execution Plan: Make every documented recipe execute

Iteration `gate-repair-installability`. Branch `steps/harness-portability`, HEAD `1353460`.
Every measurement in this file was taken against that HEAD with a clean working tree, by the
command shown. Nothing is copied from `PHASES.md`, the orchestrator's digest, or the archived
iteration without re-measurement; where a measurement **differs** from the digest it is said so in
place.

---

## Goal

Four shipped documents carry executable command recipes. Several report success while returning
nothing: exit 0, empty payload, and an agent following the doc never learns it asked wrong. A fifth
document ships an *executable verification recipe* that certifies payloads against a bound this
repo abandoned, using an estimator this repo deleted. Phase 2 makes every documented command
execute against a declared expected result, and builds the gate that keeps them executing.

The unit of repair is the **command line**, not the fenced block. 34 command lines live in the
in-scope fences today; a gate that asserts once per fence certifies a fence in which most commands
have degraded to nothing.

---

## Scope

**In scope — the five recipe-bearing files:**

- `.agents/skills/code-intelligence/SKILL.md`
- `.agents/skills/constitution-query/SKILL.md`
- `.agents/skills/adr-manager/SKILL.md`
- `AGENTS.md`
- `ai-docs/README.md`

`ai-docs/README.md` is in scope by orchestrator ruling. The byte-freeze on `ai-docs/**` protects
what the mutation table mutates and what the suite reads *as data* — `ai-docs/constitution.yaml`,
`ai-docs/specs/`, `ai-docs/decisions/`. Verified: no mutation op in `tests/mutation-harness.mjs`
targets `ai-docs/README.md`, and no test or fixture references it
(`grep -rn 'ai-docs/README' tests/ package.json` → no matches). It is a live second copy of the
recipe class: six `bash` fences with 12 duplicated `yq`/`jq` command lines (`:21-78`), plus a
seventh fence at `:86-102` whose body **uses `words × 1.3`** — the fakeable estimator Phase 1
removed — and **throws above 300 tokens**, the bound Items 9 and 10 retire.

**In scope — new/changed test surface:**

- `tests/recipe-exec.test.js` (new, the gate — one runner, two declared run modes)
- `tests/fixtures/recipes.mjs` (new, the declared tables)
- `tests/lib/markdown-sections.mjs` (additive: fenced-block and code-span extraction)
- `package.json` (`scripts.test:recipes`; `scripts.test` gains one `&&` clause, Item 11)

**In scope — the doc-contradiction repairs, where they are live:**

- complexity-gate labels: `AGENTS.md:85-87`, `plugins/steps/MODEL_ROUTING.md:30-36`,
  `plugins/steps/skills/steps/SKILL.md:92,116`, `plugins/steps/README.md:61`,
  `plugins/steps/agents/steps-architect-pro.md:3,15`
- the token-budget statement: `.agents/skills/constitution-query/SKILL.md:16,94-95,104`,
  `.agents/skills/adr-manager/SKILL.md:88`, `ai-docs/README.md:7,73-74,84,86-102`

Both repairs are authorised by `PHASES.md:30-32`, which names the Middle-vs-Tier routing label and
the 300-vs-200 token bound explicitly, and by `PHASES.md:23-26`, which already states the corrected
`tokensave` parameter repair under ruling D1.

**Explicitly not in scope** — see *Out of scope* at the end for the argued list.

---

## Binding constraints inherited from Phase 1

Each was verified against the files named and each changes the item order or the gate's shape.

**C1 — the mutation harness refuses to run while this phase is in flight.**
`tests/mutation-harness.mjs:336-340` declares
`READ_PATHS = ['ai-docs/', '.agents/skills/', 'plugins/steps/skills/rogue/']`;
`tests/lib/repo-guard.mjs:105-115` refuses with exit 2 when any uncommitted path prefix-matches one.
Items 4, 5, 7, 9 dirty `.agents/skills/`; Item 10 dirties `ai-docs/`. **Consequence:** no item may
use `node tests/mutation-harness.mjs` as its gate, and the sweep can only be re-run after the phase
commit. Item 11 records this as a post-commit verification step, not a per-item gate.

**C2 — neither runner may emit TAP-shaped lines.** `parseTap`
(`tests/mutation-harness.mjs:395-420`) matches `^# Subtest: `, `^\s+(not )?ok \d+ - `,
`^(not )?ok \d+ - `, `^1\.\.(\d+)$` and `^# (tests|pass|fail) (\d+)$` over the whole captured
`npm test` output, and `tapIntegrity` (`:423-432`) fails the run if `# tests` disagrees with the
parsed leaf + roll-up count. Report lines use the shape Phase 1 established for
`tests/lib/repo-guard.mjs --selftest` — `ok   <id> — <name>` with **no digit after `ok`** — which is
why the existing selftest output is invisible to `parseTap`.

**This constraint binds diagnostics, not only report lines.** A runner prints recipe stdout and
stderr on failure, and a recipe payload can contain any text. Every diagnostic line is prefixed
`#recipe ` (a `#` followed by a non-space character, matching none of `parseTap`'s five shapes), on
**every** line of multi-line captured output.

**C3 — the gate joins `npm test` behind `&&`, and is therefore never reached under a RED
mutation.** `package.json:11` is currently
`node --test tests/pcp_skill.test.js tests/constitution_skills.test.js && node tests/lib/repo-guard.mjs --selftest`.
Under every RED mutation the `node --test` step fails first and short-circuits, so the appended
runner contributes zero leaves to the TAP stream and the frozen `mustFail` / `mustPass` / `max`
enumerations at `.plans/phase-1/PLAN.md:126-192` are untouched. Under the three negative controls
(`benign-constitution-comment`, `benign-adr-prose-reflow`, `crlf-frontmatter`) the `node --test`
step passes, so the appended runner **does** run, and its failure would make `run.status !== 0`,
which `tests/mutation-harness.mjs:587` requires to be 0 for a `SURVIVED` verdict. The negative
controls therefore cover the appended runner for free, without a table amendment.

**C4 — nothing that depends on the live code graph or on a per-user binary may sit inside
`npm test`. This is the constraint that shapes the whole gate.**

C3's converse is the danger. Because the only mutations that *execute* the appended runner are the
three that must stay `SURVIVED`, every non-hermetic dependency the runner acquires becomes a
dependency of Phase 1's committed conformance number: a `BLOCKED` exit 3 is a non-zero
`run.status`, so the three `SURVIVED` rows flip to `RED (signature MISMATCH)` and the sweep reads
13/16 with nothing wrong in the repository at all.

That is not a hypothetical. Measured:

```
$ git ls-files .tokensave/ | wc -l
0
$ sed -n '1,8p' ~/.gitignore_global      # .tokensave/ at :5
$ TOKENSAVE_DISABLE_GREP_HOOK=1 grep -c tokensave tests/pcp_skill.test.js tests/constitution_skills.test.js
tests/pcp_skill.test.js:0
tests/constitution_skills.test.js:0
$ TOKENSAVE_DISABLE_GREP_HOOK=1 grep -n 'resolveTool(' tests/constitution_skills.test.js tests/lib/tools.mjs
… resolveTool('yq') only …
```

`.tokensave/` is globally gitignored with **zero tracked files**: it does not exist on a fresh clone
or in CI. `npm test` today has **zero** `tokensave` coupling and resolves exactly one binary, `yq`.
And the graph itself drifts — five distinct readings across sessions (`436/110`, `374/63`,
`466/129` twice; `file_count` 45 → 47 → 53), two of them inside a single planning session.

The consequence is not only a broken number. `ai-docs/constitution.yaml:5` declares
`verification_command: "npm test"`, and `:20`'s `qual-gate-01` requires that command to "execute
cleanly and return exit code 0 prior to phase completion". Wiring the graph into `npm test` means a
clean checkout fails its own declared verification — a committed, verified 16/16 broken by an
artifact that is not in the repository.

**The partition rule.** `npm test` gains **no binary dependency the shipped suite does not already
require**. That set is `DOC_TOOLS = ['yq', 'git', 'sh', 'node']`, and each entry is already there:
`yq` via `resolveTool('yq')` at `tests/constitution_skills.test.js:155,162,169` and
`tests/lib/tools.mjs:27,31`; `git` via `execFileSync('git', ['status', '--porcelain'])` at
`tests/lib/repo-guard.mjs:96`, which `package.json:11`'s `--selftest` clause already runs, and again
in Phase 1's own hermetic PATH set `['node','npm','sh','env','git']` at
`tests/mutation-harness.mjs:459`, which also supplies `node`, `npm` and `sh`.

**The interpreter is `sh`, not `bash`, and that was measured rather than argued.** Phase 1's
hermetic set names `sh`; `bash` appears nowhere in `tests/`. All 25 distinct declared executions
were re-run under `/bin/bash`, `/bin/sh` and `/bin/dash`, comparing exit code and trimmed stdout
byte-for-byte:

```
25 declared executions compared across bash / sh / dash — 24 byte-identical.
The 25th, `ci-status.1`, differs — and differs between two consecutive /bin/bash runs as well:
  bash vs bash (2 runs) differing keys: [ 'nodes_by_kind', 'files_by_language' ]
  bash vs dash          differing keys: [ 'nodes_by_kind', 'files_by_language' ]
```

`tokensave tool status` serialises those two objects with nondeterministic key order, so the
variation is the graph's, not the shell's — which is why `ci-status`'s declared assertion is a key
set plus `> 0` and pins no value or ordering. Note that `/bin/sh` on the measuring machine is
bash 3.2 in POSIX mode, so `dash` is the result that carries the portability claim; it is included
for exactly that reason.

A check is a **document check** if and only if it reads nothing but files tracked in this repository
and uses nothing but `DOC_TOOLS`. Everything else — the `tokensave` graph, the `tokensave` and `rtk`
binaries, and `jq` — is a **live check**. `LIVE_CHECKS` is a frozen literal in
`tests/fixtures/recipes.mjs` (Table 4); `DOC_CHECKS` is everything else. The subset is declared, not
filtered — an implementer-chosen predicate here would be a skip-list, for the same reason it would
be in Space B.

**The criterion is the failure mode, not the artifact.** `.tokensave/` is the clearest case, but
`tokensave`, `rtk` and `jq` reach it identically: on a machine without any one of them, tool
resolution `BLOCK`s, `npm test` exits non-zero, and the three `SURVIVED` controls go
non-conformant. `jq` resolving at `/usr/bin/jq` on the planning machine is not evidence about the
next machine, and adding a prerequisite to the constitution's declared `verification_command` is not
something this phase should do as a side effect of a recipe gate.

One runner, `tests/recipe-exec.test.js`, with two declared modes:

- **`node tests/recipe-exec.test.js --hermetic`** runs `B4` + `DOC_CHECKS`: extraction, block
  classification, inventory closure and banned strings, the extractor self-test, every static-shape
  and declared-command-line check for all 20 recipes, all 8 static block validators, the `X` suite's
  `yq`/`npm` rows, the 18 `yq`-only and `node -e` executions against the frozen in-repo `ai-docs/`
  data, and all six doc-consistency checks. **This is what `npm test` gains.**
- **`node tests/recipe-exec.test.js`**, unflagged, runs everything — the phase's acceptance
  criterion (`PHASES.md:36`), which is why the acceptance command takes no flag. It adds the seven
  `tokensave` recipe executions, the ten `yq -o=json … | jq …` executions, the graph precondition,
  the two help-text drift detectors, the `[edit]`-category disjointness check, and the
  `tokensave`/`rtk`/`jq` span checks. `npm run test:recipes` runs it and Item 11 gates on it.

This is a **move, not a removal**: the execution gate exists, is enumerated below, and must pass
before the phase closes. What changes is that it does not sit inside the command
`ai-docs/constitution.yaml:5` and `AGENTS.md:66` mandate before every commit, and therefore does not
sit inside Phase 1's mutation sweep. It also preserves what D5 bought: the three `SURVIVED` controls
still execute the runner, so a byte-pinning or crash-on-start runner is still caught for free.

**Moving an execution live never moves its content pin.** `C:<recipeId>` compares the extracted
fence body to the declared `commandLines` for all 20 recipes and is a document check for every one
of them, so the ten `jq` command lines and the seven `tokensave` ones are pinned byte-for-byte
inside `npm test`; what moves is only whether they are *run* there. Nothing is narrowed: all 35
executions still run, and still must pass, under `npm run test:recipes`.

**Check `B4` is what stops `--hermetic` becoming a skip flag.** It runs in **both** modes and
asserts that `DOC_CHECKS ∪ LIVE_CHECKS` is the whole declared universe, that the two are disjoint,
that `LIVE_CHECKS` equals the declared literal and is non-empty, and that the set this invocation is
about to execute equals `DOC_CHECKS` under `--hermetic` and the whole universe without it — with the
declared cardinality either way. Reclassifying a live check as a document check to make `npm test`
green fails `B4` in both modes.

**`--hermetic` is the runner's only argument.** Any other `argv` — a second flag, a check-id filter,
a pattern — makes the runner exit 3 `BLOCKED` before running anything. There is no general skip
mechanism to grow.

**C5 — the CRLF negative control.** `crlf-frontmatter` rewrites
`.agents/skills/constitution-query/SKILL.md` entirely in CRLF. A fence parser that does not
normalise line endings sees the info string `bash\r`, classifies six runnable blocks as unknown,
and goes red — turning a declared-`SURVIVED` mutation into a failure. Item 1 reuses `parseDoc`'s
existing `content.replace(/\r\n/g, '\n')` (`tests/lib/markdown-sections.mjs:18`) precisely so this
control stays green for the right reason, and Item 1's gate 2 measures it rather than reasoning
about it.

**C6 — measured baselines.**

```
$ node --test tests/pcp_skill.test.js tests/constitution_skills.test.js
# tests 66 / # pass 66 / # fail 0 / # skipped 0 / # todo 0

$ npm test
… 15/15 guard self-test checks passed   [exit 0]

$ node tests/mutation-harness.mjs --only path-stripped
clean tree baseline:  61 executed leaves, 25 of them in PCP Skill Automation Suite
path-stripped                RED (signature matched)    [conformant]  (no file changed)
                             61 executed, 26 failing — …
1/1 mutations conformant (--only mode)
exit 0
```

---

## Measured defects

Every line below is a command that was run and its verbatim result.

### The `tokensave` CLI recipes

`tokensave tool` usage is `tokensave tool [NAME] [ARGS]...`; `ARGS` are `--key value` flags.
A `key=value` token is consumed as a **positional**, which each tool binds to its first required
string parameter — which is why the failures are silent.

| doc line | command as documented | exit | result |
|---|---|---|---|
| `code-intelligence/SKILL.md:36` | `tokensave tool find_exact_symbol name="executePhase"` | **0** | `{"name":"name=\"executePhase\"","count":0,"matches":[]}` |
| `:51` | `tokensave tool entities path="plugins/pcp/skills/pcp/scripts/pcp.js"` | **0** | `{"file":"path=\"plugins/…\"","symbol_count":0,"symbols":[],"has_doc":false}` |
| `:66` | `tokensave tool callers name="actualize"` | **1** | `Error: config error: node not found: 'name="actualize"'. \`node_id\` expects a graph node ID …` |
| `:81` | `tokensave tool callees name="actualize" depth=1` | **1** | `Error: config error: unexpected positional argument(s): depth=1 — use --key value flags …` |
| `:97` | `tokensave tool impact name="normalizeAgentsMd"` | **0** | `{"node_count":0,"edge_count":0,"nodes":[]}` |
| `:112` | `tokensave tool body name="generateShortcode"` | **0** | `No symbol named 'name="generateShortcode"' found.` (not JSON) |
| `:127` | `tokensave tool status` | 0 | valid, non-empty |

**Correction to the digest, and it matters for the gate design.** The digest treats all the
`name="X"` sites as one silent-exit-0 class. `callers` and `callees` exit **1**, loudly.
**Four** of the seven recipes are silent (`find_exact_symbol`, `entities`, `impact`, `body`), two
are loud, and `status` is correct. A gate that only checks exit 0 would catch the two loud ones and
certify the four silent ones — the exact inversion of what this phase is for.

**The correct flags are not uniformly `--name`.** Measured from `tokensave tool <name> --help`:

| tool | required parameter | optional |
|---|---|---|
| `find_exact_symbol` | `--name` | `--limit` |
| `entities` | `--file` | `--kinds` |
| `callers` | `--node-id` | `--max-depth`, `--resolve-dispatch` |
| `callees` | `--node-id` | `--max-depth`, `--resolve-dispatch` |
| `impact` | `--node-id` | `--max-depth` |
| `body` | **`--symbol`** | `--limit` |
| `status` | *(none)* | — |

`body` takes `--symbol`, not `--name`. `PHASES.md:23-26` already states this corrected repair under
ruling D1; Item 4 follows the measured parameter table.

**Both defect classes are live and independent.** With the flag corrected the symbols still do not
exist:

```
$ for s in executePhase actualize normalizeAgentsMd generateShortcode; do tokensave tool find_exact_symbol --name "$s"; done
{"name":"executePhase","count":0,"matches":[]}
{"name":"actualize","count":0,"matches":[]}
{"name":"normalizeAgentsMd","count":0,"matches":[]}
{"name":"generateShortcode","count":0,"matches":[]}
```

All four exit 0. This is why the criterion demands a non-empty, non-`count: 0` payload and not
merely exit 0.

### `rtk raw`

`AGENTS.md:63`:

> `   - When filtered or semantic commands truncate, drop, or omit required execution logs or compiler diagnostics, agents must fallback to `rtk raw <cmd>` to inspect complete output safely.`

```
$ rtk --version
rtk 0.42.1
$ out=$(rtk raw echo hi 2>&1); echo "exit=$?"; echo "$out"
exit=127
[rtk: No such file or directory (os error 2)]
$ out=$(rtk proxy echo hi 2>&1); echo "exit=$?"; echo "$out"
exit=0
hi
```

`raw` does not appear in `rtk --help`'s `Commands:` block; `proxy` and `run` do.
**Correction to the digest:** `rtk raw` exits **127**, not 0. It is still a defect — the fallback
protocol names a command that does not exist — but it is not a member of the silent-exit-0 class.

### The two shortcode registries

`.agents/skills/constitution-query/SKILL.md:105`:

> `- **Source of Truth**: \`ai-docs/constitution.yaml\` is the canonical registry for shortcodes.`

```
$ yq -o=json '[.decisions[].id, .caveats[].id, .requirements[].id, .deferred[].id]' ai-docs/constitution.yaml
["d-8f3a","c-e9a2","r-b111","l-e404"]
$ jq -r 'keys|join(", ")' .pcp/MAP.json
c-e9a2, d-60c9, d-8c65, d-8f3a, d-a13d
$ git check-ignore -v .pcp/MAP.json
.gitignore:2:.pcp/	.pcp/MAP.json
$ git ls-files --error-unmatch .pcp/MAP.json >/dev/null 2>&1; echo "exit=$?"
exit=1
```

`d-60c9`, `d-a13d`, `d-8c65` exist only in `.pcp/MAP.json`; `r-b111`, `l-e404` only in
`ai-docs/constitution.yaml`. `.pcp/` is git-ignored, is written by `pcp mint`
(`plugins/pcp/skills/pcp/scripts/pcp.js:407`) and read by `pcp map` / `pcp lookup`
(`plugins/pcp/skills/pcp/SKILL.md:115`). The claim at `:105` is true of the governance set and
false as stated, and `adr-manager/SKILL.md:67` ("Shortcodes must be unique across all `d-xxxx`,
`c-xxxx`, `r-xxxx`, and `l-xxxx` entries") is unverifiable against a registry the repo does not
ship.

`.pcp/MAP.json`'s *contents* are machine-local and are not a declared value anywhere in this plan.

### Complexity-gate labels

The vocabulary diverges across six live canonical sites, and the fourth routing class has no tier
number.

```
$ awk 'NR>=80{printf "%d:%s\n",NR,$0}' AGENTS.md | rg '^\d+:- \*\*'
85:- **Tier 0 (Fast-Track / Planning Bypass)**: …
86:- **Tier 1 (Standard)**: …
87:- **Tier 2 (Architectural)**: …

$ rg -n '^- \*\*' plugins/steps/MODEL_ROUTING.md
30:- **Tier 0 (Fast-Track / Planning Bypass)** — …
31:- **Tier 1 (Standard)** — …
32:- **Tier 2 (Architectural)** — …
35:- **Middle** — plan cheap with `steps-planner`, then dispatch `steps-architect-pro` …

$ TOKENSAVE_DISABLE_GREP_HOOK=1 grep -rEo 'middle-complexity|\*\*Middle\*\*' --include='*.md' plugins/steps --exclude-dir=harnesses AGENTS.md | wc -l
6
$ TOKENSAVE_DISABLE_GREP_HOOK=1 grep -rEo 'middle-complexity|\*\*Middle\*\*' --include='*.md' plugins/steps/harnesses | wc -l
8
```

The six canonical sites are `plugins/steps/MODEL_ROUTING.md:35`,
`plugins/steps/skills/steps/SKILL.md:92,116`, `plugins/steps/README.md:61`,
`plugins/steps/agents/steps-architect-pro.md:3,15`. `AGENTS.md` omits the fourth class entirely.
So `MODEL_ROUTING.md` routes four ways with three of them tier-numbered, `AGENTS.md` routes three,
and `steps/SKILL.md` uses two vocabularies in one file.

**`AGENTS.md` is 87 lines long** (`wc -l` → 87), so its Tier 2 bullet is the last line of the file.

**`MODEL_ROUTING.md:38` contains a non-bullet bold span** — `Implementation is **always**
\`steps-implementer\`` — inside the same section. Any label extractor that matches `\*\*(.+?)\*\*`
anywhere in the section returns five labels, not four. The declared extractor is per-line
`/^- \*\*(.+?)\*\*/`, which is what the measurements above used.

### The token-budget statement, and the recipe that breaches it

The enforced bound is **200**: `tests/constitution_skills.test.js:235` reads
`estimatedTokens < 200`, tightened by Phase 1 under ruling D2. (`:234` is `assert.ok(`; `:236` is
the failure message, which is what `PHASES.md:32` cites.) Measured, seven live doc sites still say
300:

```
constitution-query/SKILL.md:16    sub-300 token
constitution-query/SKILL.md:104   300 tokens
adr-manager/SKILL.md:88           300 tokens
ai-docs/README.md:7               < 300 tokens
ai-docs/README.md:84              sub-300 token
ai-docs/README.md:98              if (tokens > 300) throw …
ai-docs/README.md:100             "All queries verified under 300 tokens."
```

**Lowering the stated bound to 200 creates a second contradiction unless a recipe changes.**
Measured with the suite's own estimator (`tests/lib/token-estimate.mjs`), per documented command:

```
constitution-query :36  64   :39 122   :42  77   :49 123   :52 145   :55  19
                   :62 100   :65 119   :72  72   :75  72   :78  88   :85  79
                   :88  95   :95 255   :98  58
ai-docs/README     :23  64   :26  77   :33 123   :36 145   :44 100   :47 119
                   :54  72   :57  88   :64  79   :67  95   :74 255   :77  58
```

Exactly one command in each file breaches 200, and it is the same command:
`yq '.spec' ai-docs/specs/auth-spec.yaml` → **255** estimated tokens, 750 bytes. It is an
unbounded whole-file dump, which is the thing `ai-docs/README.md:7` says the retrieval system
exists to avoid. `tests/constitution_skills.test.js` never covers it — `QUERY_CASES` case 6 is the
endpoint slice, not `.spec` — so nothing measures it today and nothing would measure it after a
prose-only repair.

The repair is to make the recipe obey the bound rather than to except it:
`yq '.spec | keys'` → **23** estimated tokens, 73 bytes, listing the six section names the reader
then slices. Measured:

```
$ yq '.spec | keys' ai-docs/specs/auth-spec.yaml
- name
- version
- domain
- description
- endpoints
- security_invariants
```

### `ai-docs/README.md`'s validation recipe

```
$ bash -c "$(sed -n '87,101p' ai-docs/README.md)"
exit=0
Query 1 payload: ~33 tokens … Query 6 payload: ~107 tokens
All queries verified under 300 tokens.
```

Its estimator is `Math.round(out.trim().split(/\s+/).length * 1.3)` (`:96`) — the whitespace word
count `tests/lib/token-estimate.mjs:1-3` names as unable to bind a dense payload. On the same
`.spec` payload it reports 107 where the enforced estimator reports 255. It is a shipped
verification recipe that certifies payloads the enforced gate rejects.

### Recipes that already work — measured, not assumed

All 15 `constitution-query` command lines and all 12 `ai-docs/README.md` command lines execute at
exit 0 with non-empty output (min 41 bytes, max 750). The `adr-manager` `bash` fence runs as a unit:

```
$ bash -c "$(sed -n '100,111p' .agents/skills/adr-manager/SKILL.md)"
All 1 ADR links synchronized.     [exit=0] [bytes=29]
```

It is nonetheless a member of the silent-success class:
`execSync("yq \".decisions[].adr\" …").toString().trim().split("\n").filter(Boolean)` yields `[]`
for an empty result, and the loop then prints `All 0 ADR links synchronized.` and exits 0. Its
declared assertion pins the count against `GOLDEN_DECISIONS` **and** carries an independent `≥ 1`
floor. (The `require` inside `node -e` is correct despite `package.json:5`'s `"type": "module"` —
`node -e` evaluates as CommonJS. Verified exit 0. Do not "fix" it.)

`.agents/skills/constitution-query/SKILL.md:55` produces
`ai-docs/decisions/ADR-0001-unified-esm.md` (41 bytes), which contains no shortcode. It is not
unguardable: that exact string is a declared literal at `tests/fixtures/expected.mjs`
(`GOLDEN_DECISIONS["d-8f3a"].adr`), and it is the declared anchor for that command.

### Extraction inventory — re-measured

Counted by a fence state machine identical to `parseDoc`'s
(`tests/lib/markdown-sections.mjs:35-57`) and the span regex declared in Item 1:

| file | fences | infos | all inline spans | command spans (declared predicate) |
|---|---|---|---|---|
| `constitution-query/SKILL.md` | 6 | `bash` ×6 | 23 | 2 (`yq`, `jq`, both `:30`) |
| `code-intelligence/SKILL.md` | 7 | `bash` ×7 | 24 | 3 (`:8`, `:25`, `:26`) |
| `adr-manager/SKILL.md` | 3 | `markdown`, `yaml`, `bash` | 38 | 0 |
| `AGENTS.md` | **0** | — | 81 | 5 (`:25`, `:61`, `:63`, `:68`, `:76`) |
| `ai-docs/README.md` | 7 | `bash` ×7 | 14 | 2 (`yq`, `jq`, both `:13`) |
| **total** | **23** | | **180** | **12** |

The `code-intelligence` figure of **3** command spans matches the orchestrator's digest
(`ORCHESTRATOR-LOG.md:265-267`, "`code-intelligence` 7 fenced (`tokensave` ×7) + 3 inline"). The
third is at `:26`, which carries two backtick spans — `` `tokensave_<command>` `` and
`` `tokensave: { tool: "<command>" }` `` — of which the declared predicate selects one. See
*Space B* below.

**Tooling gotcha that will bite the implementer.** `rg` skips dot-directories by default, so
`rg 'tokensave tool' .` reports only `AGENTS.md:68` and finds **nothing** in `.agents/skills/`.
`--hidden` is required. Combined with the recorded `grep`→`rg` hook rewrite, any class sweep run
through the shell must use `rtk proxy rg --hidden …` or `TOKENSAVE_DISABLE_GREP_HOOK=1 grep …` or
it will under-report.

---

## Design

### The crux: two extraction spaces, and the unit of measurement

`AGENTS.md` has zero fenced blocks. A gate that walks only fenced blocks certifies it clean while
`rtk raw` sits at `:63`. The check and the defect must live in the same space, so the gate has two:

- **Space A — fenced blocks.** Every fence in the five files, classified and either executed or
  statically validated. Nothing is skipped.
- **Space B — inline code spans outside fences.** Backtick spans selected by a declared predicate.
  These are **never executed** — most contain placeholders (`<cmd>`, `[args]`) — they are checked
  for *verb existence*.

**Within Space A the unit is the command line, not the fence.** Each runnable recipe declares an
ordered list of commands; each command carries its own declared assertion; each is executed and
asserted separately, except where a recipe is declared `unit` (a shell variable crosses command
boundaries, or the body is a single `node -e` program). 15 `yq` commands behind 6 fence-level
assertions is 9 commands whose degradation to empty output leaves the gate green — reproduced:

```
$ bash -c "yq '.constitution.security.rules[] | select(.domain == \"auth\")' ai-docs/constitution.yaml
yq '.constitution.security.NOPE' ai-docs/constitution.yaml
yq -o=json ai-docs/constitution.yaml | jq '.constitution.security.rules[] | select(.domain == \"NOPE\")'"
exit=0   contains sec-auth-01: 1   bytes=195
```

Exit 0, non-empty stdout, anchor present — and two of three documented recipes return nothing.

### The body is the extracted fence body. Always.

**Layer 2 executes the fence body extracted from the document, never the `commandLines` declared in
the frozen table.** `commandLines` is an *assertion about* the body, checked by the C suite; it is
never a substitute for it. Executing the declared lines makes every `D` check pass by construction
and is the single cheapest conformant-but-wrong implementation of this phase. It is forbidden here,
in one place, so that no reading of any later section can reintroduce it.

Concretely, for each runnable recipe:

- **`commands`** = the extracted body's non-blank, non-`#`-comment lines, in order, after CRLF
  normalisation. A line ending in `\` joins the next line. A fence declared `unit` is one command
  whose text is the whole body.
- **`C:<id>`** asserts `commands` equals the declared `commandLines` verbatim, in order, with equal
  length.
- **`D:<id>.<n>`** executes `commands[n-1]` (or the whole body for a `unit` recipe) and applies the
  declared assertion for position *n*.

If the extracted command count differs from the declared count, `C:<id>` FAILs and **every**
`D:<id>.*` for that recipe FAILs. There is no positional-best-effort branch.

### Space B's predicate, declared

A span is a **command span** iff: take its trimmed text, take the first whitespace-delimited token,
strip trailing `:` `;` `,` `.` characters, and the result is a member of

```
COMMAND_SPAN_CLIS = ['yq', 'jq', 'tokensave', 'rtk', 'npm', 'node']
```

Applied to the five files this selects exactly the 12 spans in Table 3 and reproduces the
orchestrator's digest per file. It is stated precisely enough that a reader can rebuild Table 3 by
hand.

Two exclusions the predicate makes, both argued rather than silent:

- **`pcp` is not in the list.** `pcp` is not a binary on `PATH` — the CLI is invoked as
  `node <path>/pcp.js` — so a "binary resolves" check on it would `BLOCK`. Verified, all four
  `` `pcp` `` spans in `AGENTS.md` (`:3`, `:11`, `:25`, `:52`) are the plugin, marketplace, suite
  and skill *name*, never an invocation.
- **`` `tokensave_<command>` `` at `code-intelligence/SKILL.md:26` is not selected**, because its
  first token is `tokensave_<command>`, not `tokensave`. It names an MCP tool, not a CLI. The
  sibling span on the same line, `` `tokensave: { tool: "<command>" }` ``, **is** selected
  (`tokensave:` → `tokensave`) and carries an `mcp-form` check.

### Why the closure claim is real, and the tautology that would kill it

`B1` and `B2` close both spaces by set-equality against the frozen tables, per file: the extracted
inventory must **equal** the declared inventory, in both directions. A block or span the implementer
forgets to declare fails the gate; a declared one that disappears fails the gate. A span that newly
matches the predicate — a re-added `` `rtk raw <cmd>` `` anywhere in the five files — enters the
extracted multiset, is not in the declared table, and fails `B2` for its file.

That property is worth nothing if the *predicate* is implementer-chosen. The cheapest conformant
filter — `isCommandSpan(text) => COMMAND_SPANS.some(s => s.text === text)` — makes `B2` a set
compared against itself. It passes today, passes after every item, and is permanently blind to a
re-added `rtk raw <cmd>`.

**`B3` is what forbids it.** `B3` runs the extractor over a frozen synthetic document declared as a
literal in `tests/fixtures/recipes.mjs` and asserts the extraction equals a frozen expected result.
The synthetic document contains a `bash` fence, a `json` fence, a fence with an unknown info string,
a tilde fence, a CRLF section, and inline spans including `` `rtk raw <cmd>` `` and
`` `docker compose up` ``. The declared expectation selects `rtk raw <cmd>` as a command span and
rejects `docker compose up`. A tautological predicate returns nothing on that document and `B3`
FAILs. `B3` tests the instrument; `B1`/`B2` test the corpus; neither substitutes for the other.
`B3` reads only literals, so it is a document check.

### `PHASES.md` says "banned-string gate"; this is stronger, not narrower

A ban-list knows only about `rtk raw`. Space B instead asks: is the token in verb position a verb
this binary advertises, and is it in the plan's declared whitelist for that CLI? Both directions:

- `span verb ∈ DECLARED_VERBS[cli]` — anything outside it is banned, so the banned-string
  requirement is met by construction, and it stays met for verbs nobody has thought of yet.
- `DECLARED_VERBS[cli] ⊆ verbs advertised by the installed binary` — catches the whitelist drifting
  off the real tool. This half needs the binary, so it is the live checks `A3`/`A4`.

`raw ∉ RTK_VERBS` fails today. A future `rtk` that gained a `raw` subcommand would still fail,
because the whitelist is the plan's decision, not the binary's.

### How a block is classified as runnable

Declared, exhaustive, no default branch:

- info string, lowercased and trimmed (after CRLF normalisation), in `{bash, sh}` → **runnable**;
  it must have an entry in `RUNNABLE_RECIPES` with declared commands and assertions.
- info string in `{markdown, yaml, json}` → **non-runnable**; it must have an entry in
  `STATIC_BLOCKS` with a declared validator.
- anything else, **including an empty info string** → the gate **fails**. There is no
  "unknown → skip" branch. No fence in the five in-scope files has an empty info string today
  (verified); fences elsewhere in the repo do (`README.md:9,28,45`,
  `plugins/steps/skills/steps/SKILL.md:207`), so the classifier fails closed on a legitimate shape
  the first time someone adds a bare fence to an in-scope file. That is the intended direction.

**A declared `(file, fenceIndex)` that does not resolve is a FAIL, never a skip and never a crash.**
The runner reports `FAIL <id> — declared fence index N does not exist in <file> (M fences found)`
and continues. The rule is uniform across `RUNNABLE_RECIPES` and `STATIC_BLOCKS`, and it is why the
frozen FAIL set below is mechanically derivable from the pre-repair fence layout.

**Fence indices in Tables 1 and 2 are post-repair.** Pre-repair,
`.agents/skills/code-intelligence/SKILL.md` has 7 fences at indices 0-6 (openers at
`:34,49,64,79,95,110,125`), so `ci-entities` (2), `ci-callers` (4) and `ci-callees` (6) address
today's `callers`, `impact` and `status` fences, and `ci-impact` (8), `ci-body` (10),
`ci-status` (12) and all six `ci-mcp-*` entries do not resolve at all. Every one of those is a FAIL
under the rule above, and every one closes in Item 4 or Item 5.

Every non-runnable block gets a real validator, not a pass:

| kind | validator |
|---|---|
| `markdown` (the ADR template) | `parseDoc(body).headings` equals `ADR_TEMPLATE_HEADINGS` |
| `yaml` (the constitution entry template) | parses under `yq`; top-level keys `== ['decisions']`; entry keys equal `DECISION_ENTRY_KEYS` |
| `json` (the six MCP call blocks) | `JSON.parse` succeeds; `.tool` ∈ tool set; `Object.keys(.arguments)` equals the declared key set |

All three are document-runner checks: the `json` validator compares against
`TOKENSAVE_TOOL_PARAMS`, a frozen literal, and never against the binary.

The `json` validator is why the MCP form gets repaired too.
`code-intelligence/SKILL.md:69-74` currently documents
`{"tool":"callers","arguments":{"name":"actualize"}}` — `callers`' only required parameter is
`node_id`. The MCP form carries the identical defect the CLI form does, and `PHASES.md` does not
name it. Enumerating the class rather than the cited lines is what surfaces it.

### The assertion model

Three layers, all required, in this order.

**1. Static shape** (runs nothing, reads only in-repo files and frozen literals — a document check).
Per runnable recipe: extracted commands equal the declared `commandLines` verbatim; every `--flag`
is in `TOKENSAVE_TOOL_PARAMS` for that tool with all required parameters present; **every command
carries at least one declared assertion** — a command with an empty assertion list FAILs. This layer
catches the `name="X"` class even when the code graph is empty, absent or stale, which is precisely
why it belongs inside `npm test` while the execution layer does not.

**2. Execution.** `sh -c <extracted body or command>`, `cwd` = repo root, inherited `PATH`,
`stdin` `/dev/null`, 30 s timeout. Assert exit 0.

**3. Declared payload.** Per command, from `tests/fixtures/recipes.mjs`. Assertions are **structured
data, not prose**, drawn from a closed vocabulary so that Item 2's gate can print every one of them
and the plan can freeze the printout:

```
{ contains: '<literal>' }                  trimmed stdout contains the literal
{ maxTokens: <n> }                         estimateTokens(trimmed stdout) < n
{ jsonEq: ['<path>', <value>] }            JSON.parse(stdout) at <path> strictly equals <value>
{ jsonMin: ['<path>', <n>] }               numeric value at <path> is >= n
{ jsonMinLen: ['<path>', <n>] }            array at <path> has length >= n
{ jsonSuperset: ['<path>', [<literals>]] } array at <path> contains every literal
{ jsonEndsWith: ['<path>', '<suffix>'] }   string at <path> ends with the suffix
{ jsonContains: ['<path>', '<literal>'] }  string at <path> contains the literal
{ jsonKeysSuperset: [<literals>] }         top-level keys include every literal
{ jsonAllInt: [[<paths>], '>0'] }          each named value is an integer > 0
{ regexEq: ['<re source>', <capture 1 expected>] }
{ regexCaptureMin: ['<re source>', <n>] }  capture 1 parsed as an integer is >= n
```

`<value>` and `<literals>` are literals or references to `tests/fixtures/expected.mjs` exports.
`''` as a path means the parsed root. No assertion is written in English anywhere in the frozen
tables.

**Universal post-condition**, applied to every executed command in addition to its declared
assertion: trimmed stdout is non-empty; it does not match `/^No .* found\.$/`; and if it parses as
JSON, the root is neither `[]` nor `{}` and no top-level key matching `/(^|_)count$/` equals `0`.

Three corrections are folded into that sentence, each measured. `/_count$/` does **not** match the
bare key `count`, and `{"name":…,"count":0,"matches":[]}` is the literal payload the acceptance
criterion names. `tokensave tool callers` and `callees` return **bare top-level arrays**, so a rule
about "array-valued fields" never sees `[]`. And `tokensave tool body --symbol doesNotExist` returns
`No symbol named 'doesNotExist' found.` at exit 0 — non-empty, not JSON, no counts.

The post-condition deliberately does **not** carry a blanket "no empty top-level array field" rule.
`tokensave tool status` has a top-level `sibling_projects` array populated from neighbouring
initialised projects (5 entries on the planning machine, `[]` on a box with no siblings); a blanket
rule fails `D:ci-status.1` for a reason that has nothing to do with the document, and exempting
`ci-status` by name would be a skip-list entry. The generalisation that rule was reaching for is
carried instead by layer 1's "every command carries a declared assertion", which is stronger: a
recipe added later with no bespoke assertion cannot pass, because it cannot be declared.

### Safety of executing document content

Layer 2 shells out to text read from markdown. The primary control is that the runnable set is
plan-declared, set-equal **and** content-pinned: `C:<id>` asserts the body's commands equal the
declared literals before `D:<id>.*` executes anything. Both halves are required — a set-equal
inventory with unpinned bodies means `npm test` executes whatever JavaScript happens to be in
`adr-manager/SKILL.md:99-112`, checked only by a string that program itself prints. `C:<id>` is a
document-runner check for every recipe, including the seven whose execution is live, so the content
pin is inside `npm test` even where the execution is not.

Second layer, the head check, folded into `C:<id>`:

- Strip a leading shell assignment prefix `VAR=`, then recurse into every `$( … )` command
  substitution and split on `|`; the head of every resulting segment must be in
  `ALLOWED_HEADS = ['yq','jq','tokensave','node']`. Checking only the outer line would exempt
  `NODE_ID=$(tokensave … | jq …)` entirely, which is three of the seven repaired `ci-*` recipes.
- **Script-recipe rule:** a runnable fence whose first command's head is `node` with an `-e`
  argument is a **single script command**. Its head is checked once; its body is not decomposed into
  lines for the head check, because `for`, `if`, `console.log(` and `}` are not command heads. This
  is one declared rule, not a per-recipe exemption, and it applies to `adr-verify`. The body remains
  fully pinned by `commandLines`, which is what makes the rule safe.
- Any `tokensave tool <name>` must have `<name> ∈ TOKENSAVE_READONLY_TOOLS`. `tokensave tool`
  exposes an `[edit]` category (`str_replace`, `multi_str_replace`, `replace_symbol`, `insert_at`,
  `insert_at_symbol`, `ast_grep_rewrite`) that writes to files. This doc-side control compares the
  recipe to a frozen literal, so it is `C:<id>`'s third clause and runs inside `npm test`; `A5`
  separately asserts `TOKENSAVE_READONLY_TOOLS` is disjoint from the binary's own `[edit]` listing
  and is a live check. The two live in different spaces and both are needed.

### The two run modes, and the declared partition

One runner file, one set of check implementations, one table module. The mode selects which declared
check list runs; it never changes what a check asserts.

| | `--hermetic` | unflagged |
|---|---|---|
| runs | `B4` + `DOC_CHECKS` (68) = **69** report lines | `B4` + `DOC_CHECKS` + `LIVE_CHECKS` (99) = **100** report lines |
| tools | `DOC_TOOLS` only — exactly what `npm test` requires today | `DOC_TOOLS` + `LIVE_TOOLS` |
| reads | tracked repo files and frozen literals | the above, plus the `tokensave` graph and the binaries' help text |
| invoked by | `npm test` (Item 11) | `npm run test:recipes`, Items 4-11's gates |
| exit codes | `0` all pass, `1` a FAIL, `3` `BLOCKED` (a `DOC_TOOL` missing, or an unrecognised argument) | same, plus `3` when a `LIVE_TOOL` is missing or the graph does not index `pcp.js` |

`LIVE_CHECKS` is exactly these 31, declared as a literal in `tests/fixtures/recipes.mjs`:

```
A2  A3  A4  A5  A6

D:ci-find.1  D:ci-entities.1  D:ci-callers.u  D:ci-callees.u  D:ci-impact.u  D:ci-body.1  D:ci-status.1

D:cq-security.3  D:cq-decision.2  D:cq-caveat.2  D:cq-requirement.3  D:cq-deferred.2
D:rd-security.2  D:rd-decision.2  D:rd-caveat.2  D:rd-requirement.2  D:rd-deferred.2

X2  X3  X4  X5  X7  X8  X9  X10  X12
```

The middle block is the ten `yq -o=json … | jq …` command lines; `X2` and `X12` are the bare `jq`
spans whose check is that the binary resolves.

Everything else is a `DOC_CHECK`. Note what stays inside `npm test`: **18 of the 35 executions** —
every `yq`-only `cq`/`rd` command and `adr-verify`'s `node -e` program — plus every static-shape
check for all 20 recipes including the seven `ci-*` and ten `jq` ones, all 8 static block
validators, the whole `B` suite including `B2.AGENTS`, the check that actually notices
`rtk raw <cmd>`, and all six `E` checks. The subset is 68 of 99 checks; it is neither empty nor
trivial. What `--hermetic` skips is *execution* of the seven `tokensave` and ten `jq` command lines,
the graph precondition, the two help-text drift detectors, the `[edit]`-category disjointness check,
and the nine `tokensave`/`rtk`/`jq` span checks. It does not move the content pin, the inventory
closure, the extractor self-test, the banned-string closure, or the doc-consistency suite.

### Tool resolution and `BLOCKED`

Reuses `resolveTool` from `tests/lib/tools.mjs:9` unchanged — a missing binary throws, naming the
tool and the searched `PATH`.

```
DOC_TOOLS  = ['yq', 'git', 'sh', 'node']          // exactly what npm test requires today
LIVE_TOOLS = ['tokensave', 'rtk', 'jq']           // every additional binary the full run needs
```

`A1` resolves `DOC_TOOLS` and is a document check; `A6` resolves `LIVE_TOOLS` and is a live check.
There is no third BLOCKED condition beyond those two and `A2`'s graph precondition, and there is no
skip flag: an allowance on a gate gets used by habit and then by CI.

**`npm test` acquires no new binary.** Verified: the shipped suite resolves `yq`
(`tests/constitution_skills.test.js:155,162,169`, `tests/lib/tools.mjs:27,31`) and already shells to
`git` (`tests/lib/repo-guard.mjs:96`, `execFileSync('git', ['status', '--porcelain'])`, reached by
`package.json:11`'s `--selftest` clause). `jq` appears nowhere in `tests/` today, so it is a **new**
prerequisite and is therefore a live tool, not a document one — its resolving at `/usr/bin/jq` on
one machine says nothing about the next, and a missing `jq` would `BLOCK` `npm test` and flip the
three `SURVIVED` controls exactly as a missing `tokensave` would. This narrows nothing: the ten
`jq` command lines still execute under `npm run test:recipes`, still must pass, and their
`commandLines` and payload assertions are pinned by `C:<recipeId>` inside `npm test` regardless.

### May the `tokensave` recipes depend on this repo's own code graph?

**Yes, for symbol identity; never for counts; and never inside `npm test`.** The graph drifts — five
readings across sessions — and it is untracked, so it does not exist on a fresh clone. `ci-status`'s
declared assertion is a key set plus `> 0`, and **no numeric graph count appears as an expected
value anywhere in `tests/fixtures/recipes.mjs`.**

Symbol *identity* is different: it is derived from `plugins/pcp/skills/pcp/scripts/pcp.js`, which
`PHASES.md:55` places out of scope for this iteration, and every golden below is read out of that
source file rather than out of the graph. If `pcp.js` later changes, the live checks fail loudly
and correctly, which is rot detection, not rot.

### Why `node-id` never appears literally in a recipe

Node IDs are content-addressed (`function:5cb28e78355b31a70a536f9f2c5939ed`). A literal ID in a
skill doc is guaranteed to rot. `callers`, `callees` and `impact` accept only `--node-id`; there is
no name-based form. The repaired recipes resolve the ID in-band:

```bash
NODE_ID=$(tokensave tool find_exact_symbol --name ensureDir | jq -r ".matches[0].id")
tokensave tool callers --node-id "$NODE_ID"
```

Verified end-to-end (exit 0, 1258 bytes), and its failure mode is loud: an unresolvable name yields
`NODE_ID=null` and `tokensave tool callers --node-id null` exits **1**.

---

## Frozen tables

Authored here, before the code exists. The implementer copies them verbatim into
`tests/fixtures/recipes.mjs` and may not edit them to match what its code emits. A value that turns
out to be wrong is a reported decision back to the orchestrator.

`tests/fixtures/recipes.mjs` inherits the **provenance rule** stated at
`tests/fixtures/expected.mjs:3-6`: every value is a literal; the file never reads or queries the
artifacts it describes. It may `import` from `expected.mjs`.

### Table 1 — runnable recipes (`RUNNABLE_RECIPES`), post-repair

Keyed by `(file, fenceIndex)`, 0-based, **post-repair**. Line numbers are reported in failure
messages but never asserted. Every command line is declared verbatim; `u` in the `#` column marks a
fence executed as one command. The `gate` column says which runner executes it — the static-shape
check `C:<id>` for every row is a document check regardless.

**`.agents/skills/code-intelligence/SKILL.md`** — 7 runnable fences at indices 0, 2, 4, 6, 8, 10, 12
— execution is **live**

| id | idx | # | command line (verbatim) | assertion |
|---|---|---|---|---|
| `ci-find` | 0 | 1 | `tokensave tool find_exact_symbol --name ensureDir` | `jsonEq['name','ensureDir']`, `jsonEq['count',1]`, `jsonEq['matches[0].kind','function']`, `jsonEq['matches[0].file','plugins/pcp/skills/pcp/scripts/pcp.js']` |
| `ci-entities` | 2 | 1 | `tokensave tool entities --file plugins/pcp/skills/pcp/scripts/pcp.js` | `jsonEq['file','plugins/pcp/skills/pcp/scripts/pcp.js']`, `jsonSuperset['symbols[].name', PCP_SYMBOLS]` |
| `ci-callers` | 4 | u | `NODE_ID=$(tokensave tool find_exact_symbol --name ensureDir \| jq -r ".matches[0].id")` + `tokensave tool callers --node-id "$NODE_ID"` | `jsonMinLen['',4]`, `jsonSuperset['[].name', ENSUREDIR_CALLERS]` |
| `ci-callees` | 6 | u | `NODE_ID=$(tokensave tool find_exact_symbol --name handleInit \| jq -r ".matches[0].id")` + `tokensave tool callees --node-id "$NODE_ID" --max-depth 1` | `jsonMinLen['',1]`, `jsonSuperset['[].name',['ensureDir']]` |
| `ci-impact` | 8 | u | `NODE_ID=$(tokensave tool find_exact_symbol --name ensureDir \| jq -r ".matches[0].id")` + `tokensave tool impact --node-id "$NODE_ID"` | `jsonMin['node_count',5]`, `jsonSuperset['nodes[].name', ENSUREDIR_IMPACT]` |
| `ci-body` | 10 | 1 | `tokensave tool body --symbol ensureDir` | `jsonEq['match_count',1]`, `jsonEndsWith['matches[0].qualified_name','::ensureDir']`, `jsonContains['matches[0].body', ENSUREDIR_BODY_LINE]` |
| `ci-status` | 12 | 1 | `tokensave tool status` | `jsonKeysSuperset[['node_count','edge_count','file_count','nodes_by_kind','edges_by_kind']]`, `jsonAllInt[['node_count','edge_count','file_count'],'>0']` |

`ci-status` pins no count. `ci-callers`/`ci-callees`/`ci-impact` assert supersets and floors, not
set-equality: set-equality would go red on a `tokensave` extractor upgrade, which is a tool-version
property, not a doc property. `ENSUREDIR_CALLERS` being derived from source means the floor is real.

**`.agents/skills/constitution-query/SKILL.md`** — 6 runnable fences at indices 0-5 — execution is
**document**, except the five `yq -o=json … | jq …` lines, which are **live** (they need `jq`)

| id | idx | # | command line (verbatim) | assertion |
|---|---|---|---|---|
| `cq-security` | 0 | 1 | `yq '.constitution.security.rules[] \| select(.domain == "auth")' ai-docs/constitution.yaml` | `contains SEC_RULE_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq '.constitution.security.rules' ai-docs/constitution.yaml` | `contains SEC_RULE_ID`, `maxTokens TOKEN_BUDGET` |
| | | 3 | `yq -o=json ai-docs/constitution.yaml \| jq '.constitution.security.rules[] \| select(.domain == "auth")'` | `contains SEC_RULE_ID`, `maxTokens TOKEN_BUDGET` |
| `cq-decision` | 1 | 1 | `yq '.decisions[] \| select(.id == "d-8f3a")' ai-docs/constitution.yaml` | `contains DECISION_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq -o=json ai-docs/constitution.yaml \| jq '.decisions[] \| select(.id == "d-8f3a")'` | `contains DECISION_ID`, `maxTokens TOKEN_BUDGET` |
| | | 3 | `yq '.decisions[] \| select(.id == "d-8f3a") \| .adr' ai-docs/constitution.yaml` | `contains DECISION_ADR`, `maxTokens TOKEN_BUDGET` |
| `cq-caveat` | 2 | 1 | `yq '.caveats[] \| select(.id == "c-e9a2")' ai-docs/constitution.yaml` | `contains CAVEAT_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq -o=json ai-docs/constitution.yaml \| jq '.caveats[] \| select(.id == "c-e9a2")'` | `contains CAVEAT_ID`, `maxTokens TOKEN_BUDGET` |
| `cq-requirement` | 3 | 1 | `yq '.requirements[] \| select(.cluster == "billing")' ai-docs/constitution.yaml` | `contains REQUIREMENT_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq '.requirements[] \| select(.id == "r-b111")' ai-docs/constitution.yaml` | `contains REQUIREMENT_ID`, `maxTokens TOKEN_BUDGET` |
| | | 3 | `yq -o=json ai-docs/constitution.yaml \| jq '.requirements[] \| select(.id == "r-b111")'` | `contains REQUIREMENT_ID`, `maxTokens TOKEN_BUDGET` |
| `cq-deferred` | 4 | 1 | `yq '.deferred[] \| select(.id == "l-e404")' ai-docs/constitution.yaml` | `contains DEFERRED_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq -o=json ai-docs/constitution.yaml \| jq '.deferred[] \| select(.id == "l-e404")'` | `contains DEFERRED_ID`, `maxTokens TOKEN_BUDGET` |
| `cq-spec` | 5 | 1 | `yq '.spec \| keys' ai-docs/specs/auth-spec.yaml` | `contains SPEC_SECTION`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq '.spec.endpoints[] \| select(.path == "/api/v1/auth/login")' ai-docs/specs/auth-spec.yaml` | `contains SPEC_ENDPOINT`, `maxTokens TOKEN_BUDGET` |

**`.agents/skills/adr-manager/SKILL.md`** — 1 runnable fence at index 2 — execution is **document**

| id | idx | # | command | assertion |
|---|---|---|---|---|
| `adr-verify` | 2 | u | the 12-line `node -e` program currently at `:100-111`, declared verbatim | `regexEq['^All (\d+) ADR links synchronized\.$', String(Object.keys(GOLDEN_DECISIONS).length)]`, `regexCaptureMin['^All (\d+) ADR links synchronized\.$', 1]` |

The equality side alone would be two-sided; the independent `>= 1` floor is what kills
`All 0 ADR links synchronized.`

**`ai-docs/README.md`** — 6 runnable fences at indices 0-5, post-repair — execution is **document**,
except the five `yq -o=json … | jq …` lines, which are **live** (they need `jq`)

| id | idx | # | command line (verbatim) | assertion |
|---|---|---|---|---|
| `rd-security` | 0 | 1 | `yq '.constitution.security.rules[] \| select(.domain == "auth")' ai-docs/constitution.yaml` | `contains SEC_RULE_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq -o=json ai-docs/constitution.yaml \| jq '.constitution.security.rules[] \| select(.domain == "auth")'` | `contains SEC_RULE_ID`, `maxTokens TOKEN_BUDGET` |
| `rd-decision` | 1 | 1 | `yq '.decisions[] \| select(.id == "d-8f3a")' ai-docs/constitution.yaml` | `contains DECISION_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq -o=json ai-docs/constitution.yaml \| jq '.decisions[] \| select(.id == "d-8f3a")'` | `contains DECISION_ID`, `maxTokens TOKEN_BUDGET` |
| `rd-caveat` | 2 | 1 | `yq '.caveats[] \| select(.id == "c-e9a2")' ai-docs/constitution.yaml` | `contains CAVEAT_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq -o=json ai-docs/constitution.yaml \| jq '.caveats[] \| select(.id == "c-e9a2")'` | `contains CAVEAT_ID`, `maxTokens TOKEN_BUDGET` |
| `rd-requirement` | 3 | 1 | `yq '.requirements[] \| select(.cluster == "billing")' ai-docs/constitution.yaml` | `contains REQUIREMENT_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq -o=json ai-docs/constitution.yaml \| jq '.requirements[] \| select(.cluster == "billing")'` | `contains REQUIREMENT_ID`, `maxTokens TOKEN_BUDGET` |
| `rd-deferred` | 4 | 1 | `yq '.deferred[] \| select(.id == "l-e404")' ai-docs/constitution.yaml` | `contains DEFERRED_ID`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq -o=json ai-docs/constitution.yaml \| jq '.deferred[] \| select(.id == "l-e404")'` | `contains DEFERRED_ID`, `maxTokens TOKEN_BUDGET` |
| `rd-spec` | 5 | 1 | `yq '.spec \| keys' ai-docs/specs/auth-spec.yaml` | `contains SPEC_SECTION`, `maxTokens TOKEN_BUDGET` |
| | | 2 | `yq '.spec.endpoints[] \| select(.path == "/api/v1/auth/login")' ai-docs/specs/auth-spec.yaml` | `contains SPEC_ENDPOINT`, `maxTokens TOKEN_BUDGET` |

**Totals: 20 runnable recipes, 35 executions — 28 document, 7 live.**

### Table 2 — non-runnable blocks (`STATIC_BLOCKS`), all document checks

| id | check | file | fenceIndex | info | validator |
|---|---|---|---|---|---|
| `ci-mcp-find` | `S1` | code-intelligence | 1 | `json` | `.tool === "find_exact_symbol"`; `keys(.arguments) === ["name"]` |
| `ci-mcp-entities` | `S2` | code-intelligence | 3 | `json` | `.tool === "entities"`; `keys(.arguments) === ["file"]` |
| `ci-mcp-callers` | `S3` | code-intelligence | 5 | `json` | `.tool === "callers"`; `keys(.arguments) === ["node_id"]` |
| `ci-mcp-callees` | `S4` | code-intelligence | 7 | `json` | `.tool === "callees"`; `keys(.arguments) === ["node_id","max_depth"]` |
| `ci-mcp-impact` | `S5` | code-intelligence | 9 | `json` | `.tool === "impact"`; `keys(.arguments) === ["node_id"]` |
| `ci-mcp-body` | `S6` | code-intelligence | 11 | `json` | `.tool === "body"`; `keys(.arguments) === ["symbol"]` |
| `adr-template` | `S7` | adr-manager | 0 | `markdown` | `parseDoc(body).headings` equals `ADR_TEMPLATE_HEADINGS` |
| `adr-entry-yaml` | `S8` | adr-manager | 1 | `yaml` | parses under `yq`; top-level keys `== ["decisions"]`; `keys(.decisions[0]) == DECISION_ENTRY_KEYS` |

`keys(.arguments)` is compared as a **set**, order-insensitive. Argument *values* are the
corresponding symbol names or a node-id placeholder; only the key sets are asserted.

### Table 3 — command code spans (`COMMAND_SPANS`), post-repair

Compared per file as a multiset of `(file, text)` by `B2` — a document check for every file. The
per-span checks below are document checks for the `yq` and `npm` spans and live checks for the
`tokensave`, `rtk` and `jq` spans, because those need a binary `npm test` does not already require.

| check | gate | file | span text | check kind |
|---|---|---|---|---|
| `X1` | doc | constitution-query | `yq` | `binary` |
| `X2` | live | constitution-query | `jq` | `binary` |
| `X3` | live | code-intelligence | `tokensave tool` | `verb` — `tool ∈ TOKENSAVE_VERBS`; binary resolves |
| `X4` | live | code-intelligence | `tokensave tool <command> [args]` | `verb` + next token is a placeholder, stop |
| `X5` | live | code-intelligence | `tokensave: { tool: "<command>" }` | `mcp-form` — binary resolves; the object's `tool` value is a `<…>` placeholder |
| `X6` | doc | AGENTS.md | `npm test` | `verb` — `test ∈ keys(package.json.scripts)` |
| `X7` | live | AGENTS.md | `tokensave` | `binary` |
| `X8` | live | AGENTS.md | `rtk proxy <cmd>` | `verb` — `proxy ∈ RTK_VERBS`; binary resolves **(Item 6 changes this from `rtk raw <cmd>`)** |
| `X9` | live | AGENTS.md | `tokensave tool status` | `verb+tool` — `tool ∈ TOKENSAVE_VERBS`; `status ∈ TOKENSAVE_READONLY_TOOLS` |
| `X10` | live | AGENTS.md | `tokensave` | `binary` |
| `X11` | doc | ai-docs/README.md | `yq` | `binary` |
| `X12` | live | ai-docs/README.md | `jq` | `binary` |
| `X13` | doc | ai-docs/README.md | `npm test` | `verb` — `test ∈ keys(package.json.scripts)` **(Item 10 creates this)** |

`B2.AGENTS` — the multiset comparison that notices `rtk raw <cmd>` is present and
`rtk proxy <cmd>` is not — is a **document** check, so `npm test` still catches the banned string
even where the verb check does not run.

### Table 4 — declared constants

```
DOC_TOOLS             = ['yq', 'git', 'sh', 'node']
LIVE_TOOLS            = ['tokensave', 'rtk', 'jq']
ALLOWED_HEADS         = ['yq', 'jq', 'tokensave', 'node']
COMMAND_SPAN_CLIS     = ['yq', 'jq', 'tokensave', 'rtk', 'npm', 'node']
RTK_VERBS             = ['proxy']
RTK_VERBS_FLOOR       = ['proxy', 'run', 'git', 'npm', 'grep']
TOKENSAVE_VERBS       = ['tool']
TOKENSAVE_READONLY_TOOLS = ['find_exact_symbol','entities','callers','callees','impact','body','status']
LIVE_CHECKS = ['A2','A3','A4','A5','A6',
               'D:ci-find.1','D:ci-entities.1','D:ci-callers.u','D:ci-callees.u',
               'D:ci-impact.u','D:ci-body.1','D:ci-status.1',
               'D:cq-security.3','D:cq-decision.2','D:cq-caveat.2',
               'D:cq-requirement.3','D:cq-deferred.2',
               'D:rd-security.2','D:rd-decision.2','D:rd-caveat.2',
               'D:rd-requirement.2','D:rd-deferred.2',
               'X2','X3','X4','X5','X7','X8','X9','X10','X12']   // 31
DOC_CHECK_COUNT   = 69      // B4 + 68 document checks
FULL_CHECK_COUNT  = 100     // B4 + 68 document + 31 live
TOKENSAVE_TOOL_PARAMS = {
  find_exact_symbol: { required: ['name'],    optional: ['limit'] },
  entities:          { required: ['file'],    optional: ['kinds'] },
  callers:           { required: ['node_id'], optional: ['max_depth','resolve_dispatch'] },
  callees:           { required: ['node_id'], optional: ['max_depth','resolve_dispatch'] },
  impact:            { required: ['node_id'], optional: ['max_depth'] },
  body:              { required: ['symbol'],  optional: ['limit'] },
  status:            { required: [],          optional: [] },
}
PCP_SYMBOLS       = ['ensureDir','handleActualize','handleInit','handleMint','main','resolveTargetFile']
ENSUREDIR_CALLERS = ['handleActualize','handleInit','handleMint','resolveTargetFile']
ENSUREDIR_IMPACT  = ['ensureDir','handleActualize','handleInit','handleMint','main','resolveTargetFile']
ENSUREDIR_BODY_LINE = 'await fs.mkdir(dirPath, { recursive: true });'
DECISION_ENTRY_KEYS = ['id','title','status','cluster','date','summary','adr']
ADR_TEMPLATE_HEADINGS = [
  { level: 1, text: 'ADR-XXXX: <Title>' },
  { level: 2, text: 'Context' },
  { level: 2, text: 'Decision Drivers' },
  { level: 2, text: 'Considered Options' },
  { level: 2, text: 'Decision Outcome' },
  { level: 2, text: 'Consequences' },
  { level: 3, text: 'Positive' },
  { level: 3, text: 'Negative / Caveats' },
]
COMPLEXITY_TIERS = [
  'Tier 0 (Fast-Track / Planning Bypass)',
  'Tier 1 (Standard)',
  'Tier 1.5 (Middle)',
  'Tier 2 (Architectural)',
]
LABEL_RESIDUAL_RE        = /middle-complexity|\*\*Middle\*\*/
CANONICAL_LABEL_RESIDUAL = 0      // under plugins/steps (excluding harnesses/) and AGENTS.md
HARNESS_LABEL_RESIDUAL   = 8      // under plugins/steps/harnesses/ — Phase 3, counted not ignored
TOKEN_BUDGET             = 200
TOKEN_BUDGET_DOC_SITES   = 5      // post-repair, across the four doc files E4 scans
TOKEN_BUDGET_GATE_SITES  = 1      // /estimatedTokens\s*<\s*(\d+)/ in constitution_skills.test.js
SHORTCODE_REGISTRIES = [
  { path: 'ai-docs/constitution.yaml', scope: 'governance', tracked: true  },
  { path: '.pcp/MAP.json',             scope: 'pcp CLI sandbox', tracked: false },
]
```

Payload anchors, imported from `tests/fixtures/expected.mjs` rather than restated:
`SEC_RULE_ID = 'sec-auth-01'` (`:17`), `DECISION_ID = 'd-8f3a'` (`:49`),
`DECISION_ADR = GOLDEN_DECISIONS['d-8f3a'].adr` (`= 'ai-docs/decisions/ADR-0001-unified-esm.md'`),
`CAVEAT_ID = 'c-e9a2'` (`:60`), `REQUIREMENT_ID = 'r-b111'` (`:70`), `DEFERRED_ID = 'l-e404'`
(`:79`), `SPEC_ENDPOINT = '/api/v1/auth/login'` (`:96`), `SPEC_SECTION = 'security_invariants'`.

### Table 5 — the extractor self-test corpus (`SELFTEST_DOC`, `SELFTEST_EXPECTED`)

A frozen literal document in `tests/fixtures/recipes.mjs`, never read from disk, containing:

- a ```` ```bash ```` fence with two command lines and one `#` comment;
- a ```` ```json ```` fence;
- a fence with an **empty** info string;
- a `~~~yaml` tilde fence;
- a CRLF-terminated section;
- inline spans outside fences, including `` `rtk raw <cmd>` ``, `` `docker compose up` ``,
  `` `pcp mint` ``, `` `tokensave_<command>` `` and `` `not a command` ``;
- at least one backtick span **inside** a fence, which must not be extracted.

`SELFTEST_EXPECTED` declares the exact fence list (index, info, body) and the exact selected
command-span list — which **includes** `rtk raw <cmd>` and **excludes** `docker compose up`,
`pcp mint`, `tokensave_<command>`, `not a command` and the in-fence span. `B3` asserts equality
against it, reads only literals, and is a document check.

---

## Declared expected results, and which are genuinely declared

| value | provenance | tautology risk |
|---|---|---|
| `ENSUREDIR_CALLERS` | `ensureDir(` call sites in `pcp.js` at `:264` (in `resolveTargetFile`, `:253`), `:345` (`handleInit`, `:343`), `:413` (`handleMint`, `:407`), `:451` (`handleActualize`, `:449`) | **none** — derived from source, then confirmed against the graph. If the graph disagrees, the graph is wrong. |
| `ENSUREDIR_IMPACT` | the four above plus `main` (`pcp.js:86` calls `handleInit`) plus `ensureDir` itself | none |
| `ENSUREDIR_BODY_LINE` | `pcp.js:219`, verbatim | none |
| `PCP_SYMBOLS` | `pcp.js:218,449,343,407,70,253` | none |
| `DECISION_ENTRY_KEYS` | key order of `CONSTITUTION.decisions[0]` at `expected.mjs:49-56` | none — `expected.mjs` is a literal file under the provenance rule |
| `cq-*` / `rd-*` payload anchors | shortcode ids literal at `expected.mjs:17,49,60,70,79,96`; `DECISION_ADR` from `GOLDEN_DECISIONS` | none |
| `SPEC_SECTION` | a key of the `.spec` mapping, verified present in `yq '.spec \| keys'` output | none |
| `adr-verify` count | `Object.keys(GOLDEN_DECISIONS).length` (`expected.mjs:223-231`), **and** an independent `>= 1` floor | the equality side alone would be two-sided; the floor kills `All 0 …` |
| `TOKENSAVE_TOOL_PARAMS` | transcribed from `tokensave tool <name> --help` | **a drift detector, not an independent golden.** `A3` compares it back to the binary, and is a live check. Everything that catches a wrong *doc* is the C and S suites, which compare the doc to this table, which the plan froze — and those run in `npm test`. |
| `RTK_VERBS` | a plan decision, not a reading of `rtk --help` | none — `RTK_VERBS_FLOOR` separately asserts the parser sees a real binary |
| `LIVE_CHECKS` | a plan decision, applying constraint C4's partition rule | none — `B4` asserts the partition is exactly this list, in both modes, so a check cannot migrate to make `npm test` green |
| `COMPLEXITY_TIERS` | a plan decision (**D2**) | none |
| `HARNESS_LABEL_RESIDUAL = 8` | measured under `plugins/steps/harnesses/` | none — a counted deferral, not an ignore. Adding one fails `E3c`; closing them all also fails `E3c`, so the Phase 3 decision has to be taken deliberately. |
| `TOKEN_BUDGET = 200` | `tests/constitution_skills.test.js:235` | a doc↔gate comparison; the plan fixes 200, so the docs move, not the bound |
| `TOKEN_BUDGET_DOC_SITES = 5`, `TOKEN_BUDGET_GATE_SITES = 1` | measured post-repair (7 sites today; `ai-docs/README.md:98,100` go with the fence at `:86-102`) | **these are the denominators.** Without them, "every occurrence equals 200" is satisfied by zero occurrences — deleting the sentences, or renaming `estimatedTokens < 200` to a named constant, would make `E4` pass vacuously. |
| `ci-status` counts | **deliberately not declared.** Key set and `> 0` only. | n/a |

---

## The frozen FAIL set

Stated once, and mechanically derivable from the check definitions above applied to the
**pre-repair** artifacts. The universe is **99 checks + `B4`**:

| suite | checks | of which live | ok today | FAIL today |
|---|---|---|---|---|
| `B4` partition | 1 | 0 | 1 | 0 |
| `A1`, `A6` tool resolution | 2 | 1 (`A6`) | 2 | 0 |
| `A2..A5` graph and binary drift | 4 | 4 | 4 | 0 |
| `B1.<file>` (5), `B2.<file>` (5), `B3` (1) | 11 | 0 | 7 | 4 |
| `C:<recipeId>` static shape | 20 | 0 | 11 | 9 |
| `S1..S8` static block validators | 8 | 0 | 2 | 6 |
| `X1..X13` command-span verbs | 13 | 9 | 11 | 2 |
| `D:<recipeId>.<n>` execution + payload | 35 | 17 | 26 | 9 |
| `E1, E2, E3a, E3b, E3c, E4` doc consistency | 6 | 0 | 1 | 5 |
| **total** | **100** | **31** | **65** | **35** |

**`node tests/recipe-exec.test.js` must exit 1, print 100 report lines, and report FAIL for exactly
these 35 ids:**

```
B1.code-intelligence   B1.ai-docs-README   B2.AGENTS   B2.ai-docs-README

C:cq-spec     C:ci-find     C:ci-entities   C:ci-callers   C:ci-callees
C:ci-impact   C:ci-body     C:ci-status     C:rd-spec

S1  S2  S3  S4  S5  S6

X8  X13

D:cq-spec.1    D:ci-find.1   D:ci-entities.1  D:ci-callers.u  D:ci-callees.u
D:ci-impact.u  D:ci-body.1   D:ci-status.1    D:rd-spec.1

E1  E3a  E3b  E3c  E4
```

**`node tests/recipe-exec.test.js --hermetic` must exit 1, print 69 report lines, and report FAIL
for the 27 of those that are document checks** — the same list minus the eight live FAILs
(`X8` and the seven `D:ci-*`). None of the twelve `jq`-dependent checks is a FAIL today: all ten
`jq` command lines execute at exit 0 with their declared anchors and ≤ 145 estimated tokens, and
both bare `jq` spans resolve.

Why each, in one line:

- `B1.code-intelligence` — 7 fences extracted, 13 declared.
- `B1.ai-docs-README` — 7 fences extracted, 6 declared (the validation fence at `:86-102` is not
  declared and must go).
- `B2.AGENTS` — the doc has `rtk raw <cmd>`; the table declares `rtk proxy <cmd>`.
- `B2.ai-docs-README` — 2 spans extracted, 3 declared (`npm test` does not exist there yet).
- `C:cq-spec`, `C:rd-spec` — the declared first command is `yq '.spec | keys' …`; the doc says
  `yq '.spec' …`.
- `C:ci-*` (7) — indices 0, 2, 4, 6 resolve to fences whose bodies are the broken CLI command plus a
  raw JSON object (7-8 command lines against 1-2 declared, and heads `{`, `"tool":`, `}` are not in
  `ALLOWED_HEADS`); indices 8, 10, 12 do not resolve.
- `S1..S6` — indices 1, 3, 5 resolve to `bash` fences, not `json`; 7, 9, 11 do not resolve.
- `X8` — the declared span `rtk proxy <cmd>` is absent from the document.
- `X13` — the declared span `npm test` is absent from `ai-docs/README.md`.
- `D:ci-*` (7) — every `ci-*` recipe's extracted command count differs from its declared count, or
  its fence does not resolve.
- `D:cq-spec.1`, `D:rd-spec.1` — the extracted body runs `yq '.spec'`, whose payload estimates
  **255** tokens against `maxTokens 200`.
- `E1` — the Source-of-Truth bullet names one registry, unqualified.
- `E3a` — `MODEL_ROUTING.md` yields `[T0, T1, T2, Middle]`.
- `E3b` — `AGENTS.md` yields `[T0, T1, T2]`.
- `E3c` — 6 canonical label-residual occurrences against a declared 0.
- `E4` — 7 doc sites against a declared 5, all reading 300 against a declared 200.

`B4`, `A1..A6`, `B3`, `E2`, `S7`, `S8`, `C:adr-verify`, all `cq-*`/`rd-*` shape checks except the
two `spec` rows, `D:adr-verify.u` and the remaining 26 `D` checks are `ok` today — each verified by
direct execution above. **A divergence from this set is a reported decision to the orchestrator,
not an edit to a table.**

Residual chains, disjoint subsets summing to 35:

```
full runner   35 → I4 (−15) → 20 → I5 (−6) → 14 → I6 (−2) → 12 → I7 (−1) → 11
                 → I8 (−3)  →  8 → I9 (−2) →  6 → I10 (−6) → 0
document      27 → I4 (−8)  → 19 → I5 (−6) → 13 → I6 (−1) → 12 → I7 (−1) → 11
                 → I8 (−3)  →  8 → I9 (−2) →  6 → I10 (−6) → 0
live           8 → I4 (−7)  →  1 → I5 (−0) →  1 → I6 (−1) →  0
```

---

## Work items

Every gate below reads the runner's exit code directly. **No gate pipes a runner into anything.**
`node tests/recipe-exec.test.js 2>&1 | rg '^FAIL'` reports `rg`'s status, so a runner that crashes
before printing satisfies "zero FAIL lines" perfectly. Every item declares its expected exit code
alongside its expected FAIL set, and every repair item additionally carries a **secondary gate**
that measures the artifact directly and can be run today, before either runner exists.

Items 4-10 gate on the unflagged `node tests/recipe-exec.test.js`, the full run, so that one number
tracks the whole phase. Item 11 gates on both modes.

### Item 1 — fenced-block and code-span extraction in `tests/lib/markdown-sections.mjs`

**What changes.** `parseDoc` gains two additional return fields, both computed inside the existing
single pass at `tests/lib/markdown-sections.mjs:35-57`:

- `fences: [{ index, info, startLine, endLine, body }]` — `index` 0-based within the file,
  `info` lowercased and trimmed, `body` the fence's interior lines joined by `\n`.
- `codeSpans: [{ line, text }]` — backtick spans on lines **outside** any fence, matched with
  `` /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g ``, `text` trimmed.

`startLine`, `endLine` and `codeSpans[].line` are **file-relative**. `parseDoc` strips frontmatter
at `:22-27` before the scanning loop, and the loop's index counts body lines, so the frontmatter
length must be added back. Measured, the offset is 4 for the three `SKILL.md` files and 0 for
`AGENTS.md` and `ai-docs/README.md` — the inconsistency is the trap, and a systematically wrong
number in a failure message is worse than none.

Existing return fields (`frontmatter`, `bodyLines`, `fenceStripped`, `headings`) are unchanged.

**Why.** `markdown-sections.mjs:1-3` declares itself "One document parser for every markdown
assertion in the suite". A second fence state machine in a new module would contradict that on the
first day. It is also the module that already normalises CRLF (`:18`), which is what keeps the
`crlf-frontmatter` negative control green (C5).

**Gate 1.**
`node -e "import('./tests/lib/markdown-sections.mjs').then(async m=>{const fs=await import('node:fs');const d=m.parseDoc(fs.readFileSync('.agents/skills/adr-manager/SKILL.md','utf8'));console.log(JSON.stringify(d.fences.map(f=>[f.info,f.startLine])), d.codeSpans.length)})"; echo "exit=$?"`

Current output:
```
TypeError: Cannot read properties of undefined (reading 'map')
    at [eval]:1:...
exit=1
```
`d.fences` and `d.codeSpans` do not exist. Guarded with `d.fences && …` the same command prints
`undefined undefined` at exit 0, which is why the gate is written unguarded.

**Expected after:** `[["markdown",24],["yaml",77],["bash",95]] 38` — file-relative openers at
`:24`, `:77`, `:95`, and 38 spans. (Body-relative they are 20, 73, 91; a run that prints those has
the frontmatter bug.)

**Gate 2 — the CRLF control, measured rather than reasoned.** Copy the five in-scope files into a
temp directory outside the repo, convert to CRLF there, run the extractor on both copies, and assert
the fence and span inventories are identical. This dirties no repo path, so C1's guard refusal does
not apply, and it turns the phase's most-cited unverified assumption into a five-second check.

```
$ d=$(mktemp -d); … sed 's/$/\r/' each of the five files into "$d" …
$ node -e "<parse LF and CRLF copies, compare (index, info, body) and (line, text) lists>"; echo "exit=$?"
```
Current output: `exit=1` (`parseDoc` has no `fences`). **Expected after:** `identical` and `exit=0`.

**Gate 3.** `node --test tests/pcp_skill.test.js tests/constitution_skills.test.js` stays at
`# pass 66 / # fail 0`. The change is additive; any movement means an existing consumer broke.

**Order.** First: Items 2 and 3 both import it, and nothing else in the phase can be measured
without it.

---

### Item 2 — `tests/fixtures/recipes.mjs`: the declared tables

**What changes.** New file containing Tables 1-5 verbatim, plus the provenance-rule header copied in
form from `tests/fixtures/expected.mjs:1-6`. Imports `GOLDEN_DECISIONS` and the shortcode ids from
`expected.mjs`; imports nothing else and reads no file.

**Why.** The acceptance criterion turns on payloads being *declared*, not read back. Splitting the
declaration from the runners is what makes Item 3's code unable to grade itself.

**Gate — and it must bind the assertion content, not four scalars.** A gate that prints
`RUNNABLE_RECIPES.length, STATIC_BLOCKS.length, COMMAND_SPANS.length` is satisfied by a table whose
every declared assertion has been replaced by the universal post-condition alone. That is the
cheapest narrowing available in this phase, it needs no bad faith, and no other check would see it.
Phase 1's analogous device worked because its frozen table contained verbatim literals that appear
byte-identically in the artifact and could be diffed mechanically. So:

```
node -e "import('./tests/fixtures/recipes.mjs').then(m=>{
  for (const r of m.RUNNABLE_RECIPES)
    r.commands.forEach((c,i)=>console.log(\`\${r.id}.\${r.unit?'u':i+1} \${JSON.stringify(c.assert)}\`));
  console.log(m.RUNNABLE_RECIPES.length, m.STATIC_BLOCKS.length, m.COMMAND_SPANS.length,
              m.LIVE_CHECKS.length, m.DOC_CHECK_COUNT, m.FULL_CHECK_COUNT, m.RTK_VERBS.join(','));
})"; echo "exit=$?"
```

**Current output:**
```
Error: Cannot find module '/Users/purplelephant/projects/pcp/tests/fixtures/recipes.mjs' imported from …
exit=1
```

**Expected after:** 35 assertion lines, one per declared execution, each naming its assertion kinds
and literal values exactly as Table 1 gives them, followed by `20 8 13 31 69 100 proxy` and
`exit=0`. The 35 lines are determined by Table 1 and are checked against it cell by cell; a missing,
weakened or substituted assertion is visible in this output, as is a `LIVE_CHECKS` list that has
grown or shrunk.

**Order.** Before Item 3: every assertion the runners make is an entry in this file, so a runner
written first would invent the values it is meant to be graded against.

---

### Item 3 — the runner and its two declared modes

**What changes.** One new standalone Node script, `tests/recipe-exec.test.js` (not a `node --test`
file — see C2). `package.json` gains `"test:recipes": "node tests/recipe-exec.test.js"`.
`scripts.test` is **not** touched by this item (see Item 11).

- unflagged — `B4` + all 99 checks. This is the phase's acceptance criterion (`PHASES.md:36`), which
  is why the acceptance command carries no flag.
- `--hermetic` — `B4` + the 68 `DOC_CHECKS`, selected by subtracting the frozen `LIVE_CHECKS`
  literal from the universe. Not a filter the implementer writes; see C4.
- any other `argv` — exit 3 `BLOCKED` before any check runs. `--hermetic` is the only argument the
  runner accepts, so there is no general skip mechanism to grow.

Report line shape, mandated by C2: `ok   <id> — <name>` / `FAIL <id> — <name>` / `BLOCKED <reason>`,
with no digit after `ok`, no `# tests`/`# pass`/`1..N` line, and no `# Subtest: ` line. Every
diagnostic line is prefixed `#recipe `, on every line of multi-line captured output.

The checks, in order:

*Preconditions (failure ⇒ exit 3, `BLOCKED`)*

- `A1 every DOC_TOOL resolves on PATH` — `resolveTool` over `DOC_TOOLS`. **Document check.**
- `A6 every LIVE_TOOL resolves on PATH` — `resolveTool` over `LIVE_TOOLS`. **Live check.**
- `A2 the code graph indexes the PCP CLI` — `tokensave tool entities --file plugins/pcp/skills/pcp/scripts/pcp.js`; `PCP_SYMBOLS ⊆ names`. Remedy printed: `tokensave sync`. **Live.**
- `A3 declared tokensave tool parameters match the installed binary` — **the parser is declared, not
  left to the implementer.** Read only the lines strictly between a line equal to `Parameters:` and
  the first line matching `^Reserved flags:` or a blank line, matching
  `/^\s+--(\S+)\s+\S+\s+(required|optional)\b/`. Every `--help` output ends with
  `Reserved flags: --json, --project <path>, --args <json>, -h/--help`, which is prose; a parser
  that matches `--` anywhere picks up four phantom optionals and fails against a correct table.
  Verified: the declared parser reproduces `TOKENSAVE_TOOL_PARAMS` exactly for all seven tools,
  `status` included (empty). **Live.**
- `A4 declared rtk verbs are advertised by the installed rtk` — parse `rtk --help` `Commands:`;
  assert `RTK_VERBS ⊆ parsed` and `RTK_VERBS_FLOOR ⊆ parsed` (the floor detects a broken parser
  returning a small or empty set). **Live.**
- `A5 the declared read-only tool set is disjoint from the binary's [edit] category` —
  `TOKENSAVE_READONLY_TOOLS ∩ (binary's [edit] category) === ∅`. A check on the *table*, not on any
  recipe; the doc-side control is `C:<id>`'s third clause. **Live.**

*Partition (failure ⇒ exit 1)*

- `B4 the check partition is the declared one` — `DOC_CHECKS ∪ LIVE_CHECKS` is the whole universe,
  the two are disjoint, `LIVE_CHECKS` equals the declared literal, and the count this runner is
  about to execute equals `DOC_CHECK_COUNT` or `FULL_CHECK_COUNT` as appropriate. Present in **both**
  runners.

*Inventory closure and instrument self-test (all document checks)*

- `B1.<file>` (5) — extracted `(index, info)` list for that file **equals** the declared fences from
  `RUNNABLE_RECIPES ∪ STATIC_BLOCKS`.
- `B2.<file>` (5) — extracted command-span multiset for that file **equals** its `COMMAND_SPANS`
  rows.
- `B3 the extractor reproduces the declared self-test extraction` — Table 5.

*`C:<recipeId>` static shape (20, all document checks)* — extracted commands equal `commandLines`
verbatim and in order; flags ⊆ declared params with required present; heads allowed after
assignment-stripping, `$( … )` recursion and pipe-splitting, under the script-recipe rule; the
read-only-tool clause; every command carries at least one declared assertion.

*`S1..S8` static block validators (all document checks)* — per Table 2.

*`X1..X13` command-span verbs* — per Table 3; six document, seven live. A declared span absent from
the document FAILs; it is never skipped.

*`D:<recipeId>.<n>` execution and payload (35)* — layers 2 and 3 against the extracted body.
28 document, 7 live.

*`E1..E4` doc consistency (6, all document checks)*

- `E1 the Source of Truth bullet declares both registries` (Item 7): the bullet's set of
  backtick-quoted registry paths equals `SHORTCODE_REGISTRIES.map(r => r.path)` and each entry's
  `scope` word appears in the bullet.
- `E2 .pcp/MAP.json is ignored and not tracked` — `git check-ignore -q .pcp/MAP.json` exits 0 **and**
  `git ls-files --error-unmatch .pcp/MAP.json` exits non-zero. `check-ignore` alone lives in the
  ignore-pattern space and exits 0 for a path that is ignored *and* tracked anyway; the sentence
  Item 7 writes is about trackedness. Measured today: 0 and 1.
- `E3a` / `E3b` — the `/^- \*\*(.+?)\*\*/` per-line label list of `MODEL_ROUTING.md`'s
  `## Complexity gate` and of `AGENTS.md`'s `## Adaptive Complexity Gate` each **deep-equal**
  `COMPLEXITY_TIERS`. Deep equality is order-sensitive, deliberately: a routing table whose tiers
  are out of order is a real defect. Comparing the two files to each other would let them agree on a
  wrong answer; `COMPLEXITY_TIERS` is the declared third party.
- `E3c` — `LABEL_RESIDUAL_RE` occurrences under `plugins/steps` excluding `harnesses/`, plus
  `AGENTS.md`, equal `CANONICAL_LABEL_RESIDUAL`; occurrences under `plugins/steps/harnesses/` equal
  `HARNESS_LABEL_RESIDUAL`.
- `E4` — every `\b(\d{2,4}) tokens?\b` and `sub-(\d{2,4}) token` occurrence across
  `constitution-query/SKILL.md`, `adr-manager/SKILL.md`, `code-intelligence/SKILL.md` and
  `ai-docs/README.md` equals `TOKEN_BUDGET`; **and** the occurrence count equals
  `TOKEN_BUDGET_DOC_SITES`; **and** `/estimatedTokens\s*<\s*(\d+)/` matches
  `tests/constitution_skills.test.js` exactly `TOKEN_BUDGET_GATE_SITES` times with capture
  `String(TOKEN_BUDGET)`. Both cardinalities are asserted before any value is compared.

**Gate 1.** `node tests/recipe-exec.test.js; echo "exit=$?"`

Current output:
```
node:internal/modules/cjs/loader:1433
  throw err;
  ^
Error: Cannot find module '/Users/purplelephant/projects/pcp/tests/recipe-exec.test.js'
exit=1
```

Expected after: `exit=1`, **100** report lines, 65 `ok`, FAIL for exactly the 35 ids frozen above.

**Gate 2.** `node tests/recipe-exec.test.js --hermetic; echo "exit=$?"`
Current output: `Cannot find module …`, `exit=1`.
Expected after: `exit=1`, **69** report lines, 42 `ok`, FAIL for the 27 document ids.

**Gate 3.** `node tests/recipe-exec.test.js --hermetic --only D:ci-find.1; echo "exit=$?"`
Current output: `Cannot find module …`, `exit=1`.
Expected after: `exit=3` and a `BLOCKED` line naming the unrecognised argument. This is the check
that `--hermetic` did not arrive with a general filter attached.

**Order.** After Items 1-2 (the runner imports both). Before every repair item, because it *is*
their gate.

---

### Item 4 — `code-intelligence/SKILL.md`: split the fences, repair the CLI recipes

**What changes.** Sections 1-6 (`:32-121`) each currently hold one ```` ```bash ```` fence
containing a shell command **and** a JSON object under a `# MCP Tool Call` comment. Verified, the
combined fence is not executable at all:

```
$ bash -c "$(sed -n '35,44p' .agents/skills/code-intelligence/SKILL.md)"
bash: line 5: tool:: command not found
bash: -c: line 9: syntax error near unexpected token `}'
exit=2
```

Each becomes two adjacent fences — ```` ```bash ```` with the CLI recipe, then ```` ```json ````
with the MCP call, **carried over unchanged in this item**. Section 7 (`:123-128`) already holds a
bash-only fence and keeps it. Post-repair the file has **13** fences: bash at 0, 2, 4, 6, 8, 10, 12
and json at 1, 3, 5, 7, 9, 11.

CLI recipe bodies: exactly the `commandLines` in Table 1 for `ci-find` … `ci-status`. All seven were
executed and returned exit 0 with a non-empty payload (425 / 7160 / 1258 / 248 / 1457 / 598 / 1263
bytes) satisfying their declared assertions.

Prose that must move with the recipes: the comment at `:65`,
`# CLI Recipe (by symbol name or node ID)`, is false — `callers` accepts only a node ID. (The
comment is at `:65`; `:66` is the command.)

**Why.** This is the phase's core defect: four silent exit-0 recipes, two loud failures, four
non-existent symbols, and a fence shape that cannot be executed as `bash` at all.

**Gate.** `node tests/recipe-exec.test.js; echo "exit=$?"`
Expected: `exit=1`, full FAIL set reduces from 35 to **20** — `B1.ai-docs-README`, `B2.AGENTS`,
`B2.ai-docs-README`, `C:cq-spec`, `C:rd-spec`, `S1..S6`, `X8`, `X13`, `D:cq-spec.1`, `D:rd-spec.1`,
`E1`, `E3a`, `E3b`, `E3c`, `E4`. Closes `B1.code-intelligence` and `C:ci-*` (8 document checks) and
`D:ci-*` (7 live checks). The hermetic run goes 27 → 19; the live residual goes 8 → 1.

**Secondary gate, runnable today.**
`TOKENSAVE_DISABLE_GREP_HOOK=1 grep -c '^```' .agents/skills/code-intelligence/SKILL.md`
Current output: `14` (7 fences). Expected after: `26` (13 fences).

**Order.** First repair. Nothing later re-opens it.

---

### Item 5 — `code-intelligence/SKILL.md`: repair the six MCP argument objects

**What changes.** In the six `json` fences Item 4 created: `callers`/`callees`/`impact` move from
`"name"` to `"node_id"`, `body` from `"name"` to `"symbol"`, `entities` from `"path"` to `"file"`,
and `callees` gains `"max_depth"`. Argument *values* are the corresponding symbol names or a
node-id placeholder; only the key sets are asserted.

**Why.** `code-intelligence/SKILL.md:69-74` documents
`{"tool":"callers","arguments":{"name":"actualize"}}`, and `callers`' only required parameter is
`node_id`. The MCP form carries the identical defect the CLI form does. Separating it from Item 4
matters: Item 4 would otherwise do four separable jobs behind one FAIL-set delta, which cannot
distinguish "three of four done" — and a partial Item 4 leaves `.agents/skills/` dirty, where C1
means the mutation harness also refuses.

**Gate.** `node tests/recipe-exec.test.js; echo "exit=$?"`
Expected: `exit=1`, full FAIL set reduces from 20 to **14**. Closes `S1..S6`, all document checks;
the hermetic run goes 19 → 13 and the live residual is unchanged at 1.

**Secondary gate, runnable today.**
`TOKENSAVE_DISABLE_GREP_HOOK=1 grep -c '"node_id"' .agents/skills/code-intelligence/SKILL.md; echo "exit=$?"`
Current output: `0`, `exit=1`. Expected after: `3`, `exit=0`.

**Order.** Immediately after Item 4, which creates the fences it edits.

---

### Item 6 — `AGENTS.md:63`: `rtk raw` → `rtk proxy`

**What changes.** One span, in place: `` `rtk raw <cmd>` `` → `` `rtk proxy <cmd>` ``. Line 63 keeps
its line number (same-line replacement), so no other citation shifts.

**Why.** `rtk raw echo hi` exits 127 with `[rtk: No such file or directory (os error 2)]`;
`rtk proxy echo hi` exits 0 and prints `hi`. `raw` is absent from `rtk --help`'s `Commands:` block;
`proxy` is present, described as "Execute command without filtering but track usage" — which is
what `:63`'s fallback protocol asks for.

**Gate.** `node tests/recipe-exec.test.js; echo "exit=$?"`
Expected: `exit=1`, full FAIL set reduces from 14 to **12**. Closes `B2.AGENTS` (document) and `X8`
(live). The hermetic run goes 13 → 12; the live residual goes 1 → 0, and from this item onward both
modes report the same FAIL set.

**Secondary gate, runnable today.**
`TOKENSAVE_DISABLE_GREP_HOOK=1 grep -c 'rtk raw' AGENTS.md; echo "exit=$?"`
Current output: `1`, `exit=0`. Expected after: `0`, `exit=1`.

**Order.** After Items 4-5 so each gate output isolates one closure; otherwise independent. Must
precede Item 11.

---

### Item 7 — `constitution-query/SKILL.md:105`: name both registries

**What changes.** The `- **Source of Truth**:` bullet is rewritten to name both registries with
their scopes: `ai-docs/constitution.yaml` as canonical for the governance shortcodes this skill
queries, and `.pcp/MAP.json` as the `pcp` CLI's minting registry, git-ignored and therefore not
shipped. The word "canonical" may only appear qualified by a scope.

**Why.** Measured above: the two registries hold overlapping-but-unequal shortcode sets, and `.pcp/`
is git-ignored (`.gitignore:2`). An agent that believes `:105` and mints via `pcp mint` writes to a
registry the skill says is not canonical, and `adr-manager/SKILL.md:67`'s cross-registry uniqueness
rule is unverifiable. `E1` checks the prose; `E2` independently checks trackedness against git.

**Gate.** `node tests/recipe-exec.test.js; echo "exit=$?"`
Expected: `exit=1`, FAIL set reduces from 12 to **11**. Closes `E1`.

**Secondary gate, runnable today.**
`TOKENSAVE_DISABLE_GREP_HOOK=1 grep -c 'MAP.json' .agents/skills/constitution-query/SKILL.md; echo "exit=$?"`
Current output: `0`, `exit=1`. Expected after: `1`, `exit=0`.

**Order.** Independent of Items 4-6; placed after them.

---

### Item 8 — complexity-gate labels: one vocabulary across six live sites

**What changes.**

- `plugins/steps/MODEL_ROUTING.md` — the `- **Middle**` bullet at `:35-36` is **moved** to sit
  between the Tier 1 bullet (`:31`) and the Tier 2 bullet (`:32-34`), and relabelled
  `- **Tier 1.5 (Middle)**`. Relabelling in place leaves the order `T0, T1, T2, Tier 1.5`, which
  fails `E3a`'s order-sensitive deep-equality — the item would not close the check it exists to
  close.
- `AGENTS.md` — a fourth bullet carrying the `Tier 1.5 (Middle)` label and MODEL_ROUTING's
  description of the class (plan cheap with `steps-planner`, then `steps-architect-pro` as an extra
  plan-review lens, keeping the wave at three reviewers or fewer) is inserted **after line 86,
  between Tier 1 and Tier 2**. It is not appended after Tier 2: `AGENTS.md` is 87 lines long, so
  "after line 87" is end-of-file and yields `T0, T1, T2, Tier 1.5`, which fails `E3b`. The insertion
  shifts the Tier 2 bullet from `:87` to `:88`; this plan's Scope citation reads `AGENTS.md:85-87`
  pre-repair and `:85-88` after. Verified, no file outside `.plans/` cites an `AGENTS.md` line
  number (`rg -n --hidden -g '!.plans' -g '!.git' 'AGENTS\.md:[0-9]+' .` → nothing).
- `plugins/steps/skills/steps/SKILL.md:92` and `:116` — "middle-complexity phases" → the
  `Tier 1.5 (Middle)` label. Editing only `:116` ships one file using two routing vocabularies.
- `plugins/steps/README.md:61` — same replacement.
- `plugins/steps/agents/steps-architect-pro.md:3` (the `description:` frontmatter) and `:15` — same
  replacement. This is the canonical, marketplace-shipped agent definition; its description is what
  a harness reads when routing.

**Why.** `MODEL_ROUTING.md` routes four ways with three of them tier-numbered; `AGENTS.md` routes
three; four other canonical files carry the un-numbered vocabulary. `AGENTS.md:43-44` states that
every harness manifest must agree with `MODEL_ROUTING.md`'s tables, so an un-numbered fourth class
is a routing vocabulary with no name to agree on.

**Hazard the implementer must know.** `plugins/steps/skills/steps/SKILL.md` is symlinked into
`~/.agents/skills/steps`, so the edit is live in the running session the moment it is written. A
label change is low risk; a structural edit to that file is not.

**Gate.** `node tests/recipe-exec.test.js; echo "exit=$?"`
Expected: `exit=1`, FAIL set reduces from 11 to **8**. Closes `E3a`, `E3b`, `E3c`.

**Secondary gate, runnable today.**
```
$ TOKENSAVE_DISABLE_GREP_HOOK=1 grep -rEo 'middle-complexity|\*\*Middle\*\*' --include='*.md' plugins/steps --exclude-dir=harnesses AGENTS.md | wc -l
6
$ TOKENSAVE_DISABLE_GREP_HOOK=1 grep -rEo 'middle-complexity|\*\*Middle\*\*' --include='*.md' plugins/steps/harnesses | wc -l
8
```
Expected after: `0` and `8`.

**Order.** After Items 4-7. It touches no file an earlier item touches except `AGENTS.md`, and it
inserts below Item 6's line 63.

---

### Item 9 — the token budget the skill docs state, and the recipe that breaches it

**What changes.**

- `constitution-query/SKILL.md:16` — "sub-300 token boundaries" → "sub-200".
- `constitution-query/SKILL.md:104` — "must remain under 300 tokens" → "under 200 tokens".
- `constitution-query/SKILL.md:95` — `yq '.spec' ai-docs/specs/auth-spec.yaml` becomes
  `yq '.spec | keys' ai-docs/specs/auth-spec.yaml`, and the comment at `:94`,
  `# Inspect entire spec definition`, becomes `# List the spec's top-level sections`.
- `adr-manager/SKILL.md:88` — `<One-sentence summary under 300 tokens>` → `under 200 tokens`.

**Why `:95` changes.** `ai-docs/constitution.yaml:24` carries `qual-hygiene-01`,
`enforcement: strict`:

> "Context exploration must use progressive disclosure via tokensave or RTK tools; broad
> repository-wide grep or full-file dumping is prohibited."

That sentence is load-bearing text, not decoration: `tests/mutation-harness.mjs`'s
`rule-inverted-unqueried` mutation anchors it **verbatim** and requires `npm test` to go RED when it
is negated, so the repository already spends a mutation slot defending it.

`yq '.spec' ai-docs/specs/auth-spec.yaml` emits the entire spec file. It **is** a full-file dump,
and `constitution-query/SKILL.md` — a skill whose stated purpose is slice retrieval — documents it
as recipe 6. The recipe is non-conformant with the project's own constitution on the artifact's own
merits, and would be non-conformant if no token bound existed anywhere in this repository.
`yq '.spec | keys'` is the progressive-disclosure form the rule asks for: it returns the six section
names the reader then slices, and `:98` already documents the slice.

**Why the three prose lines change, and why the bound is corroboration rather than the reason.**
`tests/constitution_skills.test.js:235` enforces `estimatedTokens < 200`, tightened by Phase 1 under
ruling D2, and three live skill-doc lines still say 300 — so a 250-token payload satisfies every
skill doc and fails `npm test`. Measured with the shipped estimator, `.spec` → **255** and
`.spec | keys` → **23**. The bound and the constitution rule point the same way, which is what one
would expect of a bound written to serve that rule; the bound is what *revealed* the recipe, not
what condemns it. Had the numbers come out the other way the recipe would still be wrong. Lowering
the sentence to 200 while leaving `:95` alone would additionally replace one contradiction with
another: a 200-token bound one page above a recipe measured at 255, certified green by a check that
only compares numerals.

Nothing anchors `constitution-query/SKILL.md` line content in the mutation table — its only op is
`crlf-frontmatter`, a whole-file `toCRLF` — so the edit is safe against Phase 1's frozen
enumerations.

**Gate.** `node tests/recipe-exec.test.js; echo "exit=$?"`
Expected: `exit=1`, FAIL set reduces from 8 to **6**. Closes `C:cq-spec` and `D:cq-spec.1`. `E4`
stays red: `ai-docs/README.md` still holds four 300-sites.

**Secondary gate, runnable today.**
```
$ TOKENSAVE_DISABLE_GREP_HOOK=1 grep -cE '300 tokens?|sub-300' .agents/skills/constitution-query/SKILL.md .agents/skills/adr-manager/SKILL.md
.agents/skills/constitution-query/SKILL.md:2
.agents/skills/adr-manager/SKILL.md:1
$ node -e "<estimateTokens of the :95 recipe's stdout>"
255
```
Expected after: `0`, `0`, and `23`.

**Order.** After Item 8. It is the last edit to `.agents/skills/`.

---

### Item 10 — `ai-docs/README.md`: retire the second copy of the class

**What changes.**

- `:74` — `yq '.spec' ai-docs/specs/auth-spec.yaml` → `yq '.spec | keys' …`, and the comment at
  `:73` from `# Using yq` to `# List the spec's top-level sections`. Same defect and same repair as
  `constitution-query/SKILL.md:95`: a full-file dump of the spec, prohibited by
  `ai-docs/constitution.yaml:24` (`qual-hygiene-01`), documented as a retrieval recipe by the file
  whose opening line says the system exists so agents "query isolated schema slices … instead of
  loading monolithic documentation into context windows". The token measurement (255 → 23)
  corroborates; the constitution rule is the reason.
- `:7` — "typically < 300 tokens" → "typically < 200 tokens".
- `:84` — "fit well within sub-300 token limits" → "sub-200 token limits".
- `:82-102` — the `## Payload Size Validation Suite` section's fence is **deleted** and replaced by
  prose: the bound is 200 estimated tokens, it is enforced by `tests/constitution_skills.test.js`,
  and the command that runs it is `` `npm test` `` — written as an inline span, not a fence.

**Why.** `:86-102` is an executable recipe that computes `Math.round(words * 1.3)` and throws above
300. `tests/lib/token-estimate.mjs:1-3` records why that estimator was removed: "A
whitespace-invariant word count (`words * 1.3`) cannot bind a dense payload: 800 whitespace-free
characters score 23." On the same `.spec` payload it reports 107 where the enforced estimator
reports 255. It is a shipped verification recipe that certifies payloads the enforced gate rejects —
the strongest instance of the class in the repository, and unlike the prose sentences Item 9 fixes,
it is executable. Two of the six payloads it certifies are the `.spec` dump
`ai-docs/constitution.yaml:24` prohibits, which it passes at 107 of its own notional 300.

Replacing a duplicate implementation of an enforced bound with a pointer to the single enforced one
removes the duplicate rather than maintaining it in two places.

**The replacement is prose, not a fence, and that is deliberate.** A runnable fence containing
`npm test` would, after Item 11, be executed by `node tests/recipe-exec.test.js --hermetic`, which
`npm test` runs — unbounded recursion. `AGENTS.md:25` already states `` `npm test` `` as an inline span for the same
reason; `X13` checks the new span against `Object.keys(package.json.scripts)`.

**Gate.** `node tests/recipe-exec.test.js; echo "exit=$?"`
Expected: **`exit=0`**, 100 report lines, 100 `ok`, zero FAIL and zero BLOCKED. Closes
`B1.ai-docs-README`, `B2.ai-docs-README`, `X13`, `C:rd-spec`, `D:rd-spec.1` and `E4`.

The exit code is read directly and is part of the criterion. A runner that throws during module
load, or before any report line is written, also produces zero FAIL lines; only the exit code and
the report-line count distinguish that from green, which is why both are declared.

**Secondary gate, runnable today.**
```
$ TOKENSAVE_DISABLE_GREP_HOOK=1 grep -c '^```' ai-docs/README.md
14
$ node -e "<count E4 doc sites across the four files>"
7
```
Expected after: `12` (6 fences) and `5`.

**Order.** Last repair. It is the only item that dirties `ai-docs/`, and it is the item that turns
the gate green, so it sits where a green reading means the whole phase.

---

### Item 11 — wire the hermetic mode into `npm test`, and record the numbers

**What changes.** `package.json`:

```
"test":         "node --test tests/pcp_skill.test.js tests/constitution_skills.test.js && node tests/lib/repo-guard.mjs --selftest && node tests/recipe-exec.test.js --hermetic",
"test:recipes": "node tests/recipe-exec.test.js",
```

Both existing `test` clauses intact and in order; no glob narrowed; `test:mutation` untouched.
It is the **`--hermetic`** invocation, not the full one, that joins `npm test` — see C4.
`test:recipes` runs every check, graph included, and stays mandatory.

**Why.** A gate nobody runs rots, so the 68 document checks join the command
`ai-docs/constitution.yaml:5` declares as `verification_command` and `AGENTS.md:66` mandates before
every commit. The 31 live checks do not, because each needs something a fresh clone does not have —
`.tokensave/` has zero tracked files, and `tokensave`, `rtk` and `jq` appear nowhere in `tests/`
today: wiring them in means a clean checkout cannot satisfy
`ai-docs/constitution.yaml:20`'s `qual-gate-01` ("must execute cleanly and return exit code 0 prior
to phase completion"), and a `BLOCKED` exit inside the three `SURVIVED` mutations would take
Phase 1's committed sweep from 16/16 to 13/16 for an environmental reason. The live gate still
exists, still must pass, and is gate 1 below. What D5 bought is preserved either way: the three
`SURVIVED` controls still execute the runner, so a byte-pinning or crash-on-start runner is still
caught for free.

**Gates, in this order:**

1. `node tests/recipe-exec.test.js; echo "exit=$?"` → expected `exit=0`, 100 report lines, zero FAIL.
   Current output: `Cannot find module … exit=1`.
2. `node tests/recipe-exec.test.js --hermetic; echo "exit=$?"` → expected `exit=0`, 69 report lines,
   zero FAIL. Current output: `Cannot find module … exit=1`.
3. **The hermeticity proof, measured not argued.** Build a temp directory containing symlinks to
   `DOC_TOOLS` only — the mechanism `tests/mutation-harness.mjs:466-473` already uses — set `PATH`
   to it, and run `node tests/recipe-exec.test.js --hermetic` under it. Expected `exit=0` with the
   same 69 lines. If the hermetic mode reaches for `tokensave`, `rtk` or `jq`, this is where it says
   so, before the commit rather than in the post-commit sweep.
   Current output: `Cannot find module … exit=1`.
4. `node --test tests/pcp_skill.test.js tests/constitution_skills.test.js` → expected
   `# tests 66 / # pass 66 / # fail 0`. Current output: `# tests 66 / # pass 66 / # fail 0` — this
   one must not move, which is the point of running it.
5. `npm test; echo "exit=$?"` → expected `exit=0`. Current output: `exit=0` with 15/15 guard
   self-test checks.
6. **Post-commit only** (C1): `node tests/mutation-harness.mjs` → expected **16/16 conformant,
   exit 0**, with the clean-tree baseline still **61** executed leaves (the runner emits no TAP
   leaves in either mode) and every `mustFail` / `mustPass` / `max` value unchanged. Current output measured for
   one row: `--only path-stripped` → `clean tree baseline: 61 executed leaves`,
   `61 executed, 26 failing`, `1/1 mutations conformant`, `exit 0`.
   **No `tokensave sync` precondition applies**, because the runner inside the chain is the hermetic
   one — that is the point of C4, and gate 3 is what proves it in advance.

Any movement in an executed-leaf count or a `mustFail` set at gate 6 **is a reported decision to the
orchestrator, not an edit to `tests/mutation-harness.mjs`.** The frozen table is plan-owned by
Phase 1.

**Order.** Last. Wiring a runner into `npm test` before the repairs land would make `npm test` red
for reasons unrelated to Phase 1's contract, and every intervening item would be measured against a
red baseline.

---

## What a conformant-but-wrong implementation would still pass

The honest answers, not the flattering ones.

**Routes that are closed, and by what:**

1. **A runner that shells out and checks exit 0.** Killed three ways: per-command declared payload
   assertions (layer 3); the universal post-condition, which covers the bare key `count`, a bare
   `[]` or `{}` root, and `No … found.`; and layer 1's static shape check, which fails on `name="X"`
   without executing anything.
2. **A runner that only walks fenced blocks.** `B2.AGENTS` fails: `AGENTS.md` has zero fences and
   five declared spans. `B2` is a document check, so `npm test` catches it.
3. **Executing the declared `commandLines` instead of the extracted body.** Forbidden normatively in
   one place, and mechanically prevented: `C:<id>` compares the extracted body to the declared lines
   before `D` runs, and `D` runs the extracted body. An implementation that executed the declared
   lines would make the two `spec` rows pass today, which the frozen FAIL set forbids.
4. **Defining "known CLI" as membership in `COMMAND_SPANS`.** `B3` runs the extractor over a frozen
   synthetic document containing `rtk raw <cmd>` and expecting it selected; a tautological predicate
   returns nothing there.
5. **A missing `fenceIndex` that throws or is skipped.** Declared a FAIL, uniformly, and the frozen
   set contains 13 such FAILs today, so an implementation that skips them cannot reach 35.
6. **Narrowing the declared assertions to the universal post-condition.** Item 2's gate prints all
   35 assertion sets with their literal values, and this plan freezes the printout.
7. **Moving a live check into the hermetic set, or vice versa, to make a number come out.**
   `B4` runs in both modes and asserts the partition against `LIVE_CHECKS`, a frozen literal that
   Item 2's gate also prints the length of, and that `LIVE_CHECKS` is non-empty.
8. **`--hermetic` growing into a general skip flag.** It is the runner's only argument; any other
   `argv` is `BLOCKED` at exit 3 before a check runs, and Item 3 gate 3 measures that.
9. **A hermetic mode that quietly needs `tokensave`.** Item 11 gate 3 runs it under a `PATH`
   containing only `DOC_TOOLS`.
9. **A vacuous `E4`.** `TOKEN_BUDGET_DOC_SITES` and `TOKEN_BUDGET_GATE_SITES` are asserted before
   any value is compared, so deleting the sentences or renaming the bound to a constant fails
   loudly.
10. **A crash certified as green.** No gate pipes a runner; every item declares an expected exit
    code, and Items 10 and 11 additionally declare the report-line count.
11. **A gate that goes red for any change to these files.** Phase 1's negative controls cover this
    and now cover the hermetic mode too (C3). This is why Tables 1 and 2 key on `fenceIndex` and
    never on a line number, why Item 1 reuses the CRLF-normalising parser and Item 1 gate 2 measures
    it, and why comments and blank lines inside fences are unconstrained.
12. **Both the doc and the tool being wrong in the same direction.** Layer 1 compares the doc to
    `TOKENSAVE_TOOL_PARAMS`, which this plan froze — not to the binary. `A3` compares the frozen
    table back to the binary. `E3a`/`E3b` compare two files to `COMPLEXITY_TIERS` rather than to
    each other. `adr-verify` carries an independent `>= 1` floor beside its `GOLDEN_DECISIONS`
    equality.
13. **A stale or absent code graph masquerading as a doc defect.** `A2` fails with `BLOCKED` and
    exit 3 before any live `D` check runs, naming `tokensave sync`. Exit 3 is not exit 0, and it no
    longer reaches Phase 1's sweep.

**Routes that remain open, and I am not claiming otherwise:**

- **The prose above a fence.** Nothing reads the sentence introducing a recipe. `E1`, `E3*` and `E4`
  cover four specific prose claims; the rest is unchecked. `code-intelligence/SKILL.md:65`'s false
  comment is repaired by name; nothing prevents the next one.
- **A doc that names a CLI outside `COMMAND_SPAN_CLIS`.** A span such as `` `docker compose up` ``
  is not selected by the predicate, so `B2` never sees it and no check fires. `B3` asserts the
  predicate rejects it, which is a check on the extractor, not on the corpus. Widening the list is a
  plan edit, by design.
- **Thirty-one checks are outside `npm test`, and nothing schedules the run that covers them.**
  Someone who runs only `npm test` and never `npm run test:recipes` will not learn that a
  `tokensave` or `jq` recipe has rotted. `B4` stops the partition from growing and Item 11 makes the
  full run a phase gate, but this repository has **no CI at all** — verified, there is no
  `.github/workflows` and no workflow file anywhere — so there is nothing to schedule it into.
  Creating one is outside this phase. This is the largest hole v2 knowingly leaves.
- **MCP argument *values*.** `S1..S6` validate the `tool` name and the argument key set only. A
  block with the right keys and a semantically wrong value passes. Validating values needs an MCP
  client, which this repo does not have.
- **Superset assertions on graph traversal.** `ci-callers`/`ci-callees`/`ci-impact` assert supersets
  and floors, so a graph that grows a spurious extra edge passes. Set-equality was rejected because
  it encodes a tool version, not a document property.
- **A wrong payload that happens to contain the anchor.** `contains SEC_RULE_ID` is satisfied by any
  output containing that string, including a superset query. `maxTokens` bounds it from above but
  the anchors are substrings, not slices. Full-slice equality already exists at
  `tests/constitution_skills.test.js:217-225` via `GOLDEN_SLICES`; duplicating it here would
  double-count and would change `rule-inverted`'s failing set, i.e. edit a frozen table by side
  effect.
- **`B3`'s synthetic document is finite.** An extractor correct on the declared shapes and wrong on
  a shape absent from it — a fence indented four spaces, an HTML comment containing backticks —
  passes `B3`, and would only be caught if it changed a real file's inventory.
- **A recipe that is correct but useless.** `ci-callees` demonstrates the tool on `handleInit`,
  whose only indexed callee is `ensureDir`. The check passes; the doc example is thin.

---

## Risks

Stated as uncertainty.

- **R1 — the full mutation sweep is unrun.** C1 makes it unrunnable once Item 4 dirties
  `.agents/skills/`. Only `--only path-stripped` was measured. The claim that the frozen
  enumerations are untouched rests on the C3 short-circuit argument plus
  `mutation-harness.mjs:587` and `parseTap`'s regexes, all of which were read. It is an argument,
  not a measurement; Item 11 gate 6 is where it becomes one. C4 removes the environmental failure
  mode that would otherwise be the most likely cause of a divergence.
- **R2 — `npm test` acquires no new binary, and the ten `jq` executions move rather than vanish.**
  Verified, the shipped suite resolves `yq` and already shells to `git`
  (`tests/lib/repo-guard.mjs:96`, and `git`, `node`, `npm` and `sh` are all in Phase 1's hermetic
  PATH set at `tests/mutation-harness.mjs:459`), while `jq` and `bash` appear nowhere in `tests/`.
  `DOC_TOOLS` is therefore a subset of what `npm test` already requires, with no exceptions —
  measured, not asserted (C4). The ten `jq` command lines are live checks: they run under
  `npm run test:recipes`, still must pass, and their `commandLines` and payload assertions stay
  pinned by `C:cq-*`/`C:rd-*` inside `npm test`. The residual is R4: on a machine where nobody runs
  the full gate, a `jq` recipe could rot unobserved. Ten of the 27 documented
  `cq`/`rd` command lines pipe `yq -o=json` into `jq`; they are live checks, so they run under
  `npm run test:recipes` and not under `npm test`. Nothing is narrowed — their `commandLines` and
  their declared payload assertions are still pinned by `C:cq-*`/`C:rd-*` inside `npm test`, and the
  executions themselves still must pass before the phase closes. The residual is R4: on a machine
  where nobody runs the full gate, a `jq` recipe could rot unobserved.
- **R3 — help-text scraping.** `A3` and `A4` parse human-readable help from `tokensave 7.9.0` and
  `rtk 0.42.1`. `A3`'s parser is declared normatively above and verified against all seven tools;
  `RTK_VERBS_FLOOR` guards the `rtk` side. Neither is tested against another version. Both are live
  checks, so a breakage here cannot reach `npm test`.
- **R4 — nothing schedules the full gate, and there is nothing to schedule it into.** Item 11 makes
  `npm run test:recipes` a phase gate, but verified, this repository has **no CI**: no
  `.github/workflows`, no workflow file anywhere. So the 31 live checks — the seven `tokensave`
  recipe executions, the ten `jq` ones, the drift detectors and the binary span checks — are
  exercised only when someone runs the command by hand. Creating CI is outside this phase's file
  list. This is the largest hole v2 knowingly leaves, it is owned by nobody, and it should be
  carried as an open item rather than absorbed into a work item here.
- **R5 — `ENSUREDIR_IMPACT` includes `main`, which was inferred.** `pcp.js:86` calls `handleInit`
  inside `main` (`:70`), and the graph reports `main` in the impact closure. The traversal depth at
  which it appears was not verified, so a future `--max-depth` default change could drop it.
- **R6 — `SPEC_SECTION`.** `security_invariants` is a key of the `.spec` mapping, verified present
  in `yq '.spec | keys'` output. It is a fixture property; `ai-docs/specs/auth-spec.yaml` is
  byte-frozen this phase, so it is stable now and would break loudly later.
- **R7 — a mode flag on a gate.** The cost of the partition is that `npm test` runs the gate in a
  reduced mode, and this project's own log records that an allowance on a gate gets used by habit
  and then by CI. Three things bound it: `--hermetic` selects a frozen declared set rather than
  applying a filter; it is the runner's only accepted argument, so it cannot grow options; and `B4`
  runs in both modes and asserts the partition and both cardinalities. Those are real controls, but
  they are the only ones, and a future reader who wants to widen the hermetic set must edit
  `LIVE_CHECKS` in a frozen table — which is the point.
- **R8 — `pcp.js` symbol coupling.** Six declared constants name symbols in
  `plugins/pcp/skills/pcp/scripts/pcp.js`. `PHASES.md:55` puts that file's semantics out of scope,
  so it is stable now; a later rename breaks the live gate loudly. That is correct behaviour,
  recorded so nobody later calls it brittleness and loosens it.
- **R9 — `E3c`'s residual counts are line-content counts, not structural ones.** A reflow that split
  `middle-complexity` across a line break would evade the regex. The four canonical files are small
  and hand-checked; the harness residual of 8 is a Phase 3 hand-off, not a live contract.
- **R10 — `ci-callees` uses `handleInit`, whose only indexed callee is `ensureDir`.** Thin. A richer
  subject (`main`, 3+ callees) would be a better doc example; `handleInit` was chosen because its
  single callee is verifiable from source in one line. Changing it is one fixture line and one doc
  line.
- **R11 — the file is named `*.test.js` but is not a `node --test` file.** `PHASES.md:36` fixes the
  acceptance command as `node tests/recipe-exec.test.js`, so the name follows the criterion. Anyone
  who later runs `node --test tests/` will glob it in; it will execute the full run and exit
  correctly but register zero subtests, which could read as a silent skip.

---

## Out of scope, and why

- **The 4-vs-5 workflow phases.** No live contradiction. `AGENTS.md:73-79` says "five sequential
  phases" and enumerates five. The only "4" is in `.plans/archive/`, and `PHASES.md:59` puts
  archived artifacts out of scope. A work item here would have a gate that already passes, which is
  no gate. `PHASES.md:32-35` reaches the same conclusion under ruling D4.
- **The stale graph counts in the archived `phase-2/PLAN.md:15`.** Same clause. The durable form of
  the concern — never pin a graph count — is a design rule in this plan (`ci-status`) rather than an
  edit to an archived file. An archived plan is a record of what was believed at the time; editing
  it destroys evidence.
- **`plugins/steps/harnesses/**`.** Eight label-residual sites across the droid, antigravity and
  opencode copies. The canonical-vs-harness divergence is assigned to Phase 3. Item 8 leaves them
  alone, but `E3c` **counts** them against `HARNESS_LABEL_RESIDUAL = 8`: adding one fails the gate,
  and closing them all also fails it, so the Phase 3 decision has to be taken deliberately rather
  than drifting. The divergence between the canonical and harness copies widens by six in this
  phase, disclosed here rather than discovered later.
- **`plugins/pcp/skills/pcp/procedures/{actualize,init,prune}.md` and `README.md:45-47`.** Four
  further runnable fences in live shipped docs — three `bash` fences containing `node $PCP …`
  (`actualize.md:5-7`, `init.md:9-11`, `prune.md:5-8`) and one info-string-less fence containing
  `npm test`. Verified **not** members of the silent class: all four `$PCP` subcommands are real
  (`pcp.js:85,88,98,101` and `printUsage`), and an unset `$PCP` fails loudly. The `$PCP` resolution
  question is `PHASES.md:42-47`, i.e. Phase 3. Bringing `README.md:45-47` in would additionally
  require declaring `npm test` as a runnable recipe, which after Item 11 is `npm test` invoking
  itself.
- **`AGENTS.md:66`'s `verification_command: "npm test"`.** Space B's predicate reads the span's
  first token, which here is `verification_command:`, so the span is not selected. Extending the
  predicate to reach inside quoted values would also pull in every other quoted fragment in the
  corpus, including `` `tokensave: { tool: "<command>" }` ``'s inner `"<command>"`. The defect this
  would guard — a rename of the `test` script — is already caught by `X6`, which checks
  `AGENTS.md:25`'s `` `npm test` `` span against `Object.keys(package.json.scripts)`. The class is
  closed; `:66` names no additional command.
- **CI configuration.** Item 11 makes `npm run test:recipes` a phase gate and states that CI must
  run it. Editing CI to schedule it is not in this phase's file list and is recorded as R4.
- **`ai-docs/constitution.yaml`, `ai-docs/specs/**`, `ai-docs/decisions/**`,
  `tests/pcp_skill.test.js`.** Byte-frozen. They are what the mutation table mutates and what the
  suite reads as data. Nothing in this plan writes to them.
- **Moving `.agents/skills/` or making the skills installable.** Phase 3.
- **`plugins/pcp/skills/pcp/scripts/pcp.js` semantics.** `PHASES.md:55`. This plan reads it for
  golden values and does not change it.
- **Full-slice content assertions for the `cq-*` recipes.** Already covered at
  `tests/constitution_skills.test.js:217-225`; duplicating them would change `rule-inverted`'s
  failing set, i.e. edit a frozen table by side effect.
- **`tests/pcp_skill.test.js:21-23`'s top-level-throw defect.** Owned by nobody (`STATUS.md`);
  explicitly not assigned to Phase 2.

---

## Decisions for the orchestrator

- **D1 — the corrected `tokensave` parameter repair is already ratified.** `PHASES.md:23-26` states
  it in terms, citing ruling D1: `body` takes `--symbol`, `callers`/`callees`/`impact` take
  `--node-id` with no name form, `entities` takes `--file`. Item 4 follows the measured parameter
  table, and no further ratification is needed.
- **D2 — the label `Tier 1.5 (Middle)`.** A plan decision with no external authority.
  `Tier 1+ (Middle)` or `Tier 1.5` alone are equally defensible. One fixture line and seven doc
  lines change if you prefer another.
- **D3 — the 300-vs-200 repair is authorised, and two documented recipes change with it.**
  `PHASES.md:30-32` names the bound explicitly, so Items 9 and 10 sit in the phase's own repair list
  rather than being a scope extension. The recipe change at `constitution-query/SKILL.md:95` and
  `ai-docs/README.md:74` is **not** made because a gate would otherwise be red. `yq '.spec'` is a
  full-file dump, which `ai-docs/constitution.yaml:24` (`qual-hygiene-01`, `enforcement: strict`,
  anchored verbatim by the `rule-inverted-unqueried` mutation) prohibits; the recipe was already
  non-conformant on the artifact's own merits, and the 200-token bound merely revealed it. The
  measurement (255 → 23) is corroboration. Recorded here because a reader who saw only the token
  argument would rightly read it as the artifact-follows-gate inversion this iteration exists to
  correct. If you would nonetheless rather keep the whole-spec dump, the alternative is a documented
  exception to both the bound and the constitution rule, which is a skip-list in prose and which this
  plan declines to write without your ruling.
- **D4 — `ai-docs/README.md` is in scope and Item 10 deletes an executable recipe rather than
  repairing it.** Verified: no mutation op targets it and no test reads it. The section it deletes
  is a second implementation of an enforced bound, using an estimator Phase 1 removed; the
  replacement points at `npm test`. It dirties the `ai-docs/` read path, so it must land before the
  phase commit and the sweep stays post-commit (C1, already true of `.agents/skills/`).
- **D5 — the runner has two declared modes, and only `--hermetic` joins `npm test`.** Constraint C4
  states the mechanism and the measurements. What the split keeps is worth naming: the three
  `SURVIVED` controls still execute the runner, so a byte-pinning or crash-on-start implementation
  is still caught for free, which is what wiring it in bought in the first place. Two consequences
  you should hold me to. First, this is a **move**: the 31 live checks are enumerated, frozen, gated
  by Item 11 gate 1, and protected from migration by `B4` — but they are enforced by
  `npm run test:recipes`, and this repository has no CI to schedule that into (R4). Second, the
  boundary is "no binary the shipped suite already requires", which puts `jq` on the live side
  alongside `tokensave` and `rtk`; `git` stays on the document side because
  `tests/lib/repo-guard.mjs:96` already shells to it inside `npm test`. `npm test`'s binary
  requirement after Item 11 is therefore exactly what it is today.
- **D6 — the binary-dependent span checks (`X2,X3,X4,X5,X7,X8,X9,X10,X12`) are live, not
  document.** The invariant is the failure mode, not the artifact. None of `tokensave`, `rtk` or
  `jq` exists on a fresh clone, so leaving any of them in `npm test` reintroduces exactly the
  `BLOCKED`-inside-a-`SURVIVED`-control failure C4 exists to remove. The banned-string half of the property
  is unaffected: `B2.AGENTS`, which is what actually notices `rtk raw <cmd>`, stays a document check
  and runs in `npm test`, so the banned string is caught by the mandated command. If you would
  rather the binary-resolution checks stayed hermetic-adjacent,
  the alternative is to drop the "binary resolves" clause and check only
  `verb ∈ RTK_VERBS`/`TOKENSAVE_VERBS` against the frozen tables — that keeps them in `npm test` at
  the cost of never noticing an uninstalled binary, which `A6` would then be the only thing to
  catch.
