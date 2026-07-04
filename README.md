# agentkit

Personal, cross-harness agent configuration — skills, commands, and tools shared
across [OpenCode](https://opencode.ai), Claude Code, Codex, Kiro, and other harnesses.

## Layout

```
agentkit/
├── common/            # shared across all harnesses
│   ├── skill/
│   ├── command/
│   └── scripts/
│       └── sync.py    # symlinks config into every harness's native location
├── opencode/          # OpenCode-specific config
│   ├── opencode.json
│   ├── tui.json
│   └── command/
├── claude/            # Claude Code-specific
│   ├── command/
│   └── scripts/
└── codex/  kiro/      # grow as harness-specific content appears
```

**Rule of thumb:** harness-specific config lives under its harness dir; anything
portable lives in `common/`. Within each dir, subdirs use the native format names
(`skill/`, `command/`, `scripts/`, …) that harnesses already understand.

## Setup

The repo is pure source. `sync.py` symlinks each item into every harness's live
config location — including OpenCode's `~/.config/opencode`, which is treated as an
ordinary target (a real dir populated with symlinks), so nothing points back into the
repo at itself:

```bash
python3 common/scripts/sync.py      # or: /sync from within any harness
```

Each target gets `common/<fmt>/*` plus its own `<harness>/<fmt>/*` (harness-specific
wins on name collision). Links are individual; dead links are pruned; real
(non-symlink) paths are never clobbered.

| harness  | live location       | gets                        |
| -------- | ------------------- | --------------------------- |
| claude   | `~/.claude`         | skills, commands            |
| codex    | `~/.codex`          | skills                      |
| kiro     | `~/.kiro`           | skills                      |
| agents   | `~/.agents`         | skills (shared, e.g. amp)   |
| opencode | `~/.config/opencode`| skills, commands, `*.json`  |

## License

MIT
