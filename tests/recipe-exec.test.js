#!/usr/bin/env node
// Executes every command recipe the five shipped documents publish, against a
// declared expected payload. Named *.test.js because PHASES.md fixes the acceptance
// command, but it is NOT a `node --test` file: the mutation harness parses `npm test`
// output as TAP, so this runner must emit nothing TAP-shaped — `ok` carries no digit,
// there is no plan line, and every diagnostic is prefixed `#recipe `.
//
// Two declared modes. `--hermetic` runs DOC_CHECKS only and is what `npm test` gains;
// unflagged runs the whole universe and is `npm run test:recipes`. The mode selects a
// frozen check list; it never changes what a check asserts.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseDoc } from './lib/markdown-sections.mjs';
import { resolveTool } from './lib/tools.mjs';
import { estimateTokens } from './lib/token-estimate.mjs';
import {
  ALLOWED_HEADS,
  CANONICAL_LABEL_RESIDUAL,
  COMMAND_SPANS,
  COMMAND_SPAN_CLIS,
  COMPLEXITY_TIERS,
  ESCALATION_TRIGGERS,
  ESCALATION_TRIGGER_BRIEFS,
  EXECUTION_TIERS,
  HARNESS_BINDINGS,
  HARNESS_SKILL_OVERLAYS,
  DOC_CHECK_COUNT,
  DOC_TOOLS,
  FULL_CHECK_COUNT,
  HARNESS_LABEL_RESIDUAL,
  LABEL_RESIDUAL_RE,
  LIVE_CHECKS,
  LIVE_TOOLS,
  PCP_SYMBOLS,
  RECIPE_FILES,
  RTK_VERBS,
  RTK_VERBS_FLOOR,
  RUNNABLE_RECIPES,
  SELFTEST_DOC,
  SELFTEST_EXPECTED,
  SHORTCODE_REGISTRIES,
  STATIC_BLOCKS,
  TOKENSAVE_READONLY_TOOLS,
  TOKENSAVE_TOOL_PARAMS,
  TOKENSAVE_VERBS,
  TOKEN_BUDGET,
  TOKEN_BUDGET_DOC_SITES,
  TIER_TABLE_DOCS,
  TOKEN_BUDGET_GATE_SITES,
} from './fixtures/recipes.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --hermetic is the only accepted argument: a flag that can take a filter is a skip
// mechanism, and this project's log records that an allowance on a gate gets used.
const argv = process.argv.slice(2);
const HERMETIC = argv.length === 1 && argv[0] === '--hermetic';
if (argv.length > 1 || (argv.length === 1 && !HERMETIC)) {
  console.log(`BLOCKED unrecognised argument(s): ${argv.join(' ')} — the only accepted argument is --hermetic`);
  process.exit(3);
}

class Blocked extends Error {}

function diag(text) {
  for (const line of String(text).split('\n')) console.log(`#recipe ${line}`);
}

function repoPath(rel) {
  return path.join(REPO_ROOT, rel);
}

// ---------------------------------------------------------------------------
// Extraction: the body executed is always the one read out of the document.
// ---------------------------------------------------------------------------

const DOCS = new Map();
for (const f of RECIPE_FILES) {
  DOCS.set(f.key, { ...f, doc: parseDoc(fs.readFileSync(repoPath(f.path), 'utf8')) });
}

function docFor(key) {
  return DOCS.get(key).doc;
}

function filePath(key) {
  return DOCS.get(key).path;
}

function isCommandSpan(text) {
  const head = text.trim().split(/\s+/)[0].replace(/[:;,.]+$/, '');
  return COMMAND_SPAN_CLIS.includes(head);
}

function commandSpansOf(doc) {
  return doc.codeSpans.filter((s) => isCommandSpan(s.text));
}

// Quote-aware: `yq '.a | select(...)'` is one segment, and a $( ) substitution
// contributes its own segments rather than hiding its heads inside the outer line.
function pipeSegments(text) {
  const out = [];
  let cur = '';
  let quote = null;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (quote) {
      if (c === '\\' && quote === '"') { cur += c + (text[i + 1] ?? ''); i += 2; continue; }
      if (c === quote) quote = null;
      cur += c; i += 1; continue;
    }
    if (c === "'" || c === '"') { quote = c; cur += c; i += 1; continue; }
    if (c === '$' && text[i + 1] === '(') {
      const close = matchParen(text, i + 2);
      if (close < 0) throw new Error(`unbalanced $( in: ${text}`);
      out.push(...pipeSegments(text.slice(i + 2, close)));
      i = close + 1; continue;
    }
    if (c === '|') { out.push(cur); cur = ''; i += 1; continue; }
    cur += c; i += 1;
  }
  out.push(cur);
  return out;
}

