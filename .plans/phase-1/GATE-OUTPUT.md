# Phase 1 — Gate Output

Machine: darwin 25.1.0, `node v22.22.3`, `npm 10.9.8`, `yq` at `/opt/homebrew/bin/yq`.
Branch `steps/harness-portability`, HEAD `886443e` plus this phase's uncommitted work.

## Measured test count (not projected)

```
$ npm test 2>&1 | tail -9
1..5
# tests 66
# suites 0
# pass 66
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4982.798708
```

Baseline before the phase was `# tests 49 / # pass 49`. The 17 added leaves are:
`tool resolution follows the inherited PATH`, `estimateTokens scores the declared reference
strings`, `estimateTokens is not invariant to whitespace removal`, the two
`* matches the declared golden document` leaves, the six `bounds the * payload` siblings of the
split retrieval subtests, `every SKILL.md on disk is declared in the skill inventory`, the sixth
per-skill leaf (`plugins/steps/harnesses/droid/skills/steps/SKILL.md`), and the four extra
suite-4 leaves from splitting two ADR subtests into six.

`tests/pcp_skill.test.js` is byte-unchanged (`git diff --stat -- tests/pcp_skill.test.js` is empty)
and its 25 subtests pass in every one of the 16 mutation runs.

## Full sweep

```
$ node tests/mutation-harness.mjs; echo "exit=$?"
mutation harness — 16 mutation(s), full sweep

clean tree (before): npm test PASS

rule-inverted                RED (signature matched)    [conformant]
rule-inverted-unqueried      RED (signature matched)    [conformant]
payload-bloat                RED (signature matched)    [conformant]
adr-status-bogus             RED (signature matched)    [conformant]
caveat-status-bogus          RED (signature matched)    [conformant]
adr-nested-rogue             RED (signature matched)    [conformant]
adr-heading-fenced           RED (signature matched)    [conformant]
adr-duplicate-status         RED (signature matched)    [conformant]
skill-heading-renamed        RED (signature matched)    [conformant]
skill-unlisted               RED (signature matched)    [conformant]
path-stripped                RED (signature matched)    [NON-CONFORMANT]
                             problem: 21 failing leaves exceeds max 20
canary-missing-key           RED (signature matched)    [conformant]
canary-bad-yaml              RED (signature matched)    [conformant]
benign-constitution-comment  SURVIVED                   [conformant]
benign-adr-prose-reflow      SURVIVED                   [conformant]
crlf-frontmatter             SURVIVED                   [conformant]

clean tree (after):  npm test PASS
porcelain: no divergence on read paths

15/16 mutations conformant (full sweep)
exit 1
```

Thirteen declared-RED mutations went RED with the frozen signature; three declared-SURVIVED
negative controls stayed green. Every `mustFail` set failed, every `mustPass` set stayed green, and
no `tests/pcp_skill.test.js` leaf failed under any mutation. Both clean-tree runs passed and no read
path diverged in `git status --porcelain` across the sweep.

No mutation reported `BLOCKED`; the hermetic-PATH preconditions (`node`, `npm`, `sh`, `env`, `git`
all resolvable, `yq` not) held on this machine.

## Escalated mutation-table discrepancy (not edited)

**`path-stripped`, `max: 20`.** The conformant post-phase suite produces **21** failing leaves under
the hermetic PATH, one more than the frozen cap. Verbatim:

```
path-stripped                RED (signature matched)    [NON-CONFORMANT]  (no file changed)
                             failing leaves: 21 — ai-docs/constitution.yaml exists, is readable, and contains root keys | constitution block attributes match schema specifications | security.rules array contains valid enforcement entries | quality.pre_commit_checks array contains qual-gate-01 and qual-hygiene-01 | taxonomy shortcodes conform to required attributes and patterns | ai-docs/specs/auth-spec.yaml conforms to domain specification schema | tool resolution follows the inherited PATH | ai-docs/constitution.yaml matches the declared golden document | ai-docs/specs/auth-spec.yaml matches the declared golden document | retrieves Security rules slice by domain (auth) | bounds the Security rules slice by domain (auth) payload | retrieves Architectural decision slice (d-8f3a) | bounds the Architectural decision slice (d-8f3a) payload | retrieves Engineering caveat slice (c-e9a2) | bounds the Engineering caveat slice (c-e9a2) payload | retrieves Requirement slice (r-b111) | bounds the Requirement slice (r-b111) payload | retrieves Deferred track slice (l-e404) | bounds the Deferred track slice (l-e404) payload | retrieves Domain spec endpoint slice (/api/v1/auth/login) | bounds the Domain spec endpoint slice (/api/v1/auth/login) payload
                             problem: 21 failing leaves exceeds max 20
```

