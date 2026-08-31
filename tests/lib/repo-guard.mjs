// Owns every write the mutation harness performs, so an interrupted sweep cannot
// leave a mutated artifact behind: byte snapshots, an out-of-repo journal, and
// signal handlers that restore before re-raising.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, '..', '..');
const DEFAULT_JOURNAL_PATH = path.join(os.homedir(), '.cache', 'pcp-mutation-harness', 'journal.json');
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];
const DEFAULT_RESIDUE = ['tests/playground', 'tests/playground-git', 'tests/playground-consumer'];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function refuse(message) {
  process.stderr.write(`repo-guard: REFUSED (exit 2)\n${message}\n`);
  process.exit(2);
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

// A porcelain entry for an untracked directory is a single line ending in '/';
// equality against a file beneath it would miss the whole subtree.
function prefixMatch(a, b) {
  if (a === b) return true;
  const ad = a.endsWith('/') ? a : a + '/';
  const bd = b.endsWith('/') ? b : b + '/';
  return b.startsWith(ad) || a.startsWith(bd);
}

function porcelainPath(line) {
  let p = line.slice(3);
  const arrow = p.indexOf(' -> ');
  if (arrow !== -1) p = p.slice(arrow + 4);
  if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
  return p;
}

function listRecursive(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const walk = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      out.push(e.isDirectory() ? childRel + '/' : childRel);
      if (e.isDirectory()) walk(path.join(dir, e.name), childRel);
    }
  };
  walk(root, '');
  return out;
}

function missingAncestors(abs) {
  const chain = [];
  let dir = path.dirname(abs);
  while (!fs.existsSync(dir) && dir !== path.dirname(dir)) {
    chain.push(dir);
    dir = path.dirname(dir);
  }
  return chain.reverse();
}

