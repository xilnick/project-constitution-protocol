# PCP Init Procedure

When the PCP skill is activated and the sandbox (`.pcp/`) does not exist, execute the following protocol.

## 1. Scaffold the sandbox

Run the CLI command:

```bash
node pcp/scripts/pcp.js init
```

This creates:
- `.pcp/CONSTITUTION.md` – stable decisions (`@pcp:d`) and caveats (`@pcp:c`).
- `.pcp/DRAFT_LOG.md` – working log of requirements (`@pcp:r`) and deferred tasks (`@pcp:l`).
- `.pcp/_general.md` – default area for entries not tied to a bounded context.
- Appends `.pcp/MAP.json`, `.pcp/INVENTORY.md`, `.pcp/INDEX.md` to `.gitignore`.

## 2. Drop project-level `AGENTS.md` (if missing)

Check whether `AGENTS.md` exists at the project root. If it does not, create it with the following content:

```markdown
# Project Agent Instructions

Activate the `pcp` skill and follow its instructions.
```

If `AGENTS.md` already exists, leave it untouched and log: `- AGENTS.md already exists.`

## 3. Continue with audit

After init completes, proceed to the audit step (run `pcp actualize`) as specified in the Invocation Contract.
