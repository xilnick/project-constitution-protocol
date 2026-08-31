---
name: tokensave
description: "Ask the code graph instead of reading files, and resolve the two ways it lies to you: an untracked branch and a stale index. Use for any question about existing code — where a symbol is, who calls it, what breaks if it changes — and whenever a graph answer disagrees with the code you are looking at."
---

# tokensave

A code graph answers structural questions for a fraction of what reading the files costs. The cost of
that trade is that a graph can be *confidently out of date*, and this skill is mostly about that.

## The habit

In a project with a graph, structural questions go to the graph: what exists, who calls it, what
depends on it, what a change reaches. Reading whole files to find a symbol, or grepping the repo for
something the graph indexes, is the expensive way to get a worse answer. Independent graph queries are
read-only — send them in one message rather than one per turn.

Read status through the tool interface (`tokensave tool status`), not the human one: `tokensave status`
paints a colour banner that can run to tens of kilobytes.

## When the graph is lying to you

Two symptoms, one first move.

Symptoms: the answer describes the default branch rather than the branch you are on, or a symbol you
added recently does not resolve at all.

First move, always:

```bash
tokensave tool branch_list
```

It names both faults at once: which branches have an index — an empty list means multi-branch was
never activated, so everything you ask is answered from the default branch — and how long ago each one
was synced. A branch last synced two months ago explains more than any amount of re-querying.

Then, in order of cost:

- **Track this branch** so it has its own index. It copies the nearest ancestor and syncs the
  difference, so it is cheap even on a large repo.
- **Sync** when the branch is tracked but behind the working tree.
- **Ask explicitly** rather than switching: point a query at a branch, or diff two branches' graphs,
  when the question is *what changed here* rather than *what is here*.
- **Collect garbage** once branches are deleted in git; their indexes outlive them.
- **Run the doctor** when the index itself looks wrong rather than merely old.
- **Query the SQLite file directly** as the last resort, when no tool exposes the shape you need.

```bash
tokensave branch add "$(git rev-parse --abbrev-ref HEAD)"
tokensave sync
tokensave branch gc
tokensave doctor
```

The rule that keeps this from happening silently: **an answer from an untracked or long-unsynced
branch is not an answer.** Check the tracked set before you trust the graph about code you have been
editing.

## What the graph structurally cannot know

It is synced at turn boundaries, so it never contains the edits you made this turn. Anything you just
wrote is verified by reading the file — which is also why a reviewer looking at a fresh diff reads
files rather than querying the graph.

## Living with the installer

`tokensave install` configures the agent for you: an MCP server, tool permissions, hooks, and prompt
rules it refreshes on later runs. Three consequences worth knowing:

- **Do not keep your own rules in the file it manages.** It rewrites that path and leaves a `.bak`.
  This skill is where those rules belong.
- **Permissions can be one entry instead of dozens.** `--wildcard-permissions` grants the whole tool
  namespace at once and persists the choice, which keeps your settings readable.
- **A hook blocks greps that look like symbol lookups**, because the graph answers those better. When
  you genuinely need text search over non-code — docs, fixtures, logs — set
  `TOKENSAVE_DISABLE_GREP_HOOK=1` for that one call rather than arguing with the hook.

```bash
tokensave install --wildcard-permissions
```

## Boundary

Text, structural and structured-data searching live in the `search-tools` skill; project governance
lives in `constitution-query`.
