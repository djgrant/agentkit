---
name: ask-stakeholder
description: Fork or resume a saved "stakeholder" session to ask it questions — use to consult a converged plan or persona, or to poll a panel of stakeholders for reactions to a proposal.
---

# Ask a Stakeholder

A **stakeholder** is a previously-converged agent session saved to the registry at
`~/.agents/stakeholders.json` (via the `/create-stakeholder` command). You can fork
it to ask questions without disturbing the original, and hold a multi-turn
conversation with the fork.

## Consult one stakeholder

```bash
"$HOME/Repos/djgrant/agentkit/claude/scripts/ask_stakeholder.py" <name> "<your question>"
```

It prints the answer, then a final line `SESSION: <id>`. To ask a **follow-up in the
same conversation**, pass that id back as a third argument:

```bash
"$HOME/Repos/djgrant/agentkit/claude/scripts/ask_stakeholder.py" <name> "<follow-up>" <id>
```

The first call forks the stakeholder's canonical session (leaving it pristine); the
follow-up resumes *your* fork so context accumulates. Thread the latest `SESSION:` id
for each stakeholder you are talking to.

## Poll a panel

To gather a panel's reactions to a proposal:

1. List the stakeholders: `jq -r 'keys[]' ~/.agents/stakeholders.json`
2. Ask each the same question. The fork calls are independent, so run them
   concurrently (e.g. one background Bash call per stakeholder). Keep a
   `name → SESSION id` map so you can follow up with each individually.
3. Synthesise the responses, attributing each point to its stakeholder.

## Learnings flow back automatically

A fork is throwaway, but its *learnings* aren't lost. If a consultation produces knowledge
that belongs in the plan, the stakeholder ends its answer with a `LEARNINGS:` block.
`ask_stakeholder.py` detects that block and, in the background, appends it to the canonical
session (`claude --resume <parent> -p ...`) so every future fork inherits it.

You don't have to do anything — it's automatic and non-blocking. Because each update is an
appended turn (not a pointer swap), learnings from multiple forks accumulate rather than
overwrite. The canonical session id is unchanged, so the registry stays as-is.

## Notes

- Bare names default to the `cc` harness; pass `name:kind` to target another (only
  `cc` is implemented today).
- A stakeholder can only be forked on the machine where it was saved (sessions are
  local to `~/.claude`), and the entry pins the project directory the fork must run
  from — the script handles both.
- The stakeholder was primed at save time to advocate for its plan, so it answers in
  character; you don't need to tell it what role to play.
