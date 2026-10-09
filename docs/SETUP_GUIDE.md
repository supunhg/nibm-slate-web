# Setup Guide

## Important platform note
Antigravity's UI and instruction/workflow discovery can change by version. This kit uses portable Markdown. Do not assume a file activates automatically unless your installed environment confirms it. Check the current official Antigravity docs/UI for project rules, global rules, and workflow registration.

## Install in one project
1. Extract the ZIP.
2. Copy `AGENTS.md` and `.agent/` into the project root.
3. If these already exist, **do not overwrite them**; merge intentionally and preserve project-specific rules/memory.
4. Open the project root in Antigravity.
5. If supported by your version, register the concise contract from `AGENTS.md` in its project instruction/rules mechanism. Adapt workflow files to the currently supported workflow format if required; keep these Markdown originals as source of truth.
6. Ask the agent to read `AGENTS.md`, `.agent/SUPER_AGENT.md`, `.agent/BOOTSTRAP.md`, and `.agent/TOOL_ROUTER.md`.
7. Run the read-only bootstrap prompt below.
8. Verify instruction loading with the validation prompt before trusting it on high-risk tasks.

### Bootstrap prompt
> Read `AGENTS.md`, `.agent/SUPER_AGENT.md`, `.agent/BOOTSTRAP.md`, and `.agent/TOOL_ROUTER.md`. Inspect this repository and current Git status first. Do not edit application code yet. Follow the bootstrap workflow and update `.agent/STATE.md` and `.agent/state/PROJECT_MEMORY.md` with verified facts. Report project structure, run/test/build commands, baseline health, risks, and recommended next step.

## New projects
1. Create/open the empty project folder.
2. Add `AGENTS.md` and `.agent/`.
3. Describe the product goal, users, platforms, constraints, integrations, and non-goals.
4. Ask for the `.agent/workflows/NEW_PROJECT.md` workflow: plan and acceptance criteria first.
5. Review/approve architecture; build one vertical slice.
6. Require a working local run, tests, setup docs, and definition-of-done review before expanding scope.

## Ongoing projects
1. Inspect Git status and checkpoint current work if appropriate.
2. Merge kit files without overwriting existing instructions.
3. Run read-only bootstrap; do not refactor during discovery.
4. Capture baseline failures and test/build commands.
5. Confirm memory against actual code; don't assume old notes remain true.
6. Start with a bounded task and require focused diffs plus evidence.

## Messy/inherited projects
Explicitly prohibit refactoring during discovery, dependency installation without approval, migrations, and production commands. Ask the agent to distinguish pre-existing defects from new regressions and label uncertainty.

## Global vs project-level
Keep global instructions short and universal: inspect first, preserve work, protect secrets, verify claims, ask before destructive/external actions, report checks honestly. Keep architecture, memory, paths, and workflows project-local. Do not assume project rules override global rules unless verified.

## Validate that rules are active
> Without changing files, summarize the active project rules, list actions that require approval, identify the current state file, and explain how you will verify a code change.

If it cannot identify these items, the rules may not be loaded. Register them in Antigravity's supported configuration or explicitly reference the files in task prompts.

## Update/remove
Back up or commit customized files before updates. Compare and merge rather than replacing blindly. To remove the kit, delete only files you added after reviewing customizations and memory. Removing instructions does not undo code changes made previously.
