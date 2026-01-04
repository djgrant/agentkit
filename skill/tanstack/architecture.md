# Architecture

## Data Flow

```
Route (loader/beforeLoad)
    ↓ ensureQueryData / prefetchQuery
QueryClient
    ↓ queryFn
Domain db module (*.db.ts)
    ↓
Database / API
```

## Domain Organization

Organize code by domain, not by type:

```
src/domains/
├── channels/
│   ├── todos.cache.ts     # Query keys + cache class
│   ├── todos.db.ts        # Data fetching (database/API)
│   ├── todos.hooks.ts     # React hooks
│   ├── todos.mutations.ts # Mutation definitions
│   ├── todos.queries.ts   # Query definitions
│   ├── todos.realtime.ts  # Realtime subscriptions (optional)
│   └── todos.types.ts     # TypeScript types
```

## Data Layer Rules

1. Routes and components **never** call the database/API directly
2. All data access goes through `*.db.ts` modules
3. Queries wrap db calls with TanStack Query
4. Hooks wrap queries/mutations for component consumption

## Quick Reference

**Router:**
- Use layout routes (`_layoutName.tsx`) for auth guards
- Validate search/path params with Zod schemas
- Use `ensureQueryData` in loaders for SSR-critical data
- Use `prefetchQuery` with `!isServer` guard for client-only prefetching

**Query:**
- Define query keys in `*.cache.ts` files
- Use `queryOptions` / `infiniteQueryOptions` factories
- Use `useSuspenseQuery` when loader guarantees data

**Mutations:**
- Use `withQueryClient` + `createMutationHook` pattern
- Implement optimistic updates with `onMutate` + cache class
- Handle errors with rollback in `onError`

**Server-Side:**
- Server Functions: Client-initiated actions, form handling
- Server Routes: External webhooks, raw HTTP control
- Workflows: Long-running, durable operations