function matchParen(text, start) {
  let depth = 1;
  let quote = null;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (quote) {
      if (c === '\\' && quote === '"') { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

function shellTokens(segment) {
  const tokens = [];
  let cur = '';
  let started = false;
  let quote = null;
  for (let i = 0; i < segment.length; i += 1) {
    const c = segment[i];
    if (quote) {
      if (c === '\\' && quote === '"') { cur += segment[i + 1] ?? ''; i += 1; started = true; continue; }
      if (c === quote) { quote = null; continue; }
      cur += c; started = true; continue;
    }
    if (c === "'" || c === '"') { quote = c; started = true; continue; }
    if (/\s/.test(c)) { if (started) tokens.push(cur); cur = ''; started = false; continue; }
    cur += c; started = true;
  }
  if (started) tokens.push(cur);
  return tokens;
}

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

function stripAssignments(segment) {
  let s = segment.trimStart();
  while (ASSIGNMENT.test(s)) s = s.slice(s.indexOf('=') + 1).trimStart();
  return s;
}

// A `node -e` fence is one script, not a line list: `for`, `}` and `console.log(` are
// not command heads. The body stays pinned byte-for-byte by commandLines, which is
// what makes checking its head once safe.
function isScriptCommand(text) {
  const tokens = shellTokens(pipeSegments(text)[0] ?? '');
  return tokens[0] === 'node' && tokens.slice(1).includes('-e');
}

function commandUnits(text) {
  if (isScriptCommand(text)) return [text];
  return text.split('\n').map((l) => l.trim()).filter((l) => l !== '' && !l.startsWith('#'));
}

function headCheck(text) {
  const problems = [];
  for (const unit of commandUnits(text)) {
    for (const seg of pipeSegments(unit)) {
      const stripped = stripAssignments(seg);
      if (stripped.trim() === '') continue;
      const head = shellTokens(stripped)[0];
      if (!ALLOWED_HEADS.includes(head)) problems.push(`head '${head}' not in ALLOWED_HEADS (${ALLOWED_HEADS.join(', ')})`);
    }
  }
  return problems;
}

function tokensaveInvocations(text) {
  const found = [];
  for (const unit of commandUnits(text)) {
    for (const seg of pipeSegments(unit)) {
      const tokens = shellTokens(stripAssignments(seg));
      if (tokens[0] === 'tokensave' && tokens[1] === 'tool') found.push(tokens.slice(2));
    }
  }
  return found;
}

function extractCommands(body, unit) {
  if (unit) return [body.trim()];
  const lines = body.split('\n');
  const out = [];
  let pending = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (pending !== null) {
      pending = `${pending}\n${line}`;
      if (!line.endsWith('\\')) { out.push(pending); pending = null; }
      continue;
    }
    if (line === '' || line.startsWith('#')) continue;
    if (line.endsWith('\\')) { pending = line; continue; }
    out.push(line);
  }
  if (pending !== null) out.push(pending);
  return out;
}

// ---------------------------------------------------------------------------
// Per-recipe preparation, computed once and shared by the C and D suites.
// ---------------------------------------------------------------------------

const PREP = new Map();
for (const r of RUNNABLE_RECIPES) {
  const doc = docFor(r.file);
  const fence = doc.fences[r.fenceIndex];
  const declared = r.commands.map((c) => c.text);
  if (!fence) {
    PREP.set(r.id, {
      resolved: false,
      reason: `declared fence index ${r.fenceIndex} does not exist in ${filePath(r.file)} (${doc.fences.length} fences found)`,
      commands: [], countMatches: false, headProblems: [],
    });
    continue;
  }
  const commands = extractCommands(fence.body, r.unit);
  PREP.set(r.id, {
    resolved: true, fence, commands,
    countMatches: commands.length === declared.length,
    headProblems: commands.flatMap((c) => headCheck(c)),
  });
}

// ---------------------------------------------------------------------------
// Assertion vocabulary
// ---------------------------------------------------------------------------

function jsonPath(value, p) {
  if (p === '') return value;
  if (p.startsWith('.')) return jsonPath(value, p.slice(1));
  if (p.startsWith('[]')) {
    if (!Array.isArray(value)) throw new Error(`[] applied to a non-array at '${p}'`);
    return value.map((v) => jsonPath(v, p.slice(2)));
  }
  const idx = /^\[(\d+)\]/.exec(p);
  if (idx) {
    if (!Array.isArray(value)) throw new Error(`[${idx[1]}] applied to a non-array at '${p}'`);
    return jsonPath(value[Number(idx[1])], p.slice(idx[0].length));
  }
  const key = /^[A-Za-z_][A-Za-z0-9_]*/.exec(p);
  if (!key) throw new Error(`unparsable assertion path '${p}'`);
  if (value === null || typeof value !== 'object') throw new Error(`'${key[0]}' read from a non-object`);
  return jsonPath(value[key[0]], p.slice(key[0].length));
}

function parseJsonOrNull(text) {
  try { return { ok: true, value: JSON.parse(text) }; } catch { return { ok: false, value: null }; }
}

function applyAssertion(a, out) {
  const kind = Object.keys(a)[0];
  const arg = a[kind];
  const json = () => {
    const p = parseJsonOrNull(out);
    if (!p.ok) throw new Error(`stdout is not JSON, required by ${kind}`);
    return p.value;
  };
  switch (kind) {
    case 'contains':
      if (!out.includes(arg)) throw new Error(`stdout does not contain ${JSON.stringify(arg)}`);
      return;
    case 'maxTokens': {
      const n = estimateTokens(out);
      if (!(n < arg)) throw new Error(`estimated ${n} tokens, bound is < ${arg}`);
      return;
    }
    case 'jsonEq': {
      const v = jsonPath(json(), arg[0]);
      if (v !== arg[1]) throw new Error(`at '${arg[0]}': ${JSON.stringify(v)} !== ${JSON.stringify(arg[1])}`);
      return;
    }
    case 'jsonMin': {
      const v = jsonPath(json(), arg[0]);
      if (typeof v !== 'number' || !(v >= arg[1])) throw new Error(`at '${arg[0]}': ${JSON.stringify(v)} is not >= ${arg[1]}`);
      return;
    }
    case 'jsonMinLen': {
      const v = jsonPath(json(), arg[0]);
      if (!Array.isArray(v) || !(v.length >= arg[1])) throw new Error(`at '${arg[0]}': not an array of length >= ${arg[1]}`);
      return;
    }
    case 'jsonSuperset': {
      const v = jsonPath(json(), arg[0]);
      if (!Array.isArray(v)) throw new Error(`at '${arg[0]}': not an array`);
      const missing = arg[1].filter((x) => !v.includes(x));
      if (missing.length) throw new Error(`at '${arg[0]}': missing ${JSON.stringify(missing)}`);
      return;
    }
    case 'jsonEndsWith': {
      const v = jsonPath(json(), arg[0]);
      if (typeof v !== 'string' || !v.endsWith(arg[1])) throw new Error(`at '${arg[0]}': ${JSON.stringify(v)} does not end with ${JSON.stringify(arg[1])}`);
      return;
    }
    case 'jsonContains': {
      const v = jsonPath(json(), arg[0]);
      if (typeof v !== 'string' || !v.includes(arg[1])) throw new Error(`at '${arg[0]}': does not contain ${JSON.stringify(arg[1])}`);
      return;
    }
    case 'jsonKeysSuperset': {
      const keys = Object.keys(json());
      const missing = arg.filter((k) => !keys.includes(k));
      if (missing.length) throw new Error(`top-level keys missing ${JSON.stringify(missing)}`);
      return;
    }
    case 'jsonAllInt': {
      const root = json();
      for (const p of arg[0]) {
        const v = jsonPath(root, p);
        if (!Number.isInteger(v) || !(v > 0)) throw new Error(`at '${p}': ${JSON.stringify(v)} is not an integer ${arg[1]}`);
      }
      return;
    }
    case 'regexEq': {
      const m = new RegExp(arg[0], 'm').exec(out);
      if (!m) throw new Error(`stdout does not match /${arg[0]}/m`);
      if (m[1] !== arg[1]) throw new Error(`capture 1 is ${JSON.stringify(m[1])}, expected ${JSON.stringify(arg[1])}`);
      return;
    }
    case 'regexCaptureMin': {
      const m = new RegExp(arg[0], 'm').exec(out);
      if (!m) throw new Error(`stdout does not match /${arg[0]}/m`);
      const n = Number.parseInt(m[1], 10);
      if (!(n >= arg[1])) throw new Error(`capture 1 is ${n}, floor is >= ${arg[1]}`);
      return;
    }
    default:
      throw new Error(`unknown assertion kind '${kind}'`);
  }
}

// Applied to every executed command on top of its declared assertion. `count: 0` and a
// bare `[]`/`{}` root are the exact shapes the broken recipes returned at exit 0.
function universalPostCondition(out) {
  if (out === '') throw new Error('stdout is empty');
  if (/^No .* found\.$/.test(out)) throw new Error(`stdout is a not-found message: ${out}`);
  const p = parseJsonOrNull(out);
  if (!p.ok) return;
  const root = p.value;
  if (Array.isArray(root) && root.length === 0) throw new Error('JSON root is an empty array');
  if (root !== null && !Array.isArray(root) && typeof root === 'object' && Object.keys(root).length === 0) {
    throw new Error('JSON root is an empty object');
  }
  if (root !== null && typeof root === 'object' && !Array.isArray(root)) {
    for (const [k, v] of Object.entries(root)) {
      if (/(^|_)count$/.test(k) && v === 0) throw new Error(`top-level '${k}' is 0`);
    }
  }
}

function runCommand(text) {
  const r = spawnSync('sh', ['-c', text], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  return { status: r.status, stdout: (r.stdout ?? '').trim(), stderr: (r.stderr ?? '').trim() };
}

// ---------------------------------------------------------------------------
// Shared helpers for the S, X and E suites
// ---------------------------------------------------------------------------

function yqJsonOfText(text) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'recipe-yaml-'));
  const file = path.join(tmp, 'block.yaml');
  try {
    fs.writeFileSync(file, `${text}\n`);
    const r = spawnSync(resolveTool('yq'), ['-o=json', '.', file], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`yq rejected the block: ${(r.stderr ?? '').trim()}`);
    return JSON.parse(r.stdout);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function packageScripts() {
  return Object.keys(JSON.parse(fs.readFileSync(repoPath('package.json'), 'utf8')).scripts ?? {});
}

function sectionLines(doc, headingText) {
  const i = doc.headings.findIndex((h) => h.text === headingText);
  if (i < 0) throw new Error(`no heading '${headingText}'`);
  const h = doc.headings[i];
  const next = doc.headings.find((o, j) => j > i && o.level <= h.level);
  return doc.bodyLines.slice(h.index + 1, next ? next.index : doc.bodyLines.length);
}

// Both shapes the docs use: a `- **Tier N (...)**` bullet and a `| **Tier N (...)** |` table row.
// Restricted to tier labels so a section may also carry ordinary bolded bullets.
function tierLabels(lines) {
  return lines
    .map((l) => /^(?:- |\| )\*\*(Tier .+?)\*\*/.exec(l.trim()))
    .filter(Boolean)
    .map((m) => m[1]);
}

function markdownFilesUnder(dir, skip) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (skip && skip(full)) continue;
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function escapeForRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countMatches(text, re) {
  return (text.match(new RegExp(re.source, `${re.flags.replace('g', '')}g`)) ?? []).length;
}

// Both patterns capture the same numeral at the same offset in `sub-300 token`;
// deduplicating by offset makes the site count a count of sites, not of patterns.
function tokenBudgetSites() {
  const files = [
    'plugins/pcp/skills/constitution-query/SKILL.md',
    'plugins/pcp/skills/adr-manager/SKILL.md',
    'plugins/pcp/skills/code-intelligence/SKILL.md',
    'ai-docs/README.md',
  ];
  const sites = [];
  for (const rel of files) {
    const text = fs.readFileSync(repoPath(rel), 'utf8');
    const seen = new Map();
    for (const re of [/\b(\d{2,4}) tokens?\b/g, /sub-(\d{2,4}) token/g]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) seen.set(m.index + m[0].indexOf(m[1]), m[1]);
    }
    for (const [offset, value] of [...seen].sort((a, b) => a[0] - b[0])) {
      sites.push({ file: rel, line: text.slice(0, offset).split('\n').length, value });
    }
  }
  return sites;
}

function toolHelpParams(tool) {
  const r = spawnSync(resolveTool('tokensave'), ['tool', tool, '--help'], { encoding: 'utf8' });
  const lines = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n');
  const start = lines.findIndex((l) => l === 'Parameters:');
  const params = { required: [], optional: [] };
  if (start < 0) return params;
  // Stop at the blank line or `Reserved flags:` — the reserved-flag prose is not a
  // parameter list, and a parser that matches `--` anywhere invents four optionals.
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || /^Reserved flags:/.test(line)) break;
    const m = /^\s+--(\S+)\s+\S+\s+(required|optional)\b/.exec(line);
    if (m) params[m[2]].push(m[1].replace(/-/g, '_'));
  }
  return params;
}

