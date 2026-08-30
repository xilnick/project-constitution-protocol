# Harness wrappers

The steps protocol is one protocol, nine roles. This directory holds the per-harness agent
manifests that let each harness dispatch those roles with the right model and tool surface.

- **Canonical roles**: `../agents/` — the role briefs, harness-independent in content.
- **Canonical routing**: `../MODEL_ROUTING.md` — role→tier→model class, the complexity gate, and
  the per-harness binding tables. Every manifest's model field below must agree with it.
- **Protocol**: `../skills/steps/SKILL.md`.

The manifests were generated from the canonical briefs; only the frontmatter (tools, model, file
format) differs per harness. The non-Droid model ids are **example defaults** — replace them with
the models your providers actually expose.

## Claude Code (native)

No wrapper files. The plugin marketplace installs `../agents/` and `../skills/steps/` directly.
Set each agent's `model:` per the Claude Code table in `MODEL_ROUTING.md`, or leave `inherit`.

## Droid (Factory)

```
droid/droids/*.md            → ~/.factory/droids/
droid/skills/steps/          → ~/.factory/skills/steps/
```

The droid files already carry concrete `model:` ids (`custom:*`) and Droid tool names
(`Read`, `LS`, `Grep`, `Glob`, `Create`, `Edit`, `Execute`, `WebSearch`, `TodoWrite`).

## Codex CLI (OpenAI)

```
codex/.codex/agents/*.toml   → ~/.codex/agents/          (personal)
                                <project>/.codex/agents/ (project)
```

One TOML file per agent; each sets `name`, `description`, `developer_instructions`, `model`,
`model_reasoning_effort`, and `sandbox_mode` (`read-only` for planners/reviewers,
`workspace-write` for the coder and fixer).

## OpenCode (SST)

```
opencode/.opencode/agents/*.md → ~/.config/opencode/agents/   (global)
                                 <project>/.opencode/agents/  (project)
```

Markdown agents; the filename is the agent name. `model` uses `provider/model-id`; read-only roles
get `permission.edit: deny` with `bash` allowed so they can run gates.

## Antigravity (Google)

```
antigravity/.agents/agents/*.md → ~/.gemini/config/agents/          (global)
                                  <workspace>/.agents/agents/       (workspace)
```

YAML-frontmatter subagents (`name`, `description`, `tools`, `subagent`, `mainAgent`, `model`,
`permissionMode`, `commandExecutionPolicy`). `model` is `flash` or `pro`. Tool names are
`view_file`, `grep_search`, `run_command`, `replace_file_content`. For autonomous background
runs every agent carries `permissionMode: acceptEdits` (auto-approve file edits) and
`commandExecutionPolicy: auto` (auto-run standard test/build commands; high-risk commands stay
gated). Set the CLI `agentMode` to `accept-edits` in `~/.gemini/antigravity-cli/settings.json`
so subagents inherit it.

## Model bindings

All model ids are in `MODEL_ROUTING.md`. Change them there (and in the manifest files, since the
manifests carry the value) and keep the role→tier mapping intact.
