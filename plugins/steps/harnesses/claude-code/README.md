# Claude Code

Claude Code is the native harness for this plugin — no wrapper manifests needed. The plugin
marketplace installs `agents/` and `skills/steps/` directly, and each agent in `agents/` already
carries Claude Code frontmatter (`name`, `description`, `tools`, `model`, `color`).

To apply the two-tier routing, set each agent's `model:` in `agents/` per the Claude Code table in
`../MODEL_ROUTING.md`, or leave `model: inherit` to use the session model.
