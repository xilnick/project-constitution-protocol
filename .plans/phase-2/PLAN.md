# Phase 2 Plan: Synchronize Test Harness & Recipes

## Scope & Work Items

### 1. Update `tests/fixtures/expected.mjs`
- **Target**: `tests/fixtures/expected.mjs`
- **Why**: Replace `tokensave` entries in `SKILL_INVENTORY` with `asl-intel` (both `plugins/toolbelt/skills/asl-intel/SKILL.md` and mirror `plugins/toolbelt/harnesses/antigravity/skills/asl-intel/SKILL.md`).
- **Gate**: `node --test tests/constitution_skills.test.js` passes all 26 skill discoverability & frontmatter checks.

### 2. Update `tests/fixtures/recipes.mjs`
- **Target**: `tests/fixtures/recipes.mjs`
- **Why**:
  - Update `RECIPE_FILES`: replace `tb-tokensave` with `tb-asl-intel` pointing to `plugins/toolbelt/skills/asl-intel/SKILL.md`.
  - Update `RUNNABLE_RECIPES` & `UNSAFE_BLOCKS` for `tb-asl-intel`.
  - Update `COMMAND_SPANS` for `tb-asl-intel`, `tb-search`, and `AGENTS`.
  - Add `asl` to `COMMAND_SPAN_CLIS` and `ALLOWED_HEADS`.
- **Gate**: `node tests/recipe-exec.test.js --hermetic` passes all B1, B2, C, S, X, E checks.

### 3. Update `tests/install-smoke.sh`
- **Target**: `tests/install-smoke.sh`
- **Why**: Assert discovery of `asl-intel` instead of `tokensave`; execute `asl intel outline` or graceful skip if `asl` binary not present.
- **Gate**: `bash tests/install-smoke.sh` passes 100%.

### 4. Verify Full Test Suite
- **Target**: `npm test`
- **Why**: Ensure 86/86 subtests and 15 guard tests pass with 0 failures.
- **Gate**: `npm test` exit 0.
