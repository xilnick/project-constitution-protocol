# PCP Init Procedure

When the PCP skill is activated and the sandbox (`.pcp/`) does not exist, execute the following protocol.

## 1. Scaffold the sandbox

Run the CLI command:

```bash
node skills/pcp/scripts/pcp.js init
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

## Project Constitution Protocol (PCP)

This project uses the PCP skill for context hygiene and requirements tracking.

### Orientation

Read `.pcp/INDEX.md` first to understand the current state of the constitution.

### Shortcode Types

- `@pcp:d-xxxx` (Architectural Decisions): Immutable design patterns.
- `@pcp:c-xxxx` (Engineering Caveats): Technical landmines.
- `@pcp:r-xxxx` (Functional Requirements): Lightweight requirements.
- `@pcp:l-xxxx` (Deferred Logs): Postponed tracks.

### Usage

- Run `pcp actualize` to synchronize the constitution.
- Use `pcp read <shortcode>` to read a specific entry.
- Use `pcp map <shortcode>` to get the file and line of an entry.
- Use `pcp ls <area>` to list sub-areas and counts.
- Use `pcp find <query>` to search titles.
```

If `AGENTS.md` already exists, leave it untouched and log: `- AGENTS.md already exists.`

## 3. Continue with audit

After init completes, proceed to the audit step (run `pcp actualize`) as specified in the Invocation Contract.
