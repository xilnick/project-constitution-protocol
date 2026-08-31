// The declared tables the recipe gate grades against, authored before the runner existed.
//
// PROVENANCE RULE, inherited from expected.mjs: every value here is a literal, or a
// property of one imported from expected.mjs. This file must never read, execute or
// query the documents it describes — a table computed from the artifact certifies it
// instead of testing it, which is the failure this whole gate exists to catch.

import { AUTH_SPEC, CONSTITUTION, GOLDEN_DECISIONS } from './expected.mjs';

// Payload anchors: imported rather than restated, so a fixture swap moves both at once.
export const SEC_RULE_ID = CONSTITUTION.constitution.security.rules[0].id;
export const DECISION_ID = CONSTITUTION.decisions[0].id;
export const DECISION_ADR = GOLDEN_DECISIONS['d-8f3a'].adr;
export const CAVEAT_ID = CONSTITUTION.caveats[0].id;
export const REQUIREMENT_ID = CONSTITUTION.requirements[0].id;
export const DEFERRED_ID = CONSTITUTION.deferred[0].id;
export const SPEC_ENDPOINT = AUTH_SPEC.spec.endpoints[0].path;
export const VERIFICATION_COMMAND = CONSTITUTION.constitution.verification_command;
export const PROJECT_VERSION = CONSTITUTION.constitution.version;
export const TIER_0_ESCALATES_TO = CONSTITUTION.constitution.execution.tiers[0].escalates_to;
export const SPEC_SECTION = 'security_invariants';

// ---------------------------------------------------------------------------
// Table 4 — declared constants
// ---------------------------------------------------------------------------

export const DOC_TOOLS = ['yq', 'git', 'sh', 'node'];
export const LIVE_TOOLS = ['tokensave', 'rtk', 'jq', 'ast-grep'];
export const ALLOWED_HEADS = ['yq', 'jq', 'tokensave', 'node', 'ast-grep'];
export const COMMAND_SPAN_CLIS = ['yq', 'jq', 'tokensave', 'rtk', 'npm', 'node'];
export const RTK_VERBS = ['proxy'];
export const RTK_VERBS_FLOOR = ['proxy', 'run', 'git', 'npm', 'grep'];
// The tokensave surface the skills document; a verb used in prose that is not here is undeclared.
export const TOKENSAVE_VERBS = ['tool', 'status', 'install', 'branch', 'sync', 'doctor'];
export const TOKENSAVE_READONLY_TOOLS = [
  'find_exact_symbol', 'entities', 'callers', 'callees', 'impact', 'body', 'status', 'branch_list',
];

export const TOKENSAVE_TOOL_PARAMS = {
  find_exact_symbol: { required: ['name'], optional: ['limit'] },
  entities: { required: ['file'], optional: ['kinds'] },
  callers: { required: ['node_id'], optional: ['max_depth', 'resolve_dispatch'] },
  callees: { required: ['node_id'], optional: ['max_depth', 'resolve_dispatch'] },
  impact: { required: ['node_id'], optional: ['max_depth'] },
  body: { required: ['symbol'], optional: ['limit'] },
  status: { required: [], optional: [] },
  branch_list: { required: [], optional: [] },
};

// Derived from pcp.js source, never from the graph: if the graph disagrees, the graph is wrong.
export const PCP_SYMBOLS = ['ensureDir', 'handleActualize', 'handleInit', 'handleMint', 'main', 'resolveTargetFile'];
export const ENSUREDIR_CALLERS = ['handleActualize', 'handleInit', 'handleMint', 'resolveTargetFile'];
export const ENSUREDIR_IMPACT = ['ensureDir', 'handleActualize', 'handleInit', 'handleMint', 'main', 'resolveTargetFile'];
export const ENSUREDIR_BODY_LINE = 'await fs.mkdir(dirPath, { recursive: true });';

export const DECISION_ENTRY_KEYS = ['id', 'title', 'status', 'cluster', 'date', 'summary', 'adr'];

