#!/usr/bin/env node
// The instrument, not a test: it invokes `npm test` and must never run inside it.
// The table below is authored in .plans/phase-1/PLAN.md and frozen there; a
// signature that turns out wrong is escalated, never edited to match the code.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGuard } from './lib/repo-guard.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------ leaf name sets

const CASES = [
  'Security rules slice by domain (auth)',
  'Architectural decision slice (d-8f3a)',
  'Engineering caveat slice (c-e9a2)',
  'Requirement slice (r-b111)',
  'Deferred track slice (l-e404)',
  'Domain spec endpoint slice (/api/v1/auth/login)',
];
const RETRIEVES = CASES.map((c) => `retrieves ${c}`);
const BOUNDS = CASES.map((c) => `bounds the ${c} payload`);

const SKILL_PATHS = [
  'plugins/pcp/skills/constitution-query/SKILL.md',
  'plugins/pcp/skills/code-intelligence/SKILL.md',
  'plugins/pcp/skills/adr-manager/SKILL.md',
  'plugins/pcp/skills/pcp/SKILL.md',
  'plugins/steps/skills/steps/SKILL.md',
  'plugins/steps/harnesses/droid/skills/steps/SKILL.md',
];
const SKILL_LEAVES = SKILL_PATHS.map((p) => `validates skill frontmatter and sections: ${p}`);
const INVENTORY_LEAF = 'every SKILL.md on disk is declared in the skill inventory';
const SUITE3 = [INVENTORY_LEAF, ...SKILL_LEAVES];

const SUITE4 = [
  'ADR files and constitution decisions are the same set',
  'every ADR shortcode is unique across ai-docs/decisions/',
  'ADR structural headings are real headings',
  'ADR metadata equals the constitution entry',
  'status values on both sides are in the declared vocabulary',
  'registered decisions match the declared golden registry',
];
// The one suite-4 leaf that walks ai-docs/decisions/ without consulting the
// constitution, so it survives every mutation that makes the YAML unreadable.
const SUITE4_YQ = SUITE4.filter((n) => n !== 'ADR structural headings are real headings');

// Leaves that read ai-docs/constitution.yaml through yq, and the two that read
// ai-docs/specs/auth-spec.yaml instead — an unreadable constitution spares those.
const CONSTITUTION_LEAVES = [
  'ai-docs/constitution.yaml exists, is readable, and contains root keys',
  'constitution block attributes match schema specifications',
  'security.rules array contains valid enforcement entries',
  'quality.pre_commit_checks array contains qual-gate-01 and qual-hygiene-01',
  'execution block declares the tier ladder and its escalation triggers',
  'taxonomy shortcodes conform to required attributes and patterns',
  'ai-docs/constitution.yaml matches the declared golden document',
];
const AUTH_SPEC_LEAVES = [
  'ai-docs/specs/auth-spec.yaml conforms to domain specification schema',
  'ai-docs/specs/auth-spec.yaml matches the declared golden document',
];
const PATH_PROBE_LEAF = 'tool resolution follows the inherited PATH';
// CASES[5] is the only query case sourced from auth-spec.yaml.
const CONSTITUTION_SLICES = [...RETRIEVES.slice(0, 5), ...BOUNDS.slice(0, 5)];

const PCP_SUITE = 'PCP Skill Automation Suite';

const CONSTITUTION = 'ai-docs/constitution.yaml';
const ADR1 = 'ai-docs/decisions/ADR-0001-unified-esm.md';

// -------------------------------------------------------- the frozen table

const ROGUE_ADR = `# ADR-0002: Rogue Nested Decision

- **Shortcode**: \`d-0002\`
- **Status**: Active
- **Date**: 2026-08-31
- **Cluster**: \`auth\`
- **Deciders**: Nobody

## Context

This ADR sits in a nested directory and is registered in no constitution.

## Decision Drivers

- **Invisibility**: a non-recursive readdir never sees it.

## Considered Options

1. **Register it**: add it to constitution.yaml.
2. **Leave it rogue (Selected)**: exercise the reverse-sync gate.

## Decision Outcome

Remain unregistered so the registry comparison has something to catch.

## Consequences

### Positive
- The reverse-sync assertion becomes falsifiable.

### Negative / Caveats
- None; this file exists only inside a mutation run.
`;

const ROGUE_SKILL = `---
name: rogue
description: An undeclared skill dropped beside the declared ones to exercise the inventory gate.
---

# rogue

## Purpose

Exist on disk while appearing in no declared inventory.
`;

