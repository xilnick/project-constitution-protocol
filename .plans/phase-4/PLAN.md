# Phase 4 Plan: Purge `ai-docs` from Steps & Re-ground on `.pcp/` and `.plans/`

## Scope & Work Items

### 1. Clean Procedures (`e2e-gap-audit.md` & `dynamic-planning.md`)
- **Target**: `plugins/steps/procedures/e2e-gap-audit.md`, `plugins/steps/procedures/dynamic-planning.md`
- **Why**: Eliminate all references to fictional `ai-docs/` (specs, yaml) and ground rules strictly on `.pcp/` and `.plans/`.
- **Gate**: `grep -rn "ai-docs" plugins/steps/procedures/` returns exit 1 (0 matches).

### 2. Clean `gap` Skill
- **Target**: `plugins/steps/skills/gap/SKILL.md`
- **Why**: Replace `ai-docs/constitution.yaml` and `ai-docs/specs/` with `.pcp/` and `.plans/`. Keep byte budget <= 3500 bytes and maintain required headings: `["Why the skill exists","Local evaluation","Global repository audit","Done when"]`.
- **Gate**: `grep -rn "ai-docs" plugins/steps/skills/gap/SKILL.md` returns exit 1.

### 3. Clean `steps` Skill & Plan Reviewer Brief
- **Target**: `plugins/steps/skills/steps/SKILL.md`, `plugins/steps/roles/steps-plan-reviewer.md`
- **Why**: Replace `ai-docs/constitution.yaml` in constitution check with `.pcp/` and root constitution. Keep `steps/SKILL.md` byte budget <= 15500 bytes.
- **Gate**: `npm run render && npm test` passes.

## Risks
- Byte budget overflow on `steps/SKILL.md` or `gap/SKILL.md`. Must ensure replacement strings do not exceed budgets.
