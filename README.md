# Project Constitution Protocol

A Claude Code plugin marketplace for agent-driven engineering. Two protocols, both about the same
problem from different ends: intent that does not survive the session, and work that gets graded by
the agent that produced it.

## Install

```
/plugin marketplace add xilnick/project-constitution-protocol
/plugin install pcp@pcp
/plugin install steps@pcp
```

The marketplace is named `pcp`, so both plugins install as `<plugin>@pcp`.

## Plugins

| Plugin | What it does |
|---|---|
| [`pcp`](plugins/pcp) | Project Constitution Protocol. Record decisions, constraints, rationale and lessons as short coded entries anchored in source with `@pcp:<type>-<xxxx>`, so intent survives context loss instead of being restated in comments and chat. |
| [`steps`](plugins/steps) | Run a roadmap phase by phase under separation of duties — plan, review the plan, reconcile, implement, review the implementation, fix, verify, commit. The agent that writes a thing never grades it. |

They are independent. Install either alone.

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
    skills/steps/SKILL.md          the protocol
    MODEL_ROUTING.md               role→tier→model, complexity gate, escalation
    agents/                        steps-planner, -plan-reviewer, -reconciler,
                                   -implementer, -impl-reviewer, -fixer,
                                   -architect-pro, repo-scout, step-verifier
    harnesses/                     agent manifests for codex, claude-code,
                                   opencode, droid, antigravity
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
