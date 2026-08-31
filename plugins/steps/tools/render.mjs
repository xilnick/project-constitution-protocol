#!/usr/bin/env node
// Renders every agent manifest from roles/ + partials/ + harnesses/*/profile.json.
// `--check` compares instead of writing, so drift fails a gate rather than surviving.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.slice(2).includes('--check');

const WRITE_CLASSES = ['none', 'report', 'code'];

function readRole(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const cut = raw.indexOf('\n---\n');
  if (cut < 0) throw new Error(`${file}: no '---' separating facts from body`);
  const facts = {};
  for (const line of raw.slice(0, cut).split('\n')) {
    if (!line.trim()) continue;
    const m = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!m) throw new Error(`${file}: unparsable fact line ${JSON.stringify(line)}`);
    facts[m[1]] = m[2].trim();
  }
  for (const key of ['name', 'description', 'color', 'writes', 'produces', 'reply']) {
    if (!facts[key]) throw new Error(`${file}: missing fact '${key}'`);
  }
  if (!WRITE_CLASSES.includes(facts.writes)) {
    throw new Error(`${file}: writes '${facts.writes}' is not one of ${WRITE_CLASSES.join('/')}`);
  }
  // Unquoted YAML is what every harness ships today; a colon-space would silently truncate it.
  if (/:\s/.test(facts.description)) throw new Error(`${file}: description contains ': ', which unquoted YAML would cut`);
  return { facts, body: raw.slice(cut + 5).trimEnd(), file };
}

function expand(text, vars, seen = new Set()) {
  const withPartials = text.replace(/^\{\{>\s*([a-z-]+)\s*\}\}$/gm, (_, name) => {
    if (seen.has(name)) throw new Error(`partial '${name}' includes itself`);
    const p = path.join(ROOT, 'partials', `${name}.md`);
    if (!fs.existsSync(p)) throw new Error(`missing partial '${name}'`);
    return expand(fs.readFileSync(p, 'utf8').trimEnd(), vars, new Set([...seen, name]));
  });
  const filled = withPartials.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => {
    if (!(key in vars)) throw new Error(`no value for {{${key}}}`);
    return vars[key];
  });
  const leftover = /\{\{[^}]*\}\}/.exec(filled);
  if (leftover) throw new Error(`unresolved placeholder ${leftover[0]}`);
  return filled;
}

// Substitution changes line lengths, so plain paragraphs are re-wrapped. Lists, tables, headings
// and blockquotes keep their own line breaks — re-flowing those would change what they mean.
function rewrap(body, width = 100) {
  const out = [];
  let para = [];
  const flush = () => {
    if (!para.length) return;
    const words = para.join(' ').split(/\s+/);
    let line = '';
    for (const word of words) {
      if (line && `${line} ${word}`.length > width) { out.push(line); line = word; } else line = line ? `${line} ${word}` : word;
    }
    if (line) out.push(line);
    para = [];
  };
  for (const line of body.split('\n')) {
    if (!line.trim() || /^(#|\||[-*>]|\d+\.|\s)/.test(line)) { flush(); out.push(line); continue; }
    para.push(line.trim());
  }
  flush();
  return out.join('\n');
}

function yamlValue(v, indent) {
  if (Array.isArray(v)) return `\n${v.map((x) => `${' '.repeat(indent)}- ${x}`).join('\n')}`;
  if (v && typeof v === 'object') {
    return `\n${Object.entries(v).map(([k, x]) => `${' '.repeat(indent)}${/^[.*]/.test(k) ? `"${k}"` : k}:${yamlValue(x, indent + 2)}`).join('\n')}`;
  }
  return ` ${v}`;
}

function frontmatterMd(profile, role, model) {
  const out = [];
  for (const field of profile.fields) {
    if (field === 'name') out.push(`name: ${role.facts.name}`);
    else if (field === 'description') out.push(`description: ${role.facts.description}`);
    else if (field === 'color') out.push(`color: ${role.facts.color}`);
    else if (field === 'tools') {
      const tools = profile.tools[role.facts.writes];
      out.push(profile.toolStyle === 'list' ? `tools:${yamlValue(tools, 2)}` : `tools: ${tools.join(', ')}`);
    } else if (field === 'model') out.push(`model: ${model.model}`);
    else if (field === 'reasoningEffort') out.push(`reasoningEffort: ${model.effort}`);
    else if (field === 'permission') out.push(`permission:${yamlValue(profile.permission[role.facts.writes], 2)}`);
    else if (field in (profile.static ?? {})) out.push(`${field}: ${profile.static[field]}`);
    else throw new Error(`${profile.key}: no renderer for field '${field}'`);
  }
  return out.join('\n');
}

function renderRole(profile, role) {
  const model = profile.models[role.facts.name];
  if (!model) throw new Error(`${profile.key}: no model bound for ${role.facts.name}`);
  const body = rewrap(expand(role.body, { ...profile.vars, produces: role.facts.produces, reply: role.facts.reply }));
  const title = profile.h1 ? `# ${role.facts.name} (${profile.label})\n\n` : '';

  if (profile.format === 'toml') {
    return [
      `name = "${role.facts.name}"`,
      `description = """${role.facts.description}"""`,
      `model = "${model.model}"`,
      `model_reasoning_effort = "${model.effort}"`,
      `sandbox_mode = "${profile.sandbox[role.facts.writes]}"`,
      `developer_instructions = """`,
      `${title}${body}`,
      `"""`,
      '',
    ].join('\n');
  }
  return `---\n${frontmatterMd(profile, role, model)}\n---\n\n${title}${body}\n`;
}

function skillCopy(profile) {
  const canonical = fs.readFileSync(path.join(ROOT, profile.skillCopy.from), 'utf8');
  const overlay = fs.readFileSync(path.join(ROOT, profile.skillCopy.overlay), 'utf8').trimEnd();
  const anchor = profile.skillCopy.before;
  if (!canonical.includes(anchor)) throw new Error(`${profile.key}: skill copy anchor ${JSON.stringify(anchor)} not in ${profile.skillCopy.from}`);
  return { rel: profile.skillCopy.to, text: canonical.replace(anchor, `${overlay}\n\n${anchor}`) };
}

const roles = fs.readdirSync(path.join(ROOT, 'roles'))
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => readRole(path.join(ROOT, 'roles', f)));

const profiles = fs.readdirSync(path.join(ROOT, 'harnesses'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(ROOT, 'harnesses', e.name, 'profile.json')))
  .map((e) => JSON.parse(fs.readFileSync(path.join(ROOT, 'harnesses', e.name, 'profile.json'), 'utf8')))
  .sort((a, b) => a.key.localeCompare(b.key));

const outputs = [];
for (const profile of profiles) {
  for (const role of roles) {
    outputs.push({ rel: profile.out.replace('{name}', role.facts.name), text: renderRole(profile, role) });
  }
  if (profile.skillCopy) outputs.push(skillCopy(profile));
}

const drift = [];
for (const { rel, text } of outputs) {
  const abs = path.join(ROOT, rel);
  const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (current === text) continue;
  drift.push(rel);
  if (!CHECK) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
}

const verb = CHECK ? 'differs from the render' : 'written';
console.log(`${outputs.length} artifacts from ${roles.length} roles × ${profiles.length} harnesses; ${drift.length} ${verb}`);
if (drift.length && CHECK) {
  for (const rel of drift) console.log(`  ${rel}`);
  console.log('run `npm run render` and commit the result');
  process.exit(1);
}
