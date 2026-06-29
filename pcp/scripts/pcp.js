#!/usr/bin/env node

/**
 * Project Constitution Protocol (PCP) Automation Engine
 * Universal, Zero-Dependency, ESM Node.js Script
 *
 * Phase 2: Semantic area/sub layout, programmatic lookup, size-budget warnings.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const ACCEPTED_TYPES = ['d', 'c', 'r', 'l'];
const SIZE_WARN_THRESHOLD = 4096; // 4 KB soft ceiling per cluster file
const ENTRY_SIZE_ESTIMATE = 300; // bytes per typical minted entry

// Generated/transient .md files that must never be parsed as a source of
// shortcode definitions (otherwise pruned/archived codes resurrect into MAP.json).
const TRANSIENT_MD = new Set(['ARCHIVE.md', 'INDEX.md', 'INVENTORY.md']);

// Directory scan exclusions for every source walk (inventory, trace validation,
// zombie/collision scans). Build artifacts AND test dirs are skipped: @pcp anchors
// belong above implementation code, never in tests, and excluding tests keeps test
// fixtures that fabricate `@pcp:` strings from registering as real traces.
const SCAN_EXCLUDE_DIRS = ['.git', 'node_modules', 'dist', 'build', 'tests', 'test', '__tests__'];

// ── Area / Sub Name Validation ─────────────────────────────────────────────

const NAME_MAX_LEN = 32;
const BRANCH_PREFIX_RE = /^(feat|fix|chore|hotfix|release)\//i;
const TICKET_ID_RE = /^[A-Z]+-\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_KEBAB_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function validateAreaName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error(`Invalid name: empty or missing`);
  }
  if (name.length > NAME_MAX_LEN) {
    throw new Error(`Name "${name}" exceeds ${NAME_MAX_LEN} characters`);
  }
  if (BRANCH_PREFIX_RE.test(name)) {
    throw new Error(`Name "${name}" looks like a git branch name. Use a stable codebase area name instead.`);
  }
  if (TICKET_ID_RE.test(name)) {
    throw new Error(`Name "${name}" looks like a ticket ID. Use a stable codebase area name instead.`);
  }
  if (DATE_RE.test(name)) {
    throw new Error(`Name "${name}" looks like a date. Use a stable codebase area name instead.`);
  }
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error(`Name "${name}" contains path traversal characters`);
  }
  if (!SAFE_KEBAB_RE.test(name)) {
    throw new Error(`Name "${name}" must be lowercase-kebab (a-z, 0-9, hyphens, no leading/trailing hyphen)`);
  }
  return name.toLowerCase();
}

// ── CLI Entrypoint ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printUsage();
    process.exit(0);
  }

  try {
    const root = await findProjectRoot();
    const lockPath = path.join(root, '.pcp.lock');
    await acquireLock(lockPath);
    try {
      switch (command) {
        case 'init':
          await handleInit(root);
          break;
        case 'mint': {
          const clusterIdx = args.indexOf('--cluster');
          let cluster = null;
          if (clusterIdx !== -1) cluster = validateAreaName(args[clusterIdx + 1]);
          const subIdx = args.indexOf('--sub');
          let sub = null;
          if (subIdx !== -1) sub = validateAreaName(args[subIdx + 1]);
          await handleMint(root, args[1], cluster, sub);
          break;
        }
        case 'actualize':
          await handleActualize(root);
          break;
        case 'prune': {
          const isWrite = args.includes('--write');
          await handlePrune(root, isWrite);
          break;
        }
        case 'read':
          await handleRead(root, args[1]);
          break;
        case 'ls':
          await handleLs(root, args[1]);
          break;
        case 'map':
          await handleMap(root, args[1]);
          break;
        case 'find':
          await handleFind(root, args.slice(1).join(' '));
          break;
        case 'lookup':
          await handleLookup(root, args[1]);
          break;
        default:
          console.error(`Error: Unknown command "${command}"`);
          printUsage();
          process.exit(1);
      }
    } finally {
      await releaseLock(lockPath);
    }
  } catch (error) {
    if (error.name === 'DeadConnectionBreachException') {
      console.error(`\n[Dead Connection Breach Exception] ${error.message}\n`);
      process.exit(1);
    }
    console.error(`Unexpected Error:`, error);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
Project Constitution Protocol (PCP) Engine CLI
Usage:
  node pcp.js init                                          Scaffold the isolation sandbox (.pcp/)
  node pcp.js mint <type> [--cluster <area>] [--sub <sub>]  Allocate a new cryptographically unique shortcode
  node pcp.js actualize                                     Compile maps, area index, and validate traces
  node pcp.js prune [--write]                               Scan for and remove Zombie Document Blocks
  node pcp.js read <shortcode>                              Print the entry body for a shortcode
  node pcp.js ls <area>                                     List sub-areas and entry counts for an area
  node pcp.js map <shortcode>                               Print file path and line number for a shortcode
  node pcp.js find <query>                                  Search entry titles for a substring
  node pcp.js lookup <name>                                 Search code exports by name (reads INVENTORY.json)

Layout:
  .pcp/_general.md          Default area (entries without a cluster)
  .pcp/<area>/<sub>.md      Named area with sub-modules (e.g. auth/oauth.md)
  .pcp/<area>/_misc.md      Catch-all sub when --sub is omitted and auto-route finds no match

Naming rules:
  - Lowercase-kebab only (a-z, 0-9, hyphens)
  - Max 32 characters per segment
  - Must be a stable codebase area name (e.g. auth, billing, infra)
  - Never use git branch names, ticket IDs, or dates
  `);
}

// ── Utilities ──────────────────────────────────────────────────────────────

/**
 * Resolve the canonical absolute path of the running pcp.js script.
 * Follows symlinks so it works for npx skills add installs.
 */
