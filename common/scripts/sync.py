#!/usr/bin/env python3
"""Sync agentkit config into every harness's native location via symlinks.

Repo layout:
  common/<fmt>/*     shared across all harnesses
  <harness>/<fmt>/*  harness-specific (wins over common on name collision)

where <fmt> is a native format dir: skill, command, ...

Every harness is an external TARGET: its live config dir lives outside the repo, and
we symlink each item in individually so the target can also hold things we don't
manage. Source and target are always distinct — nothing self-links.

Precedence on name collision (lowest -> highest): common < harness.

Usage:
  sync.py            link everything, prune dead symlinks
  sync.py --prune    also interactively remove *undeclared* entries (drift not
                     managed by agentkit, e.g. real dirs a plugin dropped in)
"""

from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


@dataclass
class Target:
    """A harness whose live config we populate with symlinks."""
    base: Path                        # harness config root, e.g. ~/.claude
    formats: dict[str, str]           # repo format dir -> native subdir, e.g. skill -> skills
    files: list[str] = field(default_factory=list)  # config files symlinked directly into base

    def __post_init__(self) -> None:
        self.base = Path(self.base).expanduser()


# `agents` (amp et al.) and `gemini` (antigravity) are shared skill locations.
TARGETS = {
    "claude": Target(
        base="~/.claude",
        formats={"skill": "skills", "command": "commands"},
        files=["settings.json"],
    ),
    "codex": Target(
        base="~/.codex",
        formats={"skill": "skills"},
    ),
    "kiro": Target(
        base="~/.kiro",
        formats={"skill": "skills"},
    ),
    "agents": Target(
        base="~/.agents",
        formats={"skill": "skills"},
    ),
    "gemini": Target(
        base="~/.gemini",
        formats={"skill": "skills"},
    ),
    "opencode": Target(
        base="~/.config/opencode",
        formats={"skill": "skill", "command": "command"},
        files=["opencode.json", "tui.json"],
    ),
}


def managed_dirs() -> list[Path]:
    return [t.base / native for t in TARGETS.values() for native in t.formats.values()]


def collect(harness: str, fmt: str) -> dict[str, Path]:
    """name -> source path for <fmt> in <harness>; harness wins over common."""
    out: dict[str, Path] = {}
    for d in [REPO / "common" / fmt, REPO / harness / fmt]:
        if not d.is_dir():
            continue
        for p in sorted(d.iterdir()):
            # skills are directories (SKILL.md inside); commands are .md files
            if p.name.startswith(".") or p.name == "SKILL.md":
                continue
            out[p.name] = p.resolve()
    return out


def link(src: Path, dest: Path) -> bool:
    """Create dest -> src. Returns False (and skips) if a real path is in the way."""
    if dest.exists() and not dest.is_symlink():
        return False  # never clobber a real dir/file
    if dest.is_symlink() or dest.exists():
        dest.unlink()
    dest.symlink_to(src)
    return True


def prune_dead(dest_dir: Path) -> int:
    if not dest_dir.is_dir():
        return 0
    removed = 0
    for p in dest_dir.iterdir():
        if p.is_symlink() and not p.exists():
            p.unlink()
            removed += 1
    return removed


def is_ours(p: Path) -> bool:
    """True if p is a symlink we manage (resolves into this repo)."""
    if not p.is_symlink():
        return False
    try:
        p.resolve().relative_to(REPO)
        return True
    except ValueError:
        return False


def sync() -> tuple[int, int, int]:
    linked = skipped = dead = 0
    for harness, target in TARGETS.items():
        target.base.mkdir(parents=True, exist_ok=True)
        for fname in target.files:
            src = REPO / harness / fname
            if src.exists() and link(src, target.base / fname):
                linked += 1
        for fmt, native in target.formats.items():
            dest_dir = target.base / native
            dest_dir.mkdir(parents=True, exist_ok=True)
            dead += prune_dead(dest_dir)
            items = collect(harness, fmt)
            for name, src in items.items():
                if link(src, dest_dir / name):
                    linked += 1
                else:
                    skipped += 1
            print(f"{harness}/{fmt:8} -> {dest_dir}  ({len(items)} items)")
    print(f"\nSymlinks set: {linked}   skipped (real paths): {skipped}   dead removed: {dead}")
    return linked, skipped, dead


def prune_undeclared() -> None:
    """List entries in managed dirs that agentkit doesn't declare, remove on y/N.

    'Undeclared' = anything that isn't a symlink into this repo: real dirs/files a
    plugin dropped in, or foreign symlinks. Each is confirmed individually so
    intentional foreign links (e.g. an app-provided skill) can be kept.
    """
    candidates: list[Path] = []
    for d in managed_dirs():
        if not d.is_dir():
            continue
        for p in sorted(d.iterdir()):
            if p.name.startswith(".") or is_ours(p):
                continue
            candidates.append(p)

    if not candidates:
        print("\nNo undeclared entries. Nothing to prune.")
        return

    print(f"\nUndeclared entries ({len(candidates)}) — not managed by agentkit:")
    for p in candidates:
        kind = "dir " if p.is_dir() and not p.is_symlink() else "file" if not p.is_symlink() else "link"
        tgt = f" -> {p.readlink()}" if p.is_symlink() else ""
        print(f"  [{kind}] {p}{tgt}")

    removed = 0
    for p in candidates:
        ans = input(f"Remove {p.name} ({p.parent})? [y/N] ").strip().lower()
        if ans == "y":
            if p.is_dir() and not p.is_symlink():
                shutil.rmtree(p)
            else:
                p.unlink()
            removed += 1
    print(f"\nRemoved {removed} of {len(candidates)}.")


def main() -> int:
    ap = argparse.ArgumentParser(description="Sync agentkit config into every harness.")
    ap.add_argument("--prune", action="store_true",
                    help="interactively remove undeclared entries after syncing")
    args = ap.parse_args()

    sync()
    if args.prune:
        prune_undeclared()
    return 0


if __name__ == "__main__":
    sys.exit(main())
