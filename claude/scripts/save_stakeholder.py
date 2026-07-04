#!/usr/bin/env python3
"""Record the current Claude Code session in the stakeholder registry.

Called by the /create-stakeholder command's !-block as:
    save_stakeholder.py "<session_id>" "<project_dir>" "<name> [description]"

The registry is partitioned by project directory:
    { "<project_dir>": { "<name>:cc": { kind, description, created, session_id } } }

session_id / project_dir may arrive empty (if a slash-command substitution didn't
resolve); they fall back to the in-session env var and the current directory.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import sys
from pathlib import Path

from _registry import registry_path


def main(argv: list[str]) -> int:
    reg_path = registry_path()

    sid = (argv[0] if len(argv) > 0 else "") or os.environ.get("CLAUDE_CODE_SESSION_ID", "")
    proj = (argv[1] if len(argv) > 1 else "") or os.getcwd()
    raw = argv[2] if len(argv) > 2 else ""

    name, _, rest = raw.strip().partition(" ")
    desc = rest.strip() or name

    if not name:
        print("create-stakeholder: no name given "
              "(usage: /create-stakeholder <name> [description])", file=sys.stderr)
        return 1
    if not sid:
        print("create-stakeholder: could not determine session id", file=sys.stderr)
        return 1

    reg = json.loads(reg_path.read_text()) if reg_path.exists() else {}
    reg.setdefault(proj, {})[f"{name}:cc"] = {
        "kind": "cc",
        "description": desc,
        "created": _dt.date.today().isoformat(),
        "session_id": sid,
    }
    reg_path.parent.mkdir(parents=True, exist_ok=True)
    reg_path.write_text(json.dumps(reg, indent=2) + "\n")

    print(f"Saved stakeholder '{name}:cc' in {proj} (session {sid[:8]}…).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