function rtkCommands() {
  const r = spawnSync(resolveTool('rtk'), ['--help'], { encoding: 'utf8' });
  const lines = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n');
  const start = lines.findIndex((l) => /^Commands:/.test(l));
  if (start < 0) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') break;
    const m = /^\s+(\S+)\s\s/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

function tokensaveEditTools() {
  const r = spawnSync(resolveTool('tokensave'), ['tool'], { encoding: 'utf8' });
  const lines = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n');
  const out = [];
  let inEdit = false;
  for (const line of lines) {
    if (/^\[.+\]$/.test(line.trim())) { inEdit = line.trim() === '[edit]'; continue; }
    if (!inEdit) continue;
    const m = /^\s+(\S+)\s\s/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

function eqArray(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function eqSet(a, b) {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return eqArray(sa, sb);
}

function eqMultiset(a, b) {
  return eqArray([...a].sort(), [...b].sort());
}

// ---------------------------------------------------------------------------
// The check universe, in report order
// ---------------------------------------------------------------------------

const checks = [];
const add = (id, name, run) => checks.push({ id, name, run });

// --- Preconditions -----------------------------------------------------------

add('A1', 'every DOC_TOOL resolves on PATH', () => {
  for (const t of DOC_TOOLS) {
    try { resolveTool(t); } catch (e) { throw new Blocked(e.message); }
  }
});

add('A6', 'every LIVE_TOOL resolves on PATH', () => {
  for (const t of LIVE_TOOLS) {
    try { resolveTool(t); } catch (e) { throw new Blocked(e.message); }
  }
});

add('A2', 'the code graph indexes the PCP CLI', () => {
  const r = spawnSync(resolveTool('tokensave'),
    ['tool', 'entities', '--file', 'plugins/pcp/skills/pcp/scripts/pcp.js'],
    { cwd: REPO_ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Blocked(`tokensave tool entities exited ${r.status}; run 'tokensave sync'`);
  const p = parseJsonOrNull((r.stdout ?? '').trim());
  const names = p.ok && Array.isArray(p.value?.symbols) ? p.value.symbols.map((s) => s.name) : [];
  const missing = PCP_SYMBOLS.filter((s) => !names.includes(s));
  if (missing.length) throw new Blocked(`graph does not index ${JSON.stringify(missing)}; run 'tokensave sync'`);
});

add('A3', 'declared tokensave tool parameters match the installed binary', () => {
  const bad = [];
  for (const [tool, declared] of Object.entries(TOKENSAVE_TOOL_PARAMS)) {
    const actual = toolHelpParams(tool);
    if (!eqSet(declared.required, actual.required) || !eqSet(declared.optional, actual.optional)) {
      bad.push(`${tool}: declared ${JSON.stringify(declared)} vs binary ${JSON.stringify(actual)}`);
    }
  }
  if (bad.length) throw new Error(bad.join('; '));
});

add('A4', 'declared rtk verbs are advertised by the installed rtk', () => {
  const parsed = rtkCommands();
  const missing = RTK_VERBS.filter((v) => !parsed.includes(v));
  if (missing.length) throw new Error(`RTK_VERBS not advertised: ${JSON.stringify(missing)}`);
  const floor = RTK_VERBS_FLOOR.filter((v) => !parsed.includes(v));
  if (floor.length) throw new Error(`RTK_VERBS_FLOOR not advertised (parser is probably broken): ${JSON.stringify(floor)}`);
});

add('A5', 'the declared read-only tool set is disjoint from the binary [edit] category', () => {
  const edit = tokensaveEditTools();
  if (edit.length === 0) throw new Error('parsed an empty [edit] category; the parser is broken');
  const overlap = TOKENSAVE_READONLY_TOOLS.filter((t) => edit.includes(t));
  if (overlap.length) throw new Error(`read-only set overlaps [edit]: ${JSON.stringify(overlap)}`);
});

// --- Partition ---------------------------------------------------------------

add('B4', 'the check partition is the declared one', () => {
  const universe = checks.map((c) => c.id);
  const live = universe.filter((id) => LIVE_CHECKS.includes(id));
  const doc = universe.filter((id) => !LIVE_CHECKS.includes(id));
  if (LIVE_CHECKS.length === 0) throw new Error('LIVE_CHECKS is empty');
  if (!eqSet(live, LIVE_CHECKS)) {
    const unknown = LIVE_CHECKS.filter((id) => !universe.includes(id));
    throw new Error(`LIVE_CHECKS is not a subset of the universe: ${JSON.stringify(unknown)}`);
  }
  if (doc.length + live.length !== universe.length) throw new Error('the partition is not a partition');
  if (doc.some((id) => live.includes(id))) throw new Error('DOC_CHECKS and LIVE_CHECKS overlap');
  if (universe.length !== FULL_CHECK_COUNT) throw new Error(`universe is ${universe.length}, declared ${FULL_CHECK_COUNT}`);
  if (doc.length !== DOC_CHECK_COUNT) throw new Error(`DOC_CHECKS is ${doc.length}, declared ${DOC_CHECK_COUNT}`);
  const selected = selectedIds();
  const expected = HERMETIC ? doc : universe;
  if (!eqSet(selected, expected)) throw new Error('the selected check set is not the declared one for this mode');
  const expectedCount = HERMETIC ? DOC_CHECK_COUNT : FULL_CHECK_COUNT;
  if (selected.length !== expectedCount) throw new Error(`about to run ${selected.length} checks, declared ${expectedCount}`);
});

// --- Inventory closure and instrument self-test -------------------------------

const RUNNABLE_INFOS = ['bash', 'sh'];

for (const f of RECIPE_FILES) {
  add(`B1.${f.key}`, `${f.path} fence inventory equals the declared one`, () => {
    const doc = docFor(f.key);
    const declared = new Map();
    for (const r of RUNNABLE_RECIPES) if (r.file === f.key) declared.set(r.fenceIndex, { kind: 'runnable', id: r.id });
    for (const b of STATIC_BLOCKS) if (b.file === f.key) declared.set(b.fenceIndex, { kind: 'static', id: b.id, info: b.info });
    const extracted = doc.fences.map((x) => x.index);
    if (!eqSet(extracted, [...declared.keys()])) {
      throw new Error(`extracted fences ${JSON.stringify(extracted)}, declared ${JSON.stringify([...declared.keys()].sort((a, b) => a - b))}`);
    }
    for (const fence of doc.fences) {
      const d = declared.get(fence.index);
      if (d.kind === 'runnable') {
        if (!RUNNABLE_INFOS.includes(fence.info)) throw new Error(`fence ${fence.index} (${d.id}) has info '${fence.info}', declared runnable`);
      } else if (fence.info !== d.info) {
        throw new Error(`fence ${fence.index} (${d.id}) has info '${fence.info}', declared '${d.info}'`);
      }
    }
  });
}

for (const f of RECIPE_FILES) {
  add(`B2.${f.key}`, `${f.path} command-span inventory equals the declared one`, () => {
    const extracted = commandSpansOf(docFor(f.key)).map((s) => s.text);
    const declared = COMMAND_SPANS.filter((s) => s.file === f.key).map((s) => s.text);
    if (!eqMultiset(extracted, declared)) {
      throw new Error(`extracted ${JSON.stringify(extracted)}, declared ${JSON.stringify(declared)}`);
    }
  });
}

add('B3', 'the extractor reproduces the declared self-test extraction', () => {
  const doc = parseDoc(SELFTEST_DOC);
  const fences = doc.fences.map((f) => ({ index: f.index, info: f.info, body: f.body }));
  if (JSON.stringify(fences) !== JSON.stringify(SELFTEST_EXPECTED.fences)) {
    throw new Error(`fences ${JSON.stringify(fences)} !== declared ${JSON.stringify(SELFTEST_EXPECTED.fences)}`);
  }
  const spans = commandSpansOf(doc).map((s) => s.text);
  if (!eqArray(spans, SELFTEST_EXPECTED.commandSpans)) {
    throw new Error(`command spans ${JSON.stringify(spans)} !== declared ${JSON.stringify(SELFTEST_EXPECTED.commandSpans)}`);
  }
});

// --- C: static shape ----------------------------------------------------------

for (const r of RUNNABLE_RECIPES) {
  add(`C:${r.id}`, `${r.id} matches its declared command lines and shape`, () => {
    const prep = PREP.get(r.id);
    if (!prep.resolved) throw new Error(prep.reason);
    const declared = r.commands.map((c) => c.text);
    if (!prep.countMatches) {
      throw new Error(`extracted ${prep.commands.length} command(s), declared ${declared.length}`);
    }
    for (let i = 0; i < declared.length; i += 1) {
      if (prep.commands[i] !== declared[i]) {
        throw new Error(`command ${i + 1} is ${JSON.stringify(prep.commands[i])}, declared ${JSON.stringify(declared[i])}`);
      }
    }
    if (prep.headProblems.length) throw new Error(prep.headProblems.join('; '));
    for (const cmd of prep.commands) {
      for (const args of tokensaveInvocations(cmd)) {
        const tool = args[0];
        if (!TOKENSAVE_READONLY_TOOLS.includes(tool)) throw new Error(`'${tool}' is not in TOKENSAVE_READONLY_TOOLS`);
        const params = TOKENSAVE_TOOL_PARAMS[tool];
        const flags = args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).replace(/-/g, '_'));
        const allowed = [...params.required, ...params.optional];
        const unknown = flags.filter((fl) => !allowed.includes(fl));
        if (unknown.length) throw new Error(`'${tool}' given unknown flag(s) ${JSON.stringify(unknown)}`);
        const missing = params.required.filter((fl) => !flags.includes(fl));
        if (missing.length) throw new Error(`'${tool}' missing required parameter(s) ${JSON.stringify(missing)}`);
      }
    }
    r.commands.forEach((c, i) => {
      if (!Array.isArray(c.assert) || c.assert.length === 0) throw new Error(`command ${i + 1} carries no declared assertion`);
    });
  });
}

// --- S: static block validators ------------------------------------------------

for (const b of STATIC_BLOCKS) {
  add(b.check, `${b.id} is a valid ${b.info} block`, () => {
    const doc = docFor(b.file);
    const fence = doc.fences[b.fenceIndex];
    if (!fence) {
      throw new Error(`declared fence index ${b.fenceIndex} does not exist in ${filePath(b.file)} (${doc.fences.length} fences found)`);
    }
    if (fence.info !== b.info) throw new Error(`fence ${b.fenceIndex} has info '${fence.info}', declared '${b.info}'`);
    if (b.info === 'json') {
      const p = parseJsonOrNull(fence.body.trim());
      if (!p.ok) throw new Error('block is not valid JSON');
      if (p.value.tool !== b.tool) throw new Error(`.tool is ${JSON.stringify(p.value.tool)}, declared ${JSON.stringify(b.tool)}`);
      const keys = Object.keys(p.value.arguments ?? {});
      if (!eqSet(keys, b.argKeys)) throw new Error(`argument keys ${JSON.stringify(keys)}, declared ${JSON.stringify(b.argKeys)}`);
      return;
    }
    if (b.info === 'markdown') {
      const got = parseDoc(fence.body).headings.map((h) => ({ level: h.level, text: h.text }));
      if (JSON.stringify(got) !== JSON.stringify(b.headings)) {
        throw new Error(`headings ${JSON.stringify(got)} !== declared ${JSON.stringify(b.headings)}`);
      }
      return;
    }
    const parsed = yqJsonOfText(fence.body);
    const top = Object.keys(parsed);
    if (!eqArray(top, b.topKeys)) throw new Error(`top-level keys ${JSON.stringify(top)}, declared ${JSON.stringify(b.topKeys)}`);
    const entryKeys = Object.keys(parsed.decisions[0]);
    if (!eqArray(entryKeys, b.entryKeys)) throw new Error(`entry keys ${JSON.stringify(entryKeys)}, declared ${JSON.stringify(b.entryKeys)}`);
  });
}

// --- X: command-span verbs -----------------------------------------------------

const PLACEHOLDER = /^[<[].*[>\]]$/;

for (const s of COMMAND_SPANS) {
  add(s.check, `${filePath(s.file)} span \`${s.text}\``, () => {
    const present = commandSpansOf(docFor(s.file)).filter((x) => x.text === s.text);
    if (present.length < (s.occurrence ?? 1)) {
      throw new Error(`declared span ${JSON.stringify(s.text)} occurs ${present.length} time(s), needed ${s.occurrence ?? 1}`);
    }
    const tokens = s.text.split(/\s+/);
    if (s.kind === 'binary') { resolveTool(s.cli); return; }
    if (s.kind === 'npm-script') {
      const scripts = packageScripts();
      if (!scripts.includes(s.verb)) throw new Error(`'${s.verb}' is not a package.json script (${scripts.join(', ')})`);
      return;
    }
    if (s.kind === 'mcp-form') {
      resolveTool(s.cli);
      const m = /tool:\s*"([^"]*)"/.exec(s.text);
      if (!m) throw new Error('no `tool: "…"` value in the MCP-form span');
      if (!PLACEHOLDER.test(m[1])) throw new Error(`tool value ${JSON.stringify(m[1])} is not a placeholder`);
      return;
    }
    const verbs = s.cli === 'rtk' ? RTK_VERBS : TOKENSAVE_VERBS;
    if (tokens[1] !== s.verb) throw new Error(`verb token is ${JSON.stringify(tokens[1])}, declared ${JSON.stringify(s.verb)}`);
    if (!verbs.includes(s.verb)) throw new Error(`'${s.verb}' is not a declared verb for ${s.cli}`);
    resolveTool(s.cli);
    if (s.kind === 'verb-placeholder') {
      if (!PLACEHOLDER.test(tokens[2] ?? '')) throw new Error(`token after the verb is ${JSON.stringify(tokens[2])}, expected a placeholder`);
      return;
    }
    if (s.kind === 'verb-tool') {
      if (!TOKENSAVE_READONLY_TOOLS.includes(s.tool)) throw new Error(`'${s.tool}' is not in TOKENSAVE_READONLY_TOOLS`);
      if (tokens[2] !== s.tool) throw new Error(`tool token is ${JSON.stringify(tokens[2])}, declared ${JSON.stringify(s.tool)}`);
    }
  });
}

// --- D: execution and payload ---------------------------------------------------

for (const r of RUNNABLE_RECIPES) {
  r.commands.forEach((c, i) => {
    const pos = r.unit ? 'u' : String(i + 1);
    add(`D:${r.id}.${pos}`, `${r.id} command ${pos} executes and returns its declared payload`, () => {
      const prep = PREP.get(r.id);
      if (!prep.resolved) throw new Error(prep.reason);
      if (!prep.countMatches) {
        throw new Error(`extracted ${prep.commands.length} command(s), declared ${r.commands.length} — not executed`);
      }
      // Never shell out to a head the C suite has not vetted, even when the content
      // pin has already failed: the pin is what makes execution of document text safe.
      if (prep.headProblems.length) throw new Error(`${prep.headProblems.join('; ')} — not executed`);
      const text = prep.commands[i];
      const res = runCommand(text);
      if (res.status !== 0) {
        diag(`command: ${text}`);
        if (res.stdout) diag(`stdout: ${res.stdout}`);
        if (res.stderr) diag(`stderr: ${res.stderr}`);
        throw new Error(`exited ${res.status}`);
      }
      try {
        universalPostCondition(res.stdout);
        for (const a of c.assert) applyAssertion(a, res.stdout);
      } catch (e) {
        diag(`command: ${text}`);
        diag(`stdout: ${res.stdout}`);
        throw e;
      }
    });
  });
}

// --- E: doc consistency ----------------------------------------------------------

add('E1', 'the Source of Truth bullet declares both registries', () => {
  const doc = docFor('constitution-query');
  const line = doc.bodyLines.find((l) => l.trimStart().startsWith('- **Source of Truth**'));
  if (!line) throw new Error('no `- **Source of Truth**` bullet');
  const spans = [...line.matchAll(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g)].map((m) => m[2].trim());
  const declared = SHORTCODE_REGISTRIES.map((r) => r.path);
  if (!eqSet(spans, declared)) throw new Error(`bullet names ${JSON.stringify(spans)}, declared ${JSON.stringify(declared)}`);
  const missing = SHORTCODE_REGISTRIES.filter((r) => !line.includes(r.scope)).map((r) => r.scope);
  if (missing.length) throw new Error(`bullet omits scope(s) ${JSON.stringify(missing)}`);
});

add('E2', '.pcp/MAP.json is git-ignored and not tracked', () => {
  const ignored = spawnSync('git', ['check-ignore', '-q', '.pcp/MAP.json'], { cwd: REPO_ROOT });
  if (ignored.status !== 0) throw new Error(`git check-ignore exited ${ignored.status}, expected 0`);
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '.pcp/MAP.json'], { cwd: REPO_ROOT, stdio: 'ignore' });
  if (tracked.status === 0) throw new Error('git ls-files --error-unmatch exited 0: the path is tracked');
});

