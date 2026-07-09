#!/usr/bin/env python3
"""Forward a fork's learnings into its canonical stakeholder session.

Usage: forward_learnings.py <name[:kind]> <learnings_text>

A consultation runs as a fork, so anything it learns is lost when the fork is
discarded. This appends those learnings to the *canonical* session as a new turn
(`claude --resume <parent> -p ...`): the parent's transcript grows, its model
acknowledges the input, and every future fork inherits it. The session id is
unchanged, so the registry needs no update.

This is meant to run fire-and-forget in the background (ask_stakeholder.py spawns
it). Because each update is an appended turn rather than a pointer swap, several
forks can forward learnings without clobbering one another — they accumulate.

The registry is partitioned by project dir; if the name lives in more than one
project, set STAKEHOLDER_PROJECT to disambiguate.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

from _registry import registry_path

PROMPT = (
    "The following are learnings from a consultation that was forked from you. "
    "Fold them into your canonical understanding of the plan so future consultations "
    "inherit them. Reply only with a one-line acknowledgement.\n\n{learnings}"
)


def die(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1


def main(argv: list[str]) -> int:
    if len(argv) < 2 or not argv[1].strip():
        return die("usage: forward_learnings.py <name[:kind]> <learnings_text>")
    name, learnings = argv[0], argv[1].strip()
    key = name if ":" in name else f"{name}:cc"

    reg_path = registry_path()
    if not reg_path.exists():
        return die(f"No stakeholder registry at {reg_path}")
    reg = json.loads(reg_path.read_text())

    projects = [p for p, v in reg.items() if key in v]
    if not projects:
        return die(f"Unknown stakeholder: {key}")
    if len(projects) > 1 and not os.environ.get("STAKEHOLDER_PROJECT"):
        return die("Stakeholder '%s' exists in multiple projects; set STAKEHOLDER_PROJECT to one of:\n%s"
                   % (key, "\n".join(f"  {p}" for p in projects)))

    proj = os.environ.get("STAKEHOLDER_PROJECT") or projects[0]
    sid = reg[proj][key]["session_id"]

    cmd = ["claude", "-p", "--resume", sid, PROMPT.format(learnings=learnings)]
    proc = subprocess.run(cmd, cwd=proj, capture_output=True, text=True)
    if proc.returncode != 0:
        return die(proc.stderr.strip() or f"claude exited {proc.returncode}")

    print(f"Forwarded learnings to '{name}' (session {sid[:8]}…).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
