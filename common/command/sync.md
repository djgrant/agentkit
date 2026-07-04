---
description: Sync agentkit skills & commands into every harness
---

Symlink all agentkit config into each harness's native location.

!`python3 $HOME/Repos/djgrant/agentkit/common/scripts/sync.py`

## Sources (per format)

- `common/<fmt>/*` — shared across all harnesses
- `<harness>/<fmt>/*` — harness-specific (wins over common on name collision)

Formats: `skill`, `command`.

## Targets

| harness  | skills                 | commands             | config files          |
| -------- | ---------------------- | -------------------- | --------------------- |
| claude   | `~/.claude/skills`     | `~/.claude/commands` |                       |
| codex    | `~/.codex/skills`      |                      |                       |
| kiro     | `~/.kiro/skills`       |                      |                       |
| agents   | `~/.agents/skills`     |                      |                       |
| gemini   | `~/.gemini/skills`     |                      |                       |
| opencode | `~/.config/opencode/skill` | `~/.config/opencode/command` | `opencode.json`, `tui.json` |

## Rules

- Symlink each item individually; never clobber a real (non-symlink) path
- Prune dead symlinks in every target

## Pruning drift

Plugins sometimes drop real dirs into a harness's skills folder. To review and
remove entries agentkit doesn't manage (each confirmed individually, so foreign
links like app-provided skills can be kept), run in a terminal:

```bash
python3 common/scripts/sync.py --prune
```