export function createGuard(options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const journalPath = options.journalPath ?? DEFAULT_JOURNAL_PATH;
  const readPaths = (options.readPaths ?? []).map(toPosix);
  const allowResidue = options.allowResidue ?? DEFAULT_RESIDUE;
  const useGit = options.useGit !== false;

  const relOf = (abs) => toPosix(path.relative(repoRoot, abs));
  const files = new Map();
  let journalWritten = false;

  if (fs.existsSync(journalPath)) {
    let held = '(unreadable journal)';
    try {
      const j = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
      held = j.entries.map((e) => `  ${e.absent ? 'CREATED' : 'MODIFIED'} ${e.targetPath}`).join('\n');
    } catch { /* fall through with the placeholder */ }
    refuse(
      `A mutation journal from an earlier run exists: ${journalPath}\n` +
      `It holds the pre-mutation bytes of:\n${held}\n` +
      `Restore each MODIFIED path from its base64 "bytes" field, delete each CREATED path, then remove the journal.`
    );
  }

  const readPorcelain = () =>
    execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);

  const isResidue = (p) => allowResidue.some((r) => prefixMatch(p, r));

  let baselinePorcelain = [];
  if (useGit) {
    baselinePorcelain = readPorcelain();
    const dirty = baselinePorcelain
      .map(porcelainPath)
      .filter((p) => !isResidue(p) && readPaths.some((r) => prefixMatch(p, r)));
    if (dirty.length > 0) {
      refuse(
        `These uncommitted paths are read by the suite under measurement, so a mutation run\n` +
        `would measure them rather than the committed artifacts:\n` +
        dirty.map((p) => `  ${p}`).join('\n') +
        `\nCommit or stash them and re-run.`
      );
    }
  }
  const baselineTests = listRecursive(path.join(repoRoot, 'tests'));

  function snapshot(p) {
    const abs = path.resolve(repoRoot, p);
    if (files.has(abs)) return files.get(abs);
    if (journalWritten) throw new Error(`repo-guard: snapshot(${relOf(abs)}) after writeJournal()`);
    const rec = fs.existsSync(abs)
      ? (() => {
          const bytes = fs.readFileSync(abs);
          return { abs, rel: relOf(abs), existed: true, bytes, sha: sha256(bytes), dirsToCreate: [], created: false, dirsCreated: [] };
        })()
      : { abs, rel: relOf(abs), existed: false, bytes: null, sha: null, dirsToCreate: missingAncestors(abs), created: false, dirsCreated: [] };
    files.set(abs, rec);
    return rec;
  }

  function writeJournal() {
    fs.mkdirSync(path.dirname(journalPath), { recursive: true });
    const entries = [...files.values()].map((r) => ({
      targetPath: r.abs,
      absent: !r.existed,
      sha256: r.sha,
      bytes: r.existed ? r.bytes.toString('base64') : null,
      dirsToCreate: r.dirsToCreate,
    }));
    fs.writeFileSync(journalPath, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString(), repoRoot, entries }, null, 2));
    journalWritten = true;
    return journalPath;
  }

  function requireJournal(op, rel) {
    if (!journalWritten) throw new Error(`repo-guard: ${op}(${rel}) before writeJournal()`);
  }

  function write(p, bytes) {
    const abs = path.resolve(repoRoot, p);
    const rec = files.get(abs);
    if (!rec) throw new Error(`repo-guard: write() to un-snapshotted path ${relOf(abs)}`);
    if (!rec.existed) throw new Error(`repo-guard: write() to a path absent at snapshot time: ${rec.rel} (use create())`);
    requireJournal('write', rec.rel);
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, 'utf8');
    if (buf.equals(rec.bytes)) throw new Error(`repo-guard: write() is a no-op for ${rec.rel}; the edit did not change any bytes`);
    fs.writeFileSync(abs, buf);
    return rec.rel;
  }

  function create(p, bytes) {
    const abs = path.resolve(repoRoot, p);
    const rec = files.get(abs);
    if (!rec) throw new Error(`repo-guard: create() of un-snapshotted path ${relOf(abs)}`);
    if (rec.existed || fs.existsSync(abs)) throw new Error(`repo-guard: create() refused, path already exists: ${rec.rel}`);
    requireJournal('create', rec.rel);
    for (const d of rec.dirsToCreate) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d);
        rec.dirsCreated.push(d);
      }
    }
    fs.writeFileSync(abs, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, 'utf8'));
    rec.created = true;
    return rec.rel;
  }

  function restoreAll() {
    const report = { restored: [], removedFiles: [], removedDirs: [] };
    for (const rec of files.values()) {
      if (!rec.existed) continue;
      const current = fs.existsSync(rec.abs) ? sha256(fs.readFileSync(rec.abs)) : null;
      if (current !== rec.sha) {
        fs.writeFileSync(rec.abs, rec.bytes);
        report.restored.push(rec.rel);
      }
      const after = sha256(fs.readFileSync(rec.abs));
      if (after !== rec.sha) throw new Error(`repo-guard: restore failed for ${rec.rel}: sha256 ${after} != ${rec.sha}`);
    }
    // Byte snapshots have no inverse for a path that did not exist; creates get their own.
    for (const rec of files.values()) {
      if (rec.existed || !rec.created) continue;
      if (fs.existsSync(rec.abs)) fs.unlinkSync(rec.abs);
      if (fs.existsSync(rec.abs)) throw new Error(`repo-guard: could not remove created file ${rec.rel}`);
      report.removedFiles.push(rec.rel);
      for (const d of [...rec.dirsCreated].reverse()) {
        if (fs.existsSync(d)) fs.rmdirSync(d);
        if (fs.existsSync(d)) throw new Error(`repo-guard: could not remove created directory ${relOf(d)}`);
        report.removedDirs.push(relOf(d));
      }
      rec.dirsCreated = [];
      rec.created = false;
    }
    if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath);
    journalWritten = false;
    files.clear();
    return report;
  }

  function assertPorcelainUnchanged() {
    const report = { fatal: [], tolerated: [], residue: [] };
    if (useGit) {
      const now = readPorcelain();
      const baseSet = new Set(baselinePorcelain);
      const nowSet = new Set(now);
      const diverged = [
        ...now.filter((l) => !baseSet.has(l)).map((l) => `+ ${l}`),
        ...baselinePorcelain.filter((l) => !nowSet.has(l)).map((l) => `- ${l}`),
      ];
      for (const line of diverged) {
        const p = porcelainPath(line.slice(2));
        if (readPaths.some((r) => prefixMatch(p, r))) report.fatal.push(line);
        else if (isResidue(p)) report.residue.push(line);
        else report.tolerated.push(line);
      }
    }
    // git never reports an empty directory, so an interrupted npm test leaves
    // tests/playground-git/src/... invisible to porcelain.
    const nowTests = listRecursive(path.join(repoRoot, 'tests'));
    const baseTests = new Set(baselineTests);
    for (const entry of nowTests) {
      if (baseTests.has(entry)) continue;
      report.residue.push(`+ tests/${entry}`);
    }
    if (report.fatal.length > 0) {
      throw new Error(
        `repo-guard: working tree diverged on paths the suite reads:\n` + report.fatal.map((l) => `  ${l}`).join('\n')
      );
    }
    return report;
  }

  const onSignal = (sig) => {
    try {
      restoreAll();
      process.stderr.write(`\nrepo-guard: restored all snapshots after ${sig}\n`);
    } catch (e) {
      process.stderr.write(`\nrepo-guard: RESTORE FAILED after ${sig}: ${e.message}\njournal retained at ${journalPath}\n`);
    }
    for (const s of SIGNALS) process.removeAllListeners(s);
    process.kill(process.pid, sig);
  };
  for (const s of SIGNALS) process.on(s, () => onSignal(s));

  return {
    snapshot,
    writeJournal,
    write,
    create,
    restoreAll,
    assertPorcelainUnchanged,
  };
}

