# Phase 1 Plan — Make the gate able to fail

Iteration: `gate-repair-installability`. Branch `steps/harness-portability`, HEAD `886443e`.

## Goal

`tests/constitution_skills.test.js` reports 49/49 green while surviving every one of the realistic
defect classes the audit named. This phase builds the instrument that proves it —
`tests/mutation-harness.mjs` — and then repairs the suite one blindness at a time, using the
instrument as the per-item gate.

Direction of repair is fixed: **the gate learns to fail; the artifacts are not bent to fit the
gate.** Exactly one artifact edit is in scope (Item 8), and it is argued on the artifact's own
merits, independent of any test.

The recurring hazard is that this phase reproduces the original failure one level up: a gate whose
criterion its own artifact satisfies trivially. Two structural choices exclude that, and they are
the reason the phase is shaped the way it is:

- **The mutation table below is the frozen contract.** Mutation semantics, anchors, expected
  outcomes, signatures and expected failing-subtest sets are authored here, before the harness code
  exists. The implementer may not edit them to match what its code emits. A signature that turns
  out to be wrong is escalated to the orchestrator and recorded in `.plans/phase-1/GATE-OUTPUT.md`;
  it is never quietly changed.
- **The controls are two-sided.** Three mutations declare `SURVIVED` as their expected outcome and
  make the harness exit 1 if they go RED. Without them the acceptance criterion is "the suite goes
  red", which a suite consisting of two pinned file hashes satisfies. With them the criterion is
  "the suite goes red **iff** the property broke", which neither over-strictness nor
  under-strictness can satisfy.

### Baseline measurements (this machine, today)

```
$ time npm test 2>&1 | tail -9
1..5
# tests 49
# suites 0
# pass 49
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2799.392875
real 0m3.054s
```
A full `npm test` costs ~3 s, so a sweep of 16 mutations plus 2 clean runs costs ~55 s. That is
inside a tolerable gate budget.

```
$ node -v; npm -v; command -v yq
v22.22.3
10.9.8
/opt/homebrew/bin/yq
$ ls node_modules
ls: node_modules: No such file or directory
```
`package.json` declares no dependencies and there is no `node_modules`, so nothing in this phase may
require `npm install`. Every helper is hand-written and dependency-free. `package.json:8` is
`node --test tests/pcp_skill.test.js tests/constitution_skills.test.js`.

Retrieval payloads, measured today with the Item 5 scanner. `old` is the shipped
`Math.round(words*1.3)`; `new` is the scanner; both columns are for the **array-wrapped**
expressions this plan adopts (see Item 3):

```
sec-auth-01: chars=198 new=65   (unwrapped 190/64)
d-8f3a:      chars=339 new=124  (unwrapped 325/123)
c-e9a2:      chars=301 new=101
r-b111:      chars=227 new=73
l-e404:      chars=231 new=80
login-ep:    chars=165 new=59
worst new estimate: 124
"A".repeat(900)      -> 225
"Zx9!".repeat(225)   -> 675
"A".repeat(800)      -> 200
```

The `payload-bloat` mutation's arithmetic, measured against a scratch copy outside the repo:

```
d-8f3a summary value length            = 159
"Zx9!".repeat(200) (the bloat string)  = 800 chars, estimate 600
mutated d-8f3a array payload           = 980 chars, estimate 677, old formula 23
```
980 < 1200, so the pre-existing character bound cannot be what fails; 677 > 200 by 3.4×, so the
mutation's redness does not depend on a marginal character mix.

### Live-symlink hazard, and what this plan does about it

```
~/.claude/skills/steps -> ~/.agents/skills/steps -> plugins/steps/skills/steps
~/.claude/skills/pcp   -> ~/.agents/skills/pcp   -> plugins/pcp/skills/pcp
```
Both `plugins/*` SKILL.md files are the live installed skills for the session running this
protocol. A mutation that rewrites either one, interrupted at the wrong moment, corrupts the
document the orchestrator is executing. Two consequences, both binding:

1. **No mutation targets a live-symlinked file.** The heading-rename property is exercised on
   `.agents/skills/adr-manager/SKILL.md` (verified not symlinked into `~/.agents/skills/`), and the
   rogue-skill mutation creates a *new sibling directory* under `plugins/steps/skills/`, which the
   `steps` symlink — pointing at the `steps` directory itself — does not expose.
2. **Restore is crash-safe, not just exception-safe** (Item 1): an out-of-repo journal plus signal
   handlers, because a `finally` does not run on SIGINT and a ~55 s foreground sweep is exactly
   where Ctrl-C happens.

---

## The frozen mutation table

Sixteen mutations. Every anchor below was verified to occur **exactly once** in its target file by
`content.split(anchor).length === 2`; the harness re-asserts this at run time and treats any other
count as a harness error, never as a survived mutation.

`outcome` is what a conformant post-phase suite must produce. `signature` must appear in the
captured `npm test` output. `mustFail` names leaf subtests that must be among the failures;
`mustPass` names leaf subtests that must remain green — that is what distinguishes "detected this
property" from "rejects any change to this file". `max` caps total failing leaves.

**Invariant across every mutation:** zero failing leaves from `tests/pcp_skill.test.js`. Its 25
subtests touch no `ai-docs` path (`grep -c 'ai-docs'` → 0) and its single `.agents/skills` mention
is a comment at `:424`, so any pcp failure means the environment collapsed, not that the property
was detected.

### Positive controls (outcome: RED)

| id | target | anchor (verified unique) | edit | signature | mustFail | mustPass | max |
|---|---|---|---|---|---|---|---|
| `rule-inverted` | `ai-docs/constitution.yaml` | `        rule: "All external requests must validate JWT signatures with asymmetric key pairs (RS256/ES256) and reject unsigned or HS256 tokens."` | replace with the semantic inverse: `symmetric key pairs (HS256/HS512)` … `accept unsigned or RS256 tokens`, same length class, still a non-empty string | `golden slice mismatch: Security rules slice by domain (auth)` | `retrieves Security rules slice by domain (auth)`; `ai-docs/constitution.yaml matches the declared golden document` | `bounds the Security rules slice by domain (auth) payload`; all suite-4 leaves | 3 |
| `rule-inverted-unqueried` | `ai-docs/constitution.yaml` | `        rule: "Context exploration must use progressive disclosure via tokensave or RTK tools; broad repository-wide grep or full-file dumping is prohibited."` | replace with its inverse (`must not use progressive disclosure`; `grep or full-file dumping is required`) | `golden document mismatch: ai-docs/constitution.yaml` | `ai-docs/constitution.yaml matches the declared golden document` | all six `retrieves *` leaves | 2 |
| `payload-bloat` | `ai-docs/constitution.yaml` | `    summary: "All JavaScript files in this workspace must use native ES Modules (import/export) and execute directly on Node.js without a separate compiler or bundler stage."` | replace the value with `"Zx9!".repeat(200)` (800 chars). Harness preconditions, both measured and both asserted before the run: mutated `d-8f3a` payload = **980 chars** (< 1200) and `estimateTokens` = **677** (> 2× the 200 bound) | `token budget` | `bounds the Architectural decision slice (d-8f3a) payload` | the other five `bounds the * payload` leaves | 4 |
| `adr-status-bogus` | two files, both snapshotted | `ai-docs/decisions/ADR-0001-unified-esm.md`: `- **Status**: Active\n` → `- **Status**: Bogus\n`; `ai-docs/constitution.yaml`: `  - id: "d-8f3a"\n    title: "Unified ESM Execution Layer"\n    status: "active"` → same block with `status: "bogus"` | both sides moved together, so a two-sided comparison stays green | `status not in declared vocabulary: d-8f3a` | `status values on both sides are in the declared vocabulary` | **`ADR metadata equals the constitution entry`** — the two sides agree, and its staying green is the evidence that the vocabulary, not the comparison, caught this | 5 |
| `caveat-status-bogus` | `ai-docs/constitution.yaml` | `  - id: "c-e9a2"\n    title: "Zero-Dependency Runtime Constraint"\n    status: "active"` | `status: "bogus"` | `status not in declared vocabulary: c-e9a2` | `status values on both sides are in the declared vocabulary` | `ADR metadata equals the constitution entry`; all skill leaves | 4 |
| `adr-nested-rogue` | creates `ai-docs/decisions/auth/ADR-0002-rogue.md` (directory `ai-docs/decisions/auth/` verified absent today) | n/a — create; refuses if the path exists | a well-formed ADR body carrying shortcode `d-0002`, registered nowhere | `ADR registry mismatch` | `ADR files and constitution decisions are the same set` | `registered decisions match the declared golden registry` (the subset check still holds) | 2 |
| `adr-heading-fenced` | `ai-docs/decisions/ADR-0001-unified-esm.md` | `\n## Context\n` | rename to `\n## Contextual\n` **and** append a fenced block whose body contains the line `## Context`. A prefix-matching matcher (`/## Context/`) accepts `## Contextual`; a fence-blind matcher accepts the fenced copy; only an anchored, fence-aware, frontmatter-aware parser goes red | `required heading: ## Context` | `ADR structural headings are real headings` | `ADR files and constitution decisions are the same set`; `ADR metadata equals the constitution entry` | 2 |
| `adr-duplicate-status` | `ai-docs/decisions/ADR-0001-unified-esm.md` | `- **Status**: Active\n` | `- **Status**: Active\n- **Status**: Superseded\n` — `content.match()` takes the first bullet silently | `duplicate metadata bullet: Status` | `ADR metadata equals the constitution entry` | `status values on both sides are in the declared vocabulary` | 2 |
| `skill-heading-renamed` | `.agents/skills/adr-manager/SKILL.md` (**not** live-symlinked) | `\n## Operational Guardrails\n` | `\n## Operational Guardrailz\n` | `required heading: Operational Guardrails` | `validates skill frontmatter and sections: .agents/skills/adr-manager/SKILL.md` | the other five per-skill leaves; `every SKILL.md on disk is declared in the skill inventory` | 2 |
| `skill-unlisted` | creates `plugins/steps/skills/rogue/SKILL.md` (directory verified absent today) | n/a — create | a file with valid frontmatter `name: rogue` and a non-empty description, listed nowhere | `skill inventory mismatch` | `every SKILL.md on disk is declared in the skill inventory` | all six per-skill leaves | 2 |
| `path-stripped` | no file change | n/a | `envOverride.PATH` = a temp directory containing symlinks to the resolved `node`, `npm`, `sh`, `env` and `git` **only**. Measured: under exactly that PATH `yq` is unresolvable and `npm test` is **49/49 green today**; omitting `git` breaks two unrelated `pcp_skill` subtests, which is why `git` is in the list | `required tool 'yq' not found on PATH` | the 26 leaves enumerated under *Frozen enumerations* below | all six `validates skill frontmatter and sections: *` leaves (they read files, not `yq`) | 26 |
| `canary-missing-key` | `ai-docs/constitution.yaml` | `deferred:\n  - id: "l-e404"` … to end of file | delete the block | `Missing root key: deferred` | `ai-docs/constitution.yaml exists, is readable, and contains root keys` | all skill leaves | 8 |
| `canary-bad-yaml` | `ai-docs/constitution.yaml` | append at EOF | two syntactically invalid lines (`  - - bad` + a tab-indented continuation) | `/bad file '[^']*constitution\.yaml': yaml:/` — measured identical under `execSync` and under Item 3's absolute-path `execFileSync`, so it does not silently stop matching when Item 3 lands | the 21 leaves enumerated under *Frozen enumerations* below | all skill leaves | 21 |

