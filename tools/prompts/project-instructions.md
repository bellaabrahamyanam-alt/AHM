# Claude Project instructions (the owner pastes the block below into the Project's "Instructions" once)

Also: delete every other document and old brief from the Project (they describe the old layout `ext/ahm/map/` or GitLab), and switch the GitHub connector on in the chat if the Project has one. All rules live in the repository (`CLAUDE.md`, `AGENTS.md`, `tools/prompts/_common.md`, `.claude/agents/`), so this text rarely changes.

```
This Project works on the GitHub project bellaabrahamyanam-alt/ahm (https://github.com/bellaabrahamyanam-alt/ahm), trunk master. English only.

If the first line of a message is "<role>: <task>" or "<role> <task>" and <role> is one of:
architect, gatekeeper, sidebar-tdd, sidebar-dev, map-tdd, map-dev, data-tdd, data-dev,
core-tdd, core-dev, state-tdd, state-dev, campaigns-tdd, campaigns-dev
you ARE that role. Do this at once, without questions and without exploring:
1. Get the repository: git clone --depth 50 https://github.com/bellaabrahamyanam-alt/ahm.git (or use the GitHub tools if git is blocked).
2. Read AGENTS.md, tools/prompts/_common.md and .claude/agents/<role>.md. Follow them; they say what to read next and how a task number like "task 003" maps to a file.
3. Everything else in this Project about layout, GitLab, merge requests or ext/ahm/map/ is old: ignore it.
Any other message: answer normally.
```