function selftest() {
  const GUARD = fileURLToPath(import.meta.url);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-guard-selftest-'));
  const journal = path.join(root, 'journal-store', 'journal.json');
  const checks = [];
  const ok = (name, cond, detail = '') => {
    checks.push({ name, cond, detail });
    process.stdout.write(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`);
  };

  try {
    const target = path.join(root, 'artifact.yaml');
    const original = 'key: value\nother: 1\n';
    fs.writeFileSync(target, original);
    const originalSha = sha256(Buffer.from(original));
    const g = createGuard({ repoRoot: root, journalPath: journal, useGit: false });
    g.snapshot('artifact.yaml');
    g.writeJournal();
    ok('journal exists after writeJournal()', fs.existsSync(journal));
    g.write('artifact.yaml', 'key: MUTATED\nother: 1\n');
    ok('write() changed the file', fs.readFileSync(target, 'utf8') !== original);
    let threw = false;
    try { g.write('artifact.yaml', original); } catch { threw = true; }
    ok('write() refuses restoring the snapshot bytes as an edit', threw);
    let threw2 = false;
    try { g.write('never-snapshotted.txt', 'x'); } catch { threw2 = true; }
    ok('write() refuses an un-snapshotted path', threw2);
    g.restoreAll();
    ok('restore returned the exact bytes', sha256(fs.readFileSync(target)) === originalSha);
    ok('journal removed after verified restore', !fs.existsSync(journal));

    const g2 = createGuard({ repoRoot: root, journalPath: journal, useGit: false });
    g2.snapshot('nested/deep/new-file.md');
    g2.writeJournal();
    g2.create('nested/deep/new-file.md', '# created\n');
    ok('create() made the file', fs.existsSync(path.join(root, 'nested/deep/new-file.md')));
    let threw3 = false;
    try { g2.create('nested/deep/new-file.md', 'x'); } catch { threw3 = true; }
    ok('create() refuses an existing path', threw3);
    g2.restoreAll();
    ok('created file removed', !fs.existsSync(path.join(root, 'nested/deep/new-file.md')));
    ok('created dirs removed in reverse order', !fs.existsSync(path.join(root, 'nested/deep')) && !fs.existsSync(path.join(root, 'nested')));

    const staleChild = path.join(root, 'stale-child.mjs');
    fs.writeFileSync(staleChild, [
      `import { createGuard } from ${JSON.stringify(GUARD)};`,
      `createGuard({ repoRoot: ${JSON.stringify(root)}, journalPath: ${JSON.stringify(journal)}, useGit: false });`,
      `process.stdout.write('NOT-REFUSED');`,
    ].join('\n'));
    fs.mkdirSync(path.dirname(journal), { recursive: true });
    fs.writeFileSync(journal, JSON.stringify({ pid: 1, repoRoot: root, entries: [{ targetPath: path.join(root, 'artifact.yaml'), absent: false, sha256: originalSha, bytes: Buffer.from(original).toString('base64'), dirsToCreate: [] }] }));
    const stale = spawnSync(process.execPath, [staleChild], { encoding: 'utf8' });
    ok('stale journal refuses with exit 2', stale.status === 2, `exit=${stale.status}`);
    ok('refusal names the held file', stale.stderr.includes('artifact.yaml'));
    fs.unlinkSync(journal);

    const sigChild = path.join(root, 'sigint-child.mjs');
    fs.writeFileSync(sigChild, [
      `import { createGuard } from ${JSON.stringify(GUARD)};`,
      `const g = createGuard({ repoRoot: ${JSON.stringify(root)}, journalPath: ${JSON.stringify(journal)}, useGit: false });`,
      `g.snapshot('artifact.yaml');`,
      `g.writeJournal();`,
      `g.write('artifact.yaml', 'key: INTERRUPTED\\n');`,
      `process.stdout.write('READY\\n');`,
      `setInterval(() => {}, 1000);`,
    ].join('\n'));
    const child = spawn(process.execPath, [sigChild], { stdio: ['ignore', 'pipe', 'pipe'] });
    const done = new Promise((resolve) => {
      let buf = '';
      child.stdout.on('data', (d) => {
        buf += d.toString();
        if (buf.includes('READY')) child.kill('SIGINT');
      });
      child.on('exit', (code, signal) => resolve({ code, signal }));
    });
    return done.then((exit) => {
      ok('child died from the signal, not a clean exit', exit.signal === 'SIGINT' || exit.code !== 0, `code=${exit.code} signal=${exit.signal}`);
      ok('SIGINT handler restored the file', sha256(fs.readFileSync(target)) === originalSha, fs.readFileSync(target, 'utf8').slice(0, 20));
      ok('SIGINT handler removed the journal', !fs.existsSync(journal));
      const failed = checks.filter((c) => !c.cond);
      process.stdout.write(`\n${checks.length - failed.length}/${checks.length} guard self-test checks passed\n`);
      fs.rmSync(root, { recursive: true, force: true });
      process.exit(failed.length === 0 ? 0 : 1);
    });
  } catch (e) {
    process.stderr.write(`repo-guard selftest error: ${e.stack}\n`);
    fs.rmSync(root, { recursive: true, force: true });
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--selftest')) {
    await selftest();
  } else {
    process.stderr.write('usage: node tests/lib/repo-guard.mjs --selftest\n');
    process.exit(2);
  }
}