`canary-missing-key` and `canary-bad-yaml` must be RED **today**, before any repair. Their expected
signatures are strings that already exist in committed code (`tests/constitution_skills.test.js:28`)
or in `yq`'s own stderr — neither is authored by this phase, which is what makes them evidence about
the harness mechanism rather than self-grading.

### Negative controls (outcome: SURVIVED; `mustFail` empty, `max` = 0)

| id | target | edit | why it must survive |
|---|---|---|---|
| `benign-constitution-comment` | `ai-docs/constitution.yaml`, anchor `constitution:\n` | prepend a YAML comment line | Parsed content is unchanged, so nothing about the constitution's meaning broke. A suite that pins the file's bytes or hash goes RED here and fails the phase. This is the control that kills the "two pinned hashes pass six of eight mutations" attack. |
| `benign-adr-prose-reflow` | `ai-docs/decisions/ADR-0001-unified-esm.md`, anchor `Historically, Node.js tooling often mixed CommonJS (\`require\`) and ES Modules (\`import\`), necessitating Babel/TypeScript transpilation or runtime wrappers.` | insert a line break mid-sentence | ADR body prose carries no declared expected value. A suite that hashes `ai-docs/decisions/` goes RED here. |
| `crlf-frontmatter` | `.agents/skills/constitution-query/SKILL.md` (verified to contain no `\r` today) | rewrite the whole file with CRLF line endings | Line endings are not a property of the artifact. This mutation is RED **today** (`content.startsWith('---\n')` at `tests/constitution_skills.test.js:241` is exact-`\n`), which makes it Item 4's gate; after Item 4 it must survive. It is simultaneously the negative control for the document parser and the regression gate for a `\r?\n` tolerance that was accepted in the archived iteration (`…/phase-2/RECONCILIATION.md:25`) and then dropped from the shipped test. |


### Frozen enumerations

Amended by orchestrator ruling after the implementation review; see `ORCHESTRATOR-LOG.md`.
Both rows previously carried `max: 20`, a cap computed against the pre-phase suite. Neither was
raised to fit a run: each `mustFail` set is enumerated in full and `max` set to its exact length,
so `mustFail ⊆ failing` together with `|failing| ≤ max` pins the failing set **exactly**. That
checks strictly more than either original cap did.

**`path-stripped` — 26 leaves.** Every yq-dependent leaf in the suite. Measured under the
hermetic PATH after the suite stopped aborting suite-4 registration; the five suite-4 entries are
the ones that previously vanished from the TAP stream instead of failing. It is 26 and not 27
because `ADR structural headings are real headings` walks `ai-docs/decisions/` without consulting
the constitution, so it survives every `yq` outage.

1. `ai-docs/constitution.yaml exists, is readable, and contains root keys`
2. `constitution block attributes match schema specifications`
3. `security.rules array contains valid enforcement entries`
4. `quality.pre_commit_checks array contains qual-gate-01 and qual-hygiene-01`
5. `taxonomy shortcodes conform to required attributes and patterns`
6. `ai-docs/specs/auth-spec.yaml conforms to domain specification schema`
7. `tool resolution follows the inherited PATH`
8. `ai-docs/constitution.yaml matches the declared golden document`
9. `ai-docs/specs/auth-spec.yaml matches the declared golden document`
10. `retrieves * — all six CASES`
11. `bounds the * payload — all six CASES`
12. `ADR files and constitution decisions are the same set`
13. `every ADR shortcode is unique across ai-docs/decisions/`
14. `ADR metadata equals the constitution entry`
15. `status values on both sides are in the declared vocabulary`
16. `registered decisions match the declared golden registry`

**`canary-bad-yaml` — 21 leaves.** Same amendment for the same reason: its failing set moved
16 → 21 once the five suite-4 leaves began failing rather than vanishing.

- the six constitution-backed suite-1 leaves
- the ten constitution-sourced `retrieves` / `bounds the * payload` leaves (CASES[5] is auth-spec-sourced and survives)
- the five suite-4 leaves listed above (items 12-16)

### Outcome classification and exit

Per mutation the harness prints exactly one of `RED (signature matched)`, `RED (signature MISMATCH)`,
`SURVIVED`, or `BLOCKED`, naming the file and anchor. A mutation is **conformant** when its measured
outcome equals its declared outcome, its signature matched (RED only), `mustFail ⊆ failing`,
`mustPass ∩ failing = ∅`, `|failing| ≤ max`, and no `tests/pcp_skill.test.js` leaf failed.

**Counting rule.** "Failing leaves" are the indented `not ok` lines of node:test's TAP output —
`/^\s+not ok \d+ - (.+)$/` — excluding the five top-level roll-ups, which appear unindented.
Measured today: `canary-missing-key` reports `# fail 5`, of which 3 are leaves and 2 are roll-ups;
a naive cap of 1 against the `# fail` summary would misclassify it.

`BLOCKED` is available only to `path-stripped`, only when a precondition fails, and it exits
non-zero. It is never counted as a pass and must be recorded in `GATE-OUTPUT.md` as an
environmental exception.

Exit 0 only if every mutation is conformant and `npm test` passes on the clean tree both before and
after the sweep. Otherwise exit 1 with a summary block listing every non-conforming id and what it
mutated.

`--only <id>` (repeatable) runs a subset. In `--only` mode the harness checks outcome, signature and
the pcp-suite invariant; the `mustFail` / `mustPass` / `max` contract is asserted only in a full
sweep, because those sets describe the *post-phase* suite and the per-item gates run against a
partially repaired one.

---

## Declared subtest names

The mutation table's `mustFail` / `mustPass` sets name leaf subtests, so the names are part of the
frozen contract. Existing names are kept verbatim; new ones are declared here and the implementer
uses them exactly.

**Suite 1 `Constitution Schema & Taxonomy Validation`** — the six existing leaves keep their names,
plus: `tool resolution follows the inherited PATH` (Item 3), `estimateTokens is not invariant to
whitespace removal` and `estimateTokens scores the declared reference strings` (Item 5),
`ai-docs/constitution.yaml matches the declared golden document` and `ai-docs/specs/auth-spec.yaml
matches the declared golden document` (Item 6).

