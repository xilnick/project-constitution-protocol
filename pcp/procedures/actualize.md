# PCP Actualize Procedure

When the `pcp` skill is activated (step 2 of the Invocation Contract), or when the agent needs to synchronize the constitution after minting entries or modifying code, run:

```bash
node pcp/scripts/pcp.js actualize
```

## What it does

1. **Compile shortcode map.** Recursively scans all `*.md` files under `.pcp/` (including area folders) for headers matching `### [type-xxxx] Title`. Writes the result to `.pcp/MAP.json` as `{ "xxxx": { "file", "line", "title", "populated" } }`.

2. **Extract code inventory.** Scans source directories (`src/`, `lib/`, `app/`, or project root) for exported declarations across JS/TS/Python/Go — classes, functions (incl. `async`/generators), interfaces, types, enums, consts, and `export { … }` re-exports. Writes the full per-symbol index to the git-ignored `.pcp/INVENTORY.json` and a lean per-module summary to `.pcp/INVENTORY.md`. Query individual symbols with `node pcp/scripts/pcp.js lookup <name>` — never load the inventory wholesale.

3. **Write area index.** Groups all entries by area and sub-area, counts per-type, and writes `.pcp/INDEX.md`. This is the file the agent reads first for cheap orientation.

4. **Validate trace connections.** Scans all source files for `@pcp:<type>-<xxxx>` anchors. For each anchor:
   - If the shortcode has no matching header in `.pcp/` markdown files → **Dead Connection**.
   - If the shortcode header exists but the entry body is empty/unpopulated → **Dead Connection**.

## Error modes

- If any dead connections are found, the command exits with a `Dead Connection Breach Exception` listing every mismatched reference. The agent must surface these verbatim and stop — do not auto-fix, auto-prune, or auto-mutate user docs.
- If validation passes, the command prints `PCP validation successful: 0 breaches detected.` and the agent proceeds with normal work.

## When to re-run

- On every skill activation (automatic in step 2).
- After minting new entries.
- After modifying source code that contains `@pcp:xxx` anchors.
- After moving or deleting `.pcp/` markdown files.
