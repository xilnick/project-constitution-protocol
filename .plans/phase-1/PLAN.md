# Phase 1 Plan: Standardize Step-Level Micro-Planning Procedure

## Scope & Work Items

### 1. Author Step-Planning Procedure
- **Target**: `plugins/steps/procedures/step-planning.md`
- **Why**: Establish canonical standard for planning and pre-flighting each individual work item.
- **Contract**:
  - Exact target (`path:symbol`)
  - Preconditions and invariants
  - Failing gate command with recorded output
  - Critic boundary (minimum working diff, zero speculative abstraction)
  - Edge cases & failure modes checklist
  - Execution loop for implementer
- **Gate**: File exists and contains all required sections.

### 2. Update `steps-plan` and `steps-implement` Skills
- **Target**: `plugins/steps/skills/steps-plan/SKILL.md` (keep <= 2200 bytes), `plugins/steps/skills/steps-implement/SKILL.md` (keep <= 2200 bytes)
- **Why**: Reference the step planning standard without exceeding size budgets.
- **Gate**: `npm test` checks size budgets and skill invariants.

## Risks
- Byte budget overflow on `steps-implement/SKILL.md` (budget: 2200 bytes). Must tighten phrasing to stay comfortably under the bound.