function findOwnScriptPath() {
  try {
    const real = fs.realpathSync?.(process.argv[1]) || process.argv[1];
    return path.resolve(real);
  } catch {
    return path.resolve(process.argv[1]);
  }
}

/**
 * Absolute path of the installed skill's own root (the dir holding scripts/,
 * SKILL.md, procedures/). The protocol docs carry illustrative `@pcp:` example
 * codes (e.g. `@pcp:c-e9a2`); these must never be scanned as live anchors in the
 * host project, or every consumer would get a spurious Dead Connection breach.
 */
function skillRootDir() {
  return path.dirname(path.dirname(findOwnScriptPath()));
}

/**
 * True when a scanned file belongs to the running script's own skill dir.
 * Secondary guard only: `scanFiles` already prunes every in-tree skill copy
 * structurally via `isSkillRootDir`. This still covers the running copy when it
 * lives outside the scanned project tree (e.g. `~/.claude/skills/pcp`).
 */
function isProtocolOwnFile(file, skillRoot) {
  return file === skillRoot || file.startsWith(skillRoot + path.sep);
}

async function findProjectRoot(startDir = process.cwd()) {
  let current = startDir;
  while (true) {
    try {
      const stat = await fs.stat(path.join(current, '.git'));
      if (stat.isDirectory()) return current;
    } catch {}
    try {
      await fs.stat(path.join(current, 'AGENTS.md'));
      return current;
    } catch {}
    const parent = path.dirname(current);
    if (parent === current) return process.cwd();
    current = parent;
  }
}

