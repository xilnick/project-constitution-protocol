// The single file to re-declare when the ai-docs/ fixtures are replaced.
//
// PROVENANCE RULE: every value here is a literal. This file must never import,
// require, read or query ai-docs/ — a golden computed from the artifact moves
// with it, and the two-sided comparison this suite exists to kill returns.
// There are no call expressions in this file, which is checkable at a glance.

export const CONSTITUTION = {
  "constitution": {
    "project": "project-constitution-protocol",
    "version": "1.0.0",
    "last_updated": "2026-08-31",
    "verification_command": "npm test",
    "security": {
      "rules": [
        {
          "id": "sec-auth-01",
          "domain": "auth",
          "rule": "All external requests must validate JWT signatures with asymmetric key pairs (RS256/ES256) and reject unsigned or HS256 tokens.",
          "enforcement": "strict"
        },
        {
          "id": "sec-data-01",
          "domain": "data",
          "rule": "Sensitive credentials, secrets, and private keys must never be logged or persisted in plain text.",
          "enforcement": "strict"
        }
      ]
    },
    "quality": {
      "pre_commit_checks": [
        {
          "id": "qual-gate-01",
          "domain": "quality",
          "rule": "All pre-commit verification gates and the test suite defined in verification_command must execute cleanly and return exit code 0 prior to phase completion.",
          "enforcement": "strict"
        },
        {
          "id": "qual-hygiene-01",
          "domain": "hygiene",
          "rule": "Context exploration must use progressive disclosure via tokensave or RTK tools; broad repository-wide grep or full-file dumping is prohibited.",
          "enforcement": "strict"
        }
      ]
    }
  },
  "decisions": [
    {
      "id": "d-8f3a",
      "title": "Unified ESM Execution Layer",
      "status": "active",
      "cluster": "_general",
      "date": "2026-06-27",
      "summary": "All JavaScript files in this workspace must use native ES Modules (import/export) and execute directly on Node.js without a separate compiler or bundler stage.",
      "adr": "ai-docs/decisions/ADR-0001-unified-esm.md"
    }
  ],
  "caveats": [
    {
      "id": "c-e9a2",
      "title": "Zero-Dependency Runtime Constraint",
      "status": "active",
      "cluster": "_general",
      "date": "2026-06-27",
      "summary": "Custom automations and internal developer tools must rely strictly on standard library modules of their respective runtime environment to prevent supply chain risks."
    }
  ],
  "requirements": [
    {
      "id": "r-b111",
      "cluster": "billing",
      "title": "Idempotent Webhook Processing",
      "status": "active",
      "summary": "Incoming payment webhooks must implement idempotency keys with deduplication cache checks prior to mutation execution."
    }
  ],
  "deferred": [
    {
      "id": "l-e404",
      "title": "Multi-Region Active-Active Data Replication",
      "cluster": "infra",
      "status": "deferred",
      "reason": "Cross-region consensus latency exceeds SLA targets for single-tenant deployments; deferred until global tier."
    }
  ]
};

export const AUTH_SPEC = {
  "spec": {
    "name": "auth-spec",
    "version": "1.0.0",
    "domain": "auth",
    "description": "Authentication and token authorization specification for API endpoints.",
    "endpoints": [
      {
        "path": "/api/v1/auth/login",
        "method": "POST",
        "auth_required": false,
        "rate_limit": "10 req/min",
        "description": "Authenticates user credentials and returns JWT pair."
      },
      {
        "path": "/api/v1/auth/refresh",
        "method": "POST",
        "auth_required": true,
        "rate_limit": "30 req/min",
        "description": "Refreshes expired access tokens using a valid refresh token."
      }
    ],
    "security_invariants": [
      {
        "id": "inv-auth-jwt",
        "rule": "Access tokens must use RS256 signatures with maximum 15-minute TTL."
      },
      {
        "id": "inv-auth-revocation",
        "rule": "Token blacklist check must precede all authorization middleware executions."
      }
    ]
  }
};

export const QUERY_CASES = [
  {
    name: "Security rules slice by domain (auth)",
    expr: "[ .constitution.security.rules[] | select(.domain == \"auth\") ]",
    file: "ai-docs/constitution.yaml",
    recipe: "yq '[ .constitution.security.rules[] | select(.domain == \"auth\") ]' ai-docs/constitution.yaml",
  },
  {
    name: "Architectural decision slice (d-8f3a)",
    expr: "[ .decisions[] | select(.id == \"d-8f3a\") ]",
    file: "ai-docs/constitution.yaml",
    recipe: "yq '[ .decisions[] | select(.id == \"d-8f3a\") ]' ai-docs/constitution.yaml",
  },
  {
    name: "Engineering caveat slice (c-e9a2)",
    expr: "[ .caveats[] | select(.id == \"c-e9a2\") ]",
    file: "ai-docs/constitution.yaml",
    recipe: "yq '[ .caveats[] | select(.id == \"c-e9a2\") ]' ai-docs/constitution.yaml",
  },
  {
    name: "Requirement slice (r-b111)",
    expr: "[ .requirements[] | select(.id == \"r-b111\") ]",
    file: "ai-docs/constitution.yaml",
    recipe: "yq '[ .requirements[] | select(.id == \"r-b111\") ]' ai-docs/constitution.yaml",
  },
  {
    name: "Deferred track slice (l-e404)",
    expr: "[ .deferred[] | select(.id == \"l-e404\") ]",
    file: "ai-docs/constitution.yaml",
    recipe: "yq '[ .deferred[] | select(.id == \"l-e404\") ]' ai-docs/constitution.yaml",
  },
  {
    name: "Domain spec endpoint slice (/api/v1/auth/login)",
    expr: "[ .spec.endpoints[] | select(.path == \"/api/v1/auth/login\") ]",
    file: "ai-docs/specs/auth-spec.yaml",
    recipe: "yq '[ .spec.endpoints[] | select(.path == \"/api/v1/auth/login\") ]' ai-docs/specs/auth-spec.yaml",
  },
];

