# Realtime Updates

## Subscribing to Changes

```typescript
// messages.realtime.ts
export const useRealtimeMessages = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleChange = (payload: RealtimePostgresChangesPayload<Message>) => {
      const message =
        payload.eventType === 'DELETE' ? payload.old : payload.new;
      const channelId = message?.channel_id;

      if (!channelId) return;

      const cache = new MessagesCache(queryClient, channelId);
      cache.applyPgChange(payload);
    };

    return subscribeToMessageChanges(handleChange);
  }, [queryClient]);
};
```

---

## Realtime with Server Refetch

For complex state, refetch from server instead of patching:

```typescript
export const useRealtimeChannels = () => {
  const cache = useChannelsCache();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onChannelEvent(user.id, async () => {
      // Refetch and merge with local state
      const channels = await fetchChannels();
      cache.merge(channels, { mode: 'server-wins' });
    });

    return unsubscribe;
  }, [user, cache]);
};
```

---

## Postgres Change Reducer

```typescript
// reducers.pg.ts
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type PgChange<T> = RealtimePostgresChangesPayload<T>;

export const applyPgChange =
  <Row extends { id: string }>(
    change: RealtimePostgresChangesPayload<Row>,
    transform?: (row: Row) => Row
  ) =>
  (rows: Row[] = []): Row[] => {
    const select = transform ?? ((r) => r);

    switch (change.eventType) {
      case 'INSERT': {
        // Avoid duplicates (may already exist from optimistic update)
        if (rows.some((r) => r.id === change.new.id)) {
          return rows.map(select);
        }
        return [change.new, ...rows].map(select);
      }
      case 'UPDATE': {
        // Merge to preserve client-side state
        return rows
          .map((r) => (r.id === change.new.id ? { ...r, ...change.new } : r))
          .map(select);
      }
      case 'DELETE': {
        const deletedId = change.old.id;
        if (!deletedId) return rows.map(select);
        return rows.filter((r) => r.id !== deletedId).map(select);
      }
      default:
        return rows.map(select);
    }
  };
```

---

## Transform on Apply

Add nested data when applying changes:

```typescript
export class MessagesCache extends InfiniteArrayCache<MessageWithReactions> {
  private withReactions = (message: Message): MessageWithReactions => ({
    ...message,
    message_reactions:
      (message as MessageWithReactions).message_reactions || [],
  });

  applyPgChange(change: PgChange<Message>) {
    this.setHead(applyPgChange(change, this.withReactions));
  }
}
```

---

## Subscription Helper

```typescript
// messages.realtime.shared.ts
import { getSupabase } from '@/lib/supabase';

export function subscribeToMessageChanges(
  handler: (payload: RealtimePostgresChangesPayload<Message>) => void
) {
  const supabase = getSupabase();

  const channel = supabase
    .channel('messages-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'app',
        table: 'messages',
      },
      handler
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

---

## Best Practices

1. **Subscribe in useEffect, cleanup on unmount**
   ```typescript
   useEffect(() => {
     const unsubscribe = subscribe();
     return unsubscribe;
   }, [deps]);
   ```

2. **Route changes to correct cache**
   ```typescript
   const cache = new MessagesCache(queryClient, message.channel_id);
   cache.applyPgChange(payload);
   ```

3. **Handle all event types**
   - `INSERT` - prepend to list, avoid duplicates
   - `UPDATE` - merge with existing (preserve client state)
   - `DELETE` - remove from list

4. **Consider server refetch for complex state**
   - When merging is complex
   - When you need computed fields from server
   - When realtime payload is incomplete
