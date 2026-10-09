# Usage Prompt Library

These are prompts to paste into the agent, not special executable commands.

## Plan only
> Analyze how to implement [goal]. Do not edit files. Inspect the repository and report current state, proposed approach, alternatives, risks, affected files, acceptance criteria, verification plan, and approval points.

## Feature
> Implement [outcome]. Follow `.agent/workflows/FEATURE.md`. Inspect code and Git status, define observable acceptance criteria, and give me a concise plan. Do not begin high-impact changes before approval. Run relevant checks and report exact commands/results.

## Bug fix
> Fix [symptom]. Expected: [x]. Actual: [y]. Reproduction: [steps]. Follow `.agent/workflows/BUG_FIX.md`; establish evidence and root cause before editing, add regression coverage where practical, and report uncertainty honestly.

## Security audit
> Follow `.agent/workflows/SECURITY_AUDIT.md` and `.agent/roles/SECURITY.md`. Authorized scope: [scope]. Start read-only. Report prioritized findings with evidence, impact, confidence, remediation, and validation. Ask before high-impact changes.

## UI work
> Improve [screen/flow] while respecting the existing design system. Inspect components, responsive behavior, and accessibility first. Cover loading/empty/error/success states. Inspect rendered mobile and desktop behavior if browser tools are available. Avoid unnecessary redesign/dependencies.

## Infrastructure/network change
> Follow `.agent/workflows/INFRA_CHANGE.md`. Target: [local/dev/staging/production]. Desired state: [goal]. First map current state; do not apply changes yet. Report plan, blast radius, validation, backup/checkpoint, rollback, and approvals.

## Resume after interruption
> Read `.agent/STATE.md` and relevant decisions, failures, and task log entries. Compare them with the actual repository and Git status. Report verified state, stale/uncertain notes, and the single best next action. Do not assume memory is still accurate.

## Release
> Follow `.agent/workflows/RELEASE.md`. Inspect diff, tests, build, configuration, secrets, migrations, and rollback. Do not publish, tag, deploy, or take external action until I explicitly approve the final plan.

## New project
> Follow `.agent/workflows/NEW_PROJECT.md`. Goal: [goal]. Users: [users]. Platform: [web/mobile/desktop/API]. Constraints: [stack/budget/timeline/hosting/integrations]. Non-goals: [list]. First produce plan, architecture options, security/data considerations, acceptance criteria, and milestones. Do not scaffold until I approve.

## Tips
State the outcome, constraints, target environment, and success criteria. For high-risk work ask for a plan first. Ask for evidence, not confidence. For broad “make it better” requests, ask for a discovery and prioritized improvement plan first.
