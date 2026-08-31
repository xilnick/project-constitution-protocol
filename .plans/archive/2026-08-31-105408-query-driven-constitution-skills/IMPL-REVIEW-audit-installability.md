# IMPL-REVIEW — Installability & Portability

**Iteration**: `query-driven-constitution-skills` @ HEAD `886443e`
**Lens**: Installability and portability — does this work anywhere other than this exact checkout?
**Verdict**: **reject**

---

## Summary answer to Q1 (discovery), stated plainly

**No. A user who installs the `pcp` or the `steps` plugin gets none of the three skills. A user who
clones this repo and opens Claude Code in it also gets none of them.**

The three skills live at `<repo>/.agents/skills/`. That path is outside both plugin roots and is not
a skill-discovery location for any harness this repo targets.

---

## Blockers

### B1. The three skills are in a directory no harness reads. They are dead files.

**Evidence — the files:**
- `.agents/skills/constitution-query/SKILL.md:1`
- `.agents/skills/code-intelligence/SKILL.md:1`
- `.agents/skills/adr-manager/SKILL.md:1`

**Evidence — not shipped by either plugin.** `.claude-plugin/marketplace.json:13` declares `pcp` with
`"source": "./plugins/pcp"`; `:20` declares `steps` with `"source": "./plugins/steps"`. Plugin skills
are read from `<plugin-root>/skills/<name>/SKILL.md` — the convention this repo already follows at
`plugins/pcp/skills/pcp/SKILL.md` and `plugins/steps/skills/steps/SKILL.md`. `.agents/` is a sibling
of `plugins/`, not a descendant of either plugin root, so neither plugin package contains it.

```
$ find plugins -maxdepth 4 -type d | grep skills
plugins/pcp/skills
plugins/pcp/skills/pcp
plugins/steps/skills
plugins/steps/skills/steps
plugins/steps/harnesses/droid/skills
```
No `.agents` anywhere under `plugins/`.

**Evidence — not a Claude Code project skill.** Per the Claude Code skills reference
(`code.claude.com/docs/en/skills`, "Where skills live"), the discovery locations are exactly:

| Level | Path |
|---|---|
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` |
| Project | `.claude/skills/<skill-name>/SKILL.md` (and every parent up to the repo root; plus nested `.claude/skills/` on first read in a subdir; plus `--add-dir`) |
| Enterprise | `.claude/skills/` inside the managed settings dir |
| Plugin | `<plugin>/skills/<name>/SKILL.md` → `/plugin-name:skill-name` |

`.agents/skills/` appears nowhere in that list. And this repo has no `.claude/` directory at all:
```
$ ls -la .claude
ls: .claude: No such file or directory
```

**Evidence — not any other harness this repo targets.** The repo's only `.agents` convention is
Antigravity's *agents* directory, not a skills directory:
- `plugins/steps/harnesses/README.md:57-58` — `antigravity/.agents/agents/*.md → ~/.gemini/config/agents/` (global) or `<workspace>/.agents/agents/` (workspace).
- `plugins/steps/harnesses/README.md:26-27` — Droid: `droid/skills/steps/ → ~/.factory/skills/steps/`.
- `plugins/steps/harnesses/README.md:36` — Codex: `.codex/agents/*.toml`.
- `plugins/steps/harnesses/README.md:47` — OpenCode: `.opencode/agents/*.md`.

Every harness dir on disk confirms it: `find plugins/steps/harnesses -type f` yields only
`*/agents/*` and `droid/droids/*` and `droid/skills/steps/SKILL.md`. Nothing reads `.agents/skills/`.

The only other in-repo mention of `.agents/skills/` is `plugins/pcp/skills/pcp/scripts/pcp.js:685`,
where it is named as an example of a **vendored mirror copy to prune from scans** — i.e. prior art
treats `.agents/skills/` as a place a copy might be dumped, not a place anything loads from.

**What breaks:** the entire deliverable. Three SKILL.md files that no agent, in no harness, under no
install method, will ever load.

---

### B2. `tests/constitution_skills.test.js:206-263` is a gate that certifies the defect in B1.

`:209`, `:214`, `:219` assert the skills exist at `.agents/skills/...`. The test suite is named
"Modular Skills **Discoverability** & Frontmatter Conformance" but checks only that a file exists at
a path and that its first block has `name:` and `description:` lines. It never checks the path is a
discovery location. Moving the skills to a location that actually works would make this test fail.

The gate is also blind by construction: it validates the same wrong assumption the implementation
makes, so it can never catch it. A declared expected result is missing — nothing states which
directory is the correct install target.

Additionally the frontmatter check is a hand-rolled regex, not a parser: `:246`
`frontmatterRaw.match(/^name:\s*(.+)$/m)` and `:250` `.replace(/['"]/g, '')`. It would pass on YAML
that a real parser rejects, and it strips quotes rather than parsing them. (In practice all five
files do parse — see Q4 below — so this is a latent gate weakness, not a live failure.)

---

### B3. `tests/constitution_skills.test.js:8` replaces the inherited `PATH` with a macOS-Homebrew-specific literal.

```js
const ENV_PATH = { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin' };
```

Passed to every `execSync` at `:12` and `:185`. This **overrides** the caller's `PATH`, it does not
extend it. Verified that `yq` does not exist in the non-Homebrew portion of that list:

```
$ env -i PATH=/usr/bin:/bin HOME=$HOME sh -c 'command -v yq || echo "yq MISSING"'
yq MISSING under /usr/bin:/bin
```

**What breaks:** on Linux CI, in a container, under nix/asdf/mise, or with `yq` in `~/.local/bin`,
`~/go/bin`, `/snap/bin`, or a venv, all 12 `yq`-dependent subtests fail with ENOENT — *even when `yq`
is installed and on the user's real `PATH`*. `constitution.yaml:5` declares
`verification_command: "npm test"` and `AGENTS.md:66` mandates exit code 0 before any phase
completes, so this makes the mandated gate unrunnable off a Homebrew Mac.

Class: only this file hardcodes `PATH`. `tests/pcp_skill.test.js` does not (grep for `/opt/homebrew`
returns one hit, `tests/constitution_skills.test.js:8`).

---

### B4. `.agents/skills/code-intelligence/SKILL.md` — every CLI recipe but one is wrong, and three fail *silently with exit 0*.

The skill uses `key="value"` argument syntax. `tokensave tool` takes `--key value` flags. Verified
against the installed binary (`tokensave` v-current, `tokensave tool <name> --help`):

| Skill line | Recipe as written | Actual result (run verbatim) | Correct form |
|---|---|---|---|
| `:36` | `tokensave tool find_exact_symbol name="executePhase"` | `{"name":"name=actualize","count":0,"matches":[]}` — **exit 0** | `--name <sym>` |
| `:51` | `tokensave tool entities path="plugins/…/pcp.js"` | `{"file":"path=plugins/…","symbol_count":0,"symbols":[]}` — **exit 0** | `--file <path>` |
| `:66` | `tokensave tool callers name="actualize"` | `Error: config error: node not found: 'name=actualize'. node_id expects a graph node ID …` | `--node-id <id>` |
| `:81` | `tokensave tool callees name="actualize" depth=1` | `Error: config error: unexpected positional argument(s): depth=1 — use --key value flags` | `--node-id <id> --max-depth 1` |
| `:97` | `tokensave tool impact name="normalizeAgentsMd"` | `{"node_count":0,"edge_count":0,"nodes":[]}` — **exit 0** | `--node-id <id>` |
| `:112` | `tokensave tool body name="generateShortcode"` | `No symbol named 'name=actualize' found.` | `--name <sym>` |
| `:127` | `tokensave tool status` | works (`node_count: 372`) | — correct |

Proof the flag name is `--file` not `path`, and that the corrected form works:
```
$ tokensave tool entities --file plugins/pcp/skills/pcp/scripts/pcp.js
{ "file": "plugins/pcp/skills/pcp/scripts/pcp.js", "symbol_count": 50, … }
```

`callers` / `callees` / `impact` are worse than a syntax error: they take `--node-id`, not a symbol
name, so the skill teaches a **conceptually wrong** invocation. The tool's own error text names the
correct route: `to look up by symbol name use tokensave_callers_for or tokensave_search`.

**What breaks:** three of six recipes return an empty result set with exit status 0. An agent
following this skill gets "no callers, no impact, no symbols" and cannot distinguish that from a
genuine negative. This is a silent-wrong-answer class, not a loud failure. It breaks in this
checkout, and it breaks everywhere.

---

### B5. `.agents/skills/code-intelligence/SKILL.md` cites four symbols; three do not exist anywhere in the repo, and the fourth is not a symbol.

```
$ for s in executePhase actualize normalizeAgentsMd generateShortcode; do grep -rn --include=*.js "$s" . | grep -v '^./.git/' | wc -l; done
executePhase        0
actualize          21
normalizeAgentsMd   0
generateShortcode   0
```

- `:36` `executePhase` — 0 occurrences repo-wide.
- `:97` `normalizeAgentsMd` — 0 occurrences. (`AGENTS.md`-normalization is an *LLM* behaviour per `plugins/pcp/skills/pcp/SKILL.md:46`, deliberately "the agent (not a script)". There is no such function by design.)
- `:112` `generateShortcode` — 0 occurrences.
- `:66`, `:81` `actualize` — the 21 hits are the CLI subcommand *string* (`pcp.js:145` help text, `:653`/`:660` error messages, `:709` a comment). It is not an indexed graph symbol: `tokensave tool find_exact_symbol --name actualize` → `"count": 0`.

**What breaks:** every worked example in the skill is unreproducible even in the repo it was written
against. An agent copying them gets empty results and no signal that the example, not the codebase,
is wrong.

---

### B6. `ai-docs/` is coupled to nothing. The `pcp` plugin never creates, reads, or maintains `ai-docs/constitution.yaml`.

```
$ grep -rn "ai-docs" plugins/
(no output)
```

`constitution-query/SKILL.md:105` declares: *"**Source of Truth**: `ai-docs/constitution.yaml` is the
canonical registry for shortcodes."* But the shipped `pcp` CLI's registry is `.pcp/` — `MAP.json`,
`INVENTORY.json`, `INDEX.md` (`plugins/pcp/skills/pcp/SKILL.md:24-27`). Two files now claim to be the
canonical shortcode registry for the same `d/c/r/l` taxonomy, and nothing synchronises them.

**What breaks on install:** in any project where a user actually installed the `pcp` plugin and ran
`node $PCP actualize`, there is a `.pcp/` and there is **no** `ai-docs/constitution.yaml`. Every one
of the 15 recipes in `constitution-query/SKILL.md` and all of `ai-docs/README.md` then fails with
`no such file`. Neither the skill nor the README has a bootstrap step, an existence check, or a
fallback to `.pcp/`.

---

### B7. Hardcoded working-directory paths — the `$PCP` resolution pattern was **not** adopted; the defect it fixed is reintroduced.

Prior art, `plugins/pcp/skills/pcp/SKILL.md:14-22`:
```bash
PCP="${CLAUDE_PLUGIN_ROOT:-}/skills/pcp/scripts/pcp.js"      # installed as a plugin
[ -f "$PCP" ] || PCP="$HOME/.claude/skills/pcp/scripts/pcp.js"   # installed as a user skill
[ -f "$PCP" ] || PCP="pcp/scripts/pcp.js"                        # vendored into the project
```
None of the three new skills contains `CLAUDE_PLUGIN_ROOT`, a `[ -f … ]` probe, or any resolution
step. Full enumeration of cwd-dependent references:

**`constitution-query/SKILL.md`** — `ai-docs/constitution.yaml` at `:8, :30, :36, :39, :42, :49, :52,
:55, :62, :65, :72, :75, :78, :85, :88, :105`; `ai-docs/specs/…` at `:30, :92, :95, :98`.
*Breaks:* every recipe, in any project without a repo-root-relative `ai-docs/`. Which is every
project — see B6.

**`adr-manager/SKILL.md`** — `ai-docs/decisions/` at `:8, :13, :26, :74, :77, :89, :94, :117`;
`ai-docs/constitution.yaml` at `:8, :14, :80, :95, :98, :103, :117, :118`.
*Breaks:* the "Verification Recipe" at `:99-112` exits 1 or throws in any project lacking those dirs;
the guardrails at `:117-118` are unenforceable.

**`code-intelligence/SKILL.md`** — `plugins/pcp/skills/pcp/scripts/pcp.js` at `:51` and `:57`.
*Breaks:* that path exists in this repo only. In a consumer project it resolves to nothing;
`tokensave tool entities` returns `symbol_count: 0` with exit 0.

**`ai-docs/README.md`** — same class at `:23, :26, :33, :36, :38, :44, :47, :54, :57, :64, :67, :74,
:77, :89-94`.

**`AGENTS.md`** — `:53-55` publish `.agents/skills/…` as the canonical skill locations; `:65` points
agents at `ai-docs/constitution.yaml`.

---

### B8. `AGENTS.md:63` mandates an `rtk` subcommand that does not exist, and it fails with exit 0.

> "agents must fallback to `rtk raw <cmd>` to inspect complete output safely."

```
$ rtk --help | grep -iE "^\s+(raw|proxy)"
  proxy          Execute command without filtering but track usage

$ rtk raw echo hi
[rtk: No such file or directory (os error 2)]
$ echo $?
0

$ rtk proxy echo hi
hi
```

`raw` is not a subcommand; `proxy` is. `rtk raw <cmd>` prints an error to stdout and **exits 0**, so
an agent that shell-checks the exit status believes the fallback succeeded and proceeds with no
output at all. This is the escape hatch the document reserves for "when filtered commands truncate
required compiler diagnostics" — the one path that must not fail silently.

Class check: `AGENTS.md:68` `tokensave tool status` — verified correct. `:61` "via `tokensave` or RTK
CLI" — no version or availability requirement stated. `rtk raw` is the only invented subcommand.

---

## Class enumeration (one line per defect class)

| # | Class | Where it occurs |
|---|---|---|
| A | Skill placed in a non-discovery directory | `.agents/skills/constitution-query/SKILL.md:1`, `.agents/skills/code-intelligence/SKILL.md:1`, `.agents/skills/adr-manager/SKILL.md:1` — **all three**. Documented as canonical in `AGENTS.md:53,54,55`. Pinned by `tests/constitution_skills.test.js:209,214,219`. **Not** present in `plugins/pcp/skills/pcp/` or `plugins/steps/skills/steps/`, which use the correct plugin layout. |
| B | No install-location resolution (`$PCP` pattern not adopted) | **All three** skills; zero occurrences of `CLAUDE_PLUGIN_ROOT` or an existence probe in any of them. Also `ai-docs/README.md`. Correctly handled only at `plugins/pcp/skills/pcp/SKILL.md:18-22`. |
| C | cwd-relative data paths with no bootstrap or fallback | `constitution-query` 20 sites; `adr-manager` 16 sites; `code-intelligence` 2 sites; `ai-docs/README.md` 14 sites; `AGENTS.md:65`. Enumerated in full in B7. |
| D | Wrong external-CLI invocation syntax | `code-intelligence:36,51,66,81,97,112` (6 of 7 recipes, `tokensave`); `AGENTS.md:63` (`rtk raw`). **Not** present in the `yq`/`jq` recipes — `constitution-query` and `adr-manager` and `ai-docs/README.md` shell recipes all execute correctly as written (verified verbatim). |
| E | Failure that returns exit 0 / empty result rather than erroring | `code-intelligence:36,51,97` (`count:0`, exit 0); `AGENTS.md:63` (`rtk raw`, exit 0). Not applicable to the `yq` recipes, which exit non-zero on a missing file. |
| F | Fabricated symbol/entity citation | `code-intelligence:36,97,112` (0 repo occurrences), `:66,81` (`actualize` is a CLI string, not a graph symbol). **Zero** fabricated citations found in `constitution-query` (all five shortcodes `sec-auth-01`, `d-8f3a`, `c-e9a2`, `r-b111`, `l-e404` resolve against `ai-docs/constitution.yaml`) or in `adr-manager` (`ADR-0001` resolves). |
| G | Gate pins a machine-specific environment | `tests/constitution_skills.test.js:8` (hardcoded Homebrew `PATH`) — sole occurrence; `tests/pcp_skill.test.js` is clean. |
| H | Fixture data describing a system this repo does not have | `ai-docs/constitution.yaml:45-49` (`r-b111`, billing webhook idempotency), `:52-56` (`l-e404`, multi-region replication), `ai-docs/specs/auth-spec.yaml:1-21` (a JWT auth API with `/api/v1/auth/login`). This repo is a marketplace of markdown plus one Node CLI — no billing, no webhooks, no HTTP endpoints, no regions. Compounded by `tests/constitution_skills.test.js:34,52-53,126-128,152-179` asserting on those exact fixture ids, so a consumer who replaces the fixtures with real content fails the `verification_command`. `auth-spec.yaml:6-16` is also an endpoint list, which `plugins/pcp/skills/pcp/SKILL.md:43` explicitly forbids in constitution entries ("no … API endpoint or route lists"). |

---

## Answers to the numbered questions

**1. Discovery** — answered above. Not discoverable as shipped, by Claude Code or by any harness in
`plugins/steps/harnesses/`. Installing `pcp` or `steps` yields zero of the three skills.

**2. Hardcoded paths** — enumerated in B7 (52 sites across 5 files). The `$PCP` pattern from
`plugins/pcp/skills/pcp/SKILL.md:18-22` was **not** adopted; the class it solved is reintroduced in
all three new skills.

**3. External binaries.**
```
$ command -v yq jq rq rtk tokensave
/opt/homebrew/bin/yq            # mikefarah yq v4.53.2 — correct flavour for `-o=json`
/usr/bin/jq                     # jq-1.7.1-apple
/opt/homebrew/bin/rtk
/Users/purplelephant/.cargo/bin/tokensave
# rq — MISSING (and not referenced by any skill; not a dependency)
```

| Skill | Requires | Fallback documented? |
|---|---|---|
| `constitution-query` | `yq` v4+ (**mikefarah**, not the Python `yq`), `jq` | **No.** `:30` names the requirement; no availability check, no install hint, no pure-Node fallback. A Python-`yq` user's `-o=json` invocation fails — the flavour is never stated. |
| `adr-manager` | `yq`, `node` | **No.** `:103` shells out to `yq` inside `node -e`. No probe. |
| `code-intelligence` | `tokensave` **plus an initialised `.tokensave/` index** | **No.** No `tokensave init` / `tokensave status` precondition step. An unindexed project returns `count: 0` at exit 0 — indistinguishable from a genuine negative (see B4). |
| `AGENTS.md:61,63` | `tokensave`, `rtk` | **No**, and the `rtk` command named does not exist (B8). |

`ai-docs/README.md:13` claims **"Zero-Dependency CLI Querying"**. False — `yq` and `jq` are external
binaries in neither Node's stdlib nor any base OS image. The line reads as a portability guarantee
and is the opposite of one.

**4. Frontmatter validity** — **all five parse cleanly.** Parsed with mikefarah `yq` v4.53.2, block
extracted between the delimiters:

```
constitution-query  → {"name":"constitution-query","description":"Query-driven rule extraction …"}
code-intelligence   → {"name":"code-intelligence","description":"Semantic code graph navigation …"}
adr-manager         → {"name":"adr-manager","description":"Architecture Decision Record (ADR) …"}
pcp                 → {"name":"pcp","description":"Prevent token bloat …"}
steps               → {"name":"steps","description":"Run a roadmap or multi-phase plan …"}
```

Delimiters well-formed (`---` at line 1, `---` at line 4, blank line 5, `# <Title>` at line 6 in all
three new files). Nothing odd follows. **No blocker here** — but note the frontmatter being valid is
irrelevant while the file sits where nothing reads it (B1), and the test that checks it uses regex
rather than a parser (B2).

**5. Class enumeration** — the table above.

---

## Non-blocking

1. `tests/constitution_skills.test.js` uses relative paths throughout; run from `tests/` it produces 14 `not ok`. `npm test` sets cwd to the package root so this is latent, but `AGENTS.md:25` describes the suite as "Run with `npm test` from the repo root" without saying why the constraint exists.
2. `tests/constitution_skills.test.js:192-197` estimates tokens as `words × 1.3` and asserts `< 300`. It counts whitespace-separated words in the *query output*, not model tokens; the cheapest way to raise headroom is to shorten a `summary:` string, which does not change what an agent actually loads. The paired `payload.length < 1200` check at `:199` is the load-bearing one.
3. `AGENTS.md:60` forbids "repository-wide broad grep" — three of the four defects in this review (B5, B8, and the `.agents` enumeration) were found by exactly that. A blanket prohibition with no audit carve-out is self-defeating.
4. `constitution-query/SKILL.md:16` and `:104` mandate a "sub-300 token" payload ceiling with no way to measure it at query time; the only enforcement lives in the test suite against fixed fixtures.
5. `ai-docs/constitution.yaml:3` is `version: "1.0.0"` while `plugins/pcp/.claude-plugin/plugin.json:3` is `1.1.0` and `package.json` is `1.0.0` — three independent version numbers, no stated relationship.

---

## Gates run

**`npm test`** (repo root) — verbatim tail:
```
1..5
# tests 49
# suites 0
# pass 49
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2650.324208
```
Green. Green under the conditions of this machine only — see B3.

**`node --test constitution_skills.test.js` from `tests/`**:
```
not ok 1 - Constitution Schema & Taxonomy Validation
not ok 2 - Query-Driven Retrieval & Token Budget Bounds
not ok 3 - Modular Skills Discoverability & Frontmatter Conformance
```

**`command -v yq jq rq rtk tokensave`** — output in Q3 above. `rq` absent.

**`env -i PATH=/usr/bin:/bin sh -c 'command -v yq'`** → `yq MISSING under /usr/bin:/bin`.

**All seven `code-intelligence` CLI recipes, verbatim** — results tabulated in B4.

**`adr-manager` verification recipe (`:99-112`), verbatim**:
```
All 1 ADR links synchronized.
```
Correct — this one works as written, in this checkout.

**`ai-docs/README.md` payload validation suite (`:86-102`), verbatim**:
```
Query 1 payload: ~33 tokens … Query 6 payload: ~107 tokens
All queries verified under 300 tokens.
exit=0
```
Correct as written despite `require` under `"type": "module"` (`package.json:4`) — `node -e` defaults
to CommonJS regardless of the nearest `package.json` type field. No defect; noting it because
`ADR-0001` / `d-8f3a` mandates ESM and the recipe reads as a violation at a glance.

**`rtk raw echo hi`** / **`rtk proxy echo hi`** — output in B8.

**Frontmatter parse of all five SKILL.md via `yq`** — output in Q4.

---

## Unverified

- Whether Claude Code would package `.agents/` if the plugin `source` were changed — not tested; moot while the path is outside both plugin roots.
- Behaviour of the Python `yq` (`kislyuk/yq`) against these recipes — only mikefarah v4.53.2 is installed here. `-o=json` differs between the two; the skills never state which is required.
- Whether `~/.factory/skills/` (Droid) or Antigravity would load a `skills/` subtree if one were added — the repo ships no such wiring for the three new skills, so there was nothing to test.
- Behaviour on a Linux CI runner — inferred from the `PATH` literal and the `env -i` probe, not executed on Linux.
- Whether `.plans/phase-*/` documents claim a different install target; per method rules those are claims, and the on-disk state is what I reviewed.
