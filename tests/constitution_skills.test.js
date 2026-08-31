import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { resolveTool, yqJson, yqRaw } from './lib/tools.mjs';
import { parseDoc, parseFrontmatter, hasHeading } from './lib/markdown-sections.mjs';
import { estimateTokens } from './lib/token-estimate.mjs';
import {
  CONSTITUTION as GOLDEN_CONSTITUTION,
  AUTH_SPEC as GOLDEN_AUTH_SPEC,
  QUERY_CASES,
  GOLDEN_SLICES,
  SKILL_INVENTORY,
  ADR_STATUSES,
  GOLDEN_DECISIONS,
} from './fixtures/expected.mjs';

function parseYaml(filePath) {
  return yqJson('.', filePath);
}

test('Constitution Schema & Taxonomy Validation', async (t) => {
  await t.test('ai-docs/constitution.yaml exists, is readable, and contains root keys', async () => {
    const raw = await fs.readFile('ai-docs/constitution.yaml', 'utf8');
    assert.ok(raw.length > 0, 'ai-docs/constitution.yaml should not be empty');

    const parsed = parseYaml('ai-docs/constitution.yaml');
    assert.ok(parsed.constitution, 'Missing root key: constitution');
    assert.ok(parsed.decisions, 'Missing root key: decisions');
    assert.ok(parsed.caveats, 'Missing root key: caveats');
    assert.ok(parsed.requirements, 'Missing root key: requirements');
    assert.ok(parsed.deferred, 'Missing root key: deferred');
  });

  await t.test('constitution block attributes match schema specifications', async () => {
    const parsed = parseYaml('ai-docs/constitution.yaml');
    const constBlock = parsed.constitution;
    assert.equal(constBlock.project, 'project-constitution-protocol', 'project name must match project-constitution-protocol');
    assert.match(constBlock.version, /^\d+\.\d+\.\d+$/, 'version must match semver format');
    assert.match(constBlock.last_updated, /^\d{4}-\d{2}-\d{2}$/, 'last_updated must match YYYY-MM-DD format');
    assert.equal(constBlock.verification_command, 'npm test', 'verification_command must be npm test');
  });

  await t.test('security.rules array contains valid enforcement entries', async () => {
    const parsed = parseYaml('ai-docs/constitution.yaml');
    const rules = parsed.constitution?.security?.rules;
    assert.ok(Array.isArray(rules) && rules.length > 0, 'security.rules must be a non-empty array');

    for (const rule of rules) {
      assert.match(rule.id, /^sec-/, `security rule id ${rule.id} must start with sec-`);
      assert.ok(typeof rule.domain === 'string' && rule.domain.length > 0, 'domain must be non-empty string');
      assert.ok(typeof rule.rule === 'string' && rule.rule.length > 0, 'rule must be non-empty string');
      assert.equal(rule.enforcement, 'strict', 'enforcement must be strict');
    }
    const ruleIds = rules.map(r => r.id);
    assert.ok(ruleIds.includes('sec-auth-01'), 'Must include sec-auth-01');
    assert.ok(ruleIds.includes('sec-data-01'), 'Must include sec-data-01');
  });

  await t.test('quality.pre_commit_checks array contains qual-gate-01 and qual-hygiene-01', async () => {
    const parsed = parseYaml('ai-docs/constitution.yaml');
    const checks = parsed.constitution?.quality?.pre_commit_checks;
    assert.ok(Array.isArray(checks) && checks.length > 0, 'quality.pre_commit_checks must be a non-empty array');

    for (const check of checks) {
      assert.match(check.id, /^qual-/, `quality check id ${check.id} must start with qual-`);
      assert.ok(typeof check.domain === 'string' && check.domain.length > 0, 'domain must be non-empty string');
      assert.ok(typeof check.rule === 'string' && check.rule.length > 0, 'rule must be non-empty string');
      assert.equal(check.enforcement, 'strict', 'enforcement must be strict');
    }
    const checkIds = checks.map(c => c.id);
    assert.ok(checkIds.includes('qual-gate-01'), 'Must include qual-gate-01');
    assert.ok(checkIds.includes('qual-hygiene-01'), 'Must include qual-hygiene-01');
  });

  await t.test('taxonomy shortcodes conform to required attributes and patterns', async () => {
    const parsed = parseYaml('ai-docs/constitution.yaml');

    // Decisions: id matches ^d-, requires title, status, cluster, date, summary, adr
    assert.ok(Array.isArray(parsed.decisions) && parsed.decisions.length > 0, 'decisions must be a non-empty array');
    for (const d of parsed.decisions) {
      assert.match(d.id, /^d-[0-9a-f]{4}$/, `decision id ${d.id} must match ^d-[0-9a-f]{4}$`);
      assert.ok(typeof d.title === 'string' && d.title.length > 0, `decision ${d.id} requires non-empty title`);
      assert.ok(typeof d.status === 'string' && d.status.length > 0, `decision ${d.id} requires non-empty status`);
      assert.ok(typeof d.cluster === 'string' && d.cluster.length > 0, `decision ${d.id} requires non-empty cluster`);
      assert.match(d.date, /^\d{4}-\d{2}-\d{2}$/, `decision ${d.id} requires valid date`);
      assert.ok(typeof d.summary === 'string' && d.summary.length > 0, `decision ${d.id} requires non-empty summary`);
      assert.ok(typeof d.adr === 'string' && d.adr.length > 0, `decision ${d.id} requires non-empty adr`);
    }

    // Caveats: id matches ^c-, requires title, status, cluster, date, summary
    assert.ok(Array.isArray(parsed.caveats) && parsed.caveats.length > 0, 'caveats must be a non-empty array');
    for (const c of parsed.caveats) {
      assert.match(c.id, /^c-[0-9a-f]{4}$/, `caveat id ${c.id} must match ^c-[0-9a-f]{4}$`);
      assert.ok(typeof c.title === 'string' && c.title.length > 0, `caveat ${c.id} requires non-empty title`);
      assert.ok(typeof c.status === 'string' && c.status.length > 0, `caveat ${c.id} requires non-empty status`);
      assert.ok(typeof c.cluster === 'string' && c.cluster.length > 0, `caveat ${c.id} requires non-empty cluster`);
      assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/, `caveat ${c.id} requires valid date`);
      assert.ok(typeof c.summary === 'string' && c.summary.length > 0, `caveat ${c.id} requires non-empty summary`);
    }

    // Requirements: id matches ^r-, requires id, cluster, title, status, summary
    assert.ok(Array.isArray(parsed.requirements) && parsed.requirements.length > 0, 'requirements must be a non-empty array');
    for (const r of parsed.requirements) {
      assert.match(r.id, /^r-[0-9a-f]{4}$/, `requirement id ${r.id} must match ^r-[0-9a-f]{4}$`);
      assert.ok(typeof r.cluster === 'string' && r.cluster.length > 0, `requirement ${r.id} requires non-empty cluster`);
      assert.ok(typeof r.title === 'string' && r.title.length > 0, `requirement ${r.id} requires non-empty title`);
      assert.ok(typeof r.status === 'string' && r.status.length > 0, `requirement ${r.id} requires non-empty status`);
      assert.ok(typeof r.summary === 'string' && r.summary.length > 0, `requirement ${r.id} requires non-empty summary`);
    }

    // Deferred: id matches ^l-, requires id, title, cluster, status ("deferred"), reason
    assert.ok(Array.isArray(parsed.deferred) && parsed.deferred.length > 0, 'deferred must be a non-empty array');
    for (const l of parsed.deferred) {
      assert.match(l.id, /^l-[0-9a-f]{4}$/, `deferred id ${l.id} must match ^l-[0-9a-f]{4}$`);
      assert.ok(typeof l.title === 'string' && l.title.length > 0, `deferred ${l.id} requires non-empty title`);
      assert.ok(typeof l.cluster === 'string' && l.cluster.length > 0, `deferred ${l.id} requires non-empty cluster`);
      assert.equal(l.status, 'deferred', `deferred ${l.id} status must be deferred`);
      assert.ok(typeof l.reason === 'string' && l.reason.length > 0, `deferred ${l.id} requires non-empty reason`);
    }
  });

  await t.test('ai-docs/specs/auth-spec.yaml conforms to domain specification schema', async () => {
    const raw = await fs.readFile('ai-docs/specs/auth-spec.yaml', 'utf8');
    assert.ok(raw.length > 0, 'ai-docs/specs/auth-spec.yaml should not be empty');

    const parsed = parseYaml('ai-docs/specs/auth-spec.yaml');
    assert.ok(parsed.spec, 'Missing root spec object');
    const spec = parsed.spec;
    assert.equal(spec.name, 'auth-spec');
    assert.match(spec.version, /^\d+\.\d+\.\d+$/);
    assert.equal(spec.domain, 'auth');
    assert.ok(typeof spec.description === 'string' && spec.description.length > 0);

    assert.ok(Array.isArray(spec.endpoints) && spec.endpoints.length > 0);
    for (const ep of spec.endpoints) {
      assert.ok(typeof ep.path === 'string' && ep.path.startsWith('/'));
      assert.ok(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(ep.method));
      assert.equal(typeof ep.auth_required, 'boolean');
      assert.ok(typeof ep.rate_limit === 'string' && ep.rate_limit.length > 0);
      assert.ok(typeof ep.description === 'string' && ep.description.length > 0);
    }

    assert.ok(Array.isArray(spec.security_invariants) && spec.security_invariants.length > 0);
    for (const inv of spec.security_invariants) {
      assert.match(inv.id, /^inv-/);
      assert.ok(typeof inv.rule === 'string' && inv.rule.length > 0);
    }
  });

  await t.test('tool resolution follows the inherited PATH', async () => {
    const originalPath = process.env.PATH;
    const resolved = resolveTool('yq');
    const shadow = fsSync.mkdtempSync(path.join(os.tmpdir(), 'pcp-tool-shadow-'));
    const empty = fsSync.mkdtempSync(path.join(os.tmpdir(), 'pcp-tool-empty-'));
    try {
      fsSync.symlinkSync(resolved, path.join(shadow, 'yq'));
      process.env.PATH = shadow;
      assert.equal(
        resolveTool('yq'),
        path.join(shadow, 'yq'),
        'resolveTool must return the entry found on PATH, not a hardcoded location'
      );

      process.env.PATH = empty;
      assert.throws(
        () => resolveTool('yq'),
        /required tool 'yq' not found on PATH/,
        'resolveTool must fail loudly when PATH holds no yq'
      );
    } finally {
      process.env.PATH = originalPath;
      fsSync.rmSync(shadow, { recursive: true, force: true });
      fsSync.rmSync(empty, { recursive: true, force: true });
    }
  });

  await t.test('estimateTokens scores the declared reference strings', async () => {
    assert.equal(estimateTokens('A'.repeat(900)), 225, 'letter runs cost ceil(len/4)');
    assert.equal(estimateTokens('Zx9!'.repeat(225)), 675, 'mixed classes are charged per maximal run');
    assert.equal(estimateTokens('A'.repeat(800)), 200, 'the reference string that sits exactly on the bound');
  });

  await t.test('estimateTokens is not invariant to whitespace removal', async () => {
    const spaced = 'alpha beta gamma delta epsilon zeta eta theta';
    const dense = spaced.replace(/\s+/g, '');
    assert.notEqual(
      estimateTokens(spaced),
      estimateTokens(dense),
      'an estimator that scores a payload and its whitespace-stripped form alike is a word count'
    );
  });

  await t.test('ai-docs/constitution.yaml matches the declared golden document', async () => {
    assert.deepStrictEqual(
      yqJson('.', 'ai-docs/constitution.yaml'),
      GOLDEN_CONSTITUTION,
      'golden document mismatch: ai-docs/constitution.yaml'
    );
  });

  await t.test('ai-docs/specs/auth-spec.yaml matches the declared golden document', async () => {
    assert.deepStrictEqual(
      yqJson('.', 'ai-docs/specs/auth-spec.yaml'),
      GOLDEN_AUTH_SPEC,
      'golden document mismatch: ai-docs/specs/auth-spec.yaml'
    );
  });
});

