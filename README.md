# Project Constitution Protocol (PCP)

A context-hygiene-first, light-weight requirements tracking and tracing framework designed specifically for AI-driven software development. It eliminates token bloat, prevents code redundancy in parallel multi-agent workspaces, and enforces cryptographic shortcode traceability.

## Repository Layout
- `skills/pcp/SKILL.md`: The agent instruction skill file containing system instructions and slash command specs.
- `skills/pcp/scripts/pcp.js`: Zero-dependency, ESM Node.js runner implementing the protocol automation.
- `skills/pcp/examples/CONSTITUTION_TEMPLATE.md`: Standard boilerplates for decisions, caveats, and requirements.

---

## Getting Started

### 1. Installation
To activate the PCP engine locally in a workspace, copy the `skills/pcp` directory into the workspace configuration root:
```bash
mkdir -p .agents/skills/
cp -r skills/pcp .agents/skills/pcp
```
Alternatively, to install it globally for all your workspace agents, copy it to:
```bash
cp -r skills/pcp ~/.gemini/config/skills/pcp
```

### 2. Sandbox Initialization
Run the initialization script (or use the slash command `/pcp-init`):
```bash
node .agents/skills/pcp/scripts/pcp.js init
```
This scaffolds the sandbox:
- `.pcp/`: The container for specifications.
- `.pcp/CONSTITUTION.md`: Central record of Architectural Decisions (`d`) and Engineering Caveats (`c`).
- `.pcp/DRAFT_LOG.md`: Working log of Requirements (`r`) and Deferred Tasks (`l`).
- `.gitignore`: Updated to exclude generated runtime indexes (`.pcp/MAP.json`, `.pcp/INVENTORY.md`).

---

## Operational Commands

### 1. `/pcp-mint <type>`
Mints a unique, non-colliding shortcode with high entropy.
```bash
node .agents/skills/pcp/scripts/pcp.js mint d
```
Types:
- `d` (Decision): Architectural patterns or structural frameworks.
- `c` (Caveat): Concurrency traps, legacy bugs, or vendor quirks.
- `r` (Requirement): Functional product specifications.
- `l` (Log): Deferred tasks or future improvements.

### 2. `/pcp-actualize`
Synchronizes the workspace state and performs trace checks:
```bash
node .agents/skills/pcp/scripts/pcp.js actualize
```
Actions:
- **Anti-Redundancy**: Compiles classes, functions, and interfaces across the codebase to `.pcp/INVENTORY.md`. The agent reads this to avoid duplicating code.
- **Shortcode Compilation**: Maps all markdown headers containing `[type-xxxx]` to `.pcp/MAP.json`.
- **Validation**: Scans codebase for `// @pcp:x-xxxx` anchors. Throws `Dead Connection Breach Exception` if code references are dead or if the mapped documentation block is empty.

### 3. `/pcp-prune`
Locates "Zombie Document Blocks" (specifications in markdown that have no matching inline code anchors):
```bash
node .agents/skills/pcp/scripts/pcp.js prune
```
Run with `--write` to clean up and archive obsolete entries to `.pcp/ARCHIVE.md`:
```bash
node .agents/skills/pcp/scripts/pcp.js prune --write
```

---

## Syntax Specifications

### Markdown Anchors
Format: `### [type-xxxx] Title Descriptor`
```markdown
### [d-8f3a] ESM Module Layer
- **Date**: 2026-06-27
- **Description**: We enforce ES module execution.
```

### Source Code Tracing
Format: `@pcp:<type>-<xxxx>`
```javascript
// @pcp:d-8f3a
import fs from 'fs/promises';
```
```python
# @pcp:d-8f3a
import os
```
