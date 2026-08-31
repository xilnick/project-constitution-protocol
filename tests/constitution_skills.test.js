import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const ENV_PATH = { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin' };

function parseYaml(filePath) {
  const jsonStr = execSync(`yq -o=json "${filePath}"`, {
    encoding: 'utf8',
    env: ENV_PATH,
  });
  return JSON.parse(jsonStr);
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
});

test('Query-Driven Retrieval & Token Budget Bounds', async (t) => {
  const queryCases = [
    {
      name: 'Security rules slice by domain (auth)',
      cmd: "yq '.constitution.security.rules[] | select(.domain == \"auth\")' ai-docs/constitution.yaml",
      expectedSnippet: 'sec-auth-01',
    },
    {
      name: 'Architectural decision slice (d-8f3a)',
      cmd: "yq '.decisions[] | select(.id == \"d-8f3a\")' ai-docs/constitution.yaml",
      expectedSnippet: 'd-8f3a',
    },
    {
      name: 'Engineering caveat slice (c-e9a2)',
      cmd: "yq '.caveats[] | select(.id == \"c-e9a2\")' ai-docs/constitution.yaml",
      expectedSnippet: 'c-e9a2',
    },
    {
      name: 'Requirement slice (r-b111)',
      cmd: "yq '.requirements[] | select(.id == \"r-b111\")' ai-docs/constitution.yaml",
      expectedSnippet: 'r-b111',
    },
    {
      name: 'Deferred track slice (l-e404)',
      cmd: "yq '.deferred[] | select(.id == \"l-e404\")' ai-docs/constitution.yaml",
      expectedSnippet: 'l-e404',
    },
    {
      name: 'Domain spec endpoint slice (/api/v1/auth/login)',
      cmd: "yq '.spec.endpoints[] | select(.path == \"/api/v1/auth/login\")' ai-docs/specs/auth-spec.yaml",
      expectedSnippet: '/api/v1/auth/login',
    },
  ];

  for (const tc of queryCases) {
    await t.test(`executes ${tc.name} and bounds tokens`, async () => {
      const payload = execSync(tc.cmd, {
        encoding: 'utf8',
        env: ENV_PATH,
      }).trim();

      assert.ok(payload.length > 0, `Query payload must be non-empty for ${tc.name}`);
      assert.ok(payload.includes(tc.expectedSnippet), `Query output must contain ${tc.expectedSnippet}`);

      const words = payload.trim().split(/\s+/).filter(Boolean).length;
      const estimatedTokens = Math.round(words * 1.3);
      assert.ok(
        estimatedTokens < 300,
        `Token count (${estimatedTokens}) must be < 300 for ${tc.name}`
      );
      assert.ok(
        payload.length < 1200,
        `Character length (${payload.length}) must be < 1200 for ${tc.name}`
      );
    });
  }
});