export const ADR_TEMPLATE_HEADINGS = [
  { level: 1, text: 'ADR-XXXX: <Title>' },
  { level: 2, text: 'Context' },
  { level: 2, text: 'Decision Drivers' },
  { level: 2, text: 'Considered Options' },
  { level: 2, text: 'Decision Outcome' },
  { level: 2, text: 'Consequences' },
  { level: 3, text: 'Positive' },
  { level: 3, text: 'Negative / Caveats' },
];

// Property access, not a second list: a tier renamed in the golden constitution renames it here.
export const COMPLEXITY_TIERS = [
  CONSTITUTION.constitution.execution.tiers[0].label,
  CONSTITUTION.constitution.execution.tiers[1].label,
  CONSTITUTION.constitution.execution.tiers[2].label,
  CONSTITUTION.constitution.execution.tiers[3].label,
];

// The declared ladder, reached by property access so there is one copy of it in the suite.
export const EXECUTION_STAGES = CONSTITUTION.constitution.execution.stages;
export const EXECUTION_TIERS = CONSTITUTION.constitution.execution.tiers;
export const ESCALATION_TRIGGERS = CONSTITUTION.constitution.execution.escalation_triggers;

// Where each escalation trigger must be named. The orchestrator has no brief; the protocol is its brief.
export const ESCALATION_TRIGGER_BRIEFS = {
  'step-verifier': 'plugins/steps/agents/step-verifier.md',
  'steps-implementer': 'plugins/steps/agents/steps-implementer.md',
  orchestrator: 'plugins/steps/skills/steps/SKILL.md',
};

export const HARNESS_BINDINGS = [
  {
    key: 'droid',
    heading: 'Droid (`harnesses/droid/`)',
    manifest: 'plugins/steps/harnesses/droid/droids/%s.md',
    roles: {
      'repo-scout': { model: 'custom:~deepseek/deepseek-v4-flash-latest', effort: 'low' },
      'steps-planner': { model: 'custom:z-ai/glm-5.3-flash-0', effort: 'medium' },
      'steps-reconciler': { model: 'custom:z-ai/glm-5.3-flash-0', effort: 'medium' },
      'steps-plan-reviewer': { model: 'custom:minimax/minimax-m3-0', effort: 'high' },
      'steps-impl-reviewer': { model: 'custom:minimax/minimax-m3-0', effort: 'high' },
      'steps-implementer': { model: 'custom:~deepseek/deepseek-v4-flash-latest', effort: 'medium' },
      'steps-architect-pro': { model: 'custom:qwen/qwen-3.8-max-0', effort: 'high' },
      'step-verifier': { model: 'custom:minimax/minimax-m3-0', effort: 'medium' },
      'steps-fixer': { model: 'custom:deepseek/deepseek-v4-pro-0813-0', effort: 'high' },
    },
  },
  {
    key: 'codex',
    heading: 'Codex CLI (`harnesses/codex/`)',
    manifest: 'plugins/steps/harnesses/codex/.codex/agents/%s.toml',
    roles: {
      'repo-scout': { model: 'gpt-5.6-luna', effort: 'low' },
      'steps-planner': { model: 'gpt-5.6-terra', effort: 'medium' },
      'steps-reconciler': { model: 'gpt-5.6-terra', effort: 'medium' },
      'steps-plan-reviewer': { model: 'gpt-5.6-terra', effort: 'high' },
      'steps-impl-reviewer': { model: 'gpt-5.6-terra', effort: 'high' },
      'steps-implementer': { model: 'gpt-5.6-luna', effort: 'medium' },
      'steps-architect-pro': { model: 'gpt-5.6', effort: 'high' },
      'step-verifier': { model: 'gpt-5.6-terra', effort: 'medium' },
      'steps-fixer': { model: 'gpt-5.6', effort: 'max' },
    },
  },
  {
    key: 'opencode',
    heading: 'OpenCode (`harnesses/opencode/`)',
    manifest: 'plugins/steps/harnesses/opencode/.opencode/agents/%s.md',
    roles: {
      'repo-scout': { model: 'anthropic/claude-haiku-4-20250514', effort: null },
      'steps-planner': { model: 'anthropic/claude-haiku-4-20250514', effort: null },
      'steps-reconciler': { model: 'anthropic/claude-haiku-4-20250514', effort: null },
      'steps-plan-reviewer': { model: 'anthropic/claude-sonnet-4-20250514', effort: null },
      'steps-impl-reviewer': { model: 'anthropic/claude-sonnet-4-20250514', effort: null },
      'steps-implementer': { model: 'openai/gpt-5.1-codex', effort: null },
      'steps-architect-pro': { model: 'anthropic/claude-sonnet-4-20250514', effort: null },
      'step-verifier': { model: 'anthropic/claude-sonnet-4-20250514', effort: null },
      'steps-fixer': { model: 'anthropic/claude-sonnet-4-20250514', effort: null },
    },
  },
  {
    key: 'antigravity',
    heading: 'Antigravity (`harnesses/antigravity/`)',
    manifest: 'plugins/steps/harnesses/antigravity/.agents/agents/%s.md',
    roles: {
      'repo-scout': { model: 'flash', effort: null },
      'steps-planner': { model: 'flash', effort: null },
      'steps-reconciler': { model: 'flash', effort: null },
      'steps-plan-reviewer': { model: 'flash', effort: null },
      'steps-impl-reviewer': { model: 'flash', effort: null },
      'steps-implementer': { model: 'flash', effort: null },
      'steps-architect-pro': { model: 'flash', effort: null },
      'step-verifier': { model: 'flash', effort: null },
      'steps-fixer': { model: 'flash', effort: null },
    },
  },
];

