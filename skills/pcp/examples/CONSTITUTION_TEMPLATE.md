# Project Constitution (Template)

This constitution defines core conventions, architectural decisions, and functional design requirements for the project.

---

## Architectural Decisions (Domain: d)

### [d-8f3a] Unified ESM Execution Layer
- **Date**: 2026-06-27
- **Status**: Active
- **Cluster**: _general
- **Description**: All JavaScript files in this workspace must use native ES Modules (`import/export`) and execute directly on Node.js without a separate compiler or bundler stage to minimize runtime overhead and build bloat.

### [d-c50e] Zero-Dependency Tooling
- **Date**: 2026-06-27
- **Status**: Active
- **Cluster**: _general
- **Description**: Custom automations and internal developer tools must rely strictly on standard library modules of their respective runtime environment (e.g. Node.js built-ins) to prevent supply chain risks.

---

## Engineering Caveats (Domain: c)

### [c-3b9a] Concurrent File Lock Race Conditions
- **Date**: 2026-06-27
- **Status**: Active
- **Cluster**: _general
- **Description**: When writing tools that mutate shared markdown files, always write to temporary swap files first or serialize edits to prevent race conditions during parallel agent executions.

---

## Functional Requirements (Domain: r)

### [r-4d92] Signature Declarations Scopes
- **Date**: 2026-06-27
- **Status**: Active
- **Cluster**: _general
- **Description**: The signature extractor must capture class, function, and interface signatures across JavaScript, TypeScript, Python, and Go files recursively.

### [r-7e1f] Idempotent Webhook Re-delivery Handling
- **Date**: 2026-06-28
- **Status**: Active
- **Cluster**: billing
- **Scenario**: A payment gateway (e.g. Stripe) sends the same `charge.succeeded` webhook twice due to a network retry within 30 seconds. The billing service receives both and must credit the user exactly once.
- **Why Non-Obvious**: The handler checks a `processed` flag on the payment record, but the flag is set asynchronously after the credit is applied. A naive read-then-write has a 200ms window where the second webhook skips the check and double-credits. The fix requires an atomic compare-and-swap or idempotency key at the DB layer.
- **Description**: Webhook handlers for external payment events must be idempotent. Use an atomic idempotency key (not a read-then-write flag) to prevent double-processing of retried deliveries.

---

## Deferred Tasks (Domain: l)

### [l-7b81] AST-based Extractors
- **Date**: 2026-06-27
- **Status**: Draft
- **Cluster**: _general
- **Description**: Upgrade the regex signature extractor to utilize a full parser library or AST queries once codebase size exceeds 500 modules to increase extraction accuracy.
