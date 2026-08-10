# agentkit

Personal coding harness config and skills directory + CLI to keep them in sync.

## CLI

The CLI is exposed through [`pok`](https://github.com/djgrant/pok):

```bash
pok view    # show mcp servers and missing secrets
pok drift   # compare this repo with live harness config
pok sync    # interactively reconcile live config with this repo
```

## Config files

Most harness config is symlinked straight from this repo into the harness. Files
a harness *writes back to* are merged instead, because linking them would drag
machine-local state — trusted project paths, hook hashes, dismissed notices —
into version control. `codex/config.toml` is one: the repo holds the settings it
owns, and `pok sync` merges those over the live file, leaving every key the
template doesn't name in place. `pok drift` warns if a home path ever appears in
a merged template, which is the signature of live state leaking back in.

JSON files merge too, with ownership following the template's shape: objects
recurse, leaves replace. `codex/hooks.json` and `gemini/settings.json` use this
to own a single hook event each (keeping third-party installers from planting
hooks there) while the live files keep their machine-local and secret-bearing
keys out of git.

When `pok sync` leaves a self-installed entry alone, it records that decision in
`common/unmanaged.json` so later sync and drift runs do not ask again. MCP
exceptions are similarly recorded under `unmanaged` in `common/mcp/servers.json`.

## Layout

- [`common`](common): skills and mcp shared across harnesses
- [`claude`](claude): claude-specific setup
- [`opencode`](opencode): open-code specific setup
- etc.


## License

[MIT](LICENSE)
