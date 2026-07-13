# agentkit

Personal, cross-harness agent config — skills, commands, and MCP servers shared
across [OpenCode](https://opencode.ai), Claude Code, Codex, Kiro, and others.

## Layout

```
common/          shared across all harnesses (skill/, command/, mcp/)
  mcp/servers.json   canonical MCP topology — the one file you edit
cli/             the CLI (Bun/TS)
  commands/          sync | view | drift  (business logic)
  core.ts            harness registry + MCP render (shared)
pok.config.ts    pok entrypoint
<harness>/       harness-specific config (claude/, opencode/, codex/, kiro/)
```

## Commands

```bash
bun install                 # once

pok sync                    # link skills/commands/config + render MCP per harness
pok view                    # canonical MCP source + secret status
pok drift                   # where live harness config diverges from source
```

## Contract

- **Source of truth is the repo.** Config is projected into each harness's live
  location; never edit the generated targets by hand.
- **Skills/commands/config** are symlinked. `common/<fmt>/*` plus each
  `<harness>/<fmt>/*` (harness wins on collision). Dead links pruned; real paths
  never clobbered.
- **MCP** is rendered (can't symlink — each harness has its own schema): edit
  `common/mcp/servers.json`, run `pok sync`. Per-server `"targets": [...]` scopes
  which harnesses receive it. agentkit owns each harness's MCP block outright, so
  the source is authoritative — servers added by hand elsewhere are overwritten.
- **Secrets** never enter `servers.json` — use `${VAR}` placeholders. Real values
  live in `common/mcp/secrets.env` (gitignored; copy `.example`), also meant to be
  `source`d in your shell so `{env:VAR}` harnesses read the same store.

## License

MIT