**Suite 2 `Query-Driven Retrieval & Token Budget Bounds`** — the single leaf per case becomes two:
`retrieves <case>` and `bounds the <case> payload` (Item 5). Case names are unchanged:
`Security rules slice by domain (auth)`, `Architectural decision slice (d-8f3a)`, `Engineering
caveat slice (c-e9a2)`, `Requirement slice (r-b111)`, `Deferred track slice (l-e404)`, `Domain spec
endpoint slice (/api/v1/auth/login)`.

**Suite 3 `Modular Skills Discoverability & Frontmatter Conformance`** — one new leaf `every
SKILL.md on disk is declared in the skill inventory`, and the per-skill leaf is keyed by **path**,
not name: `validates skill frontmatter and sections: <relPath>`. Two files declare `name: steps`,
so a name-keyed test id would collide.

**Suite 4 `Bidirectional ADR Synchronization & Structural Headers`** — split into five leaves
(Item 7): `ADR files and constitution decisions are the same set`, `every ADR shortcode is unique
across ai-docs/decisions/`, `ADR structural headings are real headings`, `ADR metadata equals the
constitution entry`, `registered decisions match the declared golden registry`, plus `status values
on both sides are in the declared vocabulary`.

---

## Work Items

### Item 1 — `tests/lib/repo-guard.mjs`: safe mutation, before anything is mutated

**Change.** Create `tests/lib/repo-guard.mjs`, a dependency-free ESM module owning every write the
harness performs. It exports `createGuard({readPaths, allowResidue})` returning:

- `snapshot(path)` — reads and holds the exact bytes plus their `sha256`. For a path that does not
  exist, records `{absent: true}` and the list of ancestor directories it will have to create.
- `write(path, bytes)` — refuses unless the path was snapshotted; asserts the new bytes differ from
  the snapshot.
- `create(path, bytes)` — refuses if the path already exists; records every directory it creates.
- `restoreAll()` — writes snapshot bytes back and asserts `sha256` equality per file; `unlink`s
  created files and asserts absence with `existsSync`; `rmdir`s created directories in reverse
  order and asserts absence. Byte snapshots do not cover creates, so creates get their own inverse.
- `assertPorcelainUnchanged()` — see below.

**Crash safety.** Before the first write, `writeJournal()` persists `{targetPath, sha256, bytes}`
for every snapshot to `~/.cache/pcp-mutation-harness/journal.json` — **outside the repository**,
because `.gitignore` contains only `.pcp/`, so an in-tree journal would break the guard's own
porcelain assertion. The journal is deleted only after a verified `restoreAll()`. Handlers for
`SIGINT`, `SIGTERM` and `SIGHUP` call `restoreAll()`, delete the journal, then re-raise with the
default disposition. At start-up the guard refuses with exit 2 if a journal exists, printing the
files it holds and how to restore them.

**Porcelain scoping.** `git status --porcelain` is captured at start-up and compared at exit, with
entries classified rather than string-compared:

- Entries whose path is a **prefix match** of any read path are fatal. Prefix matching, not
  equality: an untracked directory appears as a single `?? ai-docs/decisions/auth/` entry, which an
  equality check against `ai-docs/decisions/auth/ADR-0002-rogue.md` would miss.
- Entries under `tests/playground`, `tests/playground-git` and `tests/playground-consumer` are
  reported and non-fatal. `tests/pcp_skill.test.js:11,366` creates and removes these per test.
  Measured this session: an `npm test` run that fails leaves `tests/playground-git/src/auth/oauth/`
  behind, and because git does not report empty directories, `git status --porcelain` stayed at 30
  entries across it. A residue check that trusted porcelain alone would have missed it; the guard
  therefore compares the *directory listing* of `tests/` as well, and reports residue it did not
  create instead of failing the gate for someone else's cleanup.
- Any other entry is reported and non-fatal.

**Dirty-path refusal.** Exit 2 if any porcelain entry prefix-matches a path **the suite reads** —
not merely a mutation target. `.agents/skills/adr-manager/SKILL.md:32` supplies the status
vocabulary that Item 7 cross-checks, and `ai-docs/specs/auth-spec.yaml` supplies a golden; a local
edit to either changes what the mutations mean, though neither is mutated. `tests/playground*` is
excluded from this check for the reason above. There is **no `--dirty-ok` flag**: an escape hatch on
a gate gets used by habit, then by CI. Restore is a byte snapshot and never git, so tree
*cleanliness* is neither necessary nor sufficient; scoped dirtiness plus exit-time porcelain
equality is the property that matters. Consequence, and the reason the strict form was rejected:
`git status --porcelain | wc -l` is **30** right now and every entry is under `.plans/`, so the
gate is runnable today without a commit, and the phase does not manufacture a commit-per-run tax.

**Files.** `tests/lib/repo-guard.mjs` (new). No other file changes.

**Gate command.**
```bash
node tests/lib/repo-guard.mjs --selftest; echo "exit=$?"; git status --porcelain | wc -l
```
The self-test, in a temp directory outside the repo, exercises: snapshot→write→restore with hash
equality; create→restore with directory removal and absence assertions; a simulated stale journal
producing exit 2; and a `SIGINT` delivered to a child mid-write, asserting the file is restored and
the journal removed.

**Current output.**
```
Error: Cannot find module '/Users/purplelephant/projects/pcp/tests/lib/repo-guard.mjs'
exit=1
30
```

**Expected output after this item.** `exit=0` and `30`.

**Order justification.** First. Every later item writes to `ai-docs/` and to skill documents, one
symlink hop from the protocol document the orchestrator is executing. The machinery that makes
those writes reversible under interruption must exist and be independently proven before the first
mutation is applied, not alongside it.

---

### Item 2 — `tests/mutation-harness.mjs`: the instrument, with the suite left untouched

**Change.** Create `tests/mutation-harness.mjs`, a standalone ESM script — not a `node:test` file,
because it *invokes* `npm test` and must never run inside the suite it measures (see Item 9). It
holds the frozen table above verbatim and, per mutation:

1. asserts the anchor occurs exactly once (`split(anchor).length === 2`); any other count is a
   harness error, not a survived mutation;
2. snapshots every target through the Item 1 guard, and writes the journal;
3. applies the edit and asserts the bytes changed (for creates: that the path did not exist);
4. runs `npm test` via `execFileSync(npmPath, ['test'], {cwd: repoRoot, encoding: 'utf8'})` with the
   mutation's `envOverride` if any, capturing stdout+stderr and the exit status, where `npmPath` is
   resolved absolutely under the ambient PATH;
5. parses failing leaves by the declared counting rule and classifies the outcome;
6. restores through the guard and asserts porcelain per Item 1.

It also runs `npm test` on the clean tree before and after the sweep and requires both to pass.

**Why (acceptance criterion).** This is the phase's acceptance criterion. It has to exist first so
that "the suite went red" can be distinguished from "the suite went red for the right reason", and
so that the survivor set — the evidence that the audit was right — is captured before the suite
changes and becomes uncapturable.

**Files.** `tests/mutation-harness.mjs` (new).

**Gate commands.** Two, because a single one is not machine-checkable: the full run exits 1 both
when the harness is correct and when it is an always-exit-1 stub.

```bash
node tests/mutation-harness.mjs --only canary-missing-key --only canary-bad-yaml \
  --only benign-constitution-comment --only benign-adr-prose-reflow; echo "exit=$?"
```
```bash
node tests/mutation-harness.mjs; echo "exit=$?"
```

**Current output.** Both: `Error: Cannot find module '…/tests/mutation-harness.mjs'`, `exit=1`.

**Expected output after this item.** The first command `exit=0` — two RED with matched signatures
and two SURVIVED, in both directions, which no stub and no always-red harness can produce. The
second `exit=1`, with **exactly this classification** — a prediction, not a tolerance:

- conformant today (4): `canary-missing-key` RED, `canary-bad-yaml` RED,
  `benign-constitution-comment` SURVIVED, `benign-adr-prose-reflow` SURVIVED;
- non-conformant today (12): `rule-inverted`, `rule-inverted-unqueried`, `payload-bloat`,
  `adr-status-bogus`, `caveat-status-bogus`, `adr-nested-rogue`, `adr-heading-fenced`,
  `adr-duplicate-status`, `skill-heading-renamed`, `skill-unlisted`, `path-stripped` — all
  `SURVIVED` where `RED` was declared; and `crlf-frontmatter` — `RED` where `SURVIVED` was declared;
- both clean-tree runs pass; a final line naming the 12.