async function ensureDir(dirPath) {
  try { await fs.mkdir(dirPath, { recursive: true }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
}

async function acquireLock(lockPath, timeoutMs = 10000, staleMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { await fs.mkdir(lockPath); return; } catch (e) {
      if (e.code === 'EEXIST') {
        // Reclaim a lock left behind by a crashed process.
        try {
          const st = await fs.stat(lockPath);
          if (Date.now() - st.mtimeMs > staleMs) {
            await fs.rmdir(lockPath).catch(() => {});
            continue;
          }
        } catch { /* lock vanished between mkdir and stat — retry immediately */ }
        await new Promise(r => setTimeout(r, 100));
      } else { throw e; }
    }
  }
  throw new Error(`Timeout waiting for PCP lock at ${lockPath}`);
}

async function releaseLock(lockPath) {
  try { await fs.rmdir(lockPath); } catch {}
}

// ── Layout Helpers ─────────────────────────────────────────────────────────

/**
 * Resolve the target .md file for a new entry.
 *   _general / no area → .pcp/_general.md
 *   <area> / <sub>     → .pcp/<area>/<sub>.md  (creates stub if missing)
 */
async function resolveTargetFile(pcpDir, type, area, sub) {
  if (!area || area === '_general') {
    const targetPath = path.join(pcpDir, '_general.md');
    try { await fs.stat(targetPath); } catch {
      await fs.writeFile(targetPath, `# General Entries\n\nThis file groups d/c/r/l entries not specific to a particular area.\n`, 'utf-8');
      console.log(`+ Created .pcp/_general.md`);
    }
    return targetPath;
  }

  const areaDir = path.join(pcpDir, area);
  await ensureDir(areaDir);

  const subName = sub || '_misc';
  const targetPath = path.join(areaDir, `${subName}.md`);
  try { await fs.stat(targetPath); } catch {
    const displayName = area.charAt(0).toUpperCase() + area.slice(1);
    const displaySub = subName.charAt(0).toUpperCase() + subName.slice(1);
    await fs.writeFile(targetPath, `# ${displayName} / ${displaySub}\n\nThis file groups d/c/r/l entries for the ${area}/${subName} module.\n`, 'utf-8');
    console.log(`+ Created .pcp/${area}/${subName}.md`);
  }
  return targetPath;
}

/**
 * Derive {area, sub} from a MAP.json file path (relative to project root).
 * Returns null for files that should be skipped (ARCHIVE.md, MAP.json, etc.).
 */
function deriveAreaSub(relFile) {
  if (relFile === '.pcp/_general.md' || relFile === '.pcp/CONSTITUTION.md' || relFile === '.pcp/DRAFT_LOG.md') {
    return { area: '_general', sub: null };
  }
  const legacyMatch = relFile.match(/^\.pcp\/clusters\/([a-z0-9-]+)\.md$/);
  if (legacyMatch) return { area: legacyMatch[1], sub: '_misc' };
  const areaMatch = relFile.match(/^\.pcp\/([a-z0-9-]+)\/([a-z0-9_-]+)\.md$/);
  if (areaMatch) return { area: areaMatch[1], sub: areaMatch[2] };
  return null;
}

// ── Git Auto-Route ─────────────────────────────────────────────────────────

/**
 * Infer a sub-area name from changed files in git (uncommitted + staged).
 * Returns null when git is unavailable or no files match.
 */
async function inferSubFromGit(root, area) {
  try {
    const output = execSync('git status --porcelain -u', { cwd: root, encoding: 'utf-8', timeout: 5000 });
    const lines = output.split('\n').filter(l => l.trim());
    const sourceRoots = ['src/', 'app/', 'lib/'];
    const subCounts = {};

    for (const line of lines) {
      let file = line.slice(3).trim();
      // Renamed entries are reported as "old -> new"; route on the new path.
      const arrow = file.indexOf(' -> ');
      if (arrow !== -1) file = file.slice(arrow + 4).trim();
      if (!sourceRoots.some(r => file.startsWith(r))) continue;
      const idx = file.indexOf(`/${area}/`);
      if (idx === -1) continue;
      const afterArea = file.slice(idx + area.length + 2);
      const sub = afterArea.split('/')[0];
      if (sub && sub !== area) {
        subCounts[sub] = (subCounts[sub] || 0) + 1;
      }
    }

    const entries = Object.entries(subCounts);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  } catch {
    return null;
  }
}

// ── Size Budget ────────────────────────────────────────────────────────────

async function checkSizeBudget(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size + ENTRY_SIZE_ESTIMATE > SIZE_WARN_THRESHOLD) {
      const kb = (stat.size / 1024).toFixed(1);
      console.warn(`WARN: ${filePath.includes('.pcp/') ? filePath.split('.pcp/')[1] : path.basename(filePath)} is ${kb} KB (near 4 KB limit). Consider splitting into a new sub-area.`);
    }
  } catch { /* file doesn't exist yet — fine */ }
}

// ── 1. INIT ────────────────────────────────────────────────────────────────

async function handleInit(root) {
  const pcpDir = path.join(root, '.pcp');
  await ensureDir(pcpDir);

  const constitutionPath = path.join(pcpDir, 'CONSTITUTION.md');
  const draftLogPath = path.join(pcpDir, 'DRAFT_LOG.md');
  const generalPath = path.join(pcpDir, '_general.md');
  const gitignorePath = path.join(root, '.gitignore');

  try { await fs.stat(constitutionPath); console.log(`- CONSTITUTION.md already exists.`); } catch {
    await fs.writeFile(constitutionPath, `# Project Constitution\n\nThis document lists stable, finalized Architectural Decisions (@pcp:d) and permanent Engineering Caveats (@pcp:c).\n`, 'utf-8');
    console.log(`+ Created .pcp/CONSTITUTION.md`);
  }

  try { await fs.stat(draftLogPath); console.log(`- DRAFT_LOG.md already exists.`); } catch {
    await fs.writeFile(draftLogPath, `# Draft Log\n\nThis log registers newly minted requirements (@pcp:r), engineering caveats (@pcp:c), and deferred tasks (@pcp:l).\n`, 'utf-8');
    console.log(`+ Created .pcp/DRAFT_LOG.md`);
  }

  try { await fs.stat(generalPath); console.log(`- _general.md already exists.`); } catch {
    await fs.writeFile(generalPath, `# General Entries\n\nThis file groups d/c/r/l entries not specific to a particular area.\n`, 'utf-8');
    console.log(`+ Created .pcp/_general.md`);
  }

  let gitignoreContent = '';
  try { gitignoreContent = await fs.readFile(gitignorePath, 'utf-8'); } catch {}

  const targets = ['.pcp/MAP.json', '.pcp/INVENTORY.md', '.pcp/INVENTORY.json', '.pcp/INDEX.md'];
  let modified = false;
  for (const target of targets) {
    if (!gitignoreContent.split('\n').some(line => line.trim() === target)) {
      gitignoreContent += (gitignoreContent.endsWith('\n') ? '' : '\n') + target + '\n';
      modified = true;
    }
  }

  if (modified) {
    await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
    console.log(`+ Updated .gitignore with PCP transient index patterns.`);
  } else {
    console.log(`- .gitignore already contains PCP exclusions.`);
  }

  // Drop AGENTS.md if missing (registers PCP as the active context-hygiene skill)
  const agentsPath = path.join(root, 'AGENTS.md');
  try {
    await fs.stat(agentsPath);
    console.log(`- AGENTS.md already exists.`);
  } catch {
    const agentsContent = [
      '# Project Agent Instructions',
      '',
      'Activate the `pcp` skill and follow its instructions.',
      '',
    ].join('\n');
    await fs.writeFile(agentsPath, agentsContent, 'utf-8');
    console.log(`+ Created AGENTS.md at project root.`);
  }

  console.log(`\nPCP Sandbox successfully initialized at .pcp/`);
}