test('Query-Driven Retrieval & Token Budget Bounds', async (t) => {
  for (const tc of QUERY_CASES) {
    await t.test(`retrieves ${tc.name}`, async () => {
      const payload = yqRaw(tc.expr, tc.file).trim();
      assert.ok(payload.length > 0, `Query payload must be non-empty for ${tc.name}`);

      // The message literal is load-bearing: an unmessaged deepStrictEqual failure
      // is indistinguishable from any other deep-equality failure in the suite.
      assert.deepStrictEqual(
        yqJson(tc.expr, tc.file),
        GOLDEN_SLICES[tc.name],
        `golden slice mismatch: ${tc.name}`
      );
    });

    await t.test(`bounds the ${tc.name} payload`, async () => {
      const payload = yqRaw(tc.expr, tc.file).trim();

      // Token bound first: assert throws at the first failure, and a character
      // bound checked first would mask every token-budget breach under 1200 chars.
      const estimatedTokens = estimateTokens(payload);
      assert.ok(
        estimatedTokens < 200,
        `token budget: ${estimatedTokens} estimated tokens must be < 200 for ${tc.name}`
      );
      assert.ok(
        payload.length < 1200,
        `Character length (${payload.length}) must be < 1200 for ${tc.name}`
      );
    });
  }
});

