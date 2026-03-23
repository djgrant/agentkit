---
description: Create symlinks of skills for all harnesses
---

You are to symlink all opencode skills to other harnesses' skill locations. 

## Source Skills

All skills directories contained:

- `./skill` (this repo's skill directory)
- `$OPENCODE_CONFIG_DIR/skill` (the overlay config skill directory)

## Symlink Targets

- ~/.codex/skills
- ~/.claude/skills/
- ~/.kiro/skills

## Requirements

- Symlink each skill directory individually
- Remove any dead symlinks