// ── 2. MINT ────────────────────────────────────────────────────────────────

async function handleMint(root, type, area, sub) {
  if (!type || !ACCEPTED_TYPES.includes(type.toLowerCase())) {
    throw new Error(`Invalid type "${type}". Allowed types are: ${ACCEPTED_TYPES.join(', ')}`);
  }

  const pcpDir = path.join(root, '.pcp');
  await ensureDir(pcpDir);

  // Auto-route sub from git diff when not explicitly provided
  let resolvedSub = sub;
  if (!resolvedSub && area && area !== '_general') {
    resolvedSub = await inferSubFromGit(root, area);
    if (resolvedSub) console.log(`(auto-routed sub: ${resolvedSub})`);
  }

  const targetFile = await resolveTargetFile(pcpDir, type, area || '_general', resolvedSub);
  const clusterLabel = area && area !== '_general'
    ? `${area}/${resolvedSub || '_misc'}`
    : '_general';

  await checkSizeBudget(targetFile);

  const existingCodes = await scanExistingShortcodes(root);
  let code = '';
  for (let attempts = 0; attempts < 1000; attempts++) {
    const entropy = crypto.randomBytes(16).toString('hex') + Date.now();
    const hash = crypto.createHash('md5').update(entropy).digest('hex');
    const potential = `${type}-${hash.slice(0, 4)}`;
    if (!existingCodes.has(potential)) { code = potential; break; }
  }
  if (!code) throw new Error('Failed to generate a non-colliding cryptographic shortcode.');

  const marker = `### [${code}] Title Descriptor`;
  const template = `\n${marker}\n- **Date**: ${new Date().toISOString().split('T')[0]}\n- **Status**: Draft\n- **Cluster**: ${clusterLabel}\n- **Description**: Add detailed architectural intent or requirement here.\n`;

  await fs.appendFile(targetFile, template, 'utf-8');
  console.log(marker);
  console.log(`- Code appended to ${path.relative(root, targetFile)}`);
}

// ── 3. ACTUALIZE ───────────────────────────────────────────────────────────

async function handleActualize(root) {
  const pcpDir = path.join(root, '.pcp');
  await ensureDir(pcpDir);

  console.log(`[1/4] Compiling Markdown shortcode map...`);
  const { map, mapErrors } = await compileShortcodeMap(pcpDir);
  await fs.writeFile(path.join(pcpDir, 'MAP.json'), JSON.stringify(map, null, 2), 'utf-8');
  console.log(`- Indexed ${Object.keys(map).length} shortcode definitions.`);

  console.log(`[2/4] Extracting code signature inventory...`);
  const declarations = await extractInventory(root);
  await fs.writeFile(path.join(pcpDir, 'INVENTORY.json'), JSON.stringify({ declarations }, null, 2), 'utf-8');
  await fs.writeFile(path.join(pcpDir, 'INVENTORY.md'), renderInventorySummary(declarations), 'utf-8');
  console.log(`- Indexed ${declarations.length} export(s) to .pcp/INVENTORY.json (summary in INVENTORY.md). Query with: pcp lookup <name>`);

  console.log(`[3/4] Generating area index...`);
  await writeIndexFile(pcpDir, map);
  console.log(`- Area index compiled to .pcp/INDEX.md`);

  console.log(`[4/4] Performing trace validation checks...`);
  const traceErrors = await validateTraceConnections(root, map);
  const allErrors = [...mapErrors, ...traceErrors];
  if (allErrors.length > 0) {
    const exc = new Error(allErrors.join('\n'));
    exc.name = 'DeadConnectionBreachException';
    throw exc;
  }
  console.log(`PCP validation successful: 0 breaches detected.`);
}

// ── 4. PRUNE ───────────────────────────────────────────────────────────────

