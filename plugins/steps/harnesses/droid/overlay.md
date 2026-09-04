## Droid specifics

`MODEL_ROUTING.md` binds the roles for every harness; on Factory Droid the binding is:

| Role | Droid | Model | Tier |
|---|---|---|---|
| Scout | `repo-scout` | deepseek-v4-flash | 1 |
| Planner | `steps-planner` | gpt-5.6-luna | 1 |
| Architect | `steps-architect-pro` | qwen3.8-max | 2 |
| Plan reviewer | `steps-plan-reviewer` | minimax-m3 | 1 |
| Implementer | `steps-implementer` | deepseek-v4-flash | 1 |
| Impl reviewer | `steps-impl-reviewer` | minimax-m3 | 1 |

`steps-architect-pro` and `repo-scout` ship with the Droid installation. Droid has
no `explore` agent, so scouting is always `repo-scout`. `MODEL_ROUTING.md` lives outside this skill
directory in the repository, so copy it in beside `SKILL.md` when installing.

**Tool names.** Droid manifests say `Create` where the protocol says `Write`, and `Execute` where it
says `Bash`. The restriction is unchanged: a role with no `Edit` may create only its own report.

**Multimodality.** qwen3.8-max accepts images, so screenshots and diagrams are allowed in its
briefs. deepseek-v4-flash and minimax-m3 are text-only — no images in theirs.