Six of these survivals were reproduced by execution against a scratch copy during plan review
(`rule-inverted`, `adr-status-bogus`, `adr-nested-rogue`, `payload-bloat` at 966 chars,
`path-stripped` with `yq_rc=1`, and a heading rename), all 49/49 green. The remaining predictions
are derived from the shipped suite:
`rule-inverted-unqueried` — `:64` asserts only `typeof check.rule === 'string' && length > 0`;
`caveat-status-bogus` — `:92` is non-empty-only, and `c-e9a2` has no ADR side at all;
`adr-heading-fenced` — `:291` is `assert.match(content, /## Context/)`, unanchored and fence-blind,
so `## Contextual` matches it;
`adr-duplicate-status` — `:314` `content.match()` returns the first bullet;
`skill-heading-renamed` — `Operational Guardrails` is not in `requiredSections` (`:221`);
`skill-unlisted` — `skillDefinitions` (`:207-233`) is a hardcoded list of five paths, and there are
six `SKILL.md` files on disk today;
`crlf-frontmatter` — `:241` is `content.startsWith('---\n')`.

**Order justification.** Second, and before every repair. If a repair lands first, a passing
mutation cannot be told from a coincidence. It follows Item 1 because it is the first thing that
writes to the tree.

---

### Item 3 — PATH portability: `tests/lib/tools.mjs`, and every `yq` call site rewired

**Change.**

1. New `tests/lib/tools.mjs` exporting:
   - `resolveTool(name)` — scans `process.env.PATH` (read at call time, never overridden) and returns
     the absolute path of the first entry that `fs.statSync` reports as a file and `fs.accessSync(p,
     fs.constants.X_OK)` accepts. **`statSync`, not `lstatSync`**: `/opt/homebrew/bin/yq` is a
     symlink to `../Cellar/yq/4.53.2/bin/yq`, and both `node` and `npm` on this machine are symlinks
     into `~/.hermes/node/bin/`, so an "executable regular file" check written with `lstat` finds
     nothing at all. On a miss it throws
     `Error: required tool 'yq' not found on PATH (searched: <entries>). Install it and re-run 'npm test'.`
     It does not shell out to `which`, which would itself depend on the PATH being searched.
     **It is not memoised.** A cache is unreconcilable with the PATH-varying subtest below — either
     the cache is primed by an earlier `yq` call and the subtest reads the wrong value, or the
     subtest primes it and every later call resolves into a deleted temp directory. Resolution is a
     handful of `statSync` calls against a 3 s suite; the cost does not justify the coupling.
   - `yqJson(expr, file)` — `execFileSync(resolveTool('yq'), ['-o=json', expr, file], {encoding:'utf8'})`,
     `JSON.parse`d. `execFileSync` with an absolute binary removes both the PATH dependency and the
     shell-quoting hazard in the current template string at `:11`. **No `env` option is passed at
     all** — not even a reconstructed one. Passing `{...process.env, PATH: resolved}` would satisfy
     "inherited, never overridden" in spirit while reintroducing a pinned PATH in a new place.
   - `yqRaw(expr, file)` — same without `-o=json`, for raw payload slices.
2. **Every query expression is array-wrapped**: `[ .constitution.security.rules[] | select(…) ]`.
   `yq -o=json` emits *concatenated* documents on a multi-match — verified today, the `enforcement
   == "strict"` selector prints two `{...}` objects, which `JSON.parse` rejects with a `SyntaxError`.
   The single-object form works only while each selector happens to match once; a legitimate second
   `auth` rule would fail as a parse error rather than as a golden mismatch. Array-wrapping costs
   8-14 characters per payload (measured; worst slice 339 chars / 124 estimated tokens) and makes
   the shape stable.
3. `tests/constitution_skills.test.js`: delete `ENV_PATH` (`:8`), rewrite `parseYaml` (`:10-16`) over
   `yqJson`, and convert the query-case table (`:149-180`) from shell command strings to structured
   `{ name, expr, file, recipe }`. `recipe` retains the documented one-line command for
   traceability; `expr`/`file` drive execution. Payload retrieval (`:184-187`) becomes
   `yqRaw(tc.expr, tc.file).trim()` with no `env` override.
4. New subtest `tool resolution follows the inherited PATH`, with two machine-independent results:
   create a temp dir, symlink the resolved `yq` into it, set `process.env.PATH` to that dir alone and
   assert `resolveTool('yq')` returns the **temp** path (proving PATH-driven resolution, not
   location-guessing, and exercising the `statSync` follow-through); then set `PATH` to an empty temp
   dir and assert a throw matching `/required tool 'yq' not found on PATH/`. Restore
   `process.env.PATH` in a `finally`.

**Why.** `tests/constitution_skills.test.js:8` builds `{...process.env, PATH: '/opt/homebrew/bin:…'}`
— the spread is overridden by the later key, so the inherited PATH is discarded for all 12
`yq`-dependent subtests. On a box where `yq` sits in `~/.local/bin`, `/snap/bin` or a Nix profile,
the mandated verification command (`ai-docs/constitution.yaml:5` — `verification_command: "npm test"`,
asserted at `:37`) fails with `yq: command not found` while `yq` is correctly installed. This is the
branch's namesake.

**Files.** `tests/lib/tools.mjs` (new), `tests/constitution_skills.test.js` (`:8`, `:10-16`,
`:149-180`, `:184-187`, plus one new subtest).

**Gate command.**
```bash
node tests/mutation-harness.mjs --only path-stripped; echo "exit=$?"
```

**Current output.** After Item 2: `path-stripped  SURVIVED  (hermetic PATH; no file mutated)`,
`exit=1`.

**Expected output after this item.** `path-stripped  RED (signature matched: /required tool 'yq' not found on PATH/)`, `exit=0`; `npm test` green with 50 tests.

**Order justification.** First of the repairs. Items 5, 6 and 7 all add `yq`-executing assertions;
landing them first means writing them against the discarded-PATH call shape and rewriting them
later, and Item 5 consumes the structured `{expr, file}` table this item introduces.

---

### Item 4 — one document parser, one skill inventory

**Change.**

1. New `tests/lib/markdown-sections.mjs` exporting `parseDoc(content)` →
   `{ frontmatter, headings: [{level, text, line}], bodyOf(headingText) }`:
   - **Line endings are normalised first** (`content.replace(/\r\n/g, '\n')`), and the frontmatter
     delimiters are matched as `/^---\r?\n/` and `/\r?\n---\r?\n/`. The shipped test's exact-`\n`
     check (`:241-242`) fails every skill subtest on a CRLF checkout before a single heading is
     evaluated. This tolerance was accepted and recorded in the archived iteration
     (`.plans/archive/…/phase-2/RECONCILIATION.md:25`) and dropped from the shipped test; it is the
     same class as the pinned PATH — a machine assumption baked into the gate — and
     `crlf-frontmatter` is its standing regression gate.
   - Fenced blocks are tracked with a CommonMark matcher, `/^ {0,3}(```{0,}|~~~+)/` with a closing
     fence at least as long as the opening, and **headings inside fences are excluded**. A naive
     `line.startsWith('```')` tracker agrees on today's files only by luck:
     `.agents/skills/adr-manager/SKILL.md:81,90` are three-space-indented fence markers (verified,
     `"   ```yaml"` and `"   ```"`) that a naive tracker misses *in a matched pair*, so the toggle
     stays balanced by accident.
   - The frontmatter block is excluded from heading collection and from any literal search.
   - `hasHeading(doc, text)` normalises by stripping a leading `N.` ordinal, trimming and
     casefolding — `plugins/pcp/skills/pcp/SKILL.md` writes `## 1. INVOCATION CONTRACT` (`:10`),
     `## 2. …` (`:42`), `## 6. …` (`:88`) — and additionally requires a **non-empty body**: at least
     one non-blank line before the next heading of the same or higher level. Without it a bare `##`
     line satisfies the gate, which is exactly the artifact-follows-gate move this phase exists to
     stop.
   - Failure messages contain the literal `required heading: <text>`.
2. `tests/constitution_skills.test.js`, third suite: replace the hardcoded five-entry
   `skillDefinitions` (`:207-233`) and the whole-file substring scan (`:255-260`) with:
   - a **discovery walk** over `plugins/**/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md`, and a
     new subtest asserting the discovered set equals the declared inventory's paths, reporting the
     symmetric difference. Failure message contains `skill inventory mismatch`. This is the same
     class as the nested rogue ADR — an artifact on disk that a hardcoded list never discovers — and
     it is live today: there are **six** `SKILL.md` files and the table lists five.
   - a `requiredHeadings` field per file, asserted through `hasHeading`. **`requiredLiterals` is not
     introduced.** A "mention anywhere in the body" assertion cannot be falsified by any mutation and
     is where a previously-narrowed string goes to hide: `tokensave` occurs 14 times in
     `.agents/skills/code-intelligence/SKILL.md` and `.pcp` occurs 18 times in
     `plugins/pcp/skills/pcp/SKILL.md`, so neither assertion could ever fail. Both are retired; the
     files' real heading names assert strictly more.
