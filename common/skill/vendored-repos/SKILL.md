---
name: vendored-repos
description: Use to a) create new vendored repos, b) read the repo of $snap:vendored_repos(alchemy, browsermcp, companies-house-filing, effect, effect-v4, foldkit, gnucash-ixbrl, ixbrl-reporter, ixbrl-reporter-jsonnet, kapture, notation, opencode, opentui, piq, playwright, playwriter, pok, sst) instead of web search or peering into node_modules.
---

# Vendored Repos

Commonly-used libraries have their source code vendored in `~/Repos/vendors/<name>`.

This gives agents access to the best documentation – the up-to-date source of truth.

## Read vendored repos

First git pull the repo you want to inspect so you are observing the latest source files.

Grep and read the repo for examples, tests, usage etc.

Obviously, never import code from a vendored repo.

## Add a vendored repo

```bash
git clone --depth 1 --branch <branch> <repo-url> ~/Repos/vendors/<name>
```

Once the repo is added, run:

```bash
cd ~/Repos/operations/agentkit && pok sync
```