add('E3a', 'MODEL_ROUTING.md complexity gate lists the declared tiers', () => {
  const doc = parseDoc(fs.readFileSync(repoPath('plugins/steps/MODEL_ROUTING.md'), 'utf8'));
  const labels = tierLabels(sectionLines(doc, 'Complexity gate'));
  if (!eqArray(labels, COMPLEXITY_TIERS)) throw new Error(`labels ${JSON.stringify(labels)} !== ${JSON.stringify(COMPLEXITY_TIERS)}`);
});

add('E3b', 'AGENTS.md points at the declared ladder instead of restating it', () => {
  const text = fs.readFileSync(repoPath('AGENTS.md'), 'utf8');
  const restated = COMPLEXITY_TIERS.filter((label) => text.includes(label));
  if (restated.length) throw new Error(`AGENTS.md restates ${JSON.stringify(restated)}`);
  const bare = countMatches(text, /\bTier [0-9]/g);
  if (bare) throw new Error(`AGENTS.md names a tier ${bare} time(s); the ladder lives in one place`);
  for (const pointer of ['constitution.execution', 'plugins/steps/MODEL_ROUTING.md']) {
    if (!text.includes(pointer)) throw new Error(`AGENTS.md does not point at ${pointer}`);
  }
});

add('E3d', 'every tier table carries exactly the declared labels', () => {
  for (const d of TIER_TABLE_DOCS) {
    const doc = parseDoc(fs.readFileSync(repoPath(d.path), 'utf8'));
    const labels = tierLabels(sectionLines(doc, d.heading));
    if (!eqArray(labels, COMPLEXITY_TIERS)) {
      throw new Error(`${d.path} lists ${JSON.stringify(labels)} !== ${JSON.stringify(COMPLEXITY_TIERS)}`);
    }
  }
});

