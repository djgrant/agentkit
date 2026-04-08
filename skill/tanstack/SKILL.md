---
name: tanstack
description: When writing tanstack code, use this skill to understand the recommend best practices.
---

# TanStack Best Practices

This skill provides comprehensive guidance for building applications with TanStack Start, TanStack Router, and TanStack Query on Cloudflare Workers.

## Setup

Copy `~/Repos/djgrant/tanstack-utils` into the project as `@tanstack-lib/core` (or similar).

The package provides:

- `ArrayCache` / `InfiniteArrayCache` - Base classes for cache management
- `withQueryClient` / `createMutationHook` - Mutation utilities
- `prepend`, `append`, `removeById`, `updateById`, `mergeRows` - Immutable reducers
- `overFirstPageRows`, `overPaginatedRowAtId` - Paginated data helpers

## Guides

- [Basics](./basics.md) - Overview of router, server functions, API routes, data loading
- [Project Setup](./setup.md) - Vite config, SSR, Cloudflare Workers
- [Router](./router.md) - File-based routing, auth guards, data loading
- [Query](./query.md) - Query keys, definitions, suspense patterns
- [Mutations](./mutations.md) - `withQueryClient`, optimistic updates, hooks
- [Cache Classes](./cache.md) - `ArrayCache`, `InfiniteArrayCache`, domain helpers
- [Realtime](./realtime.md) - Postgres changes, subscriptions
- [Server Functions](./server.md) - Server functions, routes, workflows