const MUTATIONS = [
  {
    id: 'rule-inverted',
    outcome: 'RED',
    ops: [{
      file: CONSTITUTION,
      kind: 'replace',
      anchor: '        rule: "All external requests must validate JWT signatures with asymmetric key pairs (RS256/ES256) and reject unsigned or HS256 tokens."',
      replacement: '        rule: "All external requests must validate JWT signatures with symmetric key pairs (HS256/HS512) and accept unsigned or RS256 tokens."',
    }],
    signature: 'golden slice mismatch: Security rules slice by domain (auth)',
    mustFail: [RETRIEVES[0], 'ai-docs/constitution.yaml matches the declared golden document'],
    mustPass: [BOUNDS[0], ...SUITE4],
    max: 3,
  },
  {
    id: 'rule-inverted-unqueried',
    outcome: 'RED',
    ops: [{
      file: CONSTITUTION,
      kind: 'replace',
      anchor: '        rule: "Context exploration must use progressive disclosure via tokensave or RTK tools; broad repository-wide grep or full-file dumping is prohibited."',
      replacement: '        rule: "Context exploration must not use progressive disclosure via tokensave or RTK tools; broad repository-wide grep or full-file dumping is required."',
    }],
    signature: 'golden document mismatch: ai-docs/constitution.yaml',
    mustFail: ['ai-docs/constitution.yaml matches the declared golden document'],
    mustPass: [...RETRIEVES],
    max: 2,
  },
  {
    id: 'payload-bloat',
    outcome: 'RED',
    ops: [{
      file: CONSTITUTION,
      kind: 'replace',
      anchor: '    summary: "All JavaScript files in this workspace must use native ES Modules (import/export) and execute directly on Node.js without a separate compiler or bundler stage."',
      replacement: `    summary: "${'Zx9!'.repeat(200)}"`,
    }],
    precondition: payloadBloatPrecondition,
    signature: 'token budget',
    mustFail: [BOUNDS[1]],
    mustPass: [BOUNDS[0], BOUNDS[2], BOUNDS[3], BOUNDS[4], BOUNDS[5]],
    max: 4,
  },
  {
    id: 'adr-status-bogus',
    outcome: 'RED',
    ops: [
      { file: ADR1, kind: 'replace', anchor: '- **Status**: Active\n', replacement: '- **Status**: Bogus\n' },
      {
        file: CONSTITUTION,
        kind: 'replace',
        anchor: '  - id: "d-8f3a"\n    title: "Unified ESM Execution Layer"\n    status: "active"',
        replacement: '  - id: "d-8f3a"\n    title: "Unified ESM Execution Layer"\n    status: "bogus"',
      },
    ],
    signature: 'status not in declared vocabulary: d-8f3a',
    mustFail: ['status values on both sides are in the declared vocabulary'],
    mustPass: ['ADR metadata equals the constitution entry'],
    max: 5,
  },
  {
    id: 'caveat-status-bogus',
    outcome: 'RED',
    ops: [{
      file: CONSTITUTION,
      kind: 'replace',
      anchor: '  - id: "c-e9a2"\n    title: "Zero-Dependency Runtime Constraint"\n    status: "active"',
      replacement: '  - id: "c-e9a2"\n    title: "Zero-Dependency Runtime Constraint"\n    status: "bogus"',
    }],
    signature: 'status not in declared vocabulary: c-e9a2',
    mustFail: ['status values on both sides are in the declared vocabulary'],
    mustPass: ['ADR metadata equals the constitution entry', ...SUITE3],
    max: 4,
  },
  {
    id: 'adr-nested-rogue',
    outcome: 'RED',
    ops: [{ file: 'ai-docs/decisions/auth/ADR-0002-rogue.md', kind: 'create', content: ROGUE_ADR }],
    signature: 'ADR registry mismatch',
    mustFail: ['ADR files and constitution decisions are the same set'],
    mustPass: ['registered decisions match the declared golden registry'],
    max: 2,
  },
  {
    id: 'adr-heading-fenced',
    outcome: 'RED',
    ops: [
      { file: ADR1, kind: 'replace', anchor: '\n## Context\n', replacement: '\n## Contextual\n' },
      {
        file: ADR1,
        kind: 'append',
        text: '\n## Template\n\n```markdown\n## Context\n\nCopy this block when writing a new ADR.\n```\n',
      },
    ],
    signature: 'required heading: ## Context',
    mustFail: ['ADR structural headings are real headings'],
    mustPass: ['ADR files and constitution decisions are the same set', 'ADR metadata equals the constitution entry'],
    max: 2,
  },
  {
    id: 'adr-duplicate-status',
    outcome: 'RED',
    ops: [{
      file: ADR1,
      kind: 'replace',
      anchor: '- **Status**: Active\n',
      replacement: '- **Status**: Active\n- **Status**: Superseded\n',
    }],
    signature: 'duplicate metadata bullet: Status',
    mustFail: ['ADR metadata equals the constitution entry'],
    mustPass: ['status values on both sides are in the declared vocabulary'],
    max: 2,
  },
  {
    id: 'skill-heading-renamed',
    outcome: 'RED',
    ops: [{
      file: 'plugins/pcp/skills/adr-manager/SKILL.md',
      kind: 'replace',
      anchor: '\n## Operational Guardrails\n',
      replacement: '\n## Operational Guardrailz\n',
    }],
    signature: 'required heading: Operational Guardrails',
    mustFail: ['validates skill frontmatter and sections: plugins/pcp/skills/adr-manager/SKILL.md'],
    mustPass: [INVENTORY_LEAF, ...SKILL_LEAVES.filter((n) => !n.endsWith('adr-manager/SKILL.md'))],
    max: 2,
  },
  {
    id: 'skill-unlisted',
    outcome: 'RED',
    ops: [{ file: 'plugins/steps/skills/rogue/SKILL.md', kind: 'create', content: ROGUE_SKILL }],
    signature: 'skill inventory mismatch',
    mustFail: [INVENTORY_LEAF],
    mustPass: [...SKILL_LEAVES],
    max: 2,
  },
  {
    id: 'path-stripped',
    outcome: 'RED',
    ops: [],
    hermeticPath: true,
    signature: "required tool 'yq' not found on PATH",
    // Under a hermetic PATH the failing set is fully enumerable, so it is declared
    // rather than capped: mustFail plus an equal max pins the set exactly.
    mustFail: [...CONSTITUTION_LEAVES, ...AUTH_SPEC_LEAVES, PATH_PROBE_LEAF, ...RETRIEVES, ...BOUNDS, ...SUITE4_YQ],
    mustPass: [...SKILL_LEAVES],
    max: 27,
  },
  {
    id: 'canary-missing-key',
    outcome: 'RED',
    ops: [{ file: CONSTITUTION, kind: 'truncateFrom', anchor: 'deferred:\n  - id: "l-e404"' }],
    signature: 'Missing root key: deferred',
    mustFail: ['ai-docs/constitution.yaml exists, is readable, and contains root keys'],
    mustPass: [...SUITE3],
    max: 8,
  },
  {
    id: 'canary-bad-yaml',
    outcome: 'RED',
    ops: [{ file: CONSTITUTION, kind: 'append', text: '  - - bad\n\tcontinuation: broken\n' }],
    signature: /bad file '[^']*constitution\.yaml': yaml:/,
    // Enumerated for the same reason as path-stripped: an unparseable constitution
    // takes down a closed, nameable set of leaves.
    mustFail: [...CONSTITUTION_LEAVES, ...CONSTITUTION_SLICES, ...SUITE4_YQ],
    mustPass: [...SUITE3],
    max: 22,
  },

    {
    id: 'tier-label-drifts-from-declared',
    outcome: 'RED',
    ops: [
      {
        file: 'plugins/steps/skills/steps/SKILL.md',
        kind: 'replace',
        anchor: '| **Tier 1.5 (Middle)** |',
        replacement: '| **Tier 1.5 (Mid)** |',
      },
      {
        file: 'plugins/steps/harnesses/droid/skills/steps/SKILL.md',
        kind: 'replace',
        anchor: '| **Tier 1.5 (Middle)** |',
        replacement: '| **Tier 1.5 (Mid)** |',
      },
    ],
    signature: 'FAIL E3d — every tier table carries exactly the declared labels',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'tier-label-reworded-in-constitution',
    outcome: 'RED',
    ops: [{
      file: CONSTITUTION,
      kind: 'replace',
      anchor: '        label: "Tier 1.5 (Middle)"',
      replacement: '        label: "Tier 1.5 (Intermediate)"',
    }],
    signature: 'golden document mismatch: ai-docs/constitution.yaml',
    mustFail: ['ai-docs/constitution.yaml matches the declared golden document'],
    mustPass: [...SUITE3],
    max: 1,
  },
  {
    id: 'harness-skill-drifts-from-canonical',
    outcome: 'RED',
    ops: [{
      file: 'plugins/steps/harnesses/droid/skills/steps/SKILL.md',
      kind: 'replace',
      anchor: 'heavy models plan and critique but never touch code.',
      replacement: 'heavy models plan and critique but never write code.',
    }],
    signature: 'harnesses/droid/skills/steps/SKILL.md',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'verifier-escalation-clause-deleted',
    outcome: 'RED',
    ops: [{
      file: 'plugins/steps/agents/step-verifier.md',
      kind: 'replace',
      anchor: 'A FAILED gate is the `gate-failed` trigger, not merely a result.',
      replacement: 'A FAILED gate is a result.',
    }],
    signature: 'FAIL E5 — the ladder has an exit and every trigger is named in the brief that detects it',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'manifest-model-drifts-from-routing',
    outcome: 'RED',
    ops: [{
      file: 'plugins/steps/harnesses/codex/.codex/agents/steps-fixer.toml',
      kind: 'replace',
      anchor: 'model = "gpt-5.6"',
      replacement: 'model = "gpt-5.6-terra"',
    }],
    signature: 'FAIL E7 — each harness manifest and MODEL_ROUTING.md agree with the declared binding',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'routing-table-model-drifts',
    outcome: 'RED',
    ops: [{
      file: 'plugins/steps/MODEL_ROUTING.md',
      kind: 'replace',
      anchor: '| `steps-architect-pro`, `steps-fixer` | `pro` |',
      replacement: '| `steps-architect-pro`, `steps-fixer` | `flash` |',
    }],
    signature: 'FAIL E7 — each harness manifest and MODEL_ROUTING.md agree with the declared binding',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'rendered-manifest-edited-by-hand',
    outcome: 'RED',
    ops: [{
      file: 'plugins/steps/harnesses/codex/.codex/agents/steps-planner.toml',
      kind: 'replace',
      anchor: 'sandbox_mode = "workspace-write"',
      replacement: 'sandbox_mode = "read-only"',
    }],
    signature: 'FAIL E11 — every harness expresses each role\'s declared write class',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'report-role-handed-an-edit-tool',
    outcome: 'RED',
    ops: [{
      file: 'plugins/steps/harnesses/droid/droids/steps-plan-reviewer.md',
      kind: 'replace',
      anchor: 'tools: Read, LS, Grep, Glob, WebSearch, TodoWrite, Execute, Create',
      replacement: 'tools: Read, LS, Grep, Glob, WebSearch, TodoWrite, Execute, Create, Edit',
    }],
    signature: 'FAIL E11 — every harness expresses each role\'s declared write class',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'unsafe-block-gains-an-undeclared-verb',
    outcome: 'RED',
    ops: [{
      file: 'plugins/toolbelt/skills/tokensave/SKILL.md',
      kind: 'replace',
      anchor: 'tokensave sync',
      replacement: 'tokensave wipe',
    }],
    signature: 'FAIL U:ts-repair',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'tier-drops-the-unskippable-stage',
    outcome: 'RED',
    ops: [{
      file: CONSTITUTION,
      kind: 'replace',
      anchor: '        stages: ["plan", "implement", "verify"]',
      replacement: '        stages: ["plan", "implement"]',
    }],
    signature: 'omits the unskippable stage verify',
    mustFail: [
      'execution block declares the tier ladder and its escalation triggers',
      'ai-docs/constitution.yaml matches the declared golden document',
    ],
    mustPass: [...SUITE3],
    max: 2,
  },
  {
    id: 'stage-skill-outgrows-its-budget',
    outcome: 'RED',
    ops: [{
      file: 'plugins/steps/skills/steps-verify/SKILL.md',
      kind: 'append',
      text: `\n## Padding\n\n${'A stage skill that grows into the protocol stops being cheaper than loading it. '.repeat(20)}\n`,
    }],
    signature: 'FAIL E13 — every artifact is inside its declared byte budget',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'two-skills-state-the-same-rule',
    outcome: 'RED',
    ops: [{
      file: 'plugins/toolbelt/skills/search-tools/SKILL.md',
      kind: 'append',
      text: '\n## Waves\n\n**One message, one wave.** Tool calls placed in the same message run concurrently; the same calls\nspread across replies run one after another, each paying a full round trip. So the question to ask\nbefore every reply is not *what do I do next* but *what else can go now* — and independent reads,\nsearches, graph queries and agent dispatches almost always can.\n',
    }],
    signature: 'FAIL E8 — no two skills state the same rule',
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },
  {
    id: 'orchestrator-drops-a-stage',
    outcome: 'RED',
    ops: [{
      file: 'plugins/steps/skills/steps/SKILL.md',
      kind: 'replace',
      anchor: '| Verify | `steps-verify` |',
      replacement: '| Verify | `steps-check` |',
    }],
    signature: "the orchestrator's stage table never names steps-verify",
    mustFail: [],
    mustPass: [...SUITE3],
    max: 0,
  },

  // Negative controls. A suite that pins bytes or hashes goes RED here and fails the phase.
  {
    id: 'benign-constitution-comment',
    outcome: 'SURVIVED',
    ops: [{
      file: CONSTITUTION,
      kind: 'replace',
      anchor: 'constitution:\n',
      replacement: '# A comment carries no parsed content.\nconstitution:\n',
    }],
    signature: null,
    mustFail: [],
    mustPass: [],
    max: 0,
  },
  {
    id: 'benign-adr-prose-reflow',
    outcome: 'SURVIVED',
    ops: [{
      file: ADR1,
      kind: 'replace',
      anchor: 'Historically, Node.js tooling often mixed CommonJS (`require`) and ES Modules (`import`), necessitating Babel/TypeScript transpilation or runtime wrappers.',
      replacement: 'Historically, Node.js tooling often mixed CommonJS (`require`) and ES Modules (`import`),\nnecessitating Babel/TypeScript transpilation or runtime wrappers.',
    }],
    signature: null,
    mustFail: [],
    mustPass: [],
    max: 0,
  },
  {
    id: 'crlf-frontmatter',
    outcome: 'SURVIVED',
    ops: [{ file: 'plugins/pcp/skills/constitution-query/SKILL.md', kind: 'toCRLF' }],
    signature: null,
    mustFail: [],
    mustPass: [],
    max: 0,
  },
];

