---
name: vendored-repos
description: Read-only store of vendored external library source at ~/Repos/vendors (effect, opencode, opentui, alchemy, sst, notation, …). Consult it for idiomatic examples, real API usage, and internals before falling back to web search or guessing. Shared across all projects.
---

# Vendored Repositories

Full source of external libraries is vendored locally in one shared,
machine-local store: `~/Repos/vendors/`. It is read-only reference material —
idiomatic examples and internals — shared across every project.

## Use it

- Prefer examples from vendored source over web search or guessing.
- Grep and read under `~/Repos/vendors/<lib>` for real usage, types, and internals.
- Effect examples live under `~/Repos/vendors/effect/packages/**/examples`.
- See `~/Repos/vendors/README.md` for the current inventory and upstreams.

## Don't

- Do not import from `~/Repos/vendors`. Application code imports from the normal
  package dependencies; this is reference material only.
- Do not edit vendored files — treat them as read-only.

## Adding a repo

To vendor a new upstream into the store, use the `vendor-subtree` skill.
