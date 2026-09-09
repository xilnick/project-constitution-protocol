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

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
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

  // 1. Install repository skills: parallel & ground-truth
  const skills = [
    { name: 'parallel', src: path.join(REPO_ROOT, 'plugins/toolbelt/skills/parallel') },
    { name: 'ground-truth', src: path.join(REPO_ROOT, '.agents/skills/ground-truth') },
  ];

  const targetDirs = [
    path.join(REPO_ROOT, '.agents/skills'),
    path.join(HOME, '.gemini/config/skills'),
    path.join(HOME, '.claude/skills'),
  ];

  const installedSkills = [];
  for (const target of targetDirs) {
    if (fs.existsSync(path.dirname(target))) {
      fs.mkdirSync(target, { recursive: true });
      for (const sk of skills) {
        const dest = path.join(target, sk.name);
        copyDirRecursive(sk.src, dest);
        installedSkills.push(`${sk.name} -> ${dest}`);
      }
    }
  }

  // 2. Inject rules into agent instruction files
  const agentFiles = [
    path.join(REPO_ROOT, 'AGENTS.md'),
    path.join(HOME, '.gemini/config/AGENTS.md'),
    path.join(HOME, '.claude/CLAUDE.md'),
  ];

  const updatedFiles = [];
  for (const file of agentFiles) {
    if (fs.existsSync(file)) {
      injectRule(file, 'ASL_TOOLBELT', ASN_RULES.asl);
      injectRule(file, 'PARALLEL', ASN_RULES.parallel);
      injectRule(file, 'GROUND_TRUTH', ASN_RULES.groundTruth);
      updatedFiles.push(file);
    }
  }

  // 3. Emit physical execution receipt in ASN
  const receipt = `(:receipt
  :action :install-skills
  :exit 0
  :asl (:installed ${aslStatus.installed} :binary "${aslStatus.bin || 'none'}")
  :skills-installed [:parallel :ground-truth]
  :destinations ${JSON.stringify(targetDirs.filter((d) => fs.existsSync(path.dirname(d))))}
  :agent-rules-updated ${JSON.stringify(updatedFiles)}
)`;

  console.log(receipt);
}

run();
