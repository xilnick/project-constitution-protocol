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
(:rule :asl-toolbelt :priority :asl :binary "asl" :path true)
<!-- ASL_TOOLBELT_END -->`,

  parallel: `<!-- PARALLEL_START -->
(:rule :parallel :engine :concurrency :dispatch :one-message-one-wave :scope [:discovery :reconnaissance :adversarial-review :independent-edits])
<!-- PARALLEL_END -->`,

  groundTruth: `<!-- GROUND_TRUTH_START -->
(:rule :ground-truth
  :falsify-first        (:baseline-must-fail true :post-mutation-exit 0)
  :zero-slack           (:forbid [:stub :todo :mock :empty-catch] :require [:boundary-states :error-paths])
  :separation-of-duties (:author-eval false :reviewer-stance :adversarial)
  :physical-receipt     (:format :asn :exit 0 :asserts-evaluated (> 0) :verbal-claims false))
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