export const GOLDEN_SLICES = {
  "Security rules slice by domain (auth)": [
    {
      "id": "sec-auth-01",
      "domain": "auth",
      "rule": "All external requests must validate JWT signatures with asymmetric key pairs (RS256/ES256) and reject unsigned or HS256 tokens.",
      "enforcement": "strict"
    }
  ],
  "Architectural decision slice (d-8f3a)": [
    {
      "id": "d-8f3a",
      "title": "Unified ESM Execution Layer",
      "status": "active",
      "cluster": "_general",
      "date": "2026-06-27",
      "summary": "All JavaScript files in this workspace must use native ES Modules (import/export) and execute directly on Node.js without a separate compiler or bundler stage.",
      "adr": "ai-docs/decisions/ADR-0001-unified-esm.md"
    }
  ],
  "Engineering caveat slice (c-e9a2)": [
    {
      "id": "c-e9a2",
      "title": "Zero-Dependency Runtime Constraint",
      "status": "active",
      "cluster": "_general",
      "date": "2026-06-27",
      "summary": "Custom automations and internal developer tools must rely strictly on standard library modules of their respective runtime environment to prevent supply chain risks."
    }
  ],
  "Requirement slice (r-b111)": [
    {
      "id": "r-b111",
      "cluster": "billing",
      "title": "Idempotent Webhook Processing",
      "status": "active",
      "summary": "Incoming payment webhooks must implement idempotency keys with deduplication cache checks prior to mutation execution."
    }
  ],
  "Deferred track slice (l-e404)": [
    {
      "id": "l-e404",
      "title": "Multi-Region Active-Active Data Replication",
      "cluster": "infra",
      "status": "deferred",
      "reason": "Cross-region consensus latency exceeds SLA targets for single-tenant deployments; deferred until global tier."
    }
  ],
  "Domain spec endpoint slice (/api/v1/auth/login)": [
    {
      "path": "/api/v1/auth/login",
      "method": "POST",
      "auth_required": false,
      "rate_limit": "10 req/min",
      "description": "Authenticates user credentials and returns JWT pair."
    }
  ],
};

export const ADR_STATUSES = ["active", "proposed", "superseded", "deprecated"];

export const GOLDEN_DECISIONS = {
  "d-8f3a": {
    adr: "ai-docs/decisions/ADR-0001-unified-esm.md",
    status: "active",
    date: "2026-06-27",
    cluster: "_general",
    title: "Unified ESM Execution Layer",
  },
};

export const SKILL_INVENTORY = [
  {
    relPath: "plugins/pcp/skills/constitution-query/SKILL.md",
    expectedName: "constitution-query",
    requiredHeadings: ["Progressive Disclosure","Shortcode Taxonomy","Query Recipes"],
  },
  {
    relPath: "plugins/pcp/skills/code-intelligence/SKILL.md",
    expectedName: "code-intelligence",
    requiredHeadings: ["Progressive Disclosure","Tool Invocation Modes","Navigation & Inspection Recipes","Agent Operational Rules"],
  },
  {
    relPath: "plugins/pcp/skills/adr-manager/SKILL.md",
    expectedName: "adr-manager",
    requiredHeadings: ["Lifecycle & Workflow","Canonical ADR Template","Bidirectional Synchronization","Operational Guardrails"],
  },
  {
    relPath: "plugins/pcp/skills/pcp/SKILL.md",
    expectedName: "pcp",
    requiredHeadings: ["INVOCATION CONTRACT","CORE OPERATIONAL INVARIANTS","CLI MAINTENANCE SUBCOMMANDS","LIFECYCLE DEVELOPMENT GUARDRAILS"],
  },
  {
    relPath: "plugins/steps/skills/steps/SKILL.md",
    expectedName: "steps",
    requiredHeadings: ["Roles","Separation of duties","The phase loop","Rules that were paid for"],
  },
  {
    relPath: "plugins/steps/harnesses/droid/skills/steps/SKILL.md",
    expectedName: "steps",
    requiredHeadings: ["Roles","The phase loop","Rules that were paid for"],
  },
];
