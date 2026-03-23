#!/usr/bin/env python3
"""Symlink OpenCode skills into other harness skill directories.

Sources:
- ./skill
- $OPENCODE_CONFIG_DIR/skill (defaults to ~/.config/opencode/skill)

Targets:
- ~/.codex/skills
- ~/.claude/skills
- ~/.kiro/skills
- ~/.agents/skills

Rules:
- Symlink each skill directory individually
- Remove dead symlinks in targets (top-level only)
- Overlay config skills win on name collision
"""

from __future__ import annotations

import os
from pathlib import Path


def main() -> int:
    repo_skill_dir = (Path.cwd() / "skill").expanduser()
    opencode_base = Path(
        os.environ.get(
            "OPENCODE_CONFIG_DIR",
            str(Path.home() / ".config" / "opencode"),
        )
    ).expanduser()
    config_skill_dir = opencode_base / "skill"

    targets = [
        Path("~/.codex/skills").expanduser(),
        Path("~/.claude/skills").expanduser(),
        Path("~/.kiro/skills").expanduser(),
        Path("~/.agents/skills").expanduser(),
    ]

    if not repo_skill_dir.is_dir():
        raise SystemExit(f"Repo skill directory not found: {repo_skill_dir}")

    for t in targets:
        t.mkdir(parents=True, exist_ok=True)

    # Remove dead symlinks in targets (top-level only)
    removed_dead = 0
    for t in targets:
        for p in t.iterdir():
            if p.is_symlink() and not p.exists():
                p.unlink()
                removed_dead += 1

    # Build skill mapping (overlay config wins on name collision)
    skill_src: dict[str, Path] = {}
    for src_root in (repo_skill_dir, config_skill_dir):
        if not src_root.is_dir():
            continue
        for p in src_root.iterdir():
            if p.is_dir():
                skill_src[p.name] = p.resolve()

    skill_names = sorted(skill_src.keys())
    if not skill_names:
        print(f"No skills found in: {repo_skill_dir} or {config_skill_dir}")
        print(f"Removed dead symlinks: {removed_dead}")
        return 0

    linked = 0
    skipped = 0
    for t in targets:
        for name in skill_names:
            src = skill_src[name]
            dest = t / name

            # Don't overwrite real dirs/files.
            if dest.exists() and not dest.is_symlink():
                skipped += 1
                continue

            # Replace any existing symlink (including dead).
            if dest.is_symlink() or dest.exists():
                try:
                    dest.unlink()
                except FileNotFoundError:
                    pass

            dest.symlink_to(src)
            linked += 1

    print(f"Repo skills:   {repo_skill_dir}")
    print(f"Config skills: {config_skill_dir}")
    print(f"Skills found:  {len(skill_names)}")
    print(f"Symlinks set:  {linked}")
    print(f"Skipped (non-symlink existing paths): {skipped}")
    print(f"Removed dead symlinks: {removed_dead}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