// --------------------------------------------------------------- mechanics

// The suite reads these as data; a local edit under them would change what a
// mutation means, and residue under them at exit is a failed restore.
const READ_PATHS = [
  'ai-docs/',
  'plugins/pcp/skills/',
  'plugins/steps/',
  'plugins/toolbelt/',
];

function resolveTool(name) {
  const entries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of entries) {
    const candidate = path.join(dir, name);
    try {
      if (!fs.statSync(candidate).isFile()) continue;
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch { /* next entry */ }
  }
  return null;
}

function applyOp(op, content) {
  switch (op.kind) {
    case 'replace': {
      const parts = content.split(op.anchor);
      if (parts.length !== 2) {
        throw new Error(`harness error: anchor occurs ${parts.length - 1} times in ${op.file} (expected exactly 1): ${JSON.stringify(op.anchor.slice(0, 60))}`);
      }
      return parts.join(op.replacement);
    }
    case 'append':
      return content + op.text;
    case 'truncateFrom': {
      const parts = content.split(op.anchor);
      if (parts.length !== 2) {
        throw new Error(`harness error: anchor occurs ${parts.length - 1} times in ${op.file} (expected exactly 1): ${JSON.stringify(op.anchor.slice(0, 60))}`);
      }
      return parts[0];
    }
    case 'toCRLF':
      return content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    default:
      throw new Error(`harness error: unknown op kind ${op.kind}`);
  }
}

