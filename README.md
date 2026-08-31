# Project Constitution Protocol

A Claude Code plugin marketplace for agent-driven engineering. Two protocols, both about the same
problem from different ends: intent that does not survive the session, and work that gets graded by
the agent that produced it.

## Install

```
/plugin marketplace add xilnick/project-constitution-protocol
/plugin install steps@pcp
/plugin install toolbelt@pcp
```

The marketplace is named `pcp`, so every plugin installs as `<plugin>@pcp`.

`steps` and `toolbelt` are habits — install them once, for yourself. **`pcp` is per project**: a
constitution belongs to one codebase, so enable it where that codebase lives rather than globally.

```
/plugin install pcp@pcp
```

Then enable it for the project by adding `"enabledPlugins": { "pcp@pcp": true }` to that project's
`.claude/settings.json` — this repository's own file is the worked example.

## Plugins

| Plugin | What it does | Scope |
|---|---|---|
| [`pcp`](plugins/pcp) | Project Constitution Protocol. Record decisions, constraints, rationale and lessons as short coded entries anchored in source with `@pcp:<type>-<xxxx>`, so intent survives context loss instead of being restated in comments and chat. | per project |
| [`steps`](plugins/steps) | Run a roadmap phase by phase under separation of duties — plan, review the plan, reconcile, implement, review the implementation, fix, verify, commit. The agent that writes a thing never grades it. Five stages, loaded when the phase needs them. | global |
| [`toolbelt`](plugins/toolbelt) | Fan independent work out into one wave, ask the code graph instead of reading files, and route each search to the tool that answers it cheapest. | global |

They are independent. Install any one alone.

## Layout

```
.claude-plugin/marketplace.json    the marketplace manifest
plugins/
  pcp/
    .claude-plugin/plugin.json
    skills/pcp/                    SKILL.md, procedures/, scripts/pcp.js, examples/
    skills/constitution-query/     query the constitution schema and ADRs
    skills/code-intelligence/      semantic code-graph navigation
    skills/adr-manager/            ADR lifecycle and constitution sync
  steps/
    .claude-plugin/plugin.json
    skills/steps/SKILL.md          the orchestrator
    skills/steps-plan|-review|-implement|-verify|-fix/
                                   the five stages, each invocable alone
    MODEL_ROUTING.md               role→tier→model, complexity gate, escalation
    roles/ partials/               canonical source for the nine role briefs
    tools/render.mjs               renders agents/ and harnesses/ from them
    agents/ harnesses/             rendered output — never edited by hand
  toolbelt/
    .claude-plugin/plugin.json
    skills/parallel|tokensave|search-tools/
ai-docs/                           constitution.yaml, decisions/, specs/
tests/                             the suites (see Development)
```

Neither plugin ships a `commands/` directory: the skills are the entrypoints, and `/steps` invokes
the steps skill itself.

## Development

```
npm test
```

Runs four gates in order: `pcp_skill.test.js` (the CLI, against a scratch playground under
`tests/`, including two cases that vendor the skill into a simulated consumer repo),
`constitution_skills.test.js` (constitution schema, skill frontmatter, ADR synchronization),
the repo-guard self-test, and `recipe-exec.test.js --hermetic` (every documented recipe, executed).

```
npm run test:recipes     the same recipe suite with the live tools (yq, jq, tokensave, rtk)
npm run test:mutation    mutates the artifacts and asserts each gate goes red; needs a clean tree
npm run test:smoke       installs the marketplace into a throwaway HOME and runs the recipes there
```

## License

MIT.