test('Modular Skills Discoverability & Frontmatter Conformance', async (t) => {
  const skillDefinitions = [
    {
      relPath: '.agents/skills/constitution-query/SKILL.md',
      expectedName: 'constitution-query',
      requiredSections: ['Progressive Disclosure', 'Shortcode Taxonomy', 'Query Recipes'],
    },
    {
      relPath: '.agents/skills/code-intelligence/SKILL.md',
      expectedName: 'code-intelligence',
      requiredSections: ['Progressive Disclosure', 'Navigation', 'tokensave'],
    },
    {
      relPath: '.agents/skills/adr-manager/SKILL.md',
      expectedName: 'adr-manager',
      requiredSections: ['Lifecycle & Workflow', 'Canonical ADR Template', 'Bidirectional Synchronization'],
    },
    {
      relPath: 'plugins/pcp/skills/pcp/SKILL.md',
      expectedName: 'pcp',
      requiredSections: ['INVOCATION CONTRACT', 'CLI', '.pcp'],
    },
    {
      relPath: 'plugins/steps/skills/steps/SKILL.md',
      expectedName: 'steps',
      requiredSections: ['Roles', 'The phase loop', 'Separation of duties'],
    },
  ];

  for (const skill of skillDefinitions) {
    await t.test(`validates skill frontmatter and sections: ${skill.expectedName}`, async () => {
      const content = await fs.readFile(skill.relPath, 'utf8');
      assert.ok(content.length > 0, `Skill file must not be empty: ${skill.relPath}`);

      // Delimiters
      assert.ok(content.startsWith('---\n'), `Skill ${skill.relPath} must begin with frontmatter --- delimiter`);
      const closingIndex = content.indexOf('\n---\n', 3);
      assert.ok(closingIndex > 3, `Skill ${skill.relPath} must have closing frontmatter delimiter`);

      const frontmatterRaw = content.slice(4, closingIndex);
      const nameMatch = frontmatterRaw.match(/^name:\s*(.+)$/m);
      const descMatch = frontmatterRaw.match(/^description:\s*(.+)$/m);

      assert.ok(nameMatch, `Skill ${skill.relPath} must declare name in frontmatter`);
      assert.equal(nameMatch[1].trim().replace(/['"]/g, ''), skill.expectedName);

      assert.ok(descMatch, `Skill ${skill.relPath} must declare description in frontmatter`);
      assert.ok(descMatch[1].trim().length > 0, 'Skill description must be non-empty');

      for (const section of skill.requiredSections) {
        assert.ok(
          content.toLowerCase().includes(section.toLowerCase()),
          `Skill ${skill.relPath} must contain required section/concept '${section}'`
        );
      }
    });
  }
});

test('Bidirectional ADR Synchronization & Structural Headers', async (t) => {
  const constitutionParsed = parseYaml('ai-docs/constitution.yaml');
  const decisions = constitutionParsed.decisions || [];

  await t.test('Forward sync: constitution.yaml decisions point to existing ADR files with valid structure', async () => {
    for (const d of decisions) {
      assert.ok(d.adr, `Decision ${d.id} must have adr field`);
      const exists = fsSync.existsSync(d.adr);
      assert.ok(exists, `Referenced ADR file must exist on disk: ${d.adr}`);

      const content = await fs.readFile(d.adr, 'utf8');

      // Level 1 heading
      assert.match(content, /^# ADR-\d{4}:\s+.+/m, `ADR ${d.adr} must have level 1 heading # ADR-XXXX: <Title>`);

      // Metadata bullets
      assert.match(content, /- \*\*Shortcode\*\*:\s*`([^`]+)`/, `ADR ${d.adr} must have Shortcode bullet`);
      const shortcodeMatch = content.match(/- \*\*Shortcode\*\*:\s*`([^`]+)`/);
      assert.equal(shortcodeMatch[1], d.id, `ADR Shortcode ${shortcodeMatch[1]} must match constitution id ${d.id}`);

      assert.match(content, /- \*\*Status\*\*:\s*(.+)/, `ADR ${d.adr} must have Status bullet`);
      assert.match(content, /- \*\*Date\*\*:\s*(\d{4}-\d{2}-\d{2})/, `ADR ${d.adr} must have Date bullet`);
      assert.match(content, /- \*\*Cluster\*\*:\s*(.+)/, `ADR ${d.adr} must have Cluster bullet`);
      assert.match(content, /- \*\*Deciders\*\*:\s*(.+)/, `ADR ${d.adr} must have Deciders bullet`);

      // Structural H2 sections
      assert.match(content, /## Context/, `ADR ${d.adr} must contain "## Context"`);
      assert.match(content, /## Decision Drivers/, `ADR ${d.adr} must contain "## Decision Drivers"`);
      assert.match(content, /## Considered Options/, `ADR ${d.adr} must contain "## Considered Options"`);
      assert.match(content, /## Decision Outcome/, `ADR ${d.adr} must contain "## Decision Outcome"`);
      assert.match(content, /## Consequences/, `ADR ${d.adr} must contain "## Consequences"`);
      assert.match(content, /### Positive/, `ADR ${d.adr} must contain "### Positive"`);
      assert.match(content, /### Negative \/ Caveats/, `ADR ${d.adr} must contain "### Negative / Caveats"`);
    }
  });

  await t.test('Reverse sync: every ADR file in ai-docs/decisions/ is registered in constitution.yaml', async () => {
    const decisionsDir = 'ai-docs/decisions';
    const files = (await fs.readdir(decisionsDir)).filter(f => f.endsWith('.md'));
    assert.ok(files.length > 0, 'ai-docs/decisions must contain at least one ADR markdown file');

    for (const file of files) {
      const fullPath = path.join(decisionsDir, file);
      const content = await fs.readFile(fullPath, 'utf8');

      const shortcodeMatch = content.match(/- \*\*Shortcode\*\*:\s*`([^`]+)`/);
      assert.ok(shortcodeMatch, `ADR ${file} must have Shortcode bullet`);
      const adrShortcode = shortcodeMatch[1];

      const statusMatch = content.match(/- \*\*Status\*\*:\s*(.+)/);
      assert.ok(statusMatch, `ADR ${file} must have Status bullet`);
      const adrStatus = statusMatch[1].trim();

      const registered = decisions.find(d => d.id === adrShortcode);
      assert.ok(registered, `ADR file ${file} with shortcode ${adrShortcode} must be registered in constitution.yaml`);
      assert.equal(registered.adr, fullPath, `constitution.yaml adr path for ${adrShortcode} must match ${fullPath}`);
      assert.equal(
        adrStatus.toLowerCase().trim(),
        registered.status.toLowerCase().trim(),
        `ADR status (${adrStatus}) must match constitution.yaml status (${registered.status})`
      );
    }
  });
});