add('E3c', 'the old routing vocabulary survives only where Phase 3 owns it', () => {
  const harnessDir = repoPath('plugins/steps/harnesses');
  const canonicalFiles = [
    ...markdownFilesUnder(repoPath('plugins/steps'), (p) => p === harnessDir),
    repoPath('AGENTS.md'),
  ];
  const canonical = canonicalFiles.reduce((n, f) => n + countMatches(fs.readFileSync(f, 'utf8'), LABEL_RESIDUAL_RE), 0);
  const harness = markdownFilesUnder(harnessDir, null)
    .reduce((n, f) => n + countMatches(fs.readFileSync(f, 'utf8'), LABEL_RESIDUAL_RE), 0);
  if (canonical !== CANONICAL_LABEL_RESIDUAL) throw new Error(`canonical residual ${canonical}, declared ${CANONICAL_LABEL_RESIDUAL}`);
  if (harness !== HARNESS_LABEL_RESIDUAL) throw new Error(`harness residual ${harness}, declared ${HARNESS_LABEL_RESIDUAL}`);
});

add('E5', 'the ladder has an exit and every trigger is named in the brief that detects it', () => {
  const ids = EXECUTION_TIERS.map((tier) => tier.id);
  const dangling = EXECUTION_TIERS.filter((tier) => tier.escalates_to !== null && !ids.includes(tier.escalates_to));
  if (dangling.length) throw new Error(`tier(s) escalate nowhere declared: ${JSON.stringify(dangling.map((t) => t.id))}`);
  if (EXECUTION_TIERS.filter((tier) => tier.escalates_to === null).length !== 1) {
    throw new Error('the ladder must have exactly one top tier');
  }
  for (const trigger of ESCALATION_TRIGGERS) {
    const brief = ESCALATION_TRIGGER_BRIEFS[trigger.detected_by];
    if (!brief) throw new Error(`no brief declared for detected_by '${trigger.detected_by}'`);
    if (!fs.readFileSync(repoPath(brief), 'utf8').includes(trigger.id)) {
      throw new Error(`${brief} never names the '${trigger.id}' trigger it is declared to detect`);
    }
  }
});