3. The declared inventory, with a disposition for every archived section string. Every heading below
   was verified present by `awk '/^#/'` on each file. Line numbers are the positions **before**
   Item 8's insertion, which shifts everything below `plugins/steps/skills/steps/SKILL.md:9` down by
   two; every assertion keys on heading text, never on a line number, and so does every mutation
   anchor in the frozen table.

| file | required headings | archived strings retired, with reason |
|---|---|---|
| `.agents/skills/constitution-query/SKILL.md` | `Progressive Disclosure` (`:10`), `Shortcode Taxonomy` (`:19`, an `###`), `Query Recipes` (`:28`) | none |
| `.agents/skills/code-intelligence/SKILL.md` | `Progressive Disclosure` (`:10`), `Tool Invocation Modes` (`:22`), `Navigation & Inspection Recipes` (`:30`), `Agent Operational Rules` (`:132`) | `Navigation Workflows`, `Stdio MCP Integration` — 0 occurrences repo-wide; the file's own heading names cover the same ground and are real. `tokensave` — an unfalsifiable literal, 14 occurrences. |
| `.agents/skills/adr-manager/SKILL.md` | `Lifecycle & Workflow` (`:10`), `Canonical ADR Template` (`:24`), `Bidirectional Synchronization` (`:72`), `Operational Guardrails` (`:116`) | none |
| `plugins/pcp/skills/pcp/SKILL.md` | `INVOCATION CONTRACT` (`:10`), `CORE OPERATIONAL INVARIANTS` (`:42`), `CLI MAINTENANCE SUBCOMMANDS` (`:88`), `LIFECYCLE DEVELOPMENT GUARDRAILS` (`:111`) | `CLI Commands`, `Runtime Directory (.pcp)` — the runtime-directory content already exists at `:24,27,64-67` under other headings, so a new heading would duplicate content to satisfy a string. `.pcp/` — an unfalsifiable literal, 18 occurrences. |
| `plugins/steps/skills/steps/SKILL.md` | `Roles` (`:13`), `The phase loop` (`:56`), `Rules that were paid for` (`:125`); `Separation of duties` is added by Item 8 | `Review lenses` — there is no such section and no unheaded block whose subject it is; see Item 8. |
| `plugins/steps/harnesses/droid/skills/steps/SKILL.md` | `Roles` (`:13`), `The phase loop` (`:59`), `Rules that were paid for` (`:164`) | Not `Separation of duties`: this copy carries the same unheaded rule at `:10-11`, and whether it should be generated, symlinked or deleted is an install/packaging question **owned by Phase 3**. Phase 1 brings it inside the gate; it does not reconcile the two texts. |

The criterion applied uniformly across all six: *a heading may be asserted when it exists, or added
only over an existing, contiguous, currently-unheaded block of prose whose subject is exactly that
heading.* Four archived strings of sixteen (`…/phase-4/PLAN.md:56-60` specifies 3+3+3+3+4) are
retired, one is restored by Item 8, and the gate checks 22 real headings across six files where the
shipped test scanned 15 substrings across five.

**Files.** `tests/lib/markdown-sections.mjs` (new), `tests/constitution_skills.test.js` (`:207-262`).

**Gate commands.**
```bash
node tests/mutation-harness.mjs --only skill-heading-renamed --only skill-unlisted; echo "exit=$?"
node tests/mutation-harness.mjs --only crlf-frontmatter; echo "exit=$?"
```

**Current output.** After Item 2: `skill-heading-renamed SURVIVED`, `skill-unlisted SURVIVED`,
`exit=1`; and `crlf-frontmatter RED (expected SURVIVED)`, `exit=1`.

**Expected output after this item.** First command: both `RED (signature matched)`, `exit=0`.
Second: `crlf-frontmatter SURVIVED`, `exit=0`.

**Order justification.** After Item 3 only for review economy — it executes no `yq`. Before Item 7,
which routes ADR structural headings through this parser, and before Item 8, which cannot assert a
heading until the parser that anchors headings exists.

---

### Item 5 — a token estimate that responds to dense content, and a bound that can bind

**Change.**

1. New `tests/lib/token-estimate.mjs` exporting `estimateTokens(s)`: a single-pass character-class
   scanner. Maximal runs of `[A-Za-z]` cost `ceil(len/4)`; maximal runs of `[0-9]` cost `ceil(len/3)`;
   every other non-whitespace character costs 1; whitespace runs cost 0. It is a heuristic, not a BPE
   tokenizer; the property that matters is that it is **not invariant to whitespace removal**, which
   `Math.round(words*1.3)` is.
2. Two new subtests pinning the estimator directly, because otherwise nothing in the phase asserts
   anything about it and a later "simplification" back to a word count passes every gate:
   - `estimateTokens scores the declared reference strings` — `"A".repeat(900)` → **225**,
     `"Zx9!".repeat(225)` → **675**, `"A".repeat(800)` → **200**. All three measured today. The
     reference strings are declared here as literals; "900 whitespace-free mixed-class characters"
     without naming the string is not reproducible — two independent implementations of this scanner
     scored an unnamed mix at 601 and 720.
   - `estimateTokens is not invariant to whitespace removal` — a payload and its
     whitespace-stripped form must not score equally.
3. Split each generated retrieval subtest (`:183-202`) into two siblings over the same payload:
   `retrieves <case>` (non-emptiness now, content in Item 6) and `bounds the <case> payload`
   (budget only). Inside `bounds …` the **token assertion comes first and the character assertion
   second**; this is a requirement, not a stylistic note. `assert` throws at the first failure, so
   the reverse order makes `payload-bloat` go red on the char bound with `token budget` never
   emitted. The `< 1200` harness precondition catches that only because the mutated payload is 980
   chars; an 1100-char mutation string would defeat it.
4. Budget assertions: `estimateTokens(payload) < 200` and the retained `payload.length < 1200`
   (`:198-201`). The failure message contains the literal `token budget`.
5. Delete `:192-193` (`words` / `Math.round(words*1.3)`).

**The bound: 300 → 200, with the metric changed underneath it.** Under the new estimator today's
worst slice (`d-8f3a`, array-wrapped) is 124, so 200 leaves ~1.6× headroom for legitimate fixture
growth while being *reachable*: 900 whitespace-free letters score 225 and the declared mixed-class
string scores 675, both over 200 and both under the 1200-char bound. Under the old formula no
payload under 1200 chars could reach 300 — the shipped token assertion was decorative, and the
mutated 980-char payload scores **23** under it. The move is strictly a tightening: `estimateTokens`
charges ≥1 per whitespace-separated run, so `estimateTokens < 200 ⟹ words < 200 ⟹ round(words×1.3) <
260 < 300`; nothing that passes the new bound could have failed the old one, and no payload can slip
from red to green. This retires the archived `< 300 tokens` acceptance figure
(`.plans/archive/2026-08-31-105408-query-driven-constitution-skills/PHASES.md:6` — `:5` is the Phase
1 heading). No existing assertion is removed or loosened.

**Files.** `tests/lib/token-estimate.mjs` (new), `tests/constitution_skills.test.js` (`:183-202`,
plus two new subtests).

**Gate command.**
```bash
node tests/mutation-harness.mjs --only payload-bloat; echo "exit=$?"
```
Supporting measurement, re-runnable:
```bash
node --input-type=module -e 'import {estimateTokens} from "./tests/lib/token-estimate.mjs"; import {yqRaw} from "./tests/lib/tools.mjs"; console.log(estimateTokens(yqRaw("[ .decisions[] | select(.id == \"d-8f3a\") ]","ai-docs/constitution.yaml").trim()))'
```

**Current output.** After Item 2: `payload-bloat SURVIVED (d-8f3a summary → 800 whitespace-free
chars; payload 980 chars < 1200)`, `exit=1`. The measurement command fails with
`Cannot find module './tests/lib/token-estimate.mjs'`.

**Expected output after this item.** `payload-bloat RED (signature matched: /token budget/)`,
`exit=0`; the measurement command prints `124`.

**Order justification.** After Item 3 because it consumes `yqRaw` and the `{expr, file}` table.
Before Item 6 because Item 6 adds a content assertion to the *sibling* subtest: if the golden
landed first inside a single combined subtest, `assert` would throw on content before reaching the
budget line and `payload-bloat` would go red without the token bound ever executing — the gate would
pass over an untouched defect. The subtest split is the structural fix for that masking and belongs
here.

---

### Item 6 — declared expected values, in one file a consumer can re-declare

**Change.**

1. New `tests/fixtures/expected.mjs`, header-commented as *the single file to re-declare when the
   `ai-docs/` fixtures are replaced*, exporting:
   - `CONSTITUTION` and `AUTH_SPEC` — the full parsed documents as literals;
   - `GOLDEN_SLICES` — one array-valued entry per query case, keyed by case name;
   - `GOLDEN_DECISIONS` — the declared ADR registry (Item 7);
   - `ADR_STATUSES = ['active','proposed','superseded','deprecated']`;
   - `QUERY_CASES` and `SKILL_INVENTORY` — moved here from the test body.
