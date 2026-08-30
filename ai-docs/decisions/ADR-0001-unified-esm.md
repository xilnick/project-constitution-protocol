# ADR-0001: Unified ESM Execution Layer

- **Shortcode**: `d-8f3a`
- **Status**: Active
- **Date**: 2026-06-27
- **Cluster**: `_general`
- **Deciders**: Architecture Council

## Context

The repository contains developer CLI scripts, PCP validation tools, and Claude plugins. Historically, Node.js tooling often mixed CommonJS (`require`) and ES Modules (`import`), necessitating Babel/TypeScript transpilation or runtime wrappers. This introduces transpilation delays, complex module resolution quirks, and dependency bloat.

## Decision Drivers

- **Zero Build Overhead**: Scripts must run directly on standard Node.js runtime without build or bundle steps.
- **Modern Standards Alignment**: Node.js natively supports ECMAScript modules (`"type": "module"`).
- **Tooling Interoperability**: AI agents and automated verification scripts need direct, unambiguous entrypoints.

## Considered Options

1. **Dual CommonJS / ESM support**: Maintain CJS source with ESM shims or transpilation.
2. **TypeScript with tsc/esbuild build step**: Author in TS, compile to CJS/ESM.
3. **Pure Native ESM (Selected)**: Direct execution of `.js` files using Node.js native ESM.

## Decision Outcome

Adopt **Pure Native ESM** across all workspace JavaScript files. All files use explicit `.js` extensions in relative imports and top-level ES module syntax (`import`/`export`).

## Consequences

### Positive
- Direct execution without compilation or bundling step.
- Fast script invocation for CLI tools and test harnesses.
- Native top-level `await` support in scripts.

### Negative / Caveats
- Relative import paths must always include the `.js` file extension.
- Cannot use CommonJS globals (`__dirname`, `__filename`, `require`) directly without standard module helpers (`import.meta.url`).
