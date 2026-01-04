# Cache Classes

## ArrayCache for List Queries

Extend `ArrayCache` for domain-specific caches:

```typescript
// items.cache.ts
import { ArrayCache } from '@tanstack-lib/core';

export class ItemsCache extends ArrayCache<Item> {
  key() {
    return itemsKeys.list();
  }

  // Domain-specific helpers
  findBySlug(slug: string) {
    return this.get()?.find((item) => item.slug === slug);
  }

  findById(id: string) {
    return this.get()?.find((item) => item.id === id);
  }

  // Custom merge logic
  merge(incoming: Item[], opts?: { mode?: 'server-wins' | 'local-wins' }) {
    const mode = opts?.mode ?? 'local-wins';
    const mergeFn = (prev: Item, next: Item) => {
      if (mode === 'server-wins') return next;
      return { ...next, localField: prev.localField ?? next.localField };
    };
    this.set(mergeRows(incoming, mergeFn));
  }

  // Optimistic entry creation
  addOptimistic(params: { id: string; name: string; userId: string }): Item {
    const optimistic: Item = {
      id: params.id,
      name: params.name,
      created_by: params.userId,
      created_at: new Date().toISOString(),
    };
    this.append(optimistic);
    return optimistic;
  }
}
```

---

## InfiniteArrayCache for Paginated Data

For infinite/paginated queries:

```typescript
// messages.cache.ts
import { InfiniteArrayCache } from '@tanstack-lib/core';

export class MessagesCache extends InfiniteArrayCache<Message> {
  constructor(
    protected queryClient: QueryClient,
    private channelId: string
  ) {
    super(queryClient);
  }

  key() {
    return ['messages', this.channelId];
  }

  indexKey() {
    return ['messages', this.channelId, 'index'];
  }

  // Handle Postgres realtime changes
  applyPgChange(change: PgChange<Message>) {
    this.setHead(applyPgChange(change));
  }

  // Nested data updates (e.g., reactions on messages)
  upsertReaction(messageId: string, reaction: Reaction) {
    this.setById(messageId, (message) => ({
      ...message,
      reactions: upsertInArray(message.reactions, reaction, 'user_id'),
    }));
  }

  removeReaction(messageId: string, userId: string) {
    this.setById(messageId, (message) => ({
      ...message,
      reactions: message.reactions.filter((r) => r.user_id !== userId),
    }));
  }
}
```

---

## Parameterized Cache Classes

For caches that vary by type:

```typescript
export class SpeechesCache<T extends SpeechType> {
  constructor(
    private queryClient: QueryClient,
    private speechType: T
  ) {}

  key() {
    return speechesKeys.list(this.speechType);
  }

  get() {
    return this.queryClient.getQueryData<SpeechByType<T>[]>(this.key());
  }

  set(reducer: (rows: SpeechByType<T>[]) => SpeechByType<T>[]) {
    this.queryClient.setQueryData<SpeechByType<T>[]>(this.key(), (curr) => {
      if (!curr) return curr;
      return reducer(curr);
    });
  }

  // Also update detail cache
  setOne(id: string, speech: SpeechByType<T> | null) {
    this.queryClient.setQueryData(
      speechesKeys.detail(this.speechType, id),
      speech
    );
  }

  prepend = (speech: SpeechByType<T>) => this.set(prepend(speech));
  replace = (id: string, speech: SpeechByType<T>) => this.set(replace(id, speech));
  remove = (id: string) => this.set(removeById(id));
}
```

---

## Cache Hooks

```typescript
// items.hooks.ts
export const useItemsCache = () => {
  const queryClient = useQueryClient();
  return useMemo(() => new ItemsCache(queryClient), [queryClient]);
};

export const useMessagesCache = (channelId: string) => {
  const queryClient = useQueryClient();
  return useMemo(
    () => new MessagesCache(queryClient, channelId),
    [queryClient, channelId]
  );
};
```

---

## Base Class Reference

### ArrayCache Methods

```typescript
abstract class ArrayCache<Row extends { id: string }> {
  abstract key(): QueryKey;

  get(): Row[] | undefined;
  set(reducer: (rows: Row[]) => Row[]): void;
  invalidate(): Promise<void>;

  append(row: Row): void;
  prepend(row: Row): void;
  remove(id: string): void;
  updateById(id: string, updater: (row: Row) => Row): void;
}
```

### InfiniteArrayCache Methods

```typescript
abstract class InfiniteArrayCache<Row extends { id: string }> {
  abstract key(): QueryKey;
  abstract indexKey(): QueryKey;

  get(): InfiniteData<Row[]> | undefined;
  getById(id: string): Row | null;
  getHead(): Row[] | undefined;

  prepend(row: Row): void;
  append(row: Row): void;
  replace(id: string, row: Row): void;
  remove(id: string): void;
  replaceById(id: string, row: Row): void;

  // Protected for subclass use
  protected setHead(reducer: (rows: Row[]) => Row[]): void;
  protected setById(id: string, reducer: (row: Row) => Row): void;
}
```
