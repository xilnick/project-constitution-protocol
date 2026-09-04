---
name: gap
description: "Evaluate plans, diffs, or entire repositories for gaps, architectural consistency, and anti-overengineering adequacy. Use during plan review, implementation review, or for whole-project gap audits."
---

# gap

Evaluate a plan, a code diff, or an entire codebase for gaps, architectural drift, and over-engineering.

## Why the skill exists

A review that only verifies whether tests pass misses two opposite failure modes:
1. **Omission (Gaps)**: Missing edge cases, unhandled failure states, unvalidated input boundaries, unfulfilled specification items, or absent regression tests.
2. **Over-Engineering (Bloat)**: Speculative abstractions, premature generalization, unnecessary dependencies, and verbose boilerplate where a standard library call or a simpler idiom suffices.

This skill enforces the Critic standard: the cleanest solution is the shortest working diff that
completely solves the problem and preserves architectural invariants.

## Local evaluation

Use when reviewing a plan (`PLAN.md`) or an implementation diff before committing:

### 1. Gap Analysis (Completeness)
- **Edge cases**: Are boundary values, null states, empty collections, and error paths handled?
- **Contracts**: Does the change satisfy all specified schema rules and API contracts?
- **Verification integrity**: Does each item have an explicit, reproducible gate command that fails before and passes after?

### 2. Consistency Analysis (Invariants)
- **Architecture**: Conforms to `ai-docs/constitution.yaml` rules, active ADRs (`@pcp:d-xxxx`), and established idioms.
- **Shared types**: Reuses existing models and utility functions rather than redefining duplicate structures.
- **Zero-comment rule**: Rationale and workarounds are referenced via shortcodes (`@pcp:`), leaving source code clean and idiomatic.

### 3. Adequacy & Anti-Overengineering (Critic filter)
- **YAGNI**: Does this need to be built at all? Does an existing helper or stdlib feature already solve it?
- **Diff efficiency**: Can this be fewer lines, fewer files, and zero new dependencies?
- **Simplicity**: No premature layers of indirection or unused configuration options.

Verdict is one of: **approve**, **approve-with-amendments**, or **reject**, accompanied by concrete replacement snippets.

## Global repository audit

Use when auditing an entire codebase or running a dedicated consistency phase:

1. **Rule verification**: Query `ai-docs/constitution.yaml` and inspect whether all security, quality, and hygiene invariants hold across source files.
2. **ADR drift check**: Compare active ADRs against current implementation to find obsolete patterns or undocumented workarounds.
3. **Orphan & gap detection**: Find unimplemented specs in `ai-docs/specs/`, unreferenced helper files, or dead configuration branches.
4. **Emit remediation plan**: Write findings to `.plans/GAPS.md` and format a prioritized roadmap of corrective phases for the `steps` orchestrator.

## Done when

The review file (`REVIEW.md`, `IMPL-REVIEW.md`, or `GAPS.md`) records findings citing verbatim `path:line` evidence, concrete diff recommendations, and an unambiguous verdict.
