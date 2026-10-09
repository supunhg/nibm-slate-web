# Migration from v1/v2
1. Back up or commit existing agent files.
2. Compare old rules, prompts, roles, workflows, and memory with this package.
3. Preserve useful project-specific rules and decisions; merge instead of blindly overwriting.
4. Add the safety gates, bounded recovery, evidence-based verification, memory protocol, and bootstrap workflow.
5. Avoid duplicate root instruction files that conflict.
6. Move durable decisions/failures into the matching state files.
7. Run read-only bootstrap and verify the agent actually loads the rules.
8. Test on a small reversible task before migrations, infrastructure, or release work.

Do not delete old memory before reviewing it. This kit does not reverse previous code changes.