test('Modular Skills Discoverability & Frontmatter Conformance', async (t) => {
  function discoverSkillFiles(root) {
    const found = [];
    const walk = (dir) => {
      for (const entry of fsSync.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(child);
        else if (entry.name === 'SKILL.md') found.push(child);
      }
    };
    if (fsSync.existsSync(root)) walk(root);
    return found;
  }

  await t.test('every SKILL.md on disk is declared in the skill inventory', async () => {
    const discovered = [...discoverSkillFiles('plugins'), ...discoverSkillFiles('.agents')].sort();
    const declared = SKILL_INVENTORY.map(s => s.relPath).sort();
    const undeclared = discovered.filter(p => !declared.includes(p));
    const missing = declared.filter(p => !discovered.includes(p));
    assert.deepStrictEqual(
      { undeclared, missing },
      { undeclared: [], missing: [] },
      `skill inventory mismatch: undeclared on disk [${undeclared.join(', ')}], declared but absent [${missing.join(', ')}]`
    );
  });

  for (const skill of SKILL_INVENTORY) {
    // Keyed by path, not name: two files declare `name: steps`.
    await t.test(`validates skill frontmatter and sections: ${skill.relPath}`, async () => {
      const content = await fs.readFile(skill.relPath, 'utf8');
      assert.ok(content.length > 0, `Skill file must not be empty: ${skill.relPath}`);

      const doc = parseDoc(content);
      assert.ok(doc.frontmatter !== null, `Skill ${skill.relPath} must open and close a --- frontmatter block`);

      const fields = parseFrontmatter(doc);
      assert.ok(fields.name !== undefined, `Skill ${skill.relPath} must declare name in frontmatter`);
      assert.equal(fields.name, skill.expectedName, `Skill ${skill.relPath} declares the wrong frontmatter name`);
      assert.ok(fields.description !== undefined, `Skill ${skill.relPath} must declare description in frontmatter`);
      assert.ok(fields.description.length > 0, `Skill ${skill.relPath} description must be non-empty`);

      for (const heading of skill.requiredHeadings) {
        assert.ok(
          hasHeading(doc, heading),
          `required heading: ${heading} — missing, empty, or only present inside a fenced block in ${skill.relPath}`
        );
      }
    });
  }
});

