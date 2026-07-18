---
name: detached-git-init
description: Initialise a git repo whose git dir lives outside the working tree, under ~/.git-detached/<project>. Use when a project must not contain a .git folder (e.g. iCloud/Obsidian synced dirs).
---

# Detached git init

Keep the git directory in `~/.git-detached/<project-name>` (one subfolder per project); the working tree only gets a small `.git` **pointer file**.

```sh
git init --separate-git-dir="$HOME/.git-detached/$(basename "$PWD")" .
```
