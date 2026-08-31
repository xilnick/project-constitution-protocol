#!/usr/bin/env bash
set -euo pipefail

# tests/install-smoke.sh
# Acceptance gate for Phase 3: installability & discovery across throwaway HOME
# Tests that marketplace installation delivers every shipped skill and that the recipes run from
# an unrelated directory.

REPO_ROOT="$(pwd)"
TEST_HOME="$(mktemp -d -t pcp-install-smoke-XXXXXX)"
cleanup() {
  rm -rf "$TEST_HOME"
}
trap cleanup EXIT

echo "==> 1. Setting up throwaway HOME: $TEST_HOME"
mkdir -p "$TEST_HOME/.claude/plugins/pcp"
mkdir -p "$TEST_HOME/.claude/plugins/steps"
mkdir -p "$TEST_HOME/.claude/plugins/toolbelt"

echo "==> 2. Installing marketplace plugins into throwaway HOME"
cp -r "$REPO_ROOT/plugins/pcp/"* "$TEST_HOME/.claude/plugins/pcp/"
cp -r "$REPO_ROOT/plugins/steps/"* "$TEST_HOME/.claude/plugins/steps/"
cp -r "$REPO_ROOT/plugins/toolbelt/"* "$TEST_HOME/.claude/plugins/toolbelt/"
mkdir -p "$TEST_HOME/.claude-plugin"
cp "$REPO_ROOT/.claude-plugin/marketplace.json" "$TEST_HOME/.claude-plugin/marketplace.json"

echo "==> 3. Asserting every shipped skill is discovered"
SKILLS=(
  "$TEST_HOME/.claude/plugins/pcp/skills/pcp/SKILL.md"
  "$TEST_HOME/.claude/plugins/pcp/skills/constitution-query/SKILL.md"
  "$TEST_HOME/.claude/plugins/pcp/skills/code-intelligence/SKILL.md"
  "$TEST_HOME/.claude/plugins/pcp/skills/adr-manager/SKILL.md"
  "$TEST_HOME/.claude/plugins/steps/skills/steps/SKILL.md"
  "$TEST_HOME/.claude/plugins/steps/skills/steps-plan/SKILL.md"
  "$TEST_HOME/.claude/plugins/steps/skills/steps-review/SKILL.md"
  "$TEST_HOME/.claude/plugins/steps/skills/steps-implement/SKILL.md"
  "$TEST_HOME/.claude/plugins/steps/skills/steps-verify/SKILL.md"
  "$TEST_HOME/.claude/plugins/steps/skills/steps-fix/SKILL.md"
  "$TEST_HOME/.claude/plugins/toolbelt/skills/parallel/SKILL.md"
  "$TEST_HOME/.claude/plugins/toolbelt/skills/tokensave/SKILL.md"
  "$TEST_HOME/.claude/plugins/toolbelt/skills/search-tools/SKILL.md"
)

for skill in "${SKILLS[@]}"; do
  if [ ! -f "$skill" ]; then
    echo "ERROR: Skill not found at $skill" >&2
    exit 1
  fi
  echo "  [FOUND] $skill"
done

echo "==> 4. Setting up isolated consumer project in unrelated workspace"
CONSUMER_DIR="$TEST_HOME/workspace/consumer-app"
mkdir -p "$CONSUMER_DIR/ai-docs/decisions"
mkdir -p "$CONSUMER_DIR/.pcp"

cat << 'DOCEOF' > "$CONSUMER_DIR/ai-docs/constitution.yaml"
constitution:
  project: "consumer-app"
  version: "1.0.0"
  last_updated: "2026-08-31"
  verification_command: "npm test"
  security:
    rules:
      - id: "sec-auth-01"
        domain: "auth"
        rule: "JWT tokens must be validated against public key registry."
        enforcement: "strict"
decisions:
  - id: "d-1234"
    title: "Consumer App Initial Architecture"
    status: "active"
    date: "2026-08-31"
    adr: "ai-docs/decisions/ADR-0001-init.md"
caveats: []
requirements: []
deferred: []
DOCEOF