async function handlePrune(root, isWrite) {
  const pcpDir = path.join(root, '.pcp');
  const { map } = await compileShortcodeMap(pcpDir);

  const activeTraces = new Set();
  const skillRoot = skillRootDir();
  const files = await scanFiles(root, ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.md']);
  for (const file of files) {
    if (file.includes('.pcp/') || isProtocolOwnFile(file, skillRoot)) continue;
    try {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.match(/@pcp:[dcrl]-[0-9a-f]{4}\b/gi);
      if (matches) {
        for (const m of matches) activeTraces.add(m.replace('@pcp:', '').toLowerCase());
      }
    } catch {}
  }

  const zombies = [];
  for (const code of Object.keys(map)) {
    if (!activeTraces.has(code)) {
      zombies.push({ code, file: map[code].file, line: map[code].line, title: map[code].title });
    }
  }

  if (zombies.length === 0) {
    console.log(`No Zombie Document Blocks detected. Codebase documentation is fully clean.`);
    return;
  }

  console.log(`Detected ${zombies.length} Zombie Document Blocks (documentation structures with no active code connections):`);
  for (const z of zombies) console.log(`- [${z.code}] "${z.title}" in ${z.file}:${z.line}`);

  if (!isWrite) {
    console.log(`\nRun command with "--write" flag to archive and clean out these obsolete blocks.`);
    return;
  }

  console.log(`\nPruning zombie blocks and saving archives...`);
  const archivePath = path.join(pcpDir, 'ARCHIVE.md');
  let archiveContent = '';
  try { archiveContent = await fs.readFile(archivePath, 'utf-8'); } catch {
    archiveContent = `# Pruned Document Archives\n\nThis archive stores historical records of pruned design decisions and requirements.\n`;
  }

  const zombiesByFile = {};
  for (const z of zombies) {
    const fullPath = path.join(root, z.file);
    if (!zombiesByFile[fullPath]) zombiesByFile[fullPath] = [];
    zombiesByFile[fullPath].push(z);
  }

  for (const filePath of Object.keys(zombiesByFile)) {
    const fileZombies = zombiesByFile[filePath];
    fileZombies.sort((a, b) => b.line - a.line);
    let updatedContent = await fs.readFile(filePath, 'utf-8');

    for (const z of fileZombies) {
      const linesArray = updatedContent.split('\n');
      const startIdx = z.line - 1;
      const headerLine = linesArray[startIdx];
      if (!headerLine || !headerLine.includes(`[${z.code}]`)) {
        console.warn(`Warning: Shortcode heading mismatch for [${z.code}] at expected line ${z.line}. Skipping prune.`);
        continue;
      }
      let endIdx = startIdx + 1;
      while (endIdx < linesArray.length) { if (/^#+ /.test(linesArray[endIdx])) break; endIdx++; }
      const prunedBlock = linesArray.slice(startIdx, endIdx).join('\n');
      archiveContent += `\n## Archived from ${path.basename(filePath)} on ${new Date().toISOString().split('T')[0]}\n${prunedBlock}\n`;
      linesArray.splice(startIdx, endIdx - startIdx);
      updatedContent = linesArray.join('\n');
    }

    await fs.writeFile(filePath, updatedContent.trim() + '\n', 'utf-8');
    console.log(`- Pruned zombie block(s) from ${path.basename(filePath)}`);
  }

  await fs.writeFile(archivePath, archiveContent.trim() + '\n', 'utf-8');
  console.log(`+ Archived zombie block(s) to .pcp/ARCHIVE.md`);
}

// ── 5. READ ────────────────────────────────────────────────────────────────

async function handleRead(root, shortcode) {
  if (!shortcode) { console.error('Usage: pcp read <shortcode>'); process.exit(1); }
  const map = await loadMap(root);
  const entry = map[shortcode.toLowerCase()];
  if (!entry) { console.error(`Shortcode "${shortcode}" not found in MAP.json.`); process.exit(1); }

  const filePath = path.resolve(root, entry.file);
  const body = await findEntryInFile(filePath, shortcode.toLowerCase());
  if (!body) { console.error(`Entry body not found for "${shortcode}" in ${entry.file}.`); process.exit(1); }
  console.log(body);
}

// ── 6. LS ──────────────────────────────────────────────────────────────────

async function handleLs(root, area) {
  if (!area) { console.error('Usage: pcp ls <area>'); process.exit(1); }
  const map = await loadMap(root);

  const areaSubs = {};
  for (const [code, meta] of Object.entries(map)) {
    const derived = deriveAreaSub(meta.file);
    if (!derived || derived.area !== area) continue;
    const sub = derived.sub || '(root)';
    if (!areaSubs[sub]) areaSubs[sub] = [];
    areaSubs[sub].push(code);
  }

  if (Object.keys(areaSubs).length === 0) {
    console.error(`Area "${area}" not found or has no entries.`);
    process.exit(1);
  }

  console.log(`Area: ${area}\n`);
  const sortedSubs = Object.keys(areaSubs).sort((a, b) => {
    if (a === '(root)') return -1;
    if (b === '(root)') return 1;
    return a.localeCompare(b);
  });
  for (const sub of sortedSubs) {
    console.log(`  ${sub}: ${areaSubs[sub].length} entries`);
  }
}

// ── 7. MAP ─────────────────────────────────────────────────────────────────

async function handleMap(root, shortcode) {
  if (!shortcode) { console.error('Usage: pcp map <shortcode>'); process.exit(1); }
  const map = await loadMap(root);
  const entry = map[shortcode.toLowerCase()];
  if (!entry) { console.error(`Shortcode "${shortcode}" not found in MAP.json.`); process.exit(1); }
  console.log(`${entry.file}:${entry.line}`);
}

// ── 8. FIND ────────────────────────────────────────────────────────────────

async function handleFind(root, query) {
  if (!query) { console.error('Usage: pcp find <query>'); process.exit(1); }
  const map = await loadMap(root);
  const lowerQuery = query.toLowerCase();
  const matches = [];

  for (const [code, meta] of Object.entries(map)) {
    if (meta.title.toLowerCase().includes(lowerQuery)) {
      matches.push({ code, title: meta.title, file: meta.file, line: meta.line });
    }
  }

  if (matches.length === 0) { console.log(`No entries matching "${query}" found.`); return; }
  for (const m of matches) console.log(`@pcp:${m.code}\t${m.title}\t${m.file}:${m.line}`);
}

// ── 9. LOOKUP ──────────────────────────────────────────────────────────────

async function handleLookup(root, name) {
  if (!name) { console.error('Usage: pcp lookup <name>'); process.exit(1); }
  const inventory = await loadInventory(root);
  const declarations = inventory.declarations || [];
  const lowerName = name.toLowerCase();
  const matches = declarations.filter(d => d.name.toLowerCase().includes(lowerName));

  if (matches.length === 0) { console.log(`No exports matching "${name}" found.`); return; }
  for (const d of matches) console.log(`${d.type}\t${d.name}\t${d.file}:${d.line}`);
}

// ── Shared Helpers ─────────────────────────────────────────────────────────

async function loadMap(root) {
  const mapPath = path.join(root, '.pcp', 'MAP.json');
  try { return JSON.parse(await fs.readFile(mapPath, 'utf-8')); } catch {
    console.error('MAP.json not found. Run "pcp actualize" first.'); process.exit(1);
  }
}

async function loadInventory(root) {
  const invPath = path.join(root, '.pcp', 'INVENTORY.json');
  try { return JSON.parse(await fs.readFile(invPath, 'utf-8')); } catch {
    console.error('INVENTORY.json not found. Run "pcp actualize" first.'); process.exit(1);
  }
}

async function scanExistingShortcodes(root) {
  const codes = new Set();
  const skillRoot = skillRootDir();
  const files = await scanFiles(root, ['.md', '.js', '.jsx', '.ts', '.tsx', '.py', '.go']);
  for (const file of files) {
    if (isProtocolOwnFile(file, skillRoot)) continue;
    try {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.match(/@pcp:[dcrl]-[0-9a-f]{4}\b|\[[dcrl]-[0-9a-f]{4}\]/gi);
      if (matches) {
        for (const m of matches) codes.add(m.replace(/@pcp:|[[\]]/gi, '').toLowerCase());
      }
    } catch {}
  }
  return codes;
}

/**
 * Structurally detect a PCP skill installation: any directory that holds both
 * `SKILL.md` and `scripts/pcp.js`. Used to prune EVERY skill copy found in the
 * host tree — the running copy AND any vendored/mirrored copy (e.g.
 * `.agents/skills/pcp/`, `.claude/skills/pcp/`) — from trace/zombie/collision
 * scans. The protocol docs carry illustrative `@pcp:` example codes (e.g.
 * `@pcp:c-e9a2`); keying exclusion only on the *running* script's own dir let a
 * second in-tree copy's examples register as live anchors and raise a spurious
 * Dead Connection breach whenever the agent ran a different copy of the script.
 */
async function isSkillRootDir(dir, entries) {
  if (!entries.some(e => e.isFile() && e.name === 'SKILL.md')) return false;
  if (!entries.some(e => e.isDirectory() && e.name === 'scripts')) return false;
  try {
    return (await fs.stat(path.join(dir, 'scripts', 'pcp.js'))).isFile();
  } catch {
    return false;
  }
}

async function scanFiles(dir, extensions, excludeDirs = SCAN_EXCLUDE_DIRS) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
  // Prune any PCP skill installation wherever it lives in the tree, so its
  // illustrative `@pcp:` example codes never count as live anchors.
  if (await isSkillRootDir(dir, entries)) return [];
  const files = [];
  const subdirPromises = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) subdirPromises.push(scanFiles(fullPath, extensions, excludeDirs));
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  const subdirResults = await Promise.all(subdirPromises);
  for (const batch of subdirResults) files.push(...batch);
  return files;
}

async function compileShortcodeMap(pcpDir) {
  const map = {};
  const mapErrors = [];
  const mdFiles = [];
  await collectMarkdownFiles(pcpDir, mdFiles);
  const contentAccumulator = {};

  for (const filePath of mdFiles) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(path.dirname(pcpDir), filePath);
    let currentCode = null;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^#+.*\[([dcrl]-[0-9a-f]{4})\]\s*(.*)$/i);
      if (match) {
        if (currentCode) contentAccumulator[currentCode] = contentAccumulator[currentCode].trim();
        const rawCode = match[1].toLowerCase();
        const title = match[2].trim();
        if (map[rawCode]) {
          mapErrors.push(`Duplicate shortcode definition found: [${rawCode}] in ${relativePath}:${i + 1} and ${map[rawCode].file}`);
        }
        currentCode = rawCode;
        map[rawCode] = { file: relativePath, line: i + 1, title };
        contentAccumulator[rawCode] = '';
      } else if (currentCode) {
        contentAccumulator[currentCode] += (contentAccumulator[currentCode] ? '\n' : '') + lines[i];
      }
    }
    if (currentCode) contentAccumulator[currentCode] = contentAccumulator[currentCode].trim();
  }

  for (const code of Object.keys(map)) {
    const raw = (contentAccumulator[code] || '').trim();
    const stripped = raw.replace(/[\s\-\*]/g, '').toLowerCase();
    const isPlaceholder = stripped.includes('adddetailed') || stripped.includes('adddescription') || stripped.includes('intentorrequirementhere') || stripped.length < 5;
    map[code].populated = !isPlaceholder;
  }

  return { map, mapErrors };
}