2. **Provenance rule, binding on the implementer:** every value in this file is a literal.
   `tests/fixtures/expected.mjs` may not `import`, `require`, `readFile`, `yq` or otherwise derive
   anything from `ai-docs/`. A golden computed from the artifact is the two-sided comparison this
   phase exists to kill, relocated to the retrieval layer, and it makes `rule-inverted` survive
   completely. The file therefore contains no call expressions at all, which is a one-glance
   reviewable property.
3. Two new suite-1 subtests: `ai-docs/constitution.yaml matches the declared golden document` and
   `ai-docs/specs/auth-spec.yaml matches the declared golden document`, each a single
   `assert.deepStrictEqual(yqJson('.', file), GOLDEN)` with a message containing
   `golden document mismatch: <file>`. This covers the whole class in one assertion rather than the
   one instance that happens to sit behind a query case — after which `sec-data-01.rule` (`:14`),
   `qual-gate-01.rule` (`:20`), `qual-hygiene-01.rule` (`:24`), `spec.description`
   (`auth-spec.yaml:5`), the `/api/v1/auth/refresh` endpoint (`:12-16`) and both
   `security_invariants[].rule` values (`:19,21`) all have declared expected values. Today each is
   guarded only by `typeof x === 'string' && x.length > 0`.
4. `retrieves <case>` becomes `assert.deepStrictEqual(yqJson(tc.expr, tc.file), GOLDEN_SLICES[tc.name],
   \`golden slice mismatch: ${tc.name}\`)`. The message is mandatory and its literal is the frozen
   signature: `assert.deepStrictEqual` with no message emits `Expected values to be strictly
   deep-equal:`, which matches *any* deep-equality failure anywhere in the suite — including one
   caused by a broken `yqJson`, a fixture edit or a wrong golden entry — so an unmessaged assertion
   makes `rule-inverted`'s gate satisfiable by a suite that is red for an unrelated reason.
   `expectedSnippet` (`:153,158,163,168,173,178`) and `payload.includes(tc.expectedSnippet)` (`:190`)
   are deleted: `:190` asserts that the output of `select(.id == "d-8f3a")` contains `d-8f3a`, true
   for any non-empty result by construction, and the snippet is a substring of the golden in every
   case, so the golden subsumes it strictly. Non-emptiness of the raw payload (`:189`) stays.
5. The pre-existing shape assertions (`:45-53`, `:61-69`, `:77-116`, `:126-144`) are **kept**. They
   are one-sided checks against literals declared in the test and they fail with more specific
   messages than a whole-document diff; the golden is additive.