test('Bidirectional ADR Synchronization & Structural Headers', async (t) => {
  const DECISIONS_DIR = 'ai-docs/decisions';
  const STRUCTURAL_HEADINGS = [
    '## Context',
    '## Decision Drivers',
    '## Considered Options',
    '## Decision Outcome',
    '## Consequences',
    '### Positive',
    '### Negative / Caveats',
  ];
  const METADATA_FIELDS = ['Shortcode', 'Status', 'Date', 'Cluster', 'Deciders'];

  // Hand-written walk rather than readdir({recursive:true}) so the suite runs on
  // the Node 18 floor package.json now declares.
  function walkAdrFiles(dir) {
    const found = [];
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) found.push(...walkAdrFiles(child));
      else if (entry.name.endsWith('.md')) found.push(child);
    }
    return found;
  }

  // Every bullet must occur exactly once: content.match() returns the first
  // silently, so a second `- **Status**:` bullet is invisible to it.
  function metadataBullets(relPath) {
    const doc = parseDoc(fsSync.readFileSync(relPath, 'utf8'));
    const bullets = {};
    for (const field of METADATA_FIELDS) {
      const re = new RegExp(`^- \\*\\*${field}\\*\\*:\\s*(.*)$`, 'gm');
      const values = [...doc.fenceStripped.matchAll(re)].map(m => m[1].trim());
      bullets[field] = values;
    }
    return { doc, bullets };
  }

  const stripTicks = (v) => v.replace(/^`|`$/g, '').trim();

  // Parsed on first use inside a leaf, never at suite top level: a yq or YAML
  // failure there aborts registration, so the leaves below vanish from the TAP
  // stream instead of failing.
  let parsed = null;
  const constitution = () => (parsed ??= parseYaml('ai-docs/constitution.yaml'));
  const registeredDecisions = () => constitution().decisions || [];

  await t.test('ADR files and constitution decisions are the same set', async () => {
    const onDisk = walkAdrFiles(DECISIONS_DIR).sort();
    const registered = registeredDecisions().map(d => d.adr).sort();
    const unregistered = onDisk.filter(f => !registered.includes(f));
    const dangling = registered.filter(f => !onDisk.includes(f));
    assert.deepStrictEqual(
      { unregistered, dangling },
      { unregistered: [], dangling: [] },
      `ADR registry mismatch: on disk but unregistered [${unregistered.join(', ')}], registered but absent [${dangling.join(', ')}]`
    );
  });

  await t.test('every ADR shortcode is unique across ai-docs/decisions/', async () => {
    const byShortcode = new Map();
    for (const relPath of walkAdrFiles(DECISIONS_DIR)) {
      const { bullets } = metadataBullets(relPath);
      assert.equal(bullets.Shortcode.length, 1, `ADR ${relPath} must carry exactly one Shortcode bullet`);
      const code = stripTicks(bullets.Shortcode[0]);
      byShortcode.set(code, [...(byShortcode.get(code) ?? []), relPath]);
    }
    for (const [code, paths] of byShortcode) {
      assert.equal(paths.length, 1, `duplicate ADR shortcode ${code} in: ${paths.join(', ')}`);
    }

    const seen = new Map();
    for (const d of registeredDecisions()) seen.set(d.id, [...(seen.get(d.id) ?? []), d.title]);
    for (const [id, titles] of seen) {
      assert.equal(titles.length, 1, `duplicate constitution decision id ${id}: ${titles.join(', ')}`);
    }
  });

  await t.test('ADR structural headings are real headings', async () => {
    for (const relPath of walkAdrFiles(DECISIONS_DIR)) {
      const doc = parseDoc(fsSync.readFileSync(relPath, 'utf8'));
      assert.ok(
        doc.headings.some(h => h.level === 1 && /^ADR-\d{4}:\s+.+/.test(h.text)),
        `ADR ${relPath} must open with a level-1 heading # ADR-XXXX: <Title>`
      );
      for (const heading of STRUCTURAL_HEADINGS) {
        assert.ok(
          hasHeading(doc, heading),
          `required heading: ${heading} — missing, empty, or only present inside a fenced block in ${relPath}`
        );
      }
    }
  });

  await t.test('ADR metadata equals the constitution entry', async () => {
    for (const d of registeredDecisions()) {
      assert.ok(fsSync.existsSync(d.adr), `Referenced ADR file must exist on disk: ${d.adr}`);
      const { doc, bullets } = metadataBullets(d.adr);

      for (const field of METADATA_FIELDS) {
        assert.ok(bullets[field].length > 0, `ADR ${d.adr} must have a ${field} bullet`);
        assert.equal(
          bullets[field].length,
          1,
          `duplicate metadata bullet: ${field} — ${bullets[field].length} occurrences in ${d.adr}`
        );
      }

      const title = doc.headings.find(h => h.level === 1)?.text ?? '';
      const titleMatch = /^ADR-\d{4}:\s+(.+)$/.exec(title);
      assert.ok(titleMatch, `ADR ${d.adr} must open with # ADR-XXXX: <Title>`);
      assert.equal(titleMatch[1].trim(), d.title, `ADR ${d.adr} title must equal the constitution title`);

      assert.equal(stripTicks(bullets.Shortcode[0]), d.id, `ADR ${d.adr} Shortcode must equal the constitution id`);
      assert.equal(bullets.Date[0], d.date, `ADR ${d.adr} Date must equal the constitution date`);
      // ADR-0001 writes `_general` in backticks where the constitution writes it bare.
      assert.equal(stripTicks(bullets.Cluster[0]), d.cluster, `ADR ${d.adr} Cluster must equal the constitution cluster`);
      assert.ok(bullets.Deciders[0].length > 0, `ADR ${d.adr} Deciders must be non-empty`);
    }
  });

  await t.test('status values on both sides are in the declared vocabulary', async () => {
    // Checked against the test-local constant, never sourced from it: an agent
    // following its own skill doc could otherwise move the doc and the artifacts together.
    const skillRaw = fsSync.readFileSync('.agents/skills/adr-manager/SKILL.md', 'utf8');
    const advertised = /^- \*\*Status\*\*:\s*(\w+(?:\s*\|\s*\w+)+)\s*$/m.exec(skillRaw);
    assert.ok(advertised, '.agents/skills/adr-manager/SKILL.md must advertise the Status vocabulary');
    assert.deepStrictEqual(
      advertised[1].split('|').map(v => v.trim().toLowerCase()).sort(),
      [...ADR_STATUSES].sort(),
      'the vocabulary advertised in adr-manager/SKILL.md must equal the declared ADR_STATUSES'
    );

    const inVocab = (v) => ADR_STATUSES.includes(String(v).trim().toLowerCase());

    for (const group of ['decisions', 'caveats', 'requirements']) {
      for (const entry of constitution()[group] || []) {
        assert.ok(inVocab(entry.status), `status not in declared vocabulary: ${entry.id} has status '${entry.status}'`);
      }
    }

    for (const relPath of walkAdrFiles(DECISIONS_DIR)) {
      const { bullets } = metadataBullets(relPath);
      const code = bullets.Shortcode.length === 1 ? stripTicks(bullets.Shortcode[0]) : relPath;
      for (const value of bullets.Status) {
        assert.ok(inVocab(value), `status not in declared vocabulary: ${code} has status '${value}' in ${relPath}`);
      }
    }

    for (const d of registeredDecisions()) {
      const { bullets } = metadataBullets(d.adr);
      assert.equal(
        bullets.Status[0].toLowerCase().trim(),
        String(d.status).toLowerCase().trim(),
        `ADR status (${bullets.Status[0]}) must match constitution.yaml status (${d.status}) for ${d.id}`
      );
    }
  });

  await t.test('registered decisions match the declared golden registry', async () => {
    // Subset: a legitimate new ADR must not require a golden edit, while a silent
    // rewrite of an existing one must.
    for (const [id, golden] of Object.entries(GOLDEN_DECISIONS)) {
      const actual = registeredDecisions().find(d => d.id === id);
      assert.ok(actual, `golden registry mismatch: declared decision ${id} is not in ai-docs/constitution.yaml`);
      assert.deepStrictEqual(
        { adr: actual.adr, status: actual.status, date: actual.date, cluster: actual.cluster, title: actual.title },
        golden,
        `golden registry mismatch: ${id}`
      );
    }
  });
});
