#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const HOME = os.homedir();

const ASN_RULES = {
  asl: `<!-- ASL_TOOLBELT_START -->
(:rule :asl :binary "asl" :priority true)
<!-- ASL_TOOLBELT_END -->`,

  parallel: `<!-- PARALLEL_START -->
(:rule :parallel :batch :wave :scope [:search :scout :audit :patch])
<!-- PARALLEL_END -->`,

  groundTruth: `<!-- GROUND_TRUTH_START -->
(:rule :ground-truth
  :falsify  (:must-fail true :exit 0)
  :strict   (:forbid [:stub :todo :mock :swallow :co-author] :require [:bounds :errors])
  :critic   (:self false :stance :adversary)
  :receipt  (:format :asn :asserts (> 0) :claims false))
(:rule :git :co-author false)
<!-- GROUND_TRUTH_END -->`,
};

function checkAsl() {
  try {
    const bin = execSync('which asl', { encoding: 'utf8' }).trim();
    const ver = execSync('asl version 2>&1 || true', { encoding: 'utf8' }).trim();
    return { installed: true, bin, version: ver || 'available' };
  } catch {
    return { installed: false, bin: null, version: null };
  }
}

function injectRule(filePath, tag, block) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${block}\n`, 'utf8');
    return true;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = new RegExp(`<!-- ${tag}_START -->[\\s\\S]*?<!-- ${tag}_END -->`, 'm');
  if (regex.test(content)) {
    const updated = content.replace(regex, block);
    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf8');
      return true;
    }
    return false;
  }
  fs.writeFileSync(filePath, `${block}\n\n${content}`, 'utf8');
  return true;
}

function run() {
  const aslStatus = checkAsl();

  const targetFiles = [
    path.join(REPO_ROOT, 'AGENTS.md'),
    path.join(HOME, '.gemini/config/AGENTS.md'),
    path.join(HOME, '.claude/CLAUDE.md'),
  ];

  const updatedFiles = [];
  for (const file of targetFiles) {
    if (fs.existsSync(file) || file.startsWith(REPO_ROOT)) {
      injectRule(file, 'ASL_TOOLBELT', ASN_RULES.asl);
      injectRule(file, 'PARALLEL', ASN_RULES.parallel);
      injectRule(file, 'GROUND_TRUTH', ASN_RULES.groundTruth);
      updatedFiles.push(file);
    }
  }

  const specificRules = [
    { file: path.join(HOME, '.gemini/config/rules/ground-truth.md'), tag: 'GROUND_TRUTH', block: ASN_RULES.groundTruth },
    { file: path.join(HOME, '.claude/rules/ground-truth.md'), tag: 'GROUND_TRUTH', block: ASN_RULES.groundTruth },
    { file: path.join(HOME, '.gemini/config/rules/parallel.md'), tag: 'PARALLEL', block: ASN_RULES.parallel },
    { file: path.join(HOME, '.claude/rules/parallel.md'), tag: 'PARALLEL', block: ASN_RULES.parallel },
    { file: path.join(HOME, '.gemini/config/rules/asl-toolbelt.md'), tag: 'ASL_TOOLBELT', block: ASN_RULES.asl },
  ];

  for (const { file, tag, block } of specificRules) {
    if (fs.existsSync(file)) {
      if (injectRule(file, tag, block)) {
        updatedFiles.push(file);
      }
    }
  }

  const receipt = `(:receipt
  :action :install-rules
  :exit 0
  :asl (:installed ${aslStatus.installed} :binary "${aslStatus.bin || 'none'}")
  :rules-injected [:asl-toolbelt :parallel :ground-truth]
  :targets-updated ${JSON.stringify(updatedFiles)}
)`;

  console.log(receipt);
}

run();
