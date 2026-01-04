# TanStack Router

## File-Based Routing Conventions

```
src/routes/
├── __root.tsx                    # Root layout (context setup)
├── _protected.tsx                # Pathless layout (auth guard)
├── _protected/
│   ├── dashboard.tsx             # /dashboard
│   ├── chat.index.tsx            # /chat
│   └── chat.$id.tsx              # /chat/:id
├── _public.tsx                   # Public pages layout
├── _public/
│   └── pricing.tsx               # /pricing
└── items.{-$id}.tsx              # /items or /items/:id (optional param)
```

**Naming Patterns:**

- `__root.tsx` - Root layout for entire app
- `_layoutName.tsx` - Pathless layout group (no URL segment)
- `_layoutName/child.tsx` - Child nested under layout
- `routeName.index.tsx` - Index route for a parent
- `routeName.$paramName.tsx` - Dynamic route parameter
- `routeName.{-$optionalParam}.tsx` - Optional parameter
- `route1.route2.tsx` - Nested route (dots become URL segments)

---

## Root Route with Context

Pass `queryClient` and auth state through router context:

```typescript
// src/routes/__root.tsx
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  auth: { user: User | null };
  permissions: string[];
}>()({
  beforeLoad: async ({ context }) => {
    const auth = await context.queryClient.ensureQueryData(authQuery());
    const permissions = auth.user
      ? await context.queryClient.ensureQueryData(permissionsQuery())
      : [];
    return { auth, permissions };
  },
  component: RootComponent,
});
```

---

## Layout Routes for Auth Guards

Use pathless layout routes as auth guards:

```typescript
// src/routes/_protected.tsx
export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ location, context: { auth } }) => {
    if (!auth.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
        replace: true,
      });
    }

    // Additional guards
    if (!auth.user.is_complete) {
      throw redirect({
        to: '/onboarding',
        replace: true,
      });
    }
  },
  component: () => <Outlet />,
});
```

---

## Validate Params with Zod

Always validate search and path params.

**Search params:**

```typescript
const searchSchema = z.object({
  type: z.enum(['classical', 'contemporary']).catch('classical'),
  filters: z
    .object({
      category: z.array(z.string()).optional().catch(undefined),
      status: z.enum(['active', 'archived']).optional(),
    })
    .catch({}),
});

export const Route = createFileRoute('/_protected/items')({
  validateSearch: (search) => searchSchema.parse(search),
});
```

**Path params:**

```typescript
const typeSchema = z.enum(['classical', 'contemporary']);

export const Route = createFileRoute('/_protected/items/$type/$id')({
  params: {
    parse: (params) => ({
      type: typeSchema.parse(params.type),
      id: params.id,
    }),
    stringify: ({ type, id }) => ({ type, id }),
  },
});
```

---

## Data Loading Strategy

### `ensureQueryData` - SSR-safe, blocks navigation

```typescript
loader: async ({ context: { queryClient } }) => {
  await queryClient.ensureQueryData(itemsQuery());
};
```

### `prefetchQuery` - Non-blocking, client-only

```typescript
loader: async ({ params, context: { queryClient } }) => {
  if (!isServer) {
    queryClient.prefetchInfiniteQuery(messagesQuery(params.id));
  }
};
```

### Parallel loading

```typescript
loader: async ({ context: { queryClient } }) => {
  await Promise.all([
    queryClient.ensureQueryData(itemsQuery()),
    queryClient.ensureQueryData(categoriesQuery()),
    queryClient.ensureQueryData(userQuery()),
  ]);
};
```

### Validation in loader

```typescript
loader: async ({ params, context: { queryClient } }) => {
  const items = await queryClient.ensureQueryData(itemsQuery());

  const exists = items.some((item) => item.id === params.id);
  if (!exists) {
    throw redirect({ to: '/items' });
  }
};
```

---

## Complete Route Example

```typescript
// src/routes/_protected/chat.$id.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { isServer } from '@tanstack/react-query';

export const Route = createFileRoute('/_protected/chat/$id')({
  component: ChatRoute,
  loader: async ({ params, context: { queryClient } }) => {
    // SSR-critical: ensure channels exist
    const channels = await queryClient.ensureQueryData(channelsQuery());

    // Validate the channel exists
    const exists = channels.some((c) => c.id === params.id);
    if (!exists) {
      throw redirect({ to: '/chat' });
    }

    // Non-blocking: prefetch users
    queryClient.ensureQueryData(usersQuery());

    // Client-only: prefetch messages (avoid SSR scroll complexity)
    if (!isServer) {
      queryClient.prefetchInfiniteQuery(messagesQuery(params.id));
    }
  },
});

function ChatRoute() {
  return <Chat />;
}
```
