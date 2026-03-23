---
description: Create symlinks of skills for all harnesses
---

Create/update symlinks for all OpenCode skills into other harnesses' skill locations.

This command runs the symlink operation as a tool call.

!`python3 scripts/symlink_skills.py`

## Source Skills

All skills directories contained:

- `./skill` (this repo's skill directory)
- `$OPENCODE_CONFIG_DIR/skill` (the overlay config skill directory)

## Symlink Targets

~/.codex/skills
~/.claude/skills
~/.kiro/skills
~/.agents/skills/

## Requirements

- Symlink each skill directory individually
- Remove any dead symlinks
