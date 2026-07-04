#!/usr/bin/env python3
"""Ask a registered stakeholder a question.

Usage: ask_stakeholder.py <name[:kind]> <question> [prior_session_id]
  - First turn (no prior id): forks the stakeholder's canonical session (leaving it
    untouched) and answers from the fork.
  - Follow-up (prior id given): resumes that fork so the conversation accumulates.

The registry is partitioned by project dir. The stakeholder is located by searching
the project buckets for its name; if the same name lives in more than one project,
set STAKEHOLDER_PROJECT to disambiguate.

Prints the answer, then a final line `SESSION: <id>`. Pass that id back as the third
argument to continue the same conversation.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

from _registry import registry_path


def die(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        return die("usage: ask_stakeholder.py <name[:kind]> <question> [prior_session_id]")
    name, question = argv[0], argv[1]
    prior = argv[2] if len(argv) > 2 else ""

    key = name if ":" in name else f"{name}:cc"
    reg_path = registry_path()
    if not reg_path.exists():
        return die(f"No stakeholder registry at {reg_path}")
    reg = json.loads(reg_path.read_text())

    projects = [p for p, v in reg.items() if key in v]
    if not projects:
        lines = [f"Unknown stakeholder: {key}", "Known stakeholders:"]
        for p, v in reg.items():
            lines += [f"  {k}  [{p}]" for k in v]
        return die("\n".join(lines))
    if len(projects) > 1 and not os.environ.get("STAKEHOLDER_PROJECT"):
        return die("Stakeholder '%s' exists in multiple projects; set STAKEHOLDER_PROJECT to one of:\n%s"
                   % (key, "\n".join(f"  {p}" for p in projects)))

    proj = os.environ.get("STAKEHOLDER_PROJECT") or projects[0]
    sid = reg[proj][key]["session_id"]

    cmd = ["claude", "-p", "--output-format", "json"]
    cmd += ["--resume", prior] if prior else ["--resume", sid, "--fork-session"]
    cmd.append(question)
    proc = subprocess.run(cmd, cwd=proj, capture_output=True, text=True)
    if proc.returncode != 0:
        return die(proc.stderr.strip() or f"claude exited {proc.returncode}")

    out = json.loads(proc.stdout)
    print(out["result"])
    print(f"SESSION: {out['session_id']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
