---
description: Sync agentkit skills & commands into every harness
---

Symlink all agentkit config into each harness's native location.

!`python3 $HOME/Repos/djgrant/agentkit/common/scripts/sync.py`

## Sources (per format)

- `common/<fmt>/*` — shared across all harnesses
- `<harness>/<fmt>/*` — harness-specific (wins over common on name collision)
- `$OPENCODE_CONFIG_DIR/skill/*` — optional overlay (the-scientist), skills only

Formats: `skill`, `command`.

## Targets

| harness  | skills                | commands            |
| -------- | --------------------- | ------------------- |
| claude   | `~/.claude/skills`    | `~/.claude/commands`|
| codex    | `~/.codex/skills`     |                     |
| kiro     | `~/.kiro/skills`      |                     |
| agents   | `~/.agents/skills`    |                     |
| opencode | `opencode/skill` (in-repo, via `~/.config/opencode`) | native |

## Rules

- Symlink each item individually; never clobber a real (non-symlink) path
- Prune dead symlinks in every target