**On fixture coupling.** `.plans/PHASES.md:50-51` puts fixture-identity decoupling inside Phase 1
("Phase 1 only has to stop the tests from depending on fixture identity in a way that breaks
consumers"); only *replacing* the fixtures is out of scope. A declared expected value is required to
kill `rule-inverted`, and the property that matters — the golden lives outside the artifact, so a
single edit to `ai-docs/` cannot move both sides — is preserved just as well by a test-owned file as
by an inline constant, while a consumer swapping fixtures re-declares one file instead of hunting
literals through 300+ lines of `node:test` code.

**Files.** `tests/fixtures/expected.mjs` (new), `tests/constitution_skills.test.js` (`:149-180`,
`:183-202`, plus two new subtests).

**Gate commands.**
```bash
node tests/mutation-harness.mjs --only rule-inverted --only rule-inverted-unqueried; echo "exit=$?"
node tests/mutation-harness.mjs --only benign-constitution-comment; echo "exit=$?"
```

**Current output.** After Item 2: `rule-inverted SURVIVED`, `rule-inverted-unqueried SURVIVED`,
`exit=1`; second command already `exit=0` (`SURVIVED`).

**Expected output after this item.** First command: both `RED (signature matched)`, `exit=0`.
Second: still `SURVIVED`, `exit=0` — and this is the item where that stops being free. A golden
implemented as a byte or hash pin passes the first command and fails the second.

**Order justification.** After Item 5 (subtest split, and `yqJson` from Item 3). Before Item 7,
which stores `GOLDEN_DECISIONS` in the file this item creates.

---

### Item 7 — ADR synchronization that is not just two sides agreeing

**Change.** Rewrite the fourth suite (`tests/constitution_skills.test.js:265-328`) as **six sibling
subtests**, not one body. `assert` throws at the first failure, so a monolithic body makes which
signature appears an accident of statement order — under `adr-status-bogus` a golden-registry check
executing first would kill the run on a deep-equality diff and the declared vocabulary literal would
never appear, whereupon the obvious "fix" is to loosen the regex.

1. `ADR files and constitution decisions are the same set` — a hand-written depth-first walk over
   `ai-docs/decisions/`, sorting entries at each level, returning every `*.md` at any depth. (Node 22
   offers `{recursive:true}`, but `package.json` declares no `engines`, so a hand-written walk keeps
   the suite runnable on Node 18; this item also adds `"engines": {"node": ">=18"}` so the constraint
   is checkable rather than aspirational.) Assert the sorted set of discovered paths equals the
   sorted set of `decisions[].adr`, reporting the symmetric difference. This replaces the asymmetric
   "each file must be registered" loop (`:318-320`) and subsumes `assert.equal(registered.adr,
   fullPath)` (`:320`) and `files.length > 0` (`:304`). `fs.readdir` at `:303` is non-recursive, so a
   file under `ai-docs/decisions/auth/` is invisible in both directions today. Message contains
   `ADR registry mismatch`.
2. `every ADR shortcode is unique across ai-docs/decisions/` — a `Map<shortcode, string[]>` over the
   discovered files, asserting one path each and listing all paths on failure; plus no duplicate
   `decisions[].id`. `decisions.find(...)` at `:318` takes the first match silently.
3. `ADR structural headings are real headings` — the seven structural sections (`## Context`,
   `## Decision Drivers`, `## Considered Options`, `## Decision Outcome`, `## Consequences`,
   `### Positive`, `### Negative / Caveats`) asserted through Item 4's `hasHeading`, not through
   `assert.match(content, /## Context/)` (`:291-297`). Those seven regexes are unanchored (no `^`, no
   `m`), fence-blind and prefix-matching: `## Context` → `## Contextual` still matches, so does the
   string appearing mid-paragraph or inside a fenced template. That is the shipped substring defect
   verbatim, in the suite the phase is otherwise rewriting, and the tool that fixes it is built in
   Item 4. Message contains `required heading: <text>`.
4. `ADR metadata equals the constitution entry` — for every registered decision, assert the ADR's
   `Date`, `Cluster` and title (from `# ADR-NNNN: <Title>`, `:278`) equal the constitution's `date`,
   `cluster` and `title`, and that `Deciders` is present and non-empty (there is no constitution
   counterpart to compare it to). Cluster comparison strips surrounding backticks —
   `ADR-0001-unified-esm.md:6` writes `` `_general` `` where the constitution writes `_general`. Each
   metadata bullet must occur **exactly once** in the file; `content.match()` at `:282,285,314` takes
   the first silently, so a second `- **Status**:` bullet is invisible. Message on a repeat contains
   `duplicate metadata bullet: <field>`. Bullet extraction runs over the fence-stripped body from
   Item 4's parser, so an ADR containing a template block cannot satisfy a metadata assertion from
   inside the template.
5. `status values on both sides are in the declared vocabulary` — `ADR_STATUSES` from
   `tests/fixtures/expected.mjs`, applied case-insensitively to every `decisions[]`, `caveats[]` and
   `requirements[]` entry **and** to every discovered ADR's `Status` bullet, plus the retained
   two-sided ADR↔constitution match. `caveats[].status` (`:92`) and `requirements[].status` (`:104`)
   are non-empty-only today, so `c-e9a2 status: "bogus"` survives a repair scoped to decisions;
   `deferred[].status` is already pinned to the literal `'deferred'` (`:114`) and stays that way.
   Additionally assert that the vocabulary advertised at `.agents/skills/adr-manager/SKILL.md:32`
   (`- **Status**: Active | Proposed | Superseded | Deprecated`) parses to the same set — checked
   *against* the test-local constant, never sourced from it, because an agent following its own skill
   doc could otherwise change the doc and both artifacts together. Message contains `status not in
   declared vocabulary: <id>`.
6. `registered decisions match the declared golden registry` — `GOLDEN_DECISIONS` in
   `tests/fixtures/expected.mjs`, pinning `d-8f3a` → `{adr:'ai-docs/decisions/ADR-0001-unified-esm.md',
   status:'active', date:'2026-06-27', cluster:'_general', title:'Unified ESM Execution Layer'}`,
   asserted as a **subset** so a legitimate new ADR does not require editing the golden while
   silently rewriting the existing one does. Subject to the same literals-only provenance rule as
   Item 6. Message contains `golden registry mismatch`.

**Why.** `:321-325` compares the two sides to each other and to nothing else, and
`.agents/skills/adr-manager/SKILL.md:94-95` instructs the agent to update the ADR file and then
synchronise `constitution.yaml` — the single write path that keeps a two-sided comparison green while
both sides are wrong. (`:93` is the sentence introducing those two steps.)

**Files.** `tests/constitution_skills.test.js` (`:265-328`), `tests/fixtures/expected.mjs`,
`package.json` (`engines`).

**Gate commands.**
```bash
node tests/mutation-harness.mjs --only adr-status-bogus --only caveat-status-bogus \
  --only adr-nested-rogue --only adr-heading-fenced --only adr-duplicate-status; echo "exit=$?"
node tests/mutation-harness.mjs --only benign-adr-prose-reflow; echo "exit=$?"
```

**Current output.** After Item 2: all five `SURVIVED`, `exit=1`. (After Item 6, `adr-status-bogus`
and `caveat-status-bogus` are already RED via the document golden but with a *mismatched* signature,
so the gate still fails until this item lands.) Second command: `SURVIVED`, `exit=0`.

**Expected output after this item.** First command: all five `RED (signature matched)`, `exit=0`.
Second: still `SURVIVED`, `exit=0`.

**Order justification.** After Item 3 (`yqJson`), Item 4 (`hasHeading`, the fence-aware parser) and
Item 6 (`tests/fixtures/expected.mjs`). Last of the test-side repairs because it is the largest
rewrite and the one most likely to surface an unrelated fixture inconsistency; reaching it with the
other mutations already red keeps that diagnosis local.

---

### Item 8 — `## Separation of duties` in `plugins/steps/skills/steps/SKILL.md`

**Change.** Insert, **after line 9 and before line 10**, the heading `## Separation of duties`
followed by a blank line, then add `Separation of duties` to the `steps` row of the Item 4 inventory
— in that order, so `npm test` is never red between the two edits.

**Why, argued on the artifact.** `plugins/steps/skills/steps/SKILL.md:10-11` states the document's
central rule — "The central rule: **the agent that writes a thing never reviews it.** Everything else
here follows from that, or from a defect that got through because it was violated." It sits unheaded
between `# steps` (`:6`) and `## Roles` (`:13`). A reader scanning the document's headings cannot
find the rule from which the entire protocol is derived, and an agent loading the skill by section
cannot retrieve it. The heading names existing prose whose subject is exactly that heading; no prose
is invented, nothing is reordered, and the insertion point places `:10-11` in the body rather than
leaving an empty section. That is documentation, and it would be the right edit if no test existed.

`### Review lenses` — the other string the archived plan specified for this file — is **not** added,
and is retired instead. There is no unheaded lens section to head: `:60-81` is a single ordered list,
items `0.` (Scout) through `10.` (Commit), and the lens content is a sub-clause of step 2 at
`:64-66`. Inserting a heading above `:64` would label steps 2 through 10 as "Review lenses", which is
false, and split the ordered list so the numbering restarts at `2.` — in the document that is
live-symlinked as this session's protocol. Manufacturing a section so a restored assertion can pass
is the artifact-follows-gate inversion this phase exists to correct; the same criterion retires
`pcp`'s two strings, and applying it uniformly is what makes the retirements honest.

**Live-edit hazard.** `~/.claude/skills/steps → ~/.agents/skills/steps → plugins/steps/skills/steps`,
so this edit takes effect in the running session immediately. It is a two-line insertion above an
existing paragraph, adds no rule and removes none, and it is the only artifact edit in the phase. No
mutation targets this file, so it is written once and never rewritten by a sweep.

**Files.** `plugins/steps/skills/steps/SKILL.md` (one insertion),
`tests/constitution_skills.test.js` (one inventory row).

**Gate command.**
```bash
rtk proxy grep -n '^## Separation of duties' plugins/steps/skills/steps/SKILL.md; \
  npm test 2>&1 | tail -4; \
  node tests/mutation-harness.mjs --only skill-heading-renamed; echo "exit=$?"
```

**Current output.** The `grep` prints nothing and exits 1. (`plugins/steps/skills/steps/SKILL.md:3`
contains `separation of duties` inside the frontmatter `description:` — the only occurrence in the
file, and the sole reason the shipped whole-file substring scan at `:257` passes for it today.)

**Expected output after this item.** The `grep` prints one line; `npm test` reports `# fail 0`;
`skill-heading-renamed` still `RED (signature matched)`, `exit=0`.

**Order justification.** Late. It is the only item that touches a shipped artifact, and placing it
after the suite is otherwise strict means the edit lands against a gate that would notice if it
broke frontmatter, heading structure or the skill inventory. It must follow Item 4, which builds the
parser that can tell a real section from a bare `##` line.

---

### Item 9 — full sweep, recorded numbers, and a named entry point

**Change.**

1. Run the complete harness and record the result in `.plans/phase-1/GATE-OUTPUT.md` — including any
   `BLOCKED` outcome as an environmental exception, and any mutation-table discrepancy escalated
   rather than edited.
2. `package.json`: add `"test:mutation": "node tests/mutation-harness.mjs"`. **The `test` script is
   not changed.** The harness invokes `npm test`, so wiring it into `test` is unbounded recursion;
   and `ai-docs/constitution.yaml:5` declares `verification_command: "npm test"`, asserted at
   `tests/constitution_skills.test.js:37`, so `npm test` must stay the fast suite. The harness is a
   separate, slower gate.
3. Re-measure and record the test count. The implementer records the **measured** number; no
   projection from this plan is carried into `GATE-OUTPUT.md`.

**Why.** A per-mutation `--only` run does not prove the sweep. It does not exercise restore
idempotence across sixteen consecutive mutations, nor the `mustFail` / `mustPass` / `max` contract
(asserted only in a full sweep), nor "the clean tree passes *after* the sweep", nor scoped porcelain
equality at the end.

**Files.** `package.json` (`scripts`), `.plans/phase-1/GATE-OUTPUT.md` (new).

**Gate command.** In this order, because the porcelain check cannot read `0` new entries while this
item's own deliverables are unstaged: commit `package.json` first, then

```bash
node tests/mutation-harness.mjs; echo "exit=$?"; npm test 2>&1 | tail -4
```
then write `GATE-OUTPUT.md` from the captured output and commit it.

**Current output.** `Cannot find module '…/tests/mutation-harness.mjs'`; the chain short-circuits.

**Expected output after this item.** Thirteen `RED (signature matched)` lines and three `SURVIVED`
lines, every one conformant, `exit=0`, then the `npm test` summary showing `# fail 0`, then the
guard's own report that no read path appears in porcelain and `tests/` holds only the two test
files.

**Order justification.** Last. Its gate is the phase acceptance criterion and it cannot pass until
Items 3-8 have each turned their own mutations conformant.

---

## Sequencing rationale

`1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9`.

- **1 before 2.** Everything after Item 2 writes to `ai-docs/` and to skill documents one symlink hop
  from the live protocol. The reversibility machinery is proven independently before the first
  mutation, not alongside it.
- **2 before every repair.** The harness is the measuring instrument, and the survivor set is
  evidence that disappears the moment the suite is touched.
- **3 before 5, 6, 7.** All three add `yq`-executing assertions; landing them first means writing
  them against the discarded-PATH call shape at `:8`/`:13`/`:186` and rewriting them later. Item 5
  additionally consumes the structured case table.
- **4 before 7 and 8.** Item 7 routes ADR structural headings through the fence-aware parser; Item 8
  cannot assert a heading before the parser that anchors headings exists.
- **5 before 6.** `assert` throws at the first failure. If the golden content check shared a subtest
  with the budget assertions, `payload-bloat` would go red on content and the token bound would never
  execute — the gate would report success over an untouched defect. Splitting the subtest is Item 5's
  job, so it must precede the content assertions.
- **6 before 7.** Item 7 stores its golden registry in the file Item 6 creates.
- **8 late.** The only artifact edit, placed where an already-strict suite would catch a bad one.
- **9 last.** Its gate is the acceptance criterion.

Every item's gate is a command whose current output is quoted above and which changes state exactly
once, at that item. No item's failure is deferred to the end of the phase.

## What a conformant-but-wrong implementation would still pass

Attacking the harness first, since it is the artefact that will be trusted next time.

1. **A harness that always exits 1.** Excluded by Item 2's first gate, which demands `exit=0` from a
   four-mutation run containing two REDs *and* two SURVIVEDs. No always-red and no always-green
   harness produces both.
2. **An honest harness pointed at an over-strict suite.** The strongest attack: two pinned file
   hashes with a multi-literal failure message turn six positive controls RED with matched signatures
   and one failing subtest each. Excluded by the three negative controls —
   `benign-constitution-comment` and `benign-adr-prose-reflow` go RED under any byte or hash pin of
   `ai-docs/constitution.yaml` or `ai-docs/decisions/`, and the harness exits 1 when a declared
   `SURVIVED` goes red. This is the defect that made every other defence vacuous, and it is the
   reason the controls are two-sided.
3. **A harness whose edits silently no-op** (drifted anchor, wrong path) would report `SURVIVED`
   forever and, post-repair, make the gate unpassable — or, if someone inverted the expectation to
   "fix" it, report success over a dead mutation. Excluded by anchor-exactly-once and
   post-write-bytes-differ, both mechanical and both verified against the current files.
4. **A harness that credits any red.** Excluded by a plan-owned `expectSignature` per mutation, every
   one of them a literal this plan fixes and the implementer may not edit, plus `mustPass` sets that
   name subtests which must stay green. `adr-status-bogus` is the sharpest: `ADR metadata equals the
   constitution entry` must **pass**, because the two sides agree — so the mutation can only be
   credited to the vocabulary check.
5. **A `payload-bloat` that trips the char bound instead of the token bound.** Excluded by the frozen
   preconditions (mutated payload 980 chars < 1200; estimate 677 > 2×200), the mandated assertion
   order, and the `/token budget/` signature.
6. **A vacuous `path-stripped`.** Excluded by a hermetic PATH built from symlinks to `node`, `npm`,
   `sh`, `env` and `git`, measured to leave `npm test` at 49/49 today with `yq` unresolvable, so the
   mutation does not depend on where `yq` happens to live. `BLOCKED` exits non-zero and must be
   recorded, never accepted as a pass.
7. **A restore that "works" because nothing was checked.** Excluded by sha256 equality per edited
   file, `existsSync` absence checks plus reverse-order `rmdir` for created files and directories
   (byte snapshots do not cover creates, and `git status --porcelain` never reports an empty
   directory — measured this session on `tests/playground-git/src/auth/oauth/`), and scoped porcelain
   comparison at exit. The harness never runs `git stash`, `checkout`, `reset` or `clean`, so a
   botched restore cannot take an unrelated change with it.
8. **A crash between write and restore.** Excluded by the out-of-repo journal, signal handlers on
   SIGINT/SIGTERM/SIGHUP, and a start-up refusal on a stale journal. `SIGKILL` and a hard power loss
   remain uncovered; the journal makes them recoverable by hand rather than silent.
9. **Goldens derived from the artifacts.** `GOLDEN_SLICES = { … yqJson(expr, file) }` satisfies every
   literal word of "a declared expected value" and makes `rule-inverted` survive. Excluded by the
   provenance rule (no call expressions in `tests/fixtures/expected.mjs`) and, mechanically, by
   `rule-inverted-unqueried`: a golden generated from the artifact moves with it and cannot go red on
   prose no query case reaches.
10. **A repaired suite that passes because the fixtures were edited.** No item permits an `ai-docs/`
    edit; the only artifact edit in the phase is Item 8's single heading, and every golden is derived
    from the current fixture bytes, quoted here.

**What genuinely remains open, stated plainly:**

- **Sixteen of the twenty-two asserted headings are ungated.** `skill-heading-renamed` mutates one
  heading in one file, and `adr-heading-fenced` covers the prefix-match and fence holes. A
  `hasHeading` that is correct for `.agents/skills/adr-manager/SKILL.md` and quietly wrong for the
  other five files passes the phase. The mitigation is structural rather than mechanical: all six
  files go through one parser, so the two heading mutations exercise the same code path the other
  twenty assertions use. A per-heading mutation sweep would be 22 more `npm test` runs for a
  code-path that is already covered; it is not worth the ~70 s.
- **The goldens could be generated once and pasted in.** That is indistinguishable from
  hand-transcription by inspection, and it is not, by itself, wrong — what matters is that they stop
  tracking the artifact, which `rule-inverted-unqueried` and the two benign controls together prove.
  A golden that is *re-generated* at some later date without a recorded decision is a Phase-4-class
  problem this phase does not solve.
- **`estimateTokens` is a self-consistent metric, not a validated one.** The three pinned reference
  values stop it from silently reverting to a word count; they do not make 200 a claim about any
  model's tokenizer. See Risks.
- **Nothing gates cwd-relative path resolution.** Every path in the suite is repo-root-relative
  (`:20,23,120,123,152-177,209,214,219,224,229,302`) and the harness runs `npm test` with
  `cwd: repoRoot`, so this phase structurally cannot detect it. It is Phase 3's, and it is named here
  in full rather than as the three sites the previous plan listed.

## Risks

- **`estimateTokens` is a heuristic, not cl100k.** There is no tokenizer in the tree and
  `npm install` is not available to this phase. The audit's figure (1095 whitespace-free chars → 998
  real cl100k tokens vs 16 by the shipped formula) is reported, not measured here. The 200 bound is a
  self-consistent budget over a declared metric. A real tokenizer is a dependency decision and a
  separate item.
