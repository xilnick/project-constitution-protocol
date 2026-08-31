// Tool resolution reads the inherited PATH and never substitutes one: a pinned
// PATH makes the mandated `npm test` fail on any box whose yq lives elsewhere.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Deliberately not memoised: a cache and the PATH-varying subtest cannot both be
// correct — one of them would read a stale or deleted resolution.
export function resolveTool(name) {
  const entries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of entries) {
    const candidate = path.join(dir, name);
    try {
      // statSync, not lstatSync: yq, node and npm are all symlinks on this machine.
      if (!fs.statSync(candidate).isFile()) continue;
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch { /* try the next PATH entry */ }
  }
  throw new Error(
    `required tool '${name}' not found on PATH (searched: ${entries.join(', ')}). ` +
    `Install it and re-run 'npm test'.`
  );
}

export function yqRaw(expr, file) {
  return execFileSync(resolveTool('yq'), [expr, file], { encoding: 'utf8' });
}

export function yqJson(expr, file) {
  return JSON.parse(execFileSync(resolveTool('yq'), ['-o=json', expr, file], { encoding: 'utf8' }));
}