function runNpmTest(npmPath, env) {
  try {
    const stdout = execFileSync(npmPath, ['test'], { cwd: REPO, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, output: stdout };
  } catch (e) {
    if (e.status === undefined || e.status === null) throw e;
    return { status: e.status, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

// node:test prints roll-ups unindented and leaves indented; counting `# fail`
// instead would fold the two together. Passing leaves are parsed alongside the
// failing ones because every conclusion this harness draws from a leaf's
// absence — mustPass, SURVIVED, the pcp invariant — is satisfied by a leaf that
// never executed.
function parseTap(output) {
  const leaves = [];
  const passing = [];
  const rollups = [];
  const rollupOks = [];
  const summary = { tests: null, pass: null, fail: null, plan: null };
  let top = null;
  for (const line of output.split('\n')) {
    const topSub = /^# Subtest: (.+)$/.exec(line);
    if (topSub) { top = topSub[1]; continue; }
    const leaf = /^\s+not ok \d+ - (.+)$/.exec(line);
    if (leaf) { leaves.push({ name: leaf[1].trim(), suite: top }); continue; }
    const ok = /^\s+ok \d+ - (.+)$/.exec(line);
    if (ok) { passing.push({ name: ok[1].trim(), suite: top }); continue; }
    const rollup = /^not ok \d+ - (.+)$/.exec(line);
    if (rollup) { rollups.push(rollup[1].trim()); continue; }
    const rollupOk = /^ok \d+ - (.+)$/.exec(line);
    if (rollupOk) { rollupOks.push(rollupOk[1].trim()); continue; }
    const plan = /^1\.\.(\d+)$/.exec(line);
    if (plan) { summary.plan = Number(plan[1]); continue; }
    const counter = /^# (tests|pass|fail) (\d+)$/.exec(line);
    if (counter) summary[counter[1]] = Number(counter[2]);
  }
  const executed = passing.length + leaves.length;
  return { leaves, passing, rollups, rollupOks, summary, executed };
}

// A truncated or unparsed stream would otherwise read as "nothing failed".
function tapIntegrity(tap) {
  const { summary, executed, rollups, rollupOks } = tap;
  const topLevel = rollups.length + rollupOks.length;
  if (summary.tests === null) return 'node:test emitted no `# tests` summary; the TAP stream is incomplete';
  if (summary.plan === null) return 'node:test emitted no top-level `1..N` plan; the TAP stream is incomplete';
  if (summary.plan !== topLevel) return `top-level plan declares ${summary.plan} test(s), ${topLevel} roll-up line(s) parsed`;
  if (summary.tests !== executed + topLevel) {
    return `\`# tests ${summary.tests}\` disagrees with ${executed} leaf and ${topLevel} roll-up line(s) parsed`;
  }
  return null;
}

function payloadBloatPrecondition(ctx) {
  const yq = resolveTool('yq');
  if (!yq) throw new Error('harness error: yq not resolvable for the payload-bloat precondition');
  const wrapped = execFileSync(yq, ['[ .decisions[] | select(.id == "d-8f3a") ]', CONSTITUTION], { cwd: REPO, encoding: 'utf8' }).trim();
  if (wrapped.length !== 980) {
    throw new Error(`harness error: payload-bloat precondition failed — mutated d-8f3a payload is ${wrapped.length} chars, frozen table declares 980`);
  }
  // The frozen table declares two preconditions; the exact check above subsumes
  // this bound, and it is kept so the table's second declaration stays asserted.
  if (wrapped.length >= 1200) {
    throw new Error('harness error: payload-bloat precondition failed — payload reaches the character bound');
  }
  const estPath = path.join(REPO, 'tests/lib/token-estimate.mjs');
  if (!fs.existsSync(estPath)) {
    ctx.notes.push('token precondition deferred: tests/lib/token-estimate.mjs does not exist yet');
    return;
  }
  const est = ctx.estimateTokens(wrapped);
  if (est !== 677) {
    throw new Error(`harness error: payload-bloat precondition failed — estimateTokens is ${est}, frozen table declares 677`);
  }
}

function buildHermeticPath(ctx) {
  const needed = ['node', 'npm', 'sh', 'env', 'git'];
  const resolved = {};
  for (const n of needed) {
    const p = resolveTool(n);
    if (!p) return { blocked: `required binary '${n}' is not resolvable on the ambient PATH` };
    resolved[n] = p;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcp-hermetic-path-'));
  for (const [n, p] of Object.entries(resolved)) fs.symlinkSync(p, path.join(dir, n));
  if (resolveToolIn(dir, 'yq')) {
    fs.rmSync(dir, { recursive: true, force: true });
    return { blocked: 'the hermetic PATH directory unexpectedly resolves yq' };
  }
  ctx.cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir };
}

function resolveToolIn(dir, name) {
  const candidate = path.join(dir, name);
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return candidate;
  } catch { return null; }
}

function setDiff(a, b) {
  const bs = new Set(b);
  return a.filter((x) => !bs.has(x));
}

class BlockedSignal extends Error {}

// ------------------------------------------------------------------ driver

async function main() {
  const args = process.argv.slice(2);
  const only = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--only') { only.push(args[i + 1]); i += 1; }
    else { process.stderr.write(`usage: node tests/mutation-harness.mjs [--only <id>]...\n`); process.exit(2); }
  }
  const unknown = only.filter((id) => !MUTATIONS.some((m) => m.id === id));
  if (unknown.length > 0) {
    process.stderr.write(`unknown mutation id(s): ${unknown.join(', ')}\n`);
    process.exit(2);
  }
  const fullSweep = only.length === 0;
  const selected = fullSweep ? MUTATIONS : MUTATIONS.filter((m) => only.includes(m.id));

  const npmPath = resolveTool('npm');
  if (!npmPath) { process.stderr.write("cannot resolve 'npm' on PATH\n"); process.exit(2); }

  const guard = createGuard({ repoRoot: REPO, readPaths: READ_PATHS });
  const cleanups = [];
  const results = [];
  let exitCode = 0;

  const finish = (code) => {
    for (const fn of cleanups.reverse()) { try { fn(); } catch { /* best effort */ } }
    process.exit(code);
  };

  process.stdout.write(`mutation harness — ${selected.length} mutation(s), ${fullSweep ? 'full sweep' : '--only mode'}\n\n`);

  const cleanBefore = runNpmTest(npmPath, process.env);
  process.stdout.write(`clean tree (before): npm test ${cleanBefore.status === 0 ? 'PASS' : `FAIL (exit ${cleanBefore.status})`}\n`);
  if (cleanBefore.status !== 0) {
    process.stdout.write(cleanBefore.output.split('\n').slice(-25).join('\n') + '\n');
    process.stdout.write('ABORT: the clean tree does not pass; no mutation can be interpreted.\n');
    finish(1);
  }

  const baseline = parseTap(cleanBefore.output);
  const baselineBroken = tapIntegrity(baseline);
  const baselinePcp = baseline.passing.filter((l) => l.suite === PCP_SUITE).map((l) => l.name);
  process.stdout.write(`clean tree baseline:  ${baseline.executed} executed leaves, ${baselinePcp.length} of them in ${PCP_SUITE}\n\n`);
  if (baselineBroken || baseline.executed === 0 || baselinePcp.length === 0) {
    process.stdout.write(`ABORT: no usable denominator from the clean tree — ${baselineBroken ?? 'zero executed leaves'}.\n`);
    finish(1);
  }

  let estimateTokens = null;
  const estPath = path.join(REPO, 'tests/lib/token-estimate.mjs');
  if (fs.existsSync(estPath)) {
    ({ estimateTokens } = await import(estPath));
  }

  for (const m of selected) {
    const notes = [];
    const ctx = { notes, cleanups, estimateTokens };
    const targets = m.ops.map((o) => o.file);
    const label = targets.length > 0 ? targets.join(', ') : '(no file changed)';
    let result = { id: m.id, declared: m.outcome, measured: null, conformant: false, detail: '', notes };
    try {
      for (const op of m.ops) guard.snapshot(op.file);
      guard.writeJournal();
      for (const op of m.ops) {
        if (op.kind === 'create') { guard.create(op.file, op.content); continue; }
        const abs = path.join(REPO, op.file);
        guard.write(op.file, applyOp(op, fs.readFileSync(abs, 'utf8')));
      }
      if (m.precondition) m.precondition(ctx);

      let env = process.env;
      let blocked = null;
      if (m.hermeticPath) {
        const built = buildHermeticPath(ctx);
        if (built.blocked) blocked = built.blocked;
        else env = { ...process.env, PATH: built.dir };
      }

      if (blocked) {
        result.measured = 'BLOCKED';
        result.detail = blocked;
        result.conformant = false;
        result.problems = [`BLOCKED: ${blocked}`];
        throw new BlockedSignal();
      }

      const run = runNpmTest(npmPath, env);
      const tap = parseTap(run.output);
      const { leaves, rollups, passing, executed } = tap;
      const failing = leaves.map((l) => l.name);
      const passed = passing.map((l) => l.name);
      const pcpPassed = passing.filter((l) => l.suite === PCP_SUITE).map((l) => l.name);
      const streamBroken = tapIntegrity(tap);
      const shrank = executed !== baseline.executed;

      if (run.status === 0 && failing.length === 0 && !shrank && !streamBroken) {
        result.measured = 'SURVIVED';
      } else if (run.status === 0) {
        result.measured = 'GREEN (short denominator)';
      } else {
        const sigOk = m.signature === null
          ? false
          : (m.signature instanceof RegExp ? m.signature.test(run.output) : run.output.includes(m.signature));
        result.measured = sigOk ? 'RED (signature matched)' : 'RED (signature MISMATCH)';
        result.sigOk = sigOk;
      }
      result.failing = failing;
      result.rollups = rollups;
      result.executed = executed;

      const problems = [];
      const isRed = result.measured.startsWith('RED');
      if (m.outcome === 'RED' && !isRed) problems.push(`declared RED, measured ${result.measured}`);
      if (m.outcome === 'SURVIVED' && isRed) problems.push(`declared SURVIVED, measured ${result.measured}`);
      if (m.outcome === 'RED' && isRed && !result.sigOk) {
        problems.push(`signature not found in output: ${m.signature}`);
      }
      if (streamBroken) problems.push(`TAP stream not interpretable: ${streamBroken}`);
      if (shrank) problems.push(`${executed} leaves executed, clean-tree baseline is ${baseline.executed}`);
      // Positive membership, not absence from `failing`: a leaf whose suite
      // aborted before registration is absent from both sets.
      const pcpMissing = setDiff(baselinePcp, pcpPassed);
      if (pcpMissing.length > 0) problems.push(`tests/pcp_skill.test.js leaves did not pass: ${pcpMissing.join('; ')}`);
      if (fullSweep) {
        const missing = setDiff(m.mustFail, failing);
        if (missing.length > 0) problems.push(`mustFail leaves did not fail: ${missing.join('; ')}`);
        const broke = setDiff(m.mustPass, passed);
        if (broke.length > 0) problems.push(`mustPass leaves did not pass: ${broke.join('; ')}`);
        if (failing.length > m.max) problems.push(`${failing.length} failing leaves exceeds max ${m.max}`);
      }
      result.conformant = problems.length === 0;
      result.problems = problems;
      if (m.hermeticPath && result.measured === 'BLOCKED') result.conformant = false;
    } catch (e) {
      if (!(e instanceof BlockedSignal)) {
        result.measured = 'HARNESS ERROR';
        result.detail = e.message;
        result.conformant = false;
        result.problems = [e.message];
      }
    } finally {
      try {
        guard.restoreAll();
      } catch (e) {
        process.stdout.write(`\nFATAL: restore failed after ${m.id}: ${e.message}\n`);
        results.push(result);
        report(results, fullSweep);
        finish(1);
      }
    }
    results.push(result);
    const flag = result.conformant ? 'conformant' : 'NON-CONFORMANT';
    process.stdout.write(`${m.id.padEnd(28)} ${result.measured.padEnd(26)} [${flag}]  ${label}\n`);
    if (result.failing) process.stdout.write(`${''.padEnd(28)} ${result.executed} executed, ${result.failing.length} failing${result.failing.length ? ` — ${result.failing.join(' | ')}` : ''}\n`);
    for (const n of notes) process.stdout.write(`${''.padEnd(28)} note: ${n}\n`);
    for (const p of result.problems ?? []) process.stdout.write(`${''.padEnd(28)} problem: ${p}\n`);
    if (result.detail) process.stdout.write(`${''.padEnd(28)} ${result.detail}\n`);
  }

  const cleanAfter = runNpmTest(npmPath, process.env);
  process.stdout.write(`\nclean tree (after):  npm test ${cleanAfter.status === 0 ? 'PASS' : `FAIL (exit ${cleanAfter.status})`}\n`);
  if (cleanAfter.status !== 0) exitCode = 1;

  let porcelain;
  try {
    porcelain = guard.assertPorcelainUnchanged();
    process.stdout.write(`porcelain: no divergence on read paths` +
      `${porcelain.tolerated.length ? `; ${porcelain.tolerated.length} unrelated entr(y|ies) changed` : ''}` +
      `${porcelain.residue.length ? `; residue: ${porcelain.residue.join(', ')}` : ''}\n`);
  } catch (e) {
    process.stdout.write(`${e.message}\n`);
    exitCode = 1;
  }

  if (!report(results, fullSweep)) exitCode = 1;
  process.stdout.write(`\nexit ${exitCode}\n`);
  finish(exitCode);
}

function report(results, fullSweep) {
  const bad = results.filter((r) => !r.conformant);
  process.stdout.write(`\n${results.length - bad.length}/${results.length} mutations conformant (${fullSweep ? 'full sweep' : '--only mode'})\n`);
  if (bad.length > 0) {
    process.stdout.write('NON-CONFORMANT:\n');
    for (const r of bad) {
      process.stdout.write(`  ${r.id}: declared ${r.declared}, measured ${r.measured}${r.problems?.length ? ` — ${r.problems.join('; ')}` : ''}\n`);
    }
  }
  return bad.length === 0;
}

await main();
