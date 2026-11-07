# Proposal 007: a clear start for every agent (one command, no probing)

Status: approved (the owner, 2026-11-07, in the chat: "I want to you fix all complaints and outdated things in order to everything be clear and nice structured.")
From: shared (architect). Merge request: branch `shared/agent-start`.
Update (same day, proposal 008): the Draft merge request part is dropped (the `-tdd` agent opens no merge request) and the Project instructions now test git once instead of forbidding it. The rest stands.

## Why
The owner called `sidebar-tdd task 003` in a Claude Project chat. The agent tried to clone (gitlab.com is blocked there), searched work items and branches, listed a folder `ext/ahm/map` that does not exist, did not know which file "task 003" is, and opened no merge request. Causes: (1) old Project documents and the old architect brief still describe `ext/ahm/map/`, GitHub, `add_repo` and cloning; (2) the rules did not say where things are, how a task number maps to a file, or that a chat cannot run git or tests; (3) the `-tdd` role opened no merge request, so the owner saw nothing.

## Current text
`tools/prompts/_common.md` (rules only), role files (the `-tdd` role: "open NO merge request"), `DOMAINS.md` roles line, no text for the Project instructions.

## New text
- `tools/prompts/_common.md` starts with "Start here": the command format (`<role>: <task>`, colon optional; `task 003` = `tasks/003-*.md`; free text allowed), a map of the repository (the root is the extension, no `ext/`), a warning that old documents are old, how to reach the code (cloud chat: GitLab tools only, one `tool_search` call, no clone; terminal: git), a GitLab tool cheat sheet, and "finish with the owner's next command".
- The `-tdd` agent opens the merge request as a **Draft** right after pushing the red tests; the `-dev` agent makes CI green and removes `Draft: `; `gatekeeper` refuses a Draft (new check 7). The owner sees one merge request per task from the start, with CI red and then green.
- New `tools/prompts/project-instructions.md`: the short text the owner pastes into the Claude Project once.
- All 14 role files (`.claude/agents/`) say how to start and what to finish with.

## Who is affected
All agents. No application code, interface or test changes.

## Migration
The branch `sidebar/publish-state` already has the red tests of task 003 but no merge request: `sidebar-tdd` opens the Draft merge request on it.

## Tests
None new. CI of this merge request.
