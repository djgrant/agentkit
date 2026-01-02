# danstack-agentkit

Personal [OpenCode](https://opencode.ai) configuration.

## Setup

This repo is symlinked to `~/.config/opencode/`:

```bash
ln -s $HOME/Repos/djgrant/danstack-agentkit ~/.config/opencode
```

## Usage with the-scientist

This config works alongside [the-scientist](https://github.com/djgrant/the-scientist) overlay. Set the overlay via:

```bash
export OPENCODE_CONFIG_DIR=/path/to/the-scientist
```

OpenCode merges configs in this order:
1. **Global** (`~/.config/opencode/` -> this repo)
2. **Project** (`.opencode/` in each project)
3. **Overlay** (`OPENCODE_CONFIG_DIR` -> the-scientist)

## Structure

```
danstack-agentkit/
├── agent/           # Personal agent definitions
├── command/         # Personal slash commands
├── skill/           # Personal skills
├── tool/            # Personal tools
├── AGENTS.md        # Global instructions
└── opencode.json    # OpenCode settings
```

## License

MIT