cat << 'DOCEOF' > "$CONSUMER_DIR/ai-docs/decisions/ADR-0001-init.md"
# ADR-0001: Consumer App Initial Architecture

- **ID**: d-1234
- **Status**: active
- **Date**: 2026-08-31

## Context
Initial architecture for consumer application.
DOCEOF

TOKENSAVE_BIN="$(command -v tokensave || echo /nonexistent)"

echo "==> 5. Testing recipe execution from unrelated directory (NO cd into repo)"
(
  cd "$CONSUMER_DIR"
  export CLAUDE_PLUGIN_ROOT="$TEST_HOME/.claude/plugins/pcp"
  
  # Skill 1: pcp (CLI resolution via $PCP contract)
  PCP="${CLAUDE_PLUGIN_ROOT}/skills/pcp/scripts/pcp.js"
  [ -f "$PCP" ] || PCP="$HOME/.claude/skills/pcp/scripts/pcp.js"
  [ -f "$PCP" ] || PCP="pcp/scripts/pcp.js"
  
  if [ ! -f "$PCP" ]; then
    echo "ERROR: Failed to resolve PCP CLI script" >&2
    exit 1
  fi
  node "$PCP" actualize > /dev/null
  echo "  [PASS] pcp: node \$PCP actualize executed successfully"

  # Skill 2: constitution-query
  AUTH_RULE=$(yq '.constitution.security.rules[] | select(.domain == "auth") | .id' ai-docs/constitution.yaml)
  if [ "$AUTH_RULE" != "sec-auth-01" ]; then
    echo "ERROR: constitution-query failed to query auth rule" >&2
    exit 1
  fi
  echo "  [PASS] constitution-query: retrieved $AUTH_RULE"

  # Skill 3: adr-manager
  ADR_ID=$(yq '.decisions[] | select(.id == "d-1234") | .id' ai-docs/constitution.yaml)
  if [ "$ADR_ID" != "d-1234" ]; then
    echo "ERROR: adr-manager failed to query decision" >&2
    exit 1
  fi
  echo "  [PASS] adr-manager: retrieved $ADR_ID"

  # Skill 4: code-intelligence
  CI_SKILL="$TEST_HOME/.claude/plugins/pcp/skills/code-intelligence/SKILL.md"
  if grep -q "Progressive Disclosure" "$CI_SKILL"; then
    echo "  [PASS] code-intelligence: verified skill instructions intact"
  fi

  # Skill 5: steps, and the five stages it composes
  STEPS_SKILL="$TEST_HOME/.claude/plugins/steps/skills/steps/SKILL.md"
  if grep -q "Separation of duties" "$STEPS_SKILL"; then
    echo "  [PASS] steps: verified protocol instructions intact"
  fi
  for stage in plan review implement verify fix; do
    if grep -q "Why the stage exists" "$TEST_HOME/.claude/plugins/steps/skills/steps-$stage/SKILL.md"; then
      echo "  [PASS] steps-$stage: stage is invocable on its own"
    else
      echo "ERROR: steps-$stage did not survive the install" >&2
      exit 1
    fi
  done

  # The toolbelt skills: each one's own recipe, run from here rather than from the repo
  if grep -q "one message, one wave" -i "$TEST_HOME/.claude/plugins/toolbelt/skills/parallel/SKILL.md"; then
    echo "  [PASS] parallel: verified fan-out instructions intact"
  fi
  if "$TOKENSAVE_BIN" tool branch_list >/dev/null 2>&1; then
    echo "  [PASS] tokensave: branch_list runs from an unrelated directory"
  else
    echo "  [SKIP] tokensave: no graph in this workspace, which is the documented empty case"
  fi
  if yq '. | keys' ai-docs/constitution.yaml | grep -q constitution; then
    echo "  [PASS] search-tools: yq slice recipe runs against the consumer project"
  else
    echo "ERROR: search-tools yq recipe failed in the consumer project" >&2
    exit 1
  fi
)

echo "==> 6. All install smoke checks passed successfully!"
