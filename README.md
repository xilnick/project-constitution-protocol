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
  steps/
    .claude-plugin/plugin.json
    skills/steps/SKILL.md
    agents/                        steps-planner, -plan-reviewer, -reconciler,
                                   -implementer, -impl-reviewer, -fixer
    commands/steps.md              the /steps slash command
tests/pcp_skill.test.js            the pcp CLI suite
```

## Development

```
npm test
```

Runs the `pcp` CLI suite against a scratch playground under `tests/`. The suite drives
`plugins/pcp/skills/pcp/scripts/pcp.js` directly, including two cases that vendor the skill
directory into a simulated consumer repo.

## License

MIT.
