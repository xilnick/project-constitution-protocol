# Phases: Gate Repair & Installability

Origin: the three-lens audit of `query-driven-constitution-skills` (archived
2026-08-31). All three lenses returned `reject`. The artifacts are largely sound;
the verification suite that declared them sound is not. This iteration makes the
gate able to fail, makes the tool recipes actually run, and makes the skills
reachable once installed.

## Ordered Phases

1. **Phase 1: Make the gate able to fail**
   - Repairs: fakeable `words × 1.3` token bound (`tests/constitution_skills.test.js:192`);
     whole-file substring "section" scans (`:257`); tautological retrieval assertions
     (`:157-190`); ADR-sync blindness — any-status acceptance (`:321`) and non-recursive
     readdir (`:303`); machine-pinned `PATH` (`:8`); section strings narrowed away from
     `phase-4/PLAN.md:57,59,60` without disclosure.
   - Acceptance criterion: `node tests/mutation-harness.mjs` — applies each declared
     mutation (inverted constitution rule, renamed heading, both-sides-bogus ADR status,
     nested rogue ADR, whitespace-free oversized payload, stripped PATH), asserts
     `npm test` **fails** for every one and passes on the clean tree. Exit 0 only if all hold.

2. **Phase 2: Make every documented recipe execute**
   - Repairs: each `tokensave` recipe corrected to the parameter its subcommand actually takes, per
     `tokensave tool <name> --help` (**not** a blanket `name="X"` → `--name X`: `body` takes
     `--symbol`, and `callers`/`callees`/`impact` take `--node-id` with no name form at all —
     orchestrator ruling D1, see `ORCHESTRATOR-LOG.md`);
     `entities` `path` → `--file`; `callers`/`callees`/`impact` need `--node-id`;
     the four cited symbols that do not exist; `rtk raw` → `rtk proxy` (`AGENTS.md:63`);
     the `ai-docs/` vs `.pcp/` canonical registry (`constitution-query/SKILL.md:105`);
     live doc contradictions only — the Middle-vs-Tier routing label, and the
     300-vs-200 token bound that Phase 1 left behind in three skill docs while the gate
     enforces 200 (`tests/constitution_skills.test.js:236`). The 4-vs-5 workflow phases and
     the stale graph counts exist **only** under `.plans/archive/` — live `AGENTS.md:73-79`
     says five and enumerates five — so they fall under Out of Scope below, not here
     (orchestrator ruling D4).
   - Acceptance criterion: `node tests/recipe-exec.test.js` — extracts every fenced shell
     recipe from the three skills and `AGENTS.md`, runs each, asserts exit 0 **and** a
     non-empty payload that is not `count: 0`; plus a banned-string gate for commands that
     do not exist. Silent exit-0 failures fail the test.

3. **Phase 3: Make the skills reachable when installed**
   - Repairs: the three skills live in `.agents/skills/`, which no harness reads and which
     sits outside both plugin roots (`marketplace.json:13,20`) — a `pcp`/`steps` install
     delivers none of them. Adopt the `$PCP`-style install resolution
     (`plugins/pcp/skills/pcp/SKILL.md:18-22`) instead of the ~52 cwd-relative sites.
     Includes the dangling `MODEL_ROUTING.md` reference in `steps/SKILL.md:106`, which does
     not resolve when the skill is installed as a bare directory.
   - Acceptance criterion: `bash tests/install-smoke.sh` — installs the marketplace into a
     throwaway `HOME`, asserts all five skills are discovered, then runs one recipe per
     skill from an unrelated working directory and asserts success. No test may `cd` into
     the repo.

## Out of Scope

- Changing `plugins/pcp/skills/pcp/scripts/pcp.js` CLI semantics; only its docs may change.
- Merging `steps/harness-portability` into `main` or pushing to `origin` — a separate decision.
- Replacing the fictional `ai-docs/` fixtures (billing/webhooks/JWT) with real ones; Phase 1
  only has to stop the tests from depending on fixture identity in a way that breaks consumers.
- Re-running the archived iteration's phases. Their artifacts stay archived as-is.