// The docs that must carry the tier labels and nothing else about the ladder.
export const TIER_TABLE_DOCS = [
  { path: 'plugins/steps/skills/steps/SKILL.md', heading: 'Model routing' },
  { path: 'plugins/steps/harnesses/droid/skills/steps/SKILL.md', heading: 'Model routing' },
];

export const LABEL_RESIDUAL_RE = /middle-complexity|\*\*Middle\*\*/;
export const CANONICAL_LABEL_RESIDUAL = 0;
// Counted, not ignored: adding one fails E3c and so does closing them all, so Phase 3 has to decide.
export const HARNESS_LABEL_RESIDUAL = 0;

export const TOKEN_BUDGET = 200;
// The denominators. Without them "every occurrence equals 200" is satisfied by zero occurrences.
export const TOKEN_BUDGET_DOC_SITES = 5;
export const TOKEN_BUDGET_GATE_SITES = 1;

export const SHORTCODE_REGISTRIES = [
  { path: 'ai-docs/constitution.yaml', scope: 'governance', tracked: true },
  { path: '.pcp/MAP.json', scope: 'pcp CLI sandbox', tracked: false },
];

export const LIVE_CHECKS = [
  'A2', 'A3', 'A4', 'A5', 'A6',
  'D:ci-find.1', 'D:ci-entities.1', 'D:ci-callers.u', 'D:ci-callees.u',
  'D:ci-impact.u', 'D:ci-body.1', 'D:ci-status.1',
  'D:cq-security.3', 'D:cq-decision.2', 'D:cq-caveat.2',
  'D:cq-requirement.3', 'D:cq-deferred.2',
  'X2', 'X3', 'X4', 'X5', 'X12',
  'X14', 'X15', 'X16', 'X17', 'X18', 'X20', 'X22',
  'D:ts-branch-list.1', 'D:st-structural.1', 'D:st-slices.3',
];

export const DOC_CHECK_COUNT = 78;
export const FULL_CHECK_COUNT = 110;

// ---------------------------------------------------------------------------
// The five recipe-bearing files
// ---------------------------------------------------------------------------

export const RECIPE_FILES = [
  { key: 'constitution-query', path: 'plugins/pcp/skills/constitution-query/SKILL.md' },
  { key: 'code-intelligence', path: 'plugins/pcp/skills/code-intelligence/SKILL.md' },
  { key: 'adr-manager', path: 'plugins/pcp/skills/adr-manager/SKILL.md' },
  { key: 'tb-tokensave', path: 'plugins/toolbelt/skills/tokensave/SKILL.md' },
  { key: 'tb-search', path: 'plugins/toolbelt/skills/search-tools/SKILL.md' },
  { key: 'AGENTS', path: 'AGENTS.md' },
  { key: 'ai-docs-README', path: 'ai-docs/README.md' },
];

