# Phase 3 Plan: Render Manifests, Environment Sync & Smoke Test

## Scope & Work Items

### 1. Render Harness Manifests
- **Target**: `plugins/steps/tools/render.mjs`
- **Why**: Re-check that all rendered manifests agree with roles and partials.
- **Gate**: `node plugins/steps/tools/render.mjs --check` passes with 0 diff.

### 2. Run Isolated Install Smoke Test
- **Target**: `tests/install-smoke.sh`
- **Why**: Test clean installation into isolated throwaway HOME, assert discovery of `asl-intel`, and verify consumer recipes.
- **Gate**: `bash tests/install-smoke.sh` exits 0.

### 3. Sync User Environment Symlinks & Caches
- **Target**: `~/.agents/skills/`, `~/.gemini/config/skills/`, `~/.gemini/skills/`, `~/.claude/`
- **Why**: Link `asl-intel` from `plugins/toolbelt/skills/asl-intel`, remove stale `tokensave` references.
- **Gate**: Symlinks resolve to existing directories on disk.

### 4. Git Commit and Push
- **Target**: `git commit`, `git push origin main`
- **Why**: Ship the completed iteration to remote repository.
- **Gate**: `git status` clean, working tree synced with `origin/main`.
