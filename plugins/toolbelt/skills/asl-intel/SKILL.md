---
name: asl-intel
description: "Native AgentScript code intelligence graph: symbol search, module outlines, call graphs, impact analysis, and document slicing via dense ASN S-expressions. Use for any question about existing code — where a symbol is, who calls it, what breaks if it changes."
---

# asl-intel

Code intelligence answers structural questions for a fraction of what reading raw files costs. Native
ASL toolchain provides dense ASN S-expressions instead of heavy JSON and verbose terminal banners.

## The habit

Structural questions go to `asl intel`: what exists, who calls it, what depends on it, what a change
reaches. Reading whole files to find a symbol is the expensive way to get a worse answer. Queries are
read-only, so independent ones go out in one message rather than one per turn.

Never call `view_file` on whole files for exploration. Always retrieve outlines and symbol slices first.
The ASN format (`:module-outline`, `:symbol`, `:caller`, `:impact-analysis`) achieves ~72% token
compaction over verbose JSON payloads.

## Code intelligence commands

Use `asl intel` for language syntax and structural symbol graphs:

```bash
asl intel outline plugins/pcp/skills/pcp/scripts/pcp.js
```

```bash
asl intel search ensureDir
asl intel callers ensureDir
```

Use `asl doc` for markdown documentation, specifications, and architecture records:

```bash
asl doc outline AGENTS.md
asl doc section AGENTS.md "Strict Tool Routing"
```

## What the graph structurally cannot know

It evaluates files on disk, so it never holds unsaved in-flight edits inside an agent's memory.
Anything just modified in the current step is verified by targeted line-range reads — which is also
why reviewing subagents read specific diff ranges rather than querying obsolete cache.

## Boundary

Text searching across non-code, structural AST pattern rewrites, and YAML/JSON slicing live in the
`search-tools` skill; project governance and ADR lifecycle live in `constitution-query` and `adr-manager`.
