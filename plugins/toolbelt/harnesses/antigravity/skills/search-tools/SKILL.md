---
name: search-tools
description: "Route each search to the tool that answers it cheapest: the code graph for symbols, ast-grep for structure, ripgrep for literal text, yq and jq for slices of YAML and JSON. Use when looking for something in a repository, rewriting a pattern across a language, or reading one value out of a config file."
---

# search-tools

Most context waste is a right answer fetched the wrong way. The tools below differ in what they
understand, and picking by what your question actually is costs nothing.

## The routing rule

| The question is about | Ask | Because |
|---|---|---|
| a symbol, its callers, its blast radius | the code graph (`tokensave`) | it already knows the edges; text search only guesses at them |
| a shape — a call pattern, an idiom, a signature across a language | `ast-grep` | it matches syntax, so it does not fire inside strings or comments |
| a literal string — a message, a key, a path, prose | `rg` | there is no structure to exploit and it is the fastest thing there is |
| one value inside YAML or JSON | `yq` / `jq` | a query returns the slice; reading the file returns the file |
| output a filter mangled or truncated | the raw command | see below |

## Structural search and rewrite

`ast-grep` earns its place on rewrites, where regex is dangerous: a pattern describes the syntax, so
the match cannot land inside a comment or a similarly-spelled string. Two habits make it safe —
inspect the matches before rewriting anything, and rewrite one pattern at a time so a bad result is
one revert rather than an archaeology exercise. Where the code graph offers a structural rewrite of
its own, prefer it: it knows which files are actually in the project.

```bash
ast-grep run --pattern 'console.log($$$ARGS)' --lang js plugins/
```

## Slices, not files

Query the path you need and nothing else — the value when you know where it lives, the key list when
you are still guessing at the shape. A whole config file in context is a whole config file you will
re-read at the next compaction.

```bash
yq '. | keys' ai-docs/constitution.yaml
yq '.constitution.version' ai-docs/constitution.yaml
jq -r '.plugins[].name' .claude-plugin/marketplace.json
```

## When the filtered output is wrong

Token-optimising wrappers summarise command output, which is what you want until the detail you need
is exactly what was dropped — a compiler diagnostic, a stack trace, a test's failing assertion. Then
re-run the command raw and read the real thing. Never prefix the wrapper yourself: it is a hook, so
ordinary commands are already rewritten, and a manual prefix is how you get double-filtered output.

```bash
rtk proxy npm test
```

## Boundary

Graph queries and index staleness live in the `tokensave` skill; constitution and ADR queries have
their own recipes in `constitution-query`. This skill does not restate either.