- **Post-repair signatures are predictions.** No mutation has been run against a repaired suite,
  because the repairs are unwritten. Each `signature`, `mustFail` and `mustPass` set is derived from
  reading the shipped suite plus the changes specified here. If one is wrong the harness must exit
  non-zero and name the discrepancy, and the implementer escalates it rather than editing the table —
  that is the point of freezing it, and a wrong prediction is a finding about this plan, not a licence
  to adjust.
- **`path-stripped` on a machine where `npm` is not beside `node`.** The hermetic PATH symlinks the
  resolved binaries, so this is much weaker than a directory guess, but the failure mode if `npm`
  needs something else on PATH is a red-for-the-wrong-reason. Partly mitigated by the `mustPass` set
  (all six skill subtests, all 25 pcp subtests) and by the signature; measured on this machine only.
- **Editing `plugins/steps/skills/steps/SKILL.md` edits the live installed skill.** Item 8 is
  insert-only and no mutation rewrites the file, which bounds the exposure to one edit made once. A
  malformed edit still degrades the protocol document the orchestrator is executing.
- **Sixteen mutations at ~3 s each plus two clean runs is ~55 s per sweep.** Per-item `--only` runs
  stay at 3-15 s; only Item 9 pays the full cost.
- **`tests/playground*` residue from an interrupted `npm test` is invisible to git.** Observed this
  session. The guard reports it rather than failing on it, which means a genuinely broken unrelated
  test can leave residue the gate tolerates. The alternative — failing the gate for someone else's
  cleanup — is worse.

## Out of scope

- **`plugins/pcp/skills/pcp/scripts/pcp.js`** — untouched, semantics and all. Item 4 asserts headings
  in its `SKILL.md` only.
- **`tests/pcp_skill.test.js`** — not modified. Checked for coupling: 0 references to `ai-docs`, 0 to
  `plugins/steps`, and its single `.agents/skills` mention is a comment at `:424`. It uses
  `promisify(exec)` and resolves `node` via PATH, which is why the hermetic-PATH mutation leaves it
  green once `git` is present. No Phase 1 mutation can turn it red incidentally, and its 25 subtests
  remain an independent gate — which is what makes the "zero pcp failures" invariant in the mutation
  table meaningful.
- **The divergence between the two `steps` SKILL.md copies.** They differ by 103 lines, first at
  `:22`. Phase 1 brings the droid copy inside the gate (discovery, set-equality, its own heading
  table) and asserts nothing that requires the two texts to agree. Whether that copy should be
  generated, symlinked or deleted is an install/packaging question **owned by Phase 3**.
- **Skill location and install-path resolution** — Phase 3. Item 3 fixes *tool* resolution (`yq` on
  PATH); it does not touch how the suite finds `.agents/skills/...`, which remains cwd-relative.
- **Recipe syntax inside the skills** — Phase 2. Item 3 keeps each query case's documented `recipe`
  string as a field precisely so Phase 2 can assert executability against it; Phase 1 does not verify
  that the string and the structured `expr`/`file` agree. That cross-check is a Phase 2 item and is a
  known seam.
- **Replacing the fictional `ai-docs/` fixtures.** Out of scope per `.plans/PHASES.md:50`. Reducing
  the coupling is not, and Item 6 does it: `tests/fixtures/expected.mjs` is the one file a consumer
  re-declares.
- **A real BPE tokenizer.** Would require a dependency; see Risks.
- **Wiring the harness into `npm test`.** Structurally impossible (recursion) and forbidden by
  `ai-docs/constitution.yaml:5`; it gets its own `test:mutation` script in Item 9.
- **Non-`.md` ADR extensions.** The walk filters `*.md`, so a `.markdown` or `.MD` ADR stays
  invisible in both directions. Not repaired: no such file exists, and the extension set is a fixture
  convention rather than a defect class the audit named.
