import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execAsync = promisify(exec);
const scriptPath = path.resolve('pcp/scripts/pcp.js');
const playgroundDir = path.resolve('tests/playground');

async function cleanPlayground() {
  try {
    await fs.rm(playgroundDir, { recursive: true, force: true });
  } catch {}
}

test('PCP Skill Automation Suite', async (t) => {
  // Setup
  await cleanPlayground();
  await fs.mkdir(playgroundDir, { recursive: true });
  await fs.mkdir(path.join(playgroundDir, '.git'), { recursive: true });

  await t.test('1. init scaffolds .pcp with _general.md, areas, and .gitignore', async () => {
    const { stdout } = await execAsync(`node "${scriptPath}" init`, { cwd: playgroundDir });
    assert.match(stdout, /PCP Sandbox successfully initialized/);

    const pcpDir = path.join(playgroundDir, '.pcp');
    const constitutionStat = await fs.stat(path.join(pcpDir, 'CONSTITUTION.md'));
    const draftLogStat = await fs.stat(path.join(pcpDir, 'DRAFT_LOG.md'));
    const generalStat = await fs.stat(path.join(pcpDir, '_general.md'));

    assert.ok(constitutionStat.isFile());
    assert.ok(draftLogStat.isFile());
    assert.ok(generalStat.isFile());

    const gitignoreContent = await fs.readFile(path.join(playgroundDir, '.gitignore'), 'utf-8');
    assert.ok(gitignoreContent.includes('.pcp/MAP.json'));
    assert.ok(gitignoreContent.includes('.pcp/INVENTORY.md'));
    assert.ok(gitignoreContent.includes('.pcp/INVENTORY.json'));
    assert.ok(gitignoreContent.includes('.pcp/INDEX.md'));
  });

  await t.test('1b. init creates AGENTS.md when absent', async () => {
    const agentsPath = path.join(playgroundDir, 'AGENTS.md');
    const content = await fs.readFile(agentsPath, 'utf-8');
    assert.ok(content.includes('Activate the `pcp` skill'));
  });

  await t.test('1c. second init does not overwrite existing AGENTS.md', async () => {
    const agentsPath = path.join(playgroundDir, 'AGENTS.md');
    // Add a custom marker to prove it survives a second init
    await fs.appendFile(agentsPath, '\n<!-- custom marker -->\n', 'utf-8');

    const { stdout } = await execAsync(`node "${scriptPath}" init`, { cwd: playgroundDir });
    assert.ok(stdout.includes('AGENTS.md already exists'));

    const content = await fs.readFile(agentsPath, 'utf-8');
    assert.ok(content.includes('<!-- custom marker -->'), 'AGENTS.md should not be overwritten');
  });

  await t.test('2. mint without --cluster writes to _general.md', async () => {
    const { stdout } = await execAsync(`node "${scriptPath}" mint d`, { cwd: playgroundDir });
    assert.match(stdout, /### \[d-[0-9a-f]{4}\] Title Descriptor/);
    const match = stdout.match(/\[(d-[0-9a-f]{4})\]/);
    const code = match[1];

    const generalContent = await fs.readFile(path.join(playgroundDir, '.pcp', '_general.md'), 'utf-8');
    assert.ok(generalContent.includes(`### [${code}]`));
  });

  await t.test('3. mint with --cluster creates area/sub/_misc.md', async () => {
    const { stdout } = await execAsync(`node "${scriptPath}" mint r --cluster auth`, { cwd: playgroundDir });
    assert.match(stdout, /### \[r-[0-9a-f]{4}\] Title Descriptor/);
    assert.ok(stdout.includes('.pcp/auth/_misc.md'));

    const match = stdout.match(/\[(r-[0-9a-f]{4})\]/);
    const code = match[1];

    const miscPath = path.join(playgroundDir, '.pcp', 'auth', '_misc.md');
    const miscContent = await fs.readFile(miscPath, 'utf-8');
    assert.ok(miscContent.includes(`### [${code}]`));
    assert.ok(miscContent.includes('**Cluster**: auth/_misc'));
  });

  await t.test('4. mint with --cluster --sub creates area/sub.md', async () => {
    const { stdout } = await execAsync(`node "${scriptPath}" mint c --cluster auth --sub sessions`, { cwd: playgroundDir });
    assert.match(stdout, /### \[c-[0-9a-f]{4}\] Title Descriptor/);
    assert.ok(stdout.includes('.pcp/auth/sessions.md'));

    const match = stdout.match(/\[(c-[0-9a-f]{4})\]/);
    const code = match[1];

    const sessionPath = path.join(playgroundDir, '.pcp', 'auth', 'sessions.md');
    const sessionContent = await fs.readFile(sessionPath, 'utf-8');
    assert.ok(sessionContent.includes(`### [${code}]`));
    assert.ok(sessionContent.includes('**Cluster**: auth/sessions'));
  });

  await t.test('5. mint with --cluster --sub creates multiple subs', async () => {
    await execAsync(`node "${scriptPath}" mint r --cluster billing --sub invoices`, { cwd: playgroundDir });
    await execAsync(`node "${scriptPath}" mint r --cluster billing --sub payments`, { cwd: playgroundDir });

    const invoicesPath = path.join(playgroundDir, '.pcp', 'billing', 'invoices.md');
    const paymentsPath = path.join(playgroundDir, '.pcp', 'billing', 'payments.md');

    assert.ok((await fs.readFile(invoicesPath, 'utf-8')).includes('billing/invoices'));
    assert.ok((await fs.readFile(paymentsPath, 'utf-8')).includes('billing/payments'));
  });

  await t.test('6. actualize compiles INDEX.md with area/sub grouping', async () => {
    const srcDir = path.join(playgroundDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Mint a new d entry and populate it (replace placeholder)
    const generalDCode = await execAsync(`node "${scriptPath}" mint d`, { cwd: playgroundDir });
    const dCode = generalDCode.stdout.match(/\[(d-[0-9a-f]{4})\]/)[1];
    const generalPath = path.join(playgroundDir, '.pcp', '_general.md');
    let generalContent = await fs.readFile(generalPath, 'utf-8');
    // Replace only the last (newest) placeholder "Add detailed architectural intent or requirement here."
    const placeholderIdx = generalContent.lastIndexOf('Add detailed architectural intent or requirement here.');
    if (placeholderIdx !== -1) {
      generalContent = generalContent.substring(0, placeholderIdx) + 'Use native ESM across the project.' + generalContent.substring(placeholderIdx + 'Add detailed architectural intent or requirement here.'.length);
      await fs.writeFile(generalPath, generalContent, 'utf-8');
    }

    // Add code trace for the minted d code
    await fs.writeFile(path.join(srcDir, 'index.ts'), `// @pcp:${dCode}\nexport class CoreService {}\n`, 'utf-8');

    // Populate the auth/sessions caveat
    const sessionPath = path.join(playgroundDir, '.pcp', 'auth', 'sessions.md');
    const sessionContent = await fs.readFile(sessionPath, 'utf-8');
    const cMatch = sessionContent.match(/\[(c-[0-9a-f]{4})\]/);
    const cCode = cMatch[1];
    const populatedContent = sessionContent.replace('Add detailed architectural intent or requirement here.', 'Session cookies must use SameSite=Lax to prevent CSRF.');
    await fs.writeFile(sessionPath, populatedContent, 'utf-8');

    await fs.writeFile(path.join(srcDir, 'auth.py'), `# @pcp:${cCode}\nclass AuthHandler: pass\n`, 'utf-8');

    // Run actualize
    const { stdout } = await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
    assert.match(stdout, /PCP validation successful: 0 breaches detected/);

    // Verify INDEX.md
    const indexContent = await fs.readFile(path.join(playgroundDir, '.pcp', 'INDEX.md'), 'utf-8');
    assert.ok(indexContent.includes('PCP Area Index'));
    assert.ok(indexContent.includes('_general'));
    assert.ok(indexContent.includes('| `auth` |'), 'INDEX should have an auth summary row');
    assert.ok(indexContent.includes('sessions'), 'INDEX should list sub-areas in the summary');
    // Lean index: entries are NOT inlined — they are reachable via pcp ls/find/read.
    assert.ok(!indexContent.includes(`@pcp:${dCode}`), 'INDEX must not inline entry codes');
    assert.ok(!indexContent.includes(`@pcp:${cCode}`), 'INDEX must not inline entry codes');

    // Verify MAP.json includes entries from area folders
    const mapContent = JSON.parse(await fs.readFile(path.join(playgroundDir, '.pcp', 'MAP.json'), 'utf-8'));
    assert.ok(mapContent[dCode]);
    assert.ok(mapContent[cCode]);
    assert.ok(mapContent[cCode].title.includes('Title Descriptor') || mapContent[cCode].title.includes('Session'));
  });

  await t.test('7. read returns entry body only', async () => {
    const mapContent = JSON.parse(await fs.readFile(path.join(playgroundDir, '.pcp', 'MAP.json'), 'utf-8'));
    const cCode = Object.keys(mapContent).find(c => c.startsWith('c-'));
    assert.ok(cCode, 'Expected a c- shortcode in MAP');

    const { stdout } = await execAsync(`node "${scriptPath}" read ${cCode}`, { cwd: playgroundDir });
    assert.ok(stdout.includes(cCode));
    assert.ok(stdout.includes('SameSite'));
    assert.ok(!stdout.includes('PCP Area Index')); // should not dump INDEX
  });

  await t.test('8. map returns file path and line number', async () => {
    const mapContent = JSON.parse(await fs.readFile(path.join(playgroundDir, '.pcp', 'MAP.json'), 'utf-8'));
    const dCode = Object.keys(mapContent).find(c => c.startsWith('d-'));
    assert.ok(dCode, 'Expected a d- shortcode in MAP');

    const { stdout } = await execAsync(`node "${scriptPath}" map ${dCode}`, { cwd: playgroundDir });
    assert.match(stdout, /\.pcp\/.*:\d+/);
    // Should be a single line, no content
    assert.equal(stdout.trim().split('\n').length, 1);
  });

  await t.test('9. ls lists sub-areas and counts', async () => {
    const { stdout } = await execAsync(`node "${scriptPath}" ls auth`, { cwd: playgroundDir });
    assert.ok(stdout.includes('Area: auth'));
    assert.ok(stdout.includes('sessions'));
    assert.ok(stdout.includes('_misc'));
    assert.ok(stdout.includes('entries'));
  });

  await t.test('10. find searches by title substring', async () => {
    const { stdout } = await execAsync(`node "${scriptPath}" find Title`, { cwd: playgroundDir });
    assert.ok(stdout.includes('@pcp:'));
    // All entries have "Title Descriptor" so should match at least the ones we minted
    const lines = stdout.trim().split('\n');
    assert.ok(lines.length >= 3, `Expected at least 3 matches, got ${lines.length}`);
  });

  await t.test('11. actualize throws on dead connection (missing doc header)', async () => {
    await fs.writeFile(path.join(playgroundDir, 'src', 'buggy.ts'), `// @pcp:d-9999\nconst val = 1;`, 'utf-8');
    try {
      await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
      assert.fail('Should have thrown a breach exception');
    } catch (err) {
      assert.ok(err.stderr.includes('Dead Connection Breach Exception'));
      assert.ok(err.stderr.includes('@pcp:d-9999'));
    }
    await fs.rm(path.join(playgroundDir, 'src', 'buggy.ts'));
  });

  await t.test('12. mint rejects branch-style cluster names', async () => {
    try {
      await execAsync(`node "${scriptPath}" mint r --cluster feat/auth-signup`, { cwd: playgroundDir });
      assert.fail('Should have rejected branch-style cluster name');
    } catch (err) {
      assert.ok(err.stderr.includes('looks like a git branch name'));
    }
  });

  await t.test('13. mint rejects path traversal in cluster/sub names', async () => {
    try {
      await execAsync(`node "${scriptPath}" mint r --cluster ../escape`, { cwd: playgroundDir });
      assert.fail('Should have rejected path traversal');
    } catch (err) {
      assert.ok(err.stderr.includes('path traversal'));
    }

    try {
      await execAsync(`node "${scriptPath}" mint r --cluster auth --sub ../../../etc`, { cwd: playgroundDir });
      assert.fail('Should have rejected path traversal in sub');
    } catch (err) {
      assert.ok(err.stderr.includes('path traversal'));
    }
  });

  await t.test('14. mint rejects ticket-style cluster names', async () => {
    try {
      await execAsync(`node "${scriptPath}" mint r --cluster PROJ-123`, { cwd: playgroundDir });
      assert.fail('Should have rejected ticket-style cluster name');
    } catch (err) {
      assert.ok(err.stderr.includes('ticket ID'));
    }
  });

  await t.test('15. prune identifies and deletes Zombie blocks', async () => {
    const generalPath = path.join(playgroundDir, '.pcp', '_general.md');
    await fs.appendFile(generalPath, `\n### [d-f00d] Zombie Entry\n- **Description**: Not referenced anywhere.\n`, 'utf-8');

    // dry-run
    const { stdout } = await execAsync(`node "${scriptPath}" prune`, { cwd: playgroundDir });
    assert.match(stdout, /Detected \d+ Zombie Document Blocks/);
    assert.ok(stdout.includes('[d-f00d] "Zombie Entry"'));

    let raw = await fs.readFile(generalPath, 'utf-8');
    assert.ok(raw.includes('[d-f00d]'));

    // write
    const { stdout: writeStdout } = await execAsync(`node "${scriptPath}" prune --write`, { cwd: playgroundDir });
    assert.ok(writeStdout.includes('Pruning zombie blocks'));
    assert.ok(writeStdout.includes('Pruned zombie block(s)'));

    raw = await fs.readFile(generalPath, 'utf-8');
    assert.ok(!raw.includes('[d-f00d]'));

    const archivePath = path.join(playgroundDir, '.pcp', 'ARCHIVE.md');
    const archiveContent = await fs.readFile(archivePath, 'utf-8');
    assert.ok(archiveContent.includes('### [d-f00d]'));
  });

  await t.test('16. area/sub layout is compatible with old clusters/ layout', async () => {
    // Write an old-style clusters file and verify actualize indexes it
    const clustersDir = path.join(playgroundDir, '.pcp', 'clusters');
    await fs.mkdir(clustersDir, { recursive: true });
    await fs.writeFile(path.join(clustersDir, 'legacy.md'), `# Cluster: Legacy\n\n### [r-aaaa] Legacy Entry\n- **Date**: 2026-06-28\n- **Status**: Active\n- **Description**: This is a legacy clusters/ layout entry.\n- **Cluster**: legacy\n`, 'utf-8');

    // Add a code trace for the legacy entry
    await fs.writeFile(path.join(playgroundDir, 'src', 'legacy.ts'), `// @pcp:r-aaaa\nexport function legacy() {}\n`, 'utf-8');

    const { stdout } = await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
    assert.match(stdout, /PCP validation successful: 0 breaches detected/);

    const mapContent = JSON.parse(await fs.readFile(path.join(playgroundDir, '.pcp', 'MAP.json'), 'utf-8'));
    assert.ok(mapContent['r-aaaa']);
    assert.ok(mapContent['r-aaaa'].title.includes('Legacy Entry'));
  });

  await t.test("17. populated-check does not false-positive on 'here'/'there'/'where' substrings", async () => {
    const out = await execAsync(`node "${scriptPath}" mint d`, { cwd: playgroundDir });
    const code = out.stdout.match(/\[(d-[0-9a-f]{4})\]/)[1];

    // Replace the newest placeholder with real prose that embeds "there" and "where"
    // (both reduce to the substring "here" — the old check wrongly flagged these as placeholders).
    const generalPath = path.join(playgroundDir, '.pcp', '_general.md');
    let gen = await fs.readFile(generalPath, 'utf-8');
    const ph = 'Add detailed architectural intent or requirement here.';
    const idx = gen.lastIndexOf(ph);
    assert.notEqual(idx, -1, 'expected a fresh placeholder to replace');
    gen = gen.slice(0, idx) + 'The resolver runs there before the cache layer, where retries merge.' + gen.slice(idx + ph.length);
    await fs.writeFile(generalPath, gen, 'utf-8');

    // Anchor it in code so a non-populated entry would raise a Dead Connection breach.
    await fs.writeFile(path.join(playgroundDir, 'src', 'here.ts'), `// @pcp:${code}\nexport const x = 1;\n`, 'utf-8');

    const { stdout } = await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
    assert.match(stdout, /PCP validation successful: 0 breaches detected/);

    const map = JSON.parse(await fs.readFile(path.join(playgroundDir, '.pcp', 'MAP.json'), 'utf-8'));
    assert.equal(map[code].populated, true, "prose containing 'there'/'where' must count as populated");
  });

  await t.test('18. actualize builds INVENTORY.json + lean summary; lookup queries it', async () => {
    const srcDir = path.join(playgroundDir, 'src');
    // Export forms the old line-regex missed: async function, type alias.
    await fs.writeFile(
      path.join(srcDir, 'util.ts'),
      `export async function fetchUser() {}\nexport type UserId = string;\nexport const CACHE_TTL = 60;\n`,
      'utf-8',
    );

    const { stdout } = await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
    assert.match(stdout, /PCP validation successful: 0 breaches detected/);

    // Full per-symbol index lands in INVENTORY.json.
    const inv = JSON.parse(await fs.readFile(path.join(playgroundDir, '.pcp', 'INVENTORY.json'), 'utf-8'));
    const names = inv.declarations.map((d) => d.name);
    assert.ok(names.includes('fetchUser'), 'async function export must be captured');
    assert.ok(names.includes('UserId'), 'type export must be captured');
    assert.ok(names.includes('CACHE_TTL'));

    // INVENTORY.md is a lean summary — no per-symbol rows, no absolute paths.
    const invMd = await fs.readFile(path.join(playgroundDir, '.pcp', 'INVENTORY.md'), 'utf-8');
    assert.ok(invMd.includes('lookup <name>'), 'summary should point to pcp lookup');
    assert.ok(!invMd.includes('fetchUser'), 'summary must not inline individual symbols');
    assert.ok(!invMd.includes('file://'), 'summary must not embed absolute file:// paths');

    // lookup finds a symbol by substring and prints file:line.
    const hit = await execAsync(`node "${scriptPath}" lookup fetch`, { cwd: playgroundDir });
    assert.ok(hit.stdout.includes('fetchUser'));
    assert.match(hit.stdout, /util\.ts:\d+/);

    // lookup miss is graceful.
    const miss = await execAsync(`node "${scriptPath}" lookup zzzznotreal`, { cwd: playgroundDir });
    assert.ok(miss.stdout.includes('No exports matching'));
  });

  await t.test('19. archived shortcodes are not re-indexed into MAP.json (ARCHIVE.md excluded)', async () => {
    // d-f00d was minted, pruned, and archived in test 15.
    const archive = await fs.readFile(path.join(playgroundDir, '.pcp', 'ARCHIVE.md'), 'utf-8');
    assert.ok(archive.includes('[d-f00d]'), 'precondition: zombie was archived');

    await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
    const map = JSON.parse(await fs.readFile(path.join(playgroundDir, '.pcp', 'MAP.json'), 'utf-8'));
    assert.equal(map['d-f00d'], undefined, 'archived shortcode must not resurrect in MAP.json');

    // and it must not be readable
    try {
      await execAsync(`node "${scriptPath}" read d-f00d`, { cwd: playgroundDir });
      assert.fail('read should fail for an archived/non-indexed code');
    } catch (err) {
      assert.ok(err.stderr.includes('not found'));
    }
  });

  await t.test('20. mint auto-routes sub from git status, including renamed files', async () => {
    const gitDir = path.resolve('tests/playground-git');
    await fs.rm(gitDir, { recursive: true, force: true });
    await fs.mkdir(path.join(gitDir, 'src', 'auth', 'oauth'), { recursive: true });
    const git = (cmd) => execAsync(`git -c user.email=t@t.dev -c user.name=t ${cmd}`, { cwd: gitDir });

    await git('init -q');
    await fs.writeFile(path.join(gitDir, 'src', 'auth', 'oauth', 'handler.ts'), 'export const x = 1;\n', 'utf-8');
    await execAsync(`node "${scriptPath}" init`, { cwd: gitDir });
    await git('add -A');

    // Staged file under auth/oauth → sub 'oauth'.
    const added = await execAsync(`node "${scriptPath}" mint r --cluster auth`, { cwd: gitDir });
    assert.ok(added.stdout.includes('auto-routed sub: oauth'), added.stdout);
    assert.ok(added.stdout.includes('.pcp/auth/oauth.md'));

    // Commit, then rename into another sub → porcelain shows "R old -> new"; route on the new path.
    await git('add -A');
    await git('commit -q -m base');
    await fs.mkdir(path.join(gitDir, 'src', 'auth', 'sessions'), { recursive: true });
    await git('mv src/auth/oauth/handler.ts src/auth/sessions/handler.ts');

    const renamed = await execAsync(`node "${scriptPath}" mint r --cluster auth`, { cwd: gitDir });
    assert.ok(renamed.stdout.includes('auto-routed sub: sessions'), renamed.stdout);

    await fs.rm(gitDir, { recursive: true, force: true });
  });

  await t.test("21. the skill's own docs (example @pcp codes) never breach a consumer project", async () => {
    // Simulate a real install: copy the whole skill dir into a consumer repo and
    // run that copy. SKILL.md carries the illustrative `@pcp:c-e9a2` example, which
    // is NOT defined anywhere — it must not be treated as a live anchor.
    const consumer = path.resolve('tests/playground-consumer');
    await fs.rm(consumer, { recursive: true, force: true });
    await fs.mkdir(path.join(consumer, '.git'), { recursive: true });
    await fs.cp(path.resolve('pcp'), path.join(consumer, 'pcp'), { recursive: true });
    const consumerScript = path.join(consumer, 'pcp', 'scripts', 'pcp.js');

    await execAsync(`node "${consumerScript}" init`, { cwd: consumer });
    const ok = await execAsync(`node "${consumerScript}" actualize`, { cwd: consumer });
    assert.match(ok.stdout, /PCP validation successful: 0 breaches detected/);

    // But a genuine dangling anchor in the consumer's OWN code still breaches —
    // the exclusion is scoped to the skill dir, not a global mute.
    await fs.mkdir(path.join(consumer, 'src'), { recursive: true });
    await fs.writeFile(path.join(consumer, 'src', 'app.ts'), '// @pcp:c-1234\nexport const v = 1;\n', 'utf-8');
    try {
      await execAsync(`node "${consumerScript}" actualize`, { cwd: consumer });
      assert.fail('expected a breach for the consumer dangling anchor');
    } catch (err) {
      assert.ok(err.stderr.includes('Dead Connection Breach Exception'));
      assert.ok(err.stderr.includes('@pcp:c-1234'));
    }

    await fs.rm(consumer, { recursive: true, force: true });
  });

  await t.test("22. a vendored in-tree skill copy never breaches, even when a DIFFERENT copy is run", async () => {
    // Reproduces the real failure: a consumer repo vendors the skill at
    // `.agents/skills/pcp/` (carrying the illustrative `@pcp:c-e9a2` example),
    // but the agent runs a SEPARATE copy of the script (e.g. `~/.claude/skills/pcp`).
    // The running copy is outside the tree, so keying exclusion on its own dir
    // missed the vendored copy and raised a spurious breach. Structural pruning
    // must exclude the vendored copy regardless of which copy is executed.
    const consumer = path.resolve('tests/playground-vendored');
    await fs.rm(consumer, { recursive: true, force: true });
    await fs.mkdir(path.join(consumer, '.git'), { recursive: true });
    await fs.cp(path.resolve('pcp'), path.join(consumer, '.agents', 'skills', 'pcp'), { recursive: true });

    // Run the SOURCE copy (NOT the vendored one) against the consumer.
    await execAsync(`node "${scriptPath}" init`, { cwd: consumer });
    const ok = await execAsync(`node "${scriptPath}" actualize`, { cwd: consumer });
    assert.match(ok.stdout, /PCP validation successful: 0 breaches detected/);

    // The exclusion is structural, not a global mute: a real dangling anchor in
    // the consumer's OWN code must still breach.
    await fs.mkdir(path.join(consumer, 'src'), { recursive: true });
    await fs.writeFile(path.join(consumer, 'src', 'app.ts'), '// @pcp:c-1234\nexport const v = 1;\n', 'utf-8');
    try {
      await execAsync(`node "${scriptPath}" actualize`, { cwd: consumer });
      assert.fail('expected a breach for the consumer dangling anchor');
    } catch (err) {
      assert.ok(err.stderr.includes('Dead Connection Breach Exception'));
      assert.ok(err.stderr.includes('@pcp:c-1234'));
    }

    await fs.rm(consumer, { recursive: true, force: true });
  });

  // Cleanup
  await cleanPlayground();
});
