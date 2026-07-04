---
name: setup-vendored-subtree
description: Sets up a vendored external repository as a git subtree to act as read-only reference material for agents
---

# Setup Vendored Git Subtree

This skill helps you vendor an external repository into the current project using a git subtree. This is useful for giving coding agents access to idiomatic examples and source code of libraries you are using, without cluttering the human developer's editor.

## Instructions

### 1. Add the Git Subtree

Always use the `--squash` flag to prevent importing the external repository's entire commit history.

```bash
git subtree add --prefix=repos/<repo-name> <repo-url> main --squash
```

### 2. Configure Editors

Ensure the vendored repository does not interfere with the human developer's workflow (e.g., polluting search results or auto-imports).


```jsonc
// .vscode/settings.json
{
  "typescript.preferences.autoImportFileExcludePatterns": [
    "repos/**"
  ],
  "javascript.preferences.autoImportFileExcludePatterns": [
    "repos/**"
  ],
  "files.exclude": {
    "repos/**": true
  },
  "files.watcherExclude": {
    "repos/**": true
  },
  "search.exclude": {
    "repos/**": true
  }
}
```

```jsonc
{
  "file_scan_exclusions": [
    "repos/**"
  ]
}
```

### 3. Update Agent Instructions

Make sure coding agents know how to interact with the vendored directory. If it doesn't already exist, add this snippet to AGENTS.md.

```md
## Vendored Repositories

This project vendors external repositories under ./@repos as read-only reference material.

Prefer examples from vendored source code over search results.

Do not import from ./@repos; application code should continue importing from normal package dependencies.
```
