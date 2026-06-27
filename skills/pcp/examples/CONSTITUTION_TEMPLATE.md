# Project Constitution (Template)

This constitution defines core conventions, architectural decisions, and functional design requirements for the project.

---

## Architectural Decisions (Domain: d)

### [d-8f3a] Unified ESM Execution Layer
- **Date**: 2026-06-27
- **Status**: Active
- **Description**: All JavaScript files in this workspace must use native ES Modules (`import/export`) and execute directly on Node.js without a separate compiler or bundler stage to minimize runtime overhead and build bloat.

### [d-c50e] Zero-Dependency Tooling
- **Date**: 2026-06-27
- **Status**: Active
- **Description**: Custom automations and internal developer tools must rely strictly on standard library modules of their respective runtime environment (e.g. Node.js built-ins) to prevent supply chain risks.

---

## Engineering Caveats (Domain: c)

### [c-3b9a] Concurrent File Lock Race Conditions
- **Date**: 2026-06-27
- **Status**: Active
- **Description**: When writing tools that mutate shared markdown files, always write to temporary swap files first or serialize edits to prevent race conditions during parallel agent executions.

---

## Functional Requirements (Domain: r)

### [r-4d92] Signature Declarations Scopes
- **Date**: 2026-06-27
- **Status**: Active
- **Description**: The signature extractor must capture class, function, and interface signatures across JavaScript, TypeScript, Python, and Go files recursively.

---

## Deferred Tasks (Domain: l)

### [l-7b81] AST-based Extractors
- **Date**: 2026-06-27
- **Status**: Draft
- **Description**: Upgrade the regex signature extractor to utilize a full parser library or AST queries once codebase size exceeds 500 modules to increase extraction accuracy.
