# PCP Prune Procedure

When the agent detects or suspects documentation rot (markdown entries in `.pcp/` with no matching `@pcp:xxx` anchor in any source file), run:

```bash
node pcp/scripts/pcp.js prune          # dry-run: report only
node pcp/scripts/pcp.js prune --write   # archive and remove
```

## Dry-run (default)

1. Scans all source files for active `@pcp:<type>-<xxxx>` anchors.
2. Compares against all shortcode headers in `.pcp/` markdown.
3. Reports every "Zombie Document Block" — a markdown entry whose shortcode has zero matching code anchors in the codebase.
4. Does not modify any files.

## Write mode (`--write`)

1. Same scan as dry-run.
2. For each zombie block:
   - Copies the full markdown block (header + body until the next heading) into `.pcp/ARCHIVE.md` with a timestamped comment.
   - Removes the block from the source markdown file.
3. Creates `.pcp/ARCHIVE.md` if it does not exist.

## When to use

- Periodically during constitution maintenance.
- Before major refactors that delete or move code referenced by `@pcp:xxx` anchors.
- After removing features whose requirements and decisions are no longer relevant.

## Safety

- Always run without `--write` first to review what will be pruned.
- Pruned blocks are archived, not deleted — they can be recovered from `.pcp/ARCHIVE.md`.
