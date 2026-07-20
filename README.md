# agentkit

Personal coding harness config and skills directory + CLI to keep them in sync.

## CLI

The CLI is exposed through [`pok`](https://github.com/djgrant/pok):

```bash
pok view    # show mcp servers and missing secrets
pok drift   # compare this repo with live harness config
pok sync    # interactively reconcile live config with this repo
```

## Layout

- [`common`](common): skills and mcp shared across harnesses
- [`claude`](claude): claude-specific setup
- [`opencode`](opencode): open-code specific setup
- etc.


## License

[MIT](LICENSE)