// ---------------------------------------------------------------------------
// Table 1 — runnable recipes, post-repair. fenceIndex is 0-based within the file.
// ---------------------------------------------------------------------------

const CQ_SPEC_KEYS = "yq '.spec | keys' ai-docs/specs/auth-spec.yaml";
const CQ_SPEC_ENDPOINT = "yq '.spec.endpoints[] | select(.path == \"/api/v1/auth/login\")' ai-docs/specs/auth-spec.yaml";

export const RUNNABLE_RECIPES = [
  {
    id: 'ci-find', file: 'code-intelligence', fenceIndex: 0, unit: false,
    commands: [{
      text: 'tokensave tool find_exact_symbol --name ensureDir',
      assert: [
        { jsonEq: ['name', 'ensureDir'] },
        { jsonEq: ['count', 1] },
        { jsonEq: ['matches[0].kind', 'function'] },
        { jsonEq: ['matches[0].file', 'plugins/pcp/skills/pcp/scripts/pcp.js'] },
      ],
    }],
  },
  {
    id: 'ci-entities', file: 'code-intelligence', fenceIndex: 1, unit: false,
    commands: [{
      text: 'tokensave tool entities --file plugins/pcp/skills/pcp/scripts/pcp.js',
      assert: [
        { jsonEq: ['file', 'plugins/pcp/skills/pcp/scripts/pcp.js'] },
        { jsonSuperset: ['symbols[].name', PCP_SYMBOLS] },
      ],
    }],
  },
  {
    id: 'ci-callers', file: 'code-intelligence', fenceIndex: 2, unit: true,
    commands: [{
      text: 'NODE_ID=$(tokensave tool find_exact_symbol --name ensureDir | jq -r ".matches[0].id")\n'
        + 'tokensave tool callers --node-id "$NODE_ID"',
      assert: [
        { jsonMinLen: ['', 4] },
        { jsonSuperset: ['[].name', ENSUREDIR_CALLERS] },
      ],
    }],
  },
  {
    id: 'ci-callees', file: 'code-intelligence', fenceIndex: 3, unit: true,
    commands: [{
      text: 'NODE_ID=$(tokensave tool find_exact_symbol --name handleInit | jq -r ".matches[0].id")\n'
        + 'tokensave tool callees --node-id "$NODE_ID" --max-depth 1',
      assert: [
        { jsonMinLen: ['', 1] },
        { jsonSuperset: ['[].name', ['ensureDir']] },
      ],
    }],
  },
  {
    id: 'ci-impact', file: 'code-intelligence', fenceIndex: 4, unit: true,
    commands: [{
      text: 'NODE_ID=$(tokensave tool find_exact_symbol --name ensureDir | jq -r ".matches[0].id")\n'
        + 'tokensave tool impact --node-id "$NODE_ID"',
      assert: [
        { jsonMin: ['node_count', 5] },
        { jsonSuperset: ['nodes[].name', ENSUREDIR_IMPACT] },
      ],
    }],
  },
  {
    id: 'ci-body', file: 'code-intelligence', fenceIndex: 5, unit: false,
    commands: [{
      text: 'tokensave tool body --symbol ensureDir',
      assert: [
        { jsonEq: ['match_count', 1] },
        { jsonEndsWith: ['matches[0].qualified_name', '::ensureDir'] },
        { jsonContains: ['matches[0].body', ENSUREDIR_BODY_LINE] },
      ],
    }],
  },
  {
    id: 'ci-status', file: 'code-intelligence', fenceIndex: 6, unit: false,
    commands: [{
      text: 'tokensave tool status',
      assert: [
        { jsonKeysSuperset: ['node_count', 'edge_count', 'file_count', 'nodes_by_kind', 'edges_by_kind'] },
        { jsonAllInt: [['node_count', 'edge_count', 'file_count'], '>0'] },
      ],
    }],
  },

  {
    id: 'cq-security', file: 'constitution-query', fenceIndex: 0, unit: false,
    commands: [
      {
        text: "yq '.constitution.security.rules[] | select(.domain == \"auth\")' ai-docs/constitution.yaml",
        assert: [{ contains: SEC_RULE_ID }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq '.constitution.security.rules' ai-docs/constitution.yaml",
        assert: [{ contains: SEC_RULE_ID }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq -o=json ai-docs/constitution.yaml | jq '.constitution.security.rules[] | select(.domain == \"auth\")'",
        assert: [{ contains: SEC_RULE_ID }, { maxTokens: TOKEN_BUDGET }],
      },
    ],
  },
  {
    id: 'cq-decision', file: 'constitution-query', fenceIndex: 1, unit: false,
    commands: [
      {
        text: "yq '.decisions[] | select(.id == \"d-8f3a\")' ai-docs/constitution.yaml",
        assert: [{ contains: DECISION_ID }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq -o=json ai-docs/constitution.yaml | jq '.decisions[] | select(.id == \"d-8f3a\")'",
        assert: [{ contains: DECISION_ID }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq '.decisions[] | select(.id == \"d-8f3a\") | .adr' ai-docs/constitution.yaml",
        assert: [{ contains: DECISION_ADR }, { maxTokens: TOKEN_BUDGET }],
      },
    ],
  },
  {
    id: 'cq-caveat', file: 'constitution-query', fenceIndex: 2, unit: false,
    commands: [
      {
        text: "yq '.caveats[] | select(.id == \"c-e9a2\")' ai-docs/constitution.yaml",
        assert: [{ contains: CAVEAT_ID }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq -o=json ai-docs/constitution.yaml | jq '.caveats[] | select(.id == \"c-e9a2\")'",
        assert: [{ contains: CAVEAT_ID }, { maxTokens: TOKEN_BUDGET }],
      },
    ],
  },
  {
    id: 'cq-requirement', file: 'constitution-query', fenceIndex: 3, unit: false,
    commands: [
      {
        text: "yq '.requirements[] | select(.cluster == \"billing\")' ai-docs/constitution.yaml",
        assert: [{ contains: REQUIREMENT_ID }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq '.requirements[] | select(.id == \"r-b111\")' ai-docs/constitution.yaml",
        assert: [{ contains: REQUIREMENT_ID }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq -o=json ai-docs/constitution.yaml | jq '.requirements[] | select(.id == \"r-b111\")'",
        assert: [{ contains: REQUIREMENT_ID }, { maxTokens: TOKEN_BUDGET }],
      },
    ],
  },
  {
    id: 'cq-deferred', file: 'constitution-query', fenceIndex: 4, unit: false,
    commands: [
      {
        text: "yq '.deferred[] | select(.id == \"l-e404\")' ai-docs/constitution.yaml",
        assert: [{ contains: DEFERRED_ID }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq -o=json ai-docs/constitution.yaml | jq '.deferred[] | select(.id == \"l-e404\")'",
        assert: [{ contains: DEFERRED_ID }, { maxTokens: TOKEN_BUDGET }],
      },
    ],
  },
  {
    id: 'cq-spec', file: 'constitution-query', fenceIndex: 5, unit: false,
    commands: [
      { text: CQ_SPEC_KEYS, assert: [{ contains: SPEC_SECTION }, { maxTokens: TOKEN_BUDGET }] },
      { text: CQ_SPEC_ENDPOINT, assert: [{ contains: SPEC_ENDPOINT }, { maxTokens: TOKEN_BUDGET }] },
    ],
  },

  {
    id: 'cq-execution', file: 'constitution-query', fenceIndex: 6, unit: false,
    commands: [
      {
        text: "yq '.constitution.verification_command' ai-docs/constitution.yaml",
        assert: [{ contains: VERIFICATION_COMMAND }, { maxTokens: TOKEN_BUDGET }],
      },
      {
        text: "yq '.constitution.execution.tiers[] | select(.id == \"tier-0\")' ai-docs/constitution.yaml",
        assert: [{ contains: TIER_0_ESCALATES_TO }, { maxTokens: TOKEN_BUDGET }],
      },
    ],
  },

  {
    id: 'ts-branch-list', file: 'tb-tokensave', fenceIndex: 0, unit: false,
    commands: [{
      text: 'tokensave tool branch_list',
      // The tracked set and its staleness are the two things the skill tells you to read first.
      assert: [{ jsonEq: ['current_branch', 'main'] }],
    }],
  },
  {
    id: 'st-structural', file: 'tb-search', fenceIndex: 0, unit: false,
    commands: [{
      text: "ast-grep run --pattern 'console.log($$$ARGS)' --lang js plugins/",
      assert: [{ contains: 'plugins/' }],
    }],
  },
  {
    id: 'st-slices', file: 'tb-search', fenceIndex: 1, unit: false,
    commands: [
      { text: "yq '. | keys' ai-docs/constitution.yaml", assert: [{ contains: 'constitution' }, { maxTokens: TOKEN_BUDGET }] },
      { text: "yq '.constitution.version' ai-docs/constitution.yaml", assert: [{ contains: PROJECT_VERSION }, { maxTokens: TOKEN_BUDGET }] },
      { text: "jq -r '.plugins[].name' .claude-plugin/marketplace.json", assert: [{ contains: 'toolbelt' }, { maxTokens: TOKEN_BUDGET }] },
    ],
  },

  {
    id: 'adr-verify', file: 'adr-manager', fenceIndex: 2, unit: true,
    commands: [{
      text: [
        "node -e '",
        'const fs = require("fs");',
        'const { execSync } = require("child_process");',
        'const adrs = execSync("yq \\".decisions[].adr\\" ai-docs/constitution.yaml").toString().trim().split("\\n").filter(Boolean);',
        'for (const adr of adrs) {',
        '  if (!fs.existsSync(adr)) {',
        '    console.error("Missing ADR file referenced in constitution.yaml: " + adr);',
        '    process.exit(1);',
        '  }',
        '}',
        'console.log("All " + adrs.length + " ADR links synchronized.");',
        "'",
      ].join('\n'),
      // The GOLDEN_DECISIONS equality alone is two-sided; the >= 1 floor is what kills "All 0 …".
      assert: [
        { regexEq: ['^All (\\d+) ADR links synchronized\\.$', String(Object.keys(GOLDEN_DECISIONS).length)] },
        { regexCaptureMin: ['^All (\\d+) ADR links synchronized\\.$', 1] },
      ],
    }],
  },

];

// ---------------------------------------------------------------------------
// Table 1b — bash blocks that must never execute. Graded by shape: every command's head and verb
// is declared, so a mutating example still cannot drift into something undeclared.
// ---------------------------------------------------------------------------

export const UNSAFE_BLOCKS = [
  {
    id: 'ts-repair', file: 'tb-tokensave', fenceIndex: 1, info: 'bash',
    reason: 'copies and rewrites branch index databases',
    heads: ['tokensave', 'git'], verbs: ['branch', 'sync', 'doctor', 'rev-parse'],
  },
  {
    id: 'ts-install', file: 'tb-tokensave', fenceIndex: 2, info: 'bash',
    reason: "rewrites the user's agent configuration and permissions",
    heads: ['tokensave'], verbs: ['install'],
  },
  {
    id: 'st-proxy', file: 'tb-search', fenceIndex: 2, info: 'bash',
    reason: 'runs the whole suite, which from inside the suite is recursion',
    heads: ['rtk'], verbs: ['proxy'],
  },
];

// ---------------------------------------------------------------------------
// Table 2 — non-runnable blocks, every one with a real validator
// ---------------------------------------------------------------------------

export const STATIC_BLOCKS = [
  { id: 'adr-template', check: 'S7', file: 'adr-manager', fenceIndex: 0, info: 'markdown', headings: ADR_TEMPLATE_HEADINGS },
  { id: 'adr-entry-yaml', check: 'S8', file: 'adr-manager', fenceIndex: 1, info: 'yaml', topKeys: ['decisions'], entryKeys: DECISION_ENTRY_KEYS },
];

// ---------------------------------------------------------------------------
// Table 3 — command code spans, post-repair. Compared per file as a multiset by B2.
// ---------------------------------------------------------------------------

export const COMMAND_SPANS = [
  { check: 'X1', file: 'constitution-query', text: 'yq', kind: 'binary', cli: 'yq' },
  { check: 'X2', file: 'constitution-query', text: 'jq', kind: 'binary', cli: 'jq' },
  { check: 'X3', file: 'code-intelligence', text: 'tokensave tool', kind: 'verb', cli: 'tokensave', verb: 'tool' },
  { check: 'X4', file: 'code-intelligence', text: 'tokensave tool <command> [args]', kind: 'verb-placeholder', cli: 'tokensave', verb: 'tool' },
  { check: 'X5', file: 'code-intelligence', text: 'tokensave: { tool: "<command>" }', kind: 'mcp-form', cli: 'tokensave' },
  { check: 'X6', file: 'AGENTS', text: 'npm test', occurrence: 1, kind: 'npm-script', cli: 'npm', verb: 'test' },
  { check: 'X6b', file: 'AGENTS', text: 'npm test', occurrence: 2, kind: 'npm-script', cli: 'npm', verb: 'test' },
  { check: 'X21', file: 'AGENTS', text: 'npm run render', kind: 'npm-script', cli: 'npm', verb: 'render' },
  { check: 'X22', file: 'AGENTS', text: 'tokensave', kind: 'binary', cli: 'tokensave' },
  { check: 'X14', file: 'tb-tokensave', text: 'tokensave tool status', kind: 'verb-tool', cli: 'tokensave', verb: 'tool', tool: 'status' },
  { check: 'X15', file: 'tb-tokensave', text: 'tokensave status', kind: 'verb', cli: 'tokensave', verb: 'status' },
  { check: 'X16', file: 'tb-tokensave', text: 'tokensave install', kind: 'verb', cli: 'tokensave', verb: 'install' },
  { check: 'X17', file: 'tb-search', text: 'tokensave', occurrence: 1, kind: 'binary', cli: 'tokensave' },
  { check: 'X18', file: 'tb-search', text: 'tokensave', occurrence: 2, kind: 'binary', cli: 'tokensave' },
  { check: 'X19', file: 'tb-search', text: 'yq', kind: 'binary', cli: 'yq' },
  { check: 'X20', file: 'tb-search', text: 'jq', kind: 'binary', cli: 'jq' },
  { check: 'X11', file: 'ai-docs-README', text: 'yq', kind: 'binary', cli: 'yq' },
  { check: 'X12', file: 'ai-docs-README', text: 'jq', kind: 'binary', cli: 'jq' },
  { check: 'X13', file: 'ai-docs-README', text: 'npm test', kind: 'npm-script', cli: 'npm', verb: 'test' },
];

// ---------------------------------------------------------------------------
// Table 5 — the extractor self-test corpus. B3 runs the extractor over this and
// compares against SELFTEST_EXPECTED; a predicate defined as "membership in
// COMMAND_SPANS" returns nothing here and fails.
// ---------------------------------------------------------------------------

export const SELFTEST_DOC = [
  '---',
  'name: selftest',
  '---',
  '',
  '# Selftest',
  '',
  'Prose naming `rtk raw <cmd>` and `docker compose up` and `pcp mint`.',
  '',
  '```bash',
  '# a comment',
  'yq \'.a\' f.yaml',
  'jq -r .b',
  '```',
  '',
  'More prose with `tokensave_<command>` and `not a command`.',
  '',
  '```json',
  '{"tool": "body", "arguments": {"symbol": "x"}}',
  '```',
  '',
  '```',
  'a bare fence with a `span inside` it',
  '```',
  '',
  '~~~yaml',
  'decisions:',
  '  - id: "d-xxxx"',
  '~~~',
  '',
  'A CRLF section mentioning `npm test`.\r',
  'Second CRLF line.\r',
  '',
].join('\n');

export const SELFTEST_EXPECTED = {
  fences: [
    { index: 0, info: 'bash', body: "# a comment\nyq '.a' f.yaml\njq -r .b" },
    { index: 1, info: 'json', body: '{"tool": "body", "arguments": {"symbol": "x"}}' },
    { index: 2, info: '', body: 'a bare fence with a `span inside` it' },
    { index: 3, info: 'yaml', body: 'decisions:\n  - id: "d-xxxx"' },
  ],
  commandSpans: ['rtk raw <cmd>', 'npm test'],
};