async function collectMarkdownFiles(dir, result) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, result);
    } else if (entry.isFile() && entry.name.endsWith('.md') && !TRANSIENT_MD.has(entry.name)) {
      result.push(fullPath);
    }
  }
}

async function writeIndexFile(pcpDir, map) {
  const areas = {};

  for (const [code, meta] of Object.entries(map)) {
    const derived = deriveAreaSub(meta.file);
    if (!derived) continue;
    const { area, sub } = derived;
    if (!areas[area]) areas[area] = {};
    const subName = sub || '(root)';
    if (!areas[area][subName]) areas[area][subName] = [];
    areas[area][subName].push(code);
  }

  let md = `# PCP Area Index\n\n` +
    `Per-area summary of all PCP entries. Read this file first for orientation; do not glob \`.pcp/\`.\n` +
    `Entries are intentionally not inlined here — drill down with \`pcp ls <area>\`, \`pcp find <query>\`, or \`pcp read <code>\`.\n\n` +
    `| Area | Sub-areas | d | c | r | l | Total |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  const sortedAreas = Object.keys(areas).sort((a, b) => {
    if (a === '_general') return -1;
    if (b === '_general') return 1;
    return a.localeCompare(b);
  });

  for (const area of sortedAreas) {
    const subs = areas[area];
    const subNames = Object.keys(subs).filter(s => s !== '(root)').sort();
    const subList = subNames.length > 0 ? subNames.join(', ') : '-';
    const counts = { d: 0, c: 0, r: 0, l: 0 };
    for (const codes of Object.values(subs)) {
      for (const code of codes) {
        const t = code.split('-')[0];
        if (counts[t] !== undefined) counts[t]++;
      }
    }
    const total = counts.d + counts.c + counts.r + counts.l;
    md += `| \`${area}\` | ${subList} | ${counts.d} | ${counts.c} | ${counts.r} | ${counts.l} | ${total} |\n`;
  }

  await fs.writeFile(path.join(pcpDir, 'INDEX.md'), md.trim() + '\n', 'utf-8');
}

