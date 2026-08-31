# Harness wrappers

The steps protocol is one protocol, nine roles. This directory holds the per-harness agent
manifests that let each harness dispatch those roles with the right model and tool surface.

- **Canonical roles**: `../agents/` — the role briefs, harness-independent in content.
- **Canonical routing**: `../MODEL_ROUTING.md` — role→tier→model class, the complexity gate, and
  the per-harness binding tables. Every manifest's model field below must agree with it.
- **Protocol**: `../skills/steps/SKILL.md`.

The manifests were generated from the canonical briefs. What differs per harness is the frontmatter
(tools, model, file format), an H1 title line where the format wants one, and harness tool names.
The role text itself does not. The non-Droid model ids are **example defaults** — replace them with
the models your providers actually expose.

## Claude Code (native)

No wrapper files. The plugin marketplace installs `../agents/` and `../skills/steps/` directly.
Set each agent's `model:` per the Claude Code table in `MODEL_ROUTING.md`, or leave `inherit`.

The Scout role is Claude Code's built-in `explore` agent — it is prioritized there and must not be
disabled. Dispatch `explore` for scouting; `repo-scout` ships for the other harnesses.

## Droid (Factory)

```
droid/droids/*.md            → ~/.factory/droids/
droid/skills/steps/          → ~/.factory/skills/steps/
../MODEL_ROUTING.md          → ~/.factory/skills/steps/
```

The routing doc is the third line because the skill text cites it and it lives outside the copied
subtree; without it a Droid install has a skill pointing at a file that is not there.

The droid files already carry concrete `model:` ids (`custom:*`) and Droid tool names
(`Read`, `LS`, `Grep`, `Glob`, `Create`, `Edit`, `Execute`, `WebSearch`, `TodoWrite`).

`droid/skills/steps/SKILL.md` is the canonical protocol verbatim plus one `## Droid specifics`
section — the model bindings, the tool-name mapping, and which models accept images. Droid is the
only harness that ships its own skill copy, because it is the only one whose model ids are real
rather than examples; edit the canonical file and re-insert the overlay, never the copy alone.

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
`commandExecutionPolicy: eager` (auto-run shell commands; high-risk commands stay gated). Set the
CLI `agentMode` to `accept-edits` and `toolPermission` to `proceed-in-sandbox` in
`~/.gemini/antigravity-cli/settings.json` so subagents inherit it.

## Model bindings

All model ids are in `MODEL_ROUTING.md`. Change them there (and in the manifest files, since the
manifests carry the value) and keep the role→tier mapping intact.
