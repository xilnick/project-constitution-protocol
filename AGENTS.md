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
