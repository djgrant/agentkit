---
name: setup-vendored-subtree
description: Vendor an external repository into the shared ~/Repos/vendors reference store so coding agents get read-only access to its source and idiomatic examples
---

# Vendor an External Repository

Vendored repos live in one shared, machine-local store: `~/Repos/vendors/<name>`.
They are read-only reference material for agents — idiomatic examples and
internals — not build dependencies. For usage, see the `vendored-repos` skill.

`~/Repos/vendors` is a plain directory (not a git repo), shared across all
projects — so there is nothing to configure per project.

## 1. Clone it in

Shallow-clone the upstream to keep the store lean, then drop its git history so
it stays plain read-only files:

```bash
git clone --depth 1 --branch <branch> <repo-url> ~/Repos/vendors/<name>
rm -rf ~/Repos/vendors/<name>/.git
```

## 2. Record it

Add a row to `~/Repos/vendors/README.md`: directory, upstream URL, branch.

## 3. Done

No per-project setup: no subtree, no AGENTS.md snippet, no `.vscode` excludes.
Agents discover the store through the `vendored-repos` skill.
