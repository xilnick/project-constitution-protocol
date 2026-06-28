#!/usr/bin/env node

/**
 * Project Constitution Protocol (PCP) Automation Engine
 * Universal, Zero-Dependency, ESM Node.js Script
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ACCEPTED_TYPES = ['d', 'c', 'r', 'l'];

// Main CLI Entrypoint
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
        case 'mint':
          await handleMint(root, args[1]);
          break;
        case 'actualize':
          await handleActualize(root);
          break;
        case 'prune':
          const isWrite = args.includes('--write');
          await handlePrune(root, isWrite);
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
  node pcp.js init           Scaffold the isolation sandbox (.pcp/)
  node pcp.js mint <type>    Allocate a new cryptographically unique shortcode
  node pcp.js actualize      Compile maps, code signatures and validate active trace connections
  node pcp.js prune [--write] Scan for and remove Zombie Document Blocks (docs missing code ties)
  `);
}

// Find repository root by traversing upwards
async function findProjectRoot(startDir = process.cwd()) {
  let current = startDir;
  while (true) {
    try {
      const checkGit = path.join(current, '.git');
      const stat = await fs.stat(checkGit);
      if (stat.isDirectory()) return current;
    } catch {}

    try {
      const checkAgents = path.join(current, 'AGENTS.md');
      await fs.stat(checkAgents);
      return current;
    } catch {}

    const parent = path.dirname(current);
    if (parent === current) {
      // Default to process.cwd() if no boundary found
      return process.cwd();
    }
    current = parent;
  }
}

// Ensure directory exists utility
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

// Simple atomic locking mechanism using mkdir
async function acquireLock(lockPath, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fs.mkdir(lockPath);
      return;
    } catch (e) {
      if (e.code === 'EEXIST') {
        await new Promise(r => setTimeout(r, 100));
      } else {
        throw e;
      }
    }
  }
  throw new Error(`Timeout waiting for PCP lock at ${lockPath}`);
}

async function releaseLock(lockPath) {
  try {
    await fs.rmdir(lockPath);
  } catch (e) {}
}

// 1. Scaffold command (init)
async function handleInit(root) {
  const pcpDir = path.join(root, '.pcp');
  await ensureDir(pcpDir);

  const constitutionPath = path.join(pcpDir, 'CONSTITUTION.md');
  const draftLogPath = path.join(pcpDir, 'DRAFT_LOG.md');
  const gitignorePath = path.join(root, '.gitignore');

  // Boilerplate Constitution
  try {
    await fs.stat(constitutionPath);
    console.log(`- CONSTITUTION.md already exists.`);
  } catch {
    await fs.writeFile(constitutionPath, `# Project Constitution

This document lists stable, finalized Architectural Decisions (@pcp:d) and permanent Engineering Caveats (@pcp:c).
`, 'utf-8');
    console.log(`+ Created .pcp/CONSTITUTION.md`);
  }

  // Boilerplate Draft Log
  try {
    await fs.stat(draftLogPath);
    console.log(`- DRAFT_LOG.md already exists.`);
  } catch {
    await fs.writeFile(draftLogPath, `# Draft Log

This log registers newly minted requirements (@pcp:r), engineering caveats (@pcp:c), and deferred tasks (@pcp:l).
`, 'utf-8');
    console.log(`+ Created .pcp/DRAFT_LOG.md`);
  }

  // Update gitignore
  let gitignoreContent = '';
  try {
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
  } catch {}

  const targets = ['.pcp/MAP.json', '.pcp/INVENTORY.md'];
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

  console.log(`\nPCP Sandbox successfully initialized at .pcp/`);
}

// 2. Allocate code command (mint)
async function handleMint(root, type) {
  if (!type || !ACCEPTED_TYPES.includes(type.toLowerCase())) {
    throw new Error(`Invalid type "${type}". Allowed types are: ${ACCEPTED_TYPES.join(', ')}`);
  }

  const pcpDir = path.join(root, '.pcp');
  await ensureDir(pcpDir);
  const draftLogPath = path.join(pcpDir, 'DRAFT_LOG.md');

  // Search existing codes to prevent collision
  const existingCodes = await scanExistingShortcodes(root);
  
  let attempts = 0;
  let code = '';
  while (attempts < 1000) {
    const entropy = crypto.randomBytes(16).toString('hex') + Date.now();
    const hash = crypto.createHash('md5').update(entropy).digest('hex');
    const potentialCode = `${type}-${hash.slice(0, 4)}`;
    if (!existingCodes.has(potentialCode)) {
      code = potentialCode;
      break;
    }
    attempts++;
  }

  if (!code) {
    throw new Error('Failed to generate a non-colliding cryptographic shortcode.');
  }

  const marker = `### [${code}] Title Descriptor`;
  const template = `\n${marker}
- **Date**: ${new Date().toISOString().split('T')[0]}
- **Status**: Draft
- **Description**: Add detailed architectural intent or requirement here.
`;

  await fs.appendFile(draftLogPath, template, 'utf-8');
  console.log(marker);
  console.log(`- Code appended to .pcp/DRAFT_LOG.md`);
}

// Scan all markdown and source files to aggregate already used shortcodes
async function scanExistingShortcodes(root) {
  const codes = new Set();
  const files = await scanFiles(root, ['.md', '.js', '.jsx', '.ts', '.tsx', '.py', '.go']);
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.match(/@pcp:[dcrl]-[0-9a-f]{4}\b|\[[dcrl]-[0-9a-f]{4}\]/gi);
      if (matches) {
        for (const match of matches) {
          const raw = match.replace(/[@pcp:|\[|\]]/gi, '').toLowerCase();
          codes.add(raw);
        }
      }
    } catch {}
  }
  return codes;
}

// Utility to recursively find files matching extensions (parallelized)
async function scanFiles(dir, extensions, excludeDirs = ['.git', 'node_modules', 'dist', 'build', 'tests', 'test', '__tests__']) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  const subdirPromises = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        subdirPromises.push(scanFiles(fullPath, extensions, excludeDirs));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  const subdirResults = await Promise.all(subdirPromises);
  for (const batch of subdirResults) {
    files.push(...batch);
  }
  return files;
}

// 3. Compile context & check traces (actualize)
async function handleActualize(root) {
  const pcpDir = path.join(root, '.pcp');
  await ensureDir(pcpDir);

  console.log(`[1/3] Compiling Markdown shortcode map...`);
  const { map, mapErrors } = await compileShortcodeMap(pcpDir);
  await fs.writeFile(path.join(pcpDir, 'MAP.json'), JSON.stringify(map, null, 2), 'utf-8');
  console.log(`- Indexed ${Object.keys(map).length} shortcode definitions.`);

  console.log(`[2/3] Extracting code signature inventory...`);
  const inventoryMarkdown = await extractInventory(root);
  await fs.writeFile(path.join(pcpDir, 'INVENTORY.md'), inventoryMarkdown, 'utf-8');
  console.log(`- Code signature inventory compiled to .pcp/INVENTORY.md`);

  console.log(`[3/3] Performing trace validation checks...`);
  const traceErrors = await validateTraceConnections(root, map);
  
  const allErrors = [...mapErrors, ...traceErrors];
  if (allErrors.length > 0) {
    const exc = new Error(allErrors.join('\n'));
    exc.name = 'DeadConnectionBreachException';
    throw exc;
  }

  console.log(`PCP validation successful: 0 breaches detected.`);
}

// Helper to compile MAP.json from markdown files in .pcp/
// Token-compressed: validates content at compile-time, stores only structural metadata
async function compileShortcodeMap(pcpDir) {
  const map = {};
  const mapErrors = [];
  
  let list;
  try {
    list = await fs.readdir(pcpDir);
  } catch {
    return { map, mapErrors };
  }

  const mdFiles = list.filter(f => f.endsWith('.md'));
  // Track raw content per code for compile-time validation only
  const contentAccumulator = {};

  for (const f of mdFiles) {
    const filePath = path.join(pcpDir, f);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let currentCode = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^#+.*\[([dcrl]-[0-9a-f]{4})\]\s*(.*)$/i);
      
      if (match) {
        if (currentCode) {
          contentAccumulator[currentCode] = contentAccumulator[currentCode].trim();
        }

        const rawCode = match[1].toLowerCase();
        const title = match[2].trim();
        
        if (map[rawCode]) {
          mapErrors.push(`Duplicate shortcode definition found: [${rawCode}] in ${f}:${i + 1} and ${map[rawCode].file}`);
        }

        currentCode = rawCode;
        map[rawCode] = {
          file: path.relative(path.dirname(pcpDir), filePath),
          line: i + 1,
          title: title
        };
        contentAccumulator[rawCode] = '';
      } else if (currentCode) {
        contentAccumulator[currentCode] += (contentAccumulator[currentCode] ? '\n' : '') + line;
      }
    }
    
    if (currentCode) {
      contentAccumulator[currentCode] = contentAccumulator[currentCode].trim();
    }
  }

  // Compile-time validation: flag empty or placeholder content blocks
  for (const code of Object.keys(map)) {
    const raw = (contentAccumulator[code] || '').trim();
    const stripped = raw.replace(/[\s\-\*]/g, '').toLowerCase();
    const isPlaceholder = stripped.includes('adddetailed') || stripped.includes('adddescription') || stripped.includes('here') || stripped.length < 5;
    map[code].populated = !isPlaceholder;
  }

  return { map, mapErrors };
}

// Helper to scan codebase for exposed declarations
async function extractInventory(root) {
  // Universally scan common folders: src, lib, app, or fallback to root
  let scanDirs = ['src', 'lib', 'app'];
  let actualDirs = [];
  for (const d of scanDirs) {
    try {
      const s = await fs.stat(path.join(root, d));
      if (s.isDirectory()) actualDirs.push(d);
    } catch {}
  }

  if (actualDirs.length === 0) {
    actualDirs = ['.']; // Fallback to scanning everything (except excluded)
  }

  const files = [];
  for (const d of actualDirs) {
    const f = await scanFiles(path.join(root, d), ['.js', '.jsx', '.ts', '.tsx', '.py', '.go']);
    files.push(...f);
  }

  const declarations = [];

  for (const file of files) {
    // Avoid reading index files or map files
    if (file.includes('.pcp/') || file.includes('pcp.js')) continue;

    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(root, file);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // TS/JS Exports
      if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        const jsMatch = line.match(/\bexport\s+(class|function|interface|const)\s+([a-zA-Z0-9_$]+)/);
        if (jsMatch) {
          declarations.push({
            type: jsMatch[1],
            name: jsMatch[2],
            file: relativePath,
            line: i + 1
          });
        }
        const defaultMatch = line.match(/\bexport\s+default\s+(class|function)\s+([a-zA-Z0-9_$]+)/);
        if (defaultMatch) {
          declarations.push({
            type: `default ${defaultMatch[1]}`,
            name: defaultMatch[2],
            file: relativePath,
            line: i + 1
          });
        }
        const cjsMatch = line.match(/\b(?:module\.)?exports\.([a-zA-Z0-9_$]+)\s*=\s*(function|class|.*)/);
        if (cjsMatch && !jsMatch && !defaultMatch) {
          declarations.push({
            type: cjsMatch[2].startsWith('function') ? 'function' : (cjsMatch[2].startsWith('class') ? 'class' : 'const'),
            name: cjsMatch[1],
            file: relativePath,
            line: i + 1
          });
        }
      }

      // Python Declarations
      if (/\.py$/.test(file)) {
        const pyMatch = line.match(/^(class|def)\s+([a-zA-Z0-9_$]+)/);
        if (pyMatch) {
          declarations.push({
            type: pyMatch[1],
            name: pyMatch[2],
            file: relativePath,
            line: i + 1
          });
        }
      }

      // Go Declarations
      if (/\.go$/.test(file)) {
        const goFuncMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Z]\w*)\b/);
        if (goFuncMatch) {
          declarations.push({
            type: 'func',
            name: goFuncMatch[1],
            file: relativePath,
            line: i + 1
          });
        }
        const goTypeMatch = line.match(/^type\s+([A-Z]\w*)\s+(struct|interface)\b/);
        if (goTypeMatch) {
          declarations.push({
            type: goTypeMatch[2],
            name: goTypeMatch[1],
            file: relativePath,
            line: i + 1
          });
        }
      }
    }
  }

  // Compile to markdown table
  let md = `# Codebase Interface Inventory

Auto-generated interface declarations surface table. Check here to avoid duplicate function/module implementation.

| Type | Name | Defined In | Line |
| :--- | :--- | :--- | :--- |
`;

  if (declarations.length === 0) {
    md += `| *None* | *No exports detected* | | |\n`;
  } else {
    // Sort declarations logically by file and type
    declarations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    for (const d of declarations) {
      md += `| \`${d.type}\` | \`${d.name}\` | [${path.basename(d.file)}](file://${path.resolve(root, d.file)}#L${d.line}) | ${d.line} |\n`;
    }
  }

  return md;
}

// Helper to scan code for inline traces (@pcp:x-xxxx) and validate against MAP.json
// Content validation is already performed at compile-time in compileShortcodeMap;
// this function only checks structural existence and the pre-computed `populated` flag.
async function validateTraceConnections(root, map) {
  const errors = [];
  const files = await scanFiles(root, ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.md']);
  
  for (const file of files) {
    if (file.includes('.pcp/')) continue;

    const content = await fs.readFile(file, 'utf-8');
    const relativePath = path.relative(root, file);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/@pcp:([dcrl]-[0-9a-f]{4})\b/i);

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

// 4. Clean up documentation rot (prune)
async function handlePrune(root, isWrite) {
  const pcpDir = path.join(root, '.pcp');
  const { map } = await compileShortcodeMap(pcpDir);
  
  // Aggregate all active trace references from source code files
  const activeTraces = new Set();
  const files = await scanFiles(root, ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.md']);
  for (const file of files) {
    if (file.includes('.pcp/')) continue;
    try {
      const content = await fs.readFile(file, 'utf-8');
      const matches = content.match(/@pcp:[dcrl]-[0-9a-f]{4}\b/gi);
      if (matches) {
        for (const match of matches) {
          activeTraces.add(match.replace('@pcp:', '').toLowerCase());
        }
      }
    } catch {}
  }

  // Find zombie blocks (exist in map but not in active traces)
  const zombies = [];
  for (const code of Object.keys(map)) {
    if (!activeTraces.has(code)) {
      zombies.push({
        code: code,
        file: map[code].file,
        line: map[code].line,
        title: map[code].title
      });
    }
  }

  if (zombies.length === 0) {
    console.log(`No Zombie Document Blocks detected. Codebase documentation is fully clean.`);
    return;
  }

  console.log(`Detected ${zombies.length} Zombie Document Blocks (documentation structures with no active code connections):`);
  for (const z of zombies) {
    console.log(`- [${z.code}] "${z.title}" in ${z.file}:${z.line}`);
  }

  if (!isWrite) {
    console.log(`\nRun command with "--write" flag to archive and clean out these obsolete blocks.`);
    return;
  }

  // Archive and delete zombie blocks
  console.log(`\nPruning zombie blocks and saving archives...`);
  const archivePath = path.join(pcpDir, 'ARCHIVE.md');
  
  let archiveContent = '';
  try {
    archiveContent = await fs.readFile(archivePath, 'utf-8');
  } catch {
    archiveContent = `# Pruned Document Archives\n\nThis archive stores historical records of pruned design decisions and requirements.\n`;
  }

  // Group zombies by files to do updates efficiently
  const zombiesByFile = {};
  for (const z of zombies) {
    const fullPath = path.join(root, z.file);
    if (!zombiesByFile[fullPath]) zombiesByFile[fullPath] = [];
    zombiesByFile[fullPath].push(z);
  }

  for (const filePath of Object.keys(zombiesByFile)) {
    const fileZombies = zombiesByFile[filePath];
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    // Sort fileZombies descending by line index to avoid offset shifting issues
    fileZombies.sort((a, b) => b.line - a.line);

    let updatedContent = fileContent;

    for (const z of fileZombies) {
      // Find the range of the heading
      const linesArray = updatedContent.split('\n');
      const startIdx = z.line - 1; // 0-based
      
      // Double check that the line actually starts with the target header
      const headerLine = linesArray[startIdx];
      if (!headerLine || !headerLine.includes(`[${z.code}]`)) {
        console.warn(`Warning: Shortcode heading mismatch for [${z.code}] at expected line ${z.line}. Skipping prune.`);
        continue;
      }

      // Find the end index: next line starting with # or EOF
      let endIdx = startIdx + 1;
      while (endIdx < linesArray.length) {
        if (/^#+ /.test(linesArray[endIdx])) {
          break;
        }
        endIdx++;
      }

      // Extract pruned block content
      const prunedBlock = linesArray.slice(startIdx, endIdx).join('\n');
      
      // Append to archive content
      archiveContent += `\n## Archived from ${path.basename(filePath)} on ${new Date().toISOString().split('T')[0]}\n${prunedBlock}\n`;

      // Remove from lines array
      linesArray.splice(startIdx, endIdx - startIdx);
      updatedContent = linesArray.join('\n');
    }

    await fs.writeFile(filePath, updatedContent.trim() + '\n', 'utf-8');
    console.log(`- Pruned zombie block(s) from ${path.basename(filePath)}`);
  }

  await fs.writeFile(archivePath, archiveContent.trim() + '\n', 'utf-8');
  console.log(`+ Archived zombie block(s) to .pcp/ARCHIVE.md`);
}

main();
