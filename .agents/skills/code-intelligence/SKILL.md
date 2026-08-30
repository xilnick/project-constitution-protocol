---
name: code-intelligence
description: "Semantic code graph navigation via TokenSave MCP/CLI. Enables targeted sub-symbol and call-graph context retrieval instead of reading whole files."
---

# Code Intelligence Skill

Navigate, inspect, and analyze source code relationships using the TokenSave semantic code graph (`tokensave tool`).

## Progressive Disclosure

Loading full source files into context windows consumes excessive tokens and obscures relevant symbol definitions.

Follow **progressive disclosure** principles for code navigation:
1. **Symbol Discovery**: Locate specific functions, classes, or types with `find_exact_symbol` or `entities` instead of globbing and whole-file reads.
2. **Call Graph Traversal**: Trace incoming (`callers`) and outgoing (`callees`) call edges to understand execution pathways.
3. **Impact Radius**: Compute dependencies and blast radius (`impact`) before modifying core interfaces or shared utilities.
4. **Targeted Extraction**: Extract the exact symbol implementation (`body`) rather than reading entire source files.

---

## Tool Invocation Modes

TokenSave can be invoked through two interfaces:
1. **CLI Commands**: `tokensave tool <command> [args]`
2. **MCP stdio Calls**: Tool calls through an MCP client runtime (`tokensave_<command>` or `tokensave: { tool: "<command>" }`).

---

## Navigation & Inspection Recipes

### 1. Locate Exact Symbol (`find_exact_symbol`)
Return all graph nodes whose identifier exactly matches a given name:
```bash
# CLI Recipe
tokensave tool find_exact_symbol name="executePhase"

# MCP Tool Call
{
  "tool": "find_exact_symbol",
  "arguments": {
    "name": "executePhase"
  }
}
```

### 2. List File Entities (`entities`)
Get a flat list of top-level symbols (functions, structs, types, constants) declared in a file:
```bash
# CLI Recipe
tokensave tool entities path="plugins/pcp/skills/pcp/scripts/pcp.js"

# MCP Tool Call
{
  "tool": "entities",
  "arguments": {
    "path": "plugins/pcp/skills/pcp/scripts/pcp.js"
  }
}
```

### 3. Trace Callers (`callers`)
Find incoming call edges to a function or method:
```bash
# CLI Recipe (by symbol name or node ID)
tokensave tool callers name="actualize"

# MCP Tool Call
{
  "tool": "callers",
  "arguments": {
    "name": "actualize"
  }
}
```

### 4. Trace Callees (`callees`)
Find outgoing function/method calls from a symbol up to a specified depth:
```bash
# CLI Recipe
tokensave tool callees name="actualize" depth=1

# MCP Tool Call
{
  "tool": "callees",
  "arguments": {
    "name": "actualize",
    "depth": 1
  }
}
```

### 5. Calculate Impact Radius (`impact`)
Compute all symbols that directly or indirectly depend on a given node:
```bash
# CLI Recipe
tokensave tool impact name="normalizeAgentsMd"

# MCP Tool Call
{
  "tool": "impact",
  "arguments": {
    "name": "normalizeAgentsMd"
  }
}
```

### 6. Extract Symbol Source Body (`body`)
Retrieve the precise implementation body of a symbol without reading the surrounding file:
```bash
# CLI Recipe
tokensave tool body name="generateShortcode"

# MCP Tool Call
{
  "tool": "body",
  "arguments": {
    "name": "generateShortcode"
  }
}
```

### 7. Graph Status & Health (`status`)
Inspect aggregate node, edge, and file metrics for the workspace:
```bash
# CLI Recipe
tokensave tool status
```

---

## Agent Operational Rules
- **Prefer Sub-symbol Resolution**: Always prefer `find_exact_symbol` and `body` over full file reads (`view_file` or `read`).
- **Check Blast Radius First**: When refactoring shared symbols, run `impact` to inspect all dependent modules.
- **Trace Boundaries**: Use `callers` and `callees` to verify interaction contracts before modifying signatures.
