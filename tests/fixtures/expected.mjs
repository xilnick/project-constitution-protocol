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
    },
    "execution": {
      "verification_command_resolution": [
        "constitution.verification_command in ai-docs/constitution.yaml",
        "the gate command named in .factory/CONSTITUTION.md or CONSTITUTION.md",
        "the project's own test script (npm test or equivalent)"
      ],
      "stages": [
        {
          "id": "plan",
          "skill": "steps-plan",
          "agents": [
            "repo-scout",
            "steps-planner",
            "steps-architect-pro"
          ],
          "produces": "PLAN.md, each item with a gate that fails now",
          "skip_when": "the verification gate alone can show the work right or wrong"
        },
        {
          "id": "review",
          "skill": "steps-review",
          "agents": [
            "steps-plan-reviewer",
            "steps-impl-reviewer",
            "steps-reconciler"
          ],
          "produces": "REVIEW-<lens>.md, IMPL-REVIEW-<lens>.md, RECONCILIATION.md",
          "skip_when": "there is no plan to review"
        },
        {
          "id": "implement",
          "skill": "steps-implement",
          "agents": [
            "steps-implementer"
          ],
          "produces": "code",
          "skip_when": null
        },
        {
          "id": "verify",
          "skill": "steps-verify",
          "agents": [
            "step-verifier"
          ],
          "produces": "a gate-results report",
          "skip_when": null
        },
        {
          "id": "fix",
          "skill": "steps-fix",
          "agents": [
            "steps-fixer"
          ],
          "produces": "code, each agent in its own files",
          "skip_when": "no blocker was found and the circuit breaker did not trip"
        }
      ],
      "tiers": [
        {
          "id": "tier-0",
          "label": "Tier 0 (Fast-Track / Planning Bypass)",
          "entry": "Micro or trivial edit: a typo, an isolated single-line fix, a documentation or config tweak.",
          "stages": [
            "implement",
            "verify"
          ],
          "escalates_to": "tier-1"
        },
        {
          "id": "tier-1",
          "label": "Tier 1 (Standard)",
          "entry": "CRUD, a component edit, a local fix, a dependency bump.",
          "stages": [
            "plan",
            "implement",
            "verify"
          ],
          "escalates_to": "tier-1.5"
        },
        {
          "id": "tier-1.5",
          "label": "Tier 1.5 (Middle)",
          "entry": "More than standard, short of architectural: plan cheap, then add the architect as one critic lens.",
          "stages": [
            "plan",
            "review",
            "implement",
            "verify",
            "fix"
          ],
          "escalates_to": "tier-2"
        },
        {
          "id": "tier-2",
          "label": "Tier 2 (Architectural)",
          "entry": "DB migration, protocol change, cross-cutting refactor, distributed logic or race-condition reasoning.",
          "stages": [
            "plan",
            "review",
            "implement",
            "verify",
            "fix"
          ],
          "escalates_to": null
        }
      ],
      "escalation_triggers": [
        {
          "id": "gate-failed",
          "detected_by": "step-verifier",
          "action": "Report the failing gate verbatim and name the tier to escalate to; never fix it."
        },
        {
          "id": "hidden-coupling",
          "detected_by": "steps-implementer",
          "action": "Stop varying details, report the verbatim error, and request escalation."
        },
        {
          "id": "circuit-breaker",
          "detected_by": "orchestrator",
          "action": "On the second distinct failure roll back with git checkout -- . and dispatch steps-fixer."
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

// Write class per role: what the role is allowed to put on disk. Declared here rather than read
// from a profile, because a wrong profile is exactly what this is meant to catch.
export const ROLE_WRITE_CLASS = {
  "repo-scout": "none",
  "steps-planner": "report",
  "steps-architect-pro": "report",
  "steps-plan-reviewer": "report",
  "steps-reconciler": "report",
  "steps-impl-reviewer": "report",
  "step-verifier": "report",
  "steps-implementer": "code",
  "steps-fixer": "code",
};

// How each harness is able to express that class, and the sentence a report role's body must carry
// on every harness — the only expression available where the tool model cannot scope a write.
export const WRITE_CLASS_EXPECTATIONS = [
  {
    harness: "claude-code",
    manifest: "plugins/steps/agents/{name}.md",
    tokens: { none: { absent: ["Edit", "Write"] }, report: { present: ["Write"], absent: ["Edit"] }, code: { present: ["Write", "Edit"] } },
  },
  {
    harness: "droid",
    manifest: "plugins/steps/harnesses/droid/droids/{name}.md",
    tokens: { none: { absent: ["Edit", "Create"] }, report: { present: ["Create"], absent: ["Edit"] }, code: { present: ["Create", "Edit"] } },
  },
  {
    harness: "antigravity",
    manifest: "plugins/steps/harnesses/antigravity/agents/{name}.md",
    tokens: { none: { absent: ["replace_file_content"] }, report: { present: ["replace_file_content"] }, code: { present: ["replace_file_content"] } },
  },
  {
    harness: "opencode",
    manifest: "plugins/steps/harnesses/opencode/.opencode/agents/{name}.md",
    text: { none: ["edit: deny"], report: ['"*": deny', '".plans/**": allow'], code: ["edit: allow"] },
  },
  {
    harness: "codex",
    manifest: "plugins/steps/harnesses/codex/.codex/agents/{name}.toml",
    text: { none: ['sandbox_mode = "read-only"'], report: ['sandbox_mode = "workspace-write"'], code: ['sandbox_mode = "workspace-write"'] },
  },
];

export const REPORT_SCOPE_SENTENCE = "Writing anywhere else is a protocol violation";

// One rule, one heading. A brief heading outside this vocabulary means a shared rule grew a second
// name, which is how three headings for one rule happened before.
export const BRIEF_HEADINGS = [
  "When to invoke", "Tool boundary", "File ownership", "Starting state",
  "What you return", "What you produce", "What you receive, what you return", "What you do",
  "Work item by item", "Read the actual files", "Gate integrity", "Output",
  "Nothing is dropped silently", "PLAN.md v2", "The question that pays for this role",
  "Constitution check", "What counts as a blocker", "What counts as a failure",
  "The class, not the instance", "Each item must be able to fail", "Never weaken a gate to make it pass",
  "Reports are data, not truth", "Evidence", "Escalation", "Anti-thrash", "Never",
  "Reply to the orchestrator",
];

// Byte budgets, counted after the rewrite and then declared. Each says what it buys.
export const SIZE_BUDGETS = [
  { glob: "plugins/steps/skills/steps/SKILL.md", max: 14000, buys: "the orchestrator is always loaded, so its size is the floor of every session" },
  { glob: "plugins/steps/skills/steps-*/SKILL.md", max: 2200, buys: "a stage is loaded on demand; past this it stops being cheaper than the full protocol" },
  { glob: "plugins/toolbelt/skills/*/SKILL.md", max: 4200, buys: "a habit an agent reads often has to fit beside the actual work" },
  { glob: "plugins/steps/agents/*.md", max: 4000, buys: "a brief is pasted into a dispatch, so it competes with the task itself" },
  { glob: "plugins/pcp/skills/pcp/SKILL.md", max: 10500, buys: "the protocol file loads whenever pcp activates; it is the one deliberate outlier" },
  { glob: "plugins/pcp/skills/adr-manager/SKILL.md", max: 5000, buys: "a query skill is a recipe sheet, not a manual" },
  { glob: "plugins/pcp/skills/code-intelligence/SKILL.md", max: 5000, buys: "a query skill is a recipe sheet, not a manual" },
  { glob: "plugins/pcp/skills/constitution-query/SKILL.md", max: 5000, buys: "a query skill is a recipe sheet, not a manual" },
];

export const DESCRIPTION_MAX = 420;

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
    relPath: "plugins/steps/skills/steps-plan/SKILL.md",
    expectedName: "steps-plan",
    requiredHeadings: ["Why the stage exists","When you need it","How to run it","Done when"],
  },
  {
    relPath: "plugins/steps/skills/steps-review/SKILL.md",
    expectedName: "steps-review",
    requiredHeadings: ["Why the stage exists","When you need it","How to run it","Done when"],
  },
  {
    relPath: "plugins/steps/skills/steps-implement/SKILL.md",
    expectedName: "steps-implement",
    requiredHeadings: ["Why the stage exists","How to run it","Escalation","Done when"],
  },
  {
    relPath: "plugins/steps/skills/steps-verify/SKILL.md",
    expectedName: "steps-verify",
    requiredHeadings: ["Why the stage exists","How to run it","Escalation","Done when"],
  },
  {
    relPath: "plugins/steps/skills/steps-fix/SKILL.md",
    expectedName: "steps-fix",
    requiredHeadings: ["Why the stage exists","When you need it","How to run it","Done when"],
  },
  {
    relPath: "plugins/toolbelt/skills/parallel/SKILL.md",
    expectedName: "parallel",
    requiredHeadings: ["The mechanic that decides everything","Where the wins actually are","Splitting","When not to","Boundary"],
  },
  {
    relPath: "plugins/toolbelt/skills/tokensave/SKILL.md",
    expectedName: "tokensave",
    requiredHeadings: ["The habit","When the graph is lying to you","Living with the installer","Boundary"],
  },
  {
    relPath: "plugins/toolbelt/skills/search-tools/SKILL.md",
    expectedName: "search-tools",
    requiredHeadings: ["The routing rule","Structural search and rewrite","Slices, not files","Boundary"],
  },
  {
    relPath: "plugins/steps/harnesses/droid/skills/steps/SKILL.md",
    expectedName: "steps",
    requiredHeadings: ["Roles","Separation of duties","The phase loop","Rules that were paid for","Droid specifics"],
  },
  {
    relPath: "plugins/steps/harnesses/antigravity/skills/steps/SKILL.md",
    expectedName: "steps",
    requiredHeadings: ["Roles","Separation of duties","The phase loop","Rules that were paid for"],
  },
  {
    relPath: "plugins/steps/harnesses/antigravity/skills/steps-plan/SKILL.md",
    expectedName: "steps-plan",
    requiredHeadings: ["Why the stage exists","When you need it","How to run it","Done when"],
  },
  {
    relPath: "plugins/steps/harnesses/antigravity/skills/steps-review/SKILL.md",
    expectedName: "steps-review",
    requiredHeadings: ["Why the stage exists","When you need it","How to run it","Done when"],
  },
  {
    relPath: "plugins/steps/harnesses/antigravity/skills/steps-implement/SKILL.md",
    expectedName: "steps-implement",
    requiredHeadings: ["Why the stage exists","How to run it","Escalation","Done when"],
  },
  {
    relPath: "plugins/steps/harnesses/antigravity/skills/steps-verify/SKILL.md",
    expectedName: "steps-verify",
    requiredHeadings: ["Why the stage exists","How to run it","Escalation","Done when"],
  },
  {
    relPath: "plugins/steps/harnesses/antigravity/skills/steps-fix/SKILL.md",
    expectedName: "steps-fix",
    requiredHeadings: ["Why the stage exists","When you need it","How to run it","Done when"],
  },
  {
    relPath: "plugins/toolbelt/harnesses/antigravity/skills/parallel/SKILL.md",
    expectedName: "parallel",
    requiredHeadings: ["The mechanic that decides everything","Where the wins actually are","Splitting","When not to","Boundary"],
    mirrors: "plugins/toolbelt/skills/parallel/SKILL.md",
  },
  {
    relPath: "plugins/toolbelt/harnesses/antigravity/skills/tokensave/SKILL.md",
    expectedName: "tokensave",
    requiredHeadings: ["The habit","When the graph is lying to you","Living with the installer","Boundary"],
    mirrors: "plugins/toolbelt/skills/tokensave/SKILL.md",
  },
  {
    relPath: "plugins/toolbelt/harnesses/antigravity/skills/search-tools/SKILL.md",
    expectedName: "search-tools",
    requiredHeadings: ["The routing rule","Structural search and rewrite","Slices, not files","Boundary"],
    mirrors: "plugins/toolbelt/skills/search-tools/SKILL.md",
  },
  {
    relPath: "plugins/pcp/harnesses/antigravity/skills/pcp/SKILL.md",
    expectedName: "pcp",
    requiredHeadings: ["INVOCATION CONTRACT","CORE OPERATIONAL INVARIANTS","CLI MAINTENANCE SUBCOMMANDS","LIFECYCLE DEVELOPMENT GUARDRAILS"],
    mirrors: "plugins/pcp/skills/pcp/SKILL.md",
  },
  {
    relPath: "plugins/pcp/harnesses/antigravity/skills/constitution-query/SKILL.md",
    expectedName: "constitution-query",
    requiredHeadings: ["Progressive Disclosure","Shortcode Taxonomy","Query Recipes"],
    mirrors: "plugins/pcp/skills/constitution-query/SKILL.md",
  },
  {
    relPath: "plugins/pcp/harnesses/antigravity/skills/code-intelligence/SKILL.md",
    expectedName: "code-intelligence",
    requiredHeadings: ["Progressive Disclosure","Tool Invocation Modes","Navigation & Inspection Recipes","Agent Operational Rules"],
    mirrors: "plugins/pcp/skills/code-intelligence/SKILL.md",
  },
  {
    relPath: "plugins/pcp/harnesses/antigravity/skills/adr-manager/SKILL.md",
    expectedName: "adr-manager",
    requiredHeadings: ["Lifecycle & Workflow","Canonical ADR Template","Bidirectional Synchronization","Operational Guardrails"],
    mirrors: "plugins/pcp/skills/adr-manager/SKILL.md",
  },
];
