# Troubleshooting

- **Agent ignores kit:** confirm project root, explicitly reference `AGENTS.md` and `.agent/SUPER_AGENT.md`, register project rules in supported Antigravity settings, then run setup validation.
- **Too many questions:** ask for conservative reversible assumptions on low-risk choices; ask only when correctness, safety, privacy, cost, or irreversibility depends on the answer.
- **Edits too broad:** require a plan, scope, non-goals, and focused diff. Never revert user changes.
- **Baseline tests fail:** record pre-existing failures first and distinguish them from regressions.
- **Agent loops:** maximum three attempts per approach; require a changed hypothesis and a diagnostic experiment.
- **Memory stale:** validate against current code/config/runtime; mark old decisions superseded.
- **Claims success without evidence:** require exact commands and actual output. State checks that were not run.
- **Conflicting instructions:** merge to one concise root contract and keep specific project instructions consistent.
