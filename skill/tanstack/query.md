# TanStack Query

## Query Keys

Centralize keys in cache files with increasing specificity:

```typescript
// items.cache.ts
export const itemsKeys = {
  all: ['items'] as const,
  list: (filters?: Filters) => [...itemsKeys.all, 'list', filters] as const,
  detail: (id: string) => [...itemsKeys.all, id] as const,
};

// Parameterized keys for polymorphic data
export const speechesKeys = {
  all: ['speeches'] as const,
  list: (type: SpeechType) => ['speeches', type] as const,
  detail: (type: SpeechType, id: string) => ['speeches', type, id] as const,
};
```

---

## Query Definitions

Use `queryOptions` for type-safe, reusable queries:

```typescript
// items.queries.ts
import { queryOptions } from '@tanstack/react-query';
import * as db from './items.db';
import { itemsKeys } from './items.cache';

// Basic query
export const itemsQuery = () =>
  queryOptions({
    queryKey: itemsKeys.list(),
    queryFn: () => db.fetchItems(),
  });

// Query with staleTime
export const pricesQuery = () =>
  queryOptions({
    queryKey: ['billing', 'prices'],
    queryFn: () => db.fetchPrices(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

// Conditional query
export const itemQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: itemsKeys.detail(id ?? ''),
    queryFn: () => (id ? db.fetchItem(id) : Promise.resolve(null)),
    enabled: !!id,
  });

// Parameterized query (polymorphic)
export const speechQuery = <T extends SpeechType>(
  id: string | undefined,
  type: T
) =>
  queryOptions({
    queryKey: speechesKeys.detail(type, id ?? ''),
    queryFn: () => (id ? db.fetchSpeech(id, type) : Promise.resolve(null)),
    enabled: !!id,
  });
```

---

## Infinite Queries

```typescript
import { infiniteQueryOptions } from '@tanstack/react-query';

const PAGE_SIZE = 50;

export const messagesQuery = (channelId: string) =>
  infiniteQueryOptions({
    queryKey: ['messages', channelId],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam: cursor }) => {
      return db.fetchMessagesPage(channelId, PAGE_SIZE, cursor);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return null;
      return lastPage.at(-1)?.created_at;
    },
  });
```

---

## Suspense Queries

When loader guarantees data exists, use `useSuspenseQuery`:

```typescript
// Route loader ensures data
loader: async ({ context: { queryClient } }) => {
  await queryClient.ensureQueryData(itemsQuery());
};

// Component - data is never undefined
function ItemsPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  return <ItemList items={items} />;
}
```

---

## Query Hooks

```typescript
// items.hooks.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import * as queries from './items.queries';

// Use useSuspenseQuery when loader guarantees data
export const useItems = () => useSuspenseQuery(queries.itemsQuery());

export const useItem = (id: string | undefined) =>
  useSuspenseQuery(queries.itemQuery(id));

// Parameterized
export const useSpeech = <T extends SpeechType>(
  id: string | undefined,
  type: T
) => useSuspenseQuery(queries.speechQuery(id, type));
```