All 21 are yq-dependent by construction, and the count is derivable from `PLAN.md`'s own
"Declared subtest names" section: nine yq-dependent suite-1 leaves (the six original ones,
`tool resolution follows the inherited PATH`, and the two golden-document leaves) plus all twelve
suite-2 leaves. `20` appears to be an arithmetic slip made before those leaves were named, not a
property difference — the mutation's `mustFail` leaf failed and all six `mustPass` skill leaves
stayed green, which is what the cap exists to discriminate.

The table was **not** edited. The harness exits 1 on this and will keep doing so until the
orchestrator rules on the cap.

## Scope note on the guard's dirty-path refusal (decision requested)

`tests/lib/repo-guard.mjs` refuses (exit 2) when a `git status --porcelain` entry prefix-matches
`ai-docs/`, `.agents/skills/` or `plugins/steps/skills/rogue/`. The critic ruling D1 phrased the
refusal set as "a mutation target path … (`ai-docs/`, `tests/`, `package.json`,
`plugins/steps/skills/steps/SKILL.md`)". No mutation in the frozen table targets `tests/`,
`package.json` or `plugins/steps/skills/steps/SKILL.md`, and all three are necessarily dirty while
this phase is in flight — Items 3-8 edit `tests/constitution_skills.test.js`, Item 9 edits
`package.json`, and Item 8's own gate runs the harness immediately after editing
`plugins/steps/skills/steps/SKILL.md`. Including them would have made every per-item gate in the
phase unrunnable. The refusal therefore covers the paths the suite reads **as data** and that no
item edits. Exit-time porcelain comparison is unchanged and still treats any divergence under a read
path — including `?? ai-docs/decisions/auth/` and `?? plugins/steps/skills/rogue/` — as fatal.

---

## Orchestrator verification (post-fix-wave, re-measured — not copied)

Every number below was produced by the orchestrator running the command in this session, after both
fix agents reported. The implementer's and fixers' figures above are superseded where they differ.

```
$ npm test 2>&1 | rg '^# (tests|pass|fail|skipped|todo)|^1\.\.'
1..5
# tests 66
# pass 66
# fail 0
# skipped 0
# todo 0
```

```
$ node tests/mutation-harness.mjs; echo "sweep exit=$?"
clean tree (before): npm test PASS
clean tree baseline:  61 executed leaves, 25 of them in PCP Skill Automation Suite
...
clean tree (after):  npm test PASS
porcelain: no divergence on read paths

16/16 mutations conformant (full sweep)
sweep exit=0
```

All 16 mutations report `61 executed`, equal to the clean-tree baseline. Thirteen declared-RED
mutations went RED with the frozen signature; three declared-SURVIVED negative controls stayed
green. `path-stripped` now fails 26 enumerated leaves (was 21 with 6 leaves silently unregistered)
and `canary-bad-yaml` 21 (was 16), both pinned by `|mustFail| = max`.

`git status --porcelain` captured before and after the full sweep is **byte-identical** (39 entries
either side, `diff` empty): no `plugins/steps/skills/rogue/`, no `ai-docs/decisions/auth/`, no
playground residue.

### What the phase's acceptance criterion asked, and whether it is met

`.plans/PHASES.md` Phase 1: *"`node tests/mutation-harness.mjs` — applies each declared mutation,
asserts `npm test` fails for every one and passes on the clean tree. Exit 0 only if all hold."*
**Met**, exit 0.

The green is not the evidence, though. The evidence is that the harness was shown to go red on the
defect it used to score `[conformant]`: with the top-level `parseYaml` restored, `--only
path-stripped` reports `55 executed, baseline 61` and exits 1.
