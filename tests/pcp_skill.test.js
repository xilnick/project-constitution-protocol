import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execAsync = promisify(exec);
const scriptPath = path.resolve('skills/pcp/scripts/pcp.js');
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
    assert.ok(gitignoreContent.includes('.pcp/INDEX.md'));
  });

  await t.test('1b. init creates AGENTS.md when absent', async () => {
    const agentsPath = path.join(playgroundDir, 'AGENTS.md');
    const content = await fs.readFile(agentsPath, 'utf-8');
    assert.ok(content.includes('Project Constitution Protocol'));
    assert.ok(content.includes('@pcp:d-xxxx'));
    assert.ok(content.includes('@pcp:c-xxxx'));
    assert.ok(content.includes('@pcp:r-xxxx'));
    assert.ok(content.includes('@pcp:l-xxxx'));
    assert.ok(content.includes('.pcp/INDEX.md'));
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
    assert.ok(indexContent.includes('auth'));
    assert.ok(indexContent.includes(`@pcp:${dCode}`));
    assert.ok(indexContent.includes(`@pcp:${cCode}`));
    assert.ok(indexContent.includes('sessions'));

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

  // Cleanup
  await cleanPlayground();
});