add('E6', 'each harness skill copy is the canonical protocol plus its declared overlay', () => {
  for (const o of HARNESS_SKILL_OVERLAYS) {
    const canonical = fs.readFileSync(repoPath(o.canonical), 'utf8');
    const copy = fs.readFileSync(repoPath(o.path), 'utf8');
    const heading = `## ${o.overlayHeading}`;
    const start = copy.indexOf(heading);
    if (start < 0) throw new Error(`${o.path} has no '${heading}' section`);
    const next = copy.indexOf('\n## ', start);
    if (next < 0) throw new Error(`${o.path}: the overlay is the last section, so nothing follows it`);
    const stripped = copy.slice(0, start) + copy.slice(next + 1);
    if (stripped !== canonical) throw new Error(`${o.path} minus its overlay is not ${o.canonical} verbatim`);
  }
});

add('E7', 'each harness manifest and MODEL_ROUTING.md agree with the declared binding', () => {
  const doc = parseDoc(fs.readFileSync(repoPath('plugins/steps/MODEL_ROUTING.md'), 'utf8'));
  for (const h of HARNESS_BINDINGS) {
    const rows = sectionLines(doc, h.heading).filter((l) => l.trim().startsWith('|')).slice(2);
    const inDoc = new Map();
    for (const row of rows) {
      const cells = row.split('|').slice(1, -1).map((c) => c.trim());
      const model = /`([^`]+)`/.exec(cells[1] ?? '')?.[1] ?? null;
      const effort = cells.length > 2 ? (/`([^`]+)`/.exec(cells[2] ?? '')?.[1] ?? null) : null;
      for (const m of cells[0].matchAll(/`([^`]+)`/g)) inDoc.set(m[1], { model, effort });
    }
    for (const [role, want] of Object.entries(h.roles)) {
      const row = inDoc.get(role);
      if (!row) throw new Error(`MODEL_ROUTING.md '${h.heading}' has no row for ${role}`);
      if (row.model !== want.model) throw new Error(`${h.key}/${role}: doc says ${row.model}, declared ${want.model}`);
      if (row.effort !== want.effort) throw new Error(`${h.key}/${role}: doc effort ${row.effort}, declared ${want.effort}`);
      const rel = h.manifest.replace('%s', role);
      const text = fs.readFileSync(repoPath(rel), 'utf8');
      if (!new RegExp(`^\\s*model\\s*[:=]\\s*"?${escapeForRegex(want.model)}"?\\s*$`, 'm').test(text)) {
        throw new Error(`${rel} does not bind model ${want.model}`);
      }
      if (want.effort !== null
        && !new RegExp(`(?:reasoningEffort|model_reasoning_effort)\\s*[:=]\\s*"?${want.effort}"?`).test(text)) {
        throw new Error(`${rel} does not set reasoning effort ${want.effort}`);
      }
    }
  }
});

add('E4', 'every stated token bound is the enforced one', () => {
  const sites = tokenBudgetSites();
  if (sites.length !== TOKEN_BUDGET_DOC_SITES) {
    throw new Error(`${sites.length} doc sites, declared ${TOKEN_BUDGET_DOC_SITES}: ${JSON.stringify(sites)}`);
  }
  const gate = fs.readFileSync(repoPath('tests/constitution_skills.test.js'), 'utf8');
  const gateSites = [...gate.matchAll(/estimatedTokens\s*<\s*(\d+)/g)];
  if (gateSites.length !== TOKEN_BUDGET_GATE_SITES) {
    throw new Error(`${gateSites.length} gate sites, declared ${TOKEN_BUDGET_GATE_SITES}`);
  }
  const wrong = sites.filter((s) => s.value !== String(TOKEN_BUDGET));
  if (wrong.length) throw new Error(`doc sites state ${JSON.stringify(wrong)}, enforced bound is ${TOKEN_BUDGET}`);
  const wrongGate = gateSites.filter((m) => m[1] !== String(TOKEN_BUDGET));
  if (wrongGate.length) throw new Error(`gate states ${wrongGate.map((m) => m[1]).join(', ')}, declared ${TOKEN_BUDGET}`);
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function selectedIds() {
  return checks.map((c) => c.id).filter((id) => !HERMETIC || !LIVE_CHECKS.includes(id));
}

const selected = new Set(selectedIds());
let failed = 0;

for (const check of checks) {
  if (!selected.has(check.id)) continue;
  try {
    check.run();
    console.log(`ok   ${check.id} — ${check.name}`);
  } catch (e) {
    if (e instanceof Blocked) {
      console.log(`BLOCKED ${check.id} — ${e.message}`);
      process.exit(3);
    }
    console.log(`FAIL ${check.id} — ${check.name}`);
    diag(e.message);
    failed += 1;
  }
}

process.exit(failed === 0 ? 0 : 1);
