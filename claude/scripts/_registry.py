"""Shared helpers for the stakeholder registry."""

from __future__ import annotations

import os
from pathlib import Path


def registry_path() -> Path:
    return Path(
        os.environ.get("STAKEHOLDER_REGISTRY", str(Path.home() / ".agents" / "stakeholders.json"))
    ).expanduser()