async function extractInventory(root) {
  let scanDirs = ['src', 'lib', 'app'];
  let actualDirs = [];
  for (const d of scanDirs) {
    try { const s = await fs.stat(path.join(root, d)); if (s.isDirectory()) actualDirs.push(d); } catch {}
  }
  if (actualDirs.length === 0) actualDirs = ['.'];

  const files = [];
  for (const d of actualDirs) {
    const f = await scanFiles(path.join(root, d), ['.js', '.jsx', '.ts', '.tsx', '.py', '.go']);
    files.push(...f);
  }

  const declarations = [];
  const seen = new Set();
  const push = (type, name, file, line) => {
    const key = `${name}@${file}:${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    declarations.push({ type, name, file, line });
  };

  for (const file of files) {
    if (file.includes('.pcp/') || file.includes('pcp.js')) continue;
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(root, file);
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ln = i + 1;
      if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        // export [default] [async] [abstract] (class|function[*]|interface|const|let|var|type|enum) Name
        const m = line.match(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(class|function\*?|interface|const|let|var|type|enum)\s+([A-Za-z0-9_$]+)/);
        if (m) {
          push(m[1], m[2], relativePath, ln);
        } else {
          // export { foo, bar as baz } [from '...']
          const re = line.match(/\bexport\s*\{([^}]*)\}/);
          if (re) {
            for (const part of re[1].split(',')) {
              const name = part.trim().split(/\s+as\s+/).pop().trim();
              if (name && name !== 'default' && /^[A-Za-z0-9_$]+$/.test(name)) push('re-export', name, relativePath, ln);
            }
          }
          // module.exports.x = / exports.x =
          const cjs = line.match(/\b(?:module\.)?exports\.([A-Za-z0-9_$]+)\s*=\s*(function|class|.*)/);
          if (cjs) {
            const t = cjs[2].startsWith('function') ? 'function' : (cjs[2].startsWith('class') ? 'class' : 'const');
            push(t, cjs[1], relativePath, ln);
          }
        }
      }
      if (/\.py$/.test(file)) {
        const pyMatch = line.match(/^(class|def)\s+([A-Za-z0-9_$]+)/);
        if (pyMatch) push(pyMatch[1], pyMatch[2], relativePath, ln);
      }
      if (/\.go$/.test(file)) {
        const goFuncMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Z]\w*)\b/);
        if (goFuncMatch) push('func', goFuncMatch[1], relativePath, ln);
        const goTypeMatch = line.match(/^type\s+([A-Z]\w*)\s+(struct|interface)\b/);
        if (goTypeMatch) push(goTypeMatch[2], goTypeMatch[1], relativePath, ln);
      }
    }
  }

  declarations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return declarations;
}

/**
 * Render the lean, human/agent-readable inventory summary. The full per-symbol
 * index lives in the git-ignored INVENTORY.json; this file only orients the
 * agent and points at `pcp lookup` so the bulk is never loaded into context.
 */
function renderInventorySummary(declarations) {
  const modules = {};
  for (const d of declarations) {
    const dir = path.dirname(d.file);
    const mod = dir === '.' ? '(root)' : dir;
    modules[mod] = (modules[mod] || 0) + 1;
  }

  let md = `# Codebase Inventory (summary)\n\n` +
    `The full export index lives in the git-ignored \`.pcp/INVENTORY.json\`. Do NOT read it wholesale.\n` +
    `Before writing a new utility, query for an existing one:\n\n` +
    `    node pcp/scripts/pcp.js lookup <name>\n\n`;

  const mods = Object.keys(modules).sort();
  if (mods.length === 0) {
    md += `_No exports detected._\n`;
    return md;
  }

  md += `| Module | Exports |\n| :--- | :--- |\n`;
  for (const mod of mods) md += `| \`${mod}\` | ${modules[mod]} |\n`;
  md += `\nTotal: ${declarations.length} export(s) across ${mods.length} module(s).\n`;
  return md;
}

async function validateTraceConnections(root, map) {
  const errors = [];
  const skillRoot = skillRootDir();
  const files = await scanFiles(root, ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.md']);
  for (const file of files) {
    if (file.includes('.pcp/') || isProtocolOwnFile(file, skillRoot)) continue;
    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(root, file);
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/@pcp:([dcrl]-[0-9a-f]{4})\b/i);
      if (match) {
        const traceCode = match[1].toLowerCase();
        const definition = map[traceCode];
        if (!definition) {
          errors.push(`Dead Connection: Reference @pcp:${traceCode} found in ${relativePath}:${i + 1} does not map to any markdown header definition in .pcp/`);
        } else if (!definition.populated) {
          errors.push(`Dead Connection: Reference @pcp:${traceCode} in ${relativePath}:${i + 1} points to an empty/unpopulated documentation block in ${definition.file}:${definition.line}`);
        }
      }
    }
  }
  return errors;
}

async function findEntryInFile(filePath, shortcode) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let startIdx = -1;
    let endIdx = lines.length;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^#+.*\[([dcrl]-[0-9a-f]{4})\]/i);
      if (match) {
        if (startIdx !== -1) { endIdx = i; break; }
        if (match[1].toLowerCase() === shortcode) startIdx = i;
      }
    }
    if (startIdx === -1) return null;
    return lines.slice(startIdx, endIdx).join('\n').trim();
  } catch { return null; }
}

main();
