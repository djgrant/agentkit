#!/usr/bin/env python3
"""List the stakeholders saved for a project directory.

Usage: list_stakeholders.py [project_dir]   (defaults to $CLAUDE_PROJECT_DIR or $PWD)
"""

from __future__ import annotations

import json
import os
import sys

from _registry import registry_path


def main(argv: list[str]) -> int:
    reg_path = registry_path()
    proj = (argv[0] if argv else "") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()

    if not reg_path.exists():
        print("No stakeholders saved yet.")
        return 0

    reg = json.loads(reg_path.read_text())
    here = reg.get(proj, {})

    if not here:
        print(f"No stakeholders saved for this project ({proj}).")
        others = sum(1 for v in reg.values() if v)
        if others:
            print(f"({others} other project(s) have stakeholders — "
                  "run this from those directories to see them.)")
        return 0

    print(f"Stakeholders in {proj}:")
    for key, v in here.items():
        print(f"  • {key}  —  {v.get('description')}  ({v.get('created')})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
