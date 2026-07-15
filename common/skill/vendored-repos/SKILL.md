---
name: vendored-repos
description: Read-only store of vendored external library source at ~/Repos/vendors — consult it for idiomatic examples, real API usage, and internals before falling back to web search or guessing. Also covers adding a repo to the store.
---

# Vendored Repositories

External library source is vendored locally in a shared, read-only store:
`~/Repos/vendors/<name>`. Grep and read it for idiomatic examples, real API
usage, and internals — prefer it over web search or guessing.

Never import from it (application code uses the normal package dependencies) and
never edit it. See `~/Repos/vendors/README.md` for the current inventory.

## Add a repo

`~/Repos/vendors` is a plain directory. Shallow-clone the upstream, then drop its
git history so it stays plain read-only files:

```bash
git clone --depth 1 --branch <branch> <repo-url> ~/Repos/vendors/<name>
rm -rf ~/Repos/vendors/<name>/.git
```

Then add a row to `~/Repos/vendors/README.md` (directory, upstream URL, branch).
