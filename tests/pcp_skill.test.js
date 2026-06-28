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
  // Setup before tests
  await cleanPlayground();
  await fs.mkdir(playgroundDir, { recursive: true });
  // Create a .git marker so findProjectRoot resolves to the playground
  await fs.mkdir(path.join(playgroundDir, '.git'), { recursive: true });

  await t.test('1. init command scaffolds .pcp sandbox and .gitignore', async () => {
    // Run pcp init
    const { stdout } = await execAsync(`node "${scriptPath}" init`, { cwd: playgroundDir });
    assert.match(stdout, /PCP Sandbox successfully initialized/);

    // Verify directory structure
    const pcpDir = path.join(playgroundDir, '.pcp');
    const constitutionStat = await fs.stat(path.join(pcpDir, 'CONSTITUTION.md'));
    const draftLogStat = await fs.stat(path.join(pcpDir, 'DRAFT_LOG.md'));

    assert.ok(constitutionStat.isFile());
    assert.ok(draftLogStat.isFile());

    // Verify .gitignore content
    const gitignoreContent = await fs.readFile(path.join(playgroundDir, '.gitignore'), 'utf-8');
    assert.ok(gitignoreContent.includes('.pcp/MAP.json'));
    assert.ok(gitignoreContent.includes('.pcp/INVENTORY.md'));
  });

  await t.test('2. mint command generates unique shortcode', async () => {
    // Mint decision (d)
    const { stdout } = await execAsync(`node "${scriptPath}" mint d`, { cwd: playgroundDir });
    assert.match(stdout, /### \[d-[0-9a-f]{4}\] Title Descriptor/);

    const match = stdout.match(/\[(d-[0-9a-f]{4})\]/);
    const mintedCode = match[1];

    // Ensure it is written to DRAFT_LOG.md
    const draftLogContent = await fs.readFile(path.join(playgroundDir, '.pcp', 'DRAFT_LOG.md'), 'utf-8');
    assert.ok(draftLogContent.includes(`### [${mintedCode}]`));

    // Mint requirement (r) and check for uniqueness
    const { stdout: stdout2 } = await execAsync(`node "${scriptPath}" mint r`, { cwd: playgroundDir });
    const match2 = stdout2.match(/\[(r-[0-9a-f]{4})\]/);
    const mintedCode2 = match2[1];
    assert.notEqual(mintedCode, mintedCode2);
  });

  await t.test('3. actualize command maps headers and inventories declarations', async () => {
    const srcDir = path.join(playgroundDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // 1. Setup mock constitution entries
    const constitutionPath = path.join(playgroundDir, '.pcp', 'CONSTITUTION.md');
    const constitutionContent = `# Project Constitution

### [d-a1b2] Use Native ESM
- **Description**: We enforce ES module files usage.

### [c-c3d4] Local Lock Quirks
- **Description**: Standard filesystem lock issues.
`;
    await fs.writeFile(constitutionPath, constitutionContent, 'utf-8');

    // 2. Setup mock source files with signatures and traces
    const tsFile = path.join(srcDir, 'index.ts');
    const tsContent = `// @pcp:d-a1b2
export class CoreService {
  constructor() {}
}

export interface ServiceInterface {
  run(): void;
}

export function startService() {
  return true;
}
`;
    await fs.writeFile(tsFile, tsContent, 'utf-8');

    const pyFile = path.join(srcDir, 'helper.py');
    const pyContent = `# @pcp:c-c3d4
class HelperRunner:
    def __init__(self):
        pass

def run_helper_action():
    return None
`;
    await fs.writeFile(pyFile, pyContent, 'utf-8');

    // 3. Run actualize
    const { stdout } = await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
    assert.match(stdout, /PCP validation successful: 0 breaches detected/);

    // 4. Verify MAP.json content (token-compressed: no raw content stored)
    const mapContent = JSON.parse(await fs.readFile(path.join(playgroundDir, '.pcp', 'MAP.json'), 'utf-8'));
    assert.ok(mapContent['d-a1b2']);
    assert.equal(mapContent['d-a1b2'].title, 'Use Native ESM');
    assert.equal(mapContent['d-a1b2'].populated, true);
    assert.equal(mapContent['d-a1b2'].content, undefined, 'MAP.json must not store raw content');

    assert.ok(mapContent['c-c3d4']);
    assert.equal(mapContent['c-c3d4'].title, 'Local Lock Quirks');
    assert.equal(mapContent['c-c3d4'].populated, true);

    // 5. Verify INVENTORY.md signatures
    const inventoryContent = await fs.readFile(path.join(playgroundDir, '.pcp', 'INVENTORY.md'), 'utf-8');
    assert.ok(inventoryContent.includes('`class` | `CoreService`'));
    assert.ok(inventoryContent.includes('`interface` | `ServiceInterface`'));
    assert.ok(inventoryContent.includes('`function` | `startService`'));
    assert.ok(inventoryContent.includes('`class` | `HelperRunner`'));
    assert.ok(inventoryContent.includes('`def` | `run_helper_action`'));
  });

  await t.test('4. actualize throws exception on dead connection (missing doc header)', async () => {
    const srcDir = path.join(playgroundDir, 'src');
    const buggyFile = path.join(srcDir, 'buggy.ts');
    
    // Add reference @pcp:d-9999 that doesn't exist in constitution
    await fs.writeFile(buggyFile, `// @pcp:d-9999\nconst val = 1;`, 'utf-8');

    try {
      await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
      assert.fail('Should have thrown a breach exception');
    } catch (err) {
      assert.ok(err.stderr.includes('Dead Connection Breach Exception'));
      assert.ok(err.stderr.includes('@pcp:d-9999'));
    }

    // Clean up buggy file
    await fs.rm(buggyFile);
  });

  await t.test('5. actualize throws exception on empty description', async () => {
    // Add an empty placeholder entry to constitution
    const constitutionPath = path.join(playgroundDir, '.pcp', 'CONSTITUTION.md');
    await fs.appendFile(constitutionPath, `\n### [d-e0f0] Empty Entry\n- **Description**: Add description here.\n`, 'utf-8');

    // Reference it in code
    const srcDir = path.join(playgroundDir, 'src');
    const traceFile = path.join(srcDir, 'trace.ts');
    await fs.writeFile(traceFile, `// @pcp:d-e0f0\nexport function test() {}`, 'utf-8');

    try {
      await execAsync(`node "${scriptPath}" actualize`, { cwd: playgroundDir });
      assert.fail('Should have failed validation due to empty description');
    } catch (err) {
      assert.ok(err.stderr.includes('Dead Connection Breach Exception'));
      assert.ok(err.stderr.includes('@pcp:d-e0f0'));
    }

    // Clean up trace file and restore constitution
    await fs.rm(traceFile);
    const content = await fs.readFile(constitutionPath, 'utf-8');
    const restored = content.split('### [d-e0f0]')[0];
    await fs.writeFile(constitutionPath, restored.trim() + '\n', 'utf-8');
  });

  await t.test('6. prune identifies and deletes Zombie blocks', async () => {
    const constitutionPath = path.join(playgroundDir, '.pcp', 'CONSTITUTION.md');
    
    // Add an unused block to constitution
    await fs.appendFile(constitutionPath, `\n### [d-f00d] Zombie Architectural Entry\n- **Description**: This is not referenced anywhere in code.\n`, 'utf-8');

    // Run prune (dry-run)
    const { stdout } = await execAsync(`node "${scriptPath}" prune`, { cwd: playgroundDir });
    assert.match(stdout, /Detected \d+ Zombie Document Blocks/);
    assert.ok(stdout.includes('[d-f00d] "Zombie Architectural Entry"'));

    // Check constitution still has it
    let rawConstitution = await fs.readFile(constitutionPath, 'utf-8');
    assert.ok(rawConstitution.includes('[d-f00d]'));

    // Run prune with --write
    const { stdout: writeStdout } = await execAsync(`node "${scriptPath}" prune --write`, { cwd: playgroundDir });
    assert.ok(writeStdout.includes('Pruning zombie blocks and saving archives'));
    assert.ok(writeStdout.includes('Pruned zombie block(s) from CONSTITUTION.md'));

    // Check constitution no longer has it
    rawConstitution = await fs.readFile(constitutionPath, 'utf-8');
    assert.ok(!rawConstitution.includes('[d-f00d]'));

    // Check ARCHIVE.md was created and contains it
    const archivePath = path.join(playgroundDir, '.pcp', 'ARCHIVE.md');
    const archiveContent = await fs.readFile(archivePath, 'utf-8');
    assert.ok(archiveContent.includes('### [d-f00d]'));
  });

  // Cleanup after all tests
  await cleanPlayground();
});
