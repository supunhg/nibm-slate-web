# Antigravity Super Agent v3

A portable instruction-and-workflow kit for more reliable agentic software engineering. It is not a new model and does not guarantee autonomous execution; it provides project rules, specialist playbooks, workflows, durable state, safety gates, and evidence-based verification.

## Quick start
1. Read `docs/SETUP_GUIDE.md`.
2. Copy `AGENTS.md` and `.agent/` into a project without overwriting existing custom files.
3. Open the project root in Antigravity.
4. Register/adapt rules and workflows using the features supported by your installed Antigravity version. Do not assume Markdown files auto-load.
5. Run the read-only bootstrap prompt in the setup guide.
6. Validate that the agent can explain the active rules before using it for risky work.

## Contents
- `AGENTS.md`: concise project contract
- `.agent/SUPER_AGENT.md`: orchestration, risk, verification, recovery
- `.agent/BOOTSTRAP.md`: onboarding workflow
- `.agent/TOOL_ROUTER.md`: capability selection
- `.agent/roles/`: architect, debugger, security, tester, UI, critic
- `.agent/workflows/`: new project, feature, bug, security, infrastructure, release
- `.agent/state/`: project memory, decisions, failures, task evidence
- `docs/`: setup, prompts, troubleshooting, migration

## Core principles
Inspect before changing. Preserve user work. One orchestrator, selective specialists. Ask before destructive or external actions. Verify claims with observed evidence. Bound retries. Keep memory factual and secret-free.
