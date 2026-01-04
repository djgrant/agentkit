# Mutations

## The `withQueryClient` Pattern

Use `withQueryClient` to inject `queryClient` into mutation factories. This enables cache access without prop drilling.

### Three Mutation Factory Patterns

```typescript
import { withQueryClient, createMutationHook } from '@tanstack-lib/core';

// 1. Direct factory (no params at hook call site)
export const updateItemMutation = withQueryClient((queryClient) =>
  mutationOptions({
    mutationFn: async (input) => db.updateItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemsKeys.all });
    },
  })
);

// 2. Nested factory (params at hook call site)
export const addMessageMutation = withQueryClient(
  (queryClient) => (params: { channelId: string; userId: string }) => {
    const cache = new MessagesCache(queryClient, params.channelId);

    return mutationOptions({
      mutationKey: cache.key(),
      mutationFn: async (input) => db.addMessage(input, params.channelId),
      // ... optimistic updates
    });
  }
);

// 3. Generic nested factory (type params at hook call site)
export const createSpeechMutation = withQueryClient(
  (queryClient) =>
    <T extends SpeechType>(speechType: T) => {
      const cache = new SpeechesCache(queryClient, speechType);

      return mutationOptions({
        mutationKey: [...cache.key(), 'create'],
        mutationFn: async (payload) => db.createSpeech(payload, speechType),
        onSuccess: (created) => {
          cache.prepend(created);
          cache.setOne(created.id, created);
        },
      });
    }
);
```

---

## Mutation with Optimistic Updates

```typescript
export const addMessageMutation = withQueryClient(
  (queryClient) => (params: { channelId: string; userId: string }) => {
    const { channelId, userId } = params;
    const cache = new MessagesCache(queryClient, channelId);

    return mutationOptions({
      mutationKey: cache.key(),
      mutationFn: async (input: { id: string; message: string }) => {
        return db.addMessage(input.id, input.message, channelId, userId);
      },
      onMutate: async (input) => {
        // Cancel in-flight queries
        await queryClient.cancelQueries({ queryKey: cache.key() });

        // Optimistically add the new message
        cache.prepend({
          id: input.id,
          message: input.message,
          channel_id: channelId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

        return { id: input.id };
      },
      onError: (_err, _vars, ctx) => {
        // Rollback on error
        if (ctx) cache.remove(ctx.id);
      },
    });
  }
);
```

---

## Mutation with Full Rollback

For mutations where you need to restore previous state:

```typescript
export const createChannelMutation = withQueryClient(
  (queryClient) => (params: { userId: string }) => {
    const cache = new ChannelCache(queryClient);

    return mutationOptions({
      mutationKey: ['create-channel'],
      mutationFn: async (input: { id: string; slug: string }) => {
        return db.createChannel(input.id, input.slug, params.userId);
      },
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: cache.key() });

        // Save previous state for rollback
        const prev = cache.get();

        // Add optimistic entry
        cache.addOptimisticChannel({
          id: input.id,
          slug: input.slug,
          userId: params.userId,
        });

        return { prev };
      },
      onError: (_err, _vars, ctx) => {
        // Full rollback to previous state
        if (ctx?.prev) cache.merge(ctx.prev);
      },
      onSettled: () => {
        // Always refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: cache.key() });
      },
    });
  }
);
```

---

## Mutation with Invalidation Only

For simpler cases where optimistic updates aren't needed:

```typescript
export const updateUserMutation = withQueryClient((queryClient) =>
  mutationOptions({
    mutationKey: ['update-user'],
    mutationFn: async ({ userId, data }) => {
      return db.updateUser(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Updated', { description: 'User updated successfully.' });
    },
    onError: (e: any) => {
      toast.error('Update failed', { description: e?.message });
    },
  })
);
```

---

## Syncing List and Detail Caches

When mutating, update both list and detail caches:

```typescript
export const updateSpeechMutation = withQueryClient(
  (queryClient) =>
    <T extends SpeechType>(speechType: T) => {
      const cache = new SpeechesCache(queryClient, speechType);

      return mutationOptions({
        mutationFn: async ({ id, updates }) => {
          return db.updateSpeech(id, updates, speechType);
        },
        onSuccess: (updated) => {
          // Update in list cache
          cache.replace(updated.id, updated);
          // Update detail cache
          cache.setOne(updated.id, updated);
          toast.success('Updated');
        },
      });
    }
);
```

---

## Mutation Hooks

```typescript
// items.hooks.ts
import { createMutationHook } from '@tanstack-lib/core';

export const useCreateItem = createMutationHook(createItemMutation);
export const useUpdateItem = createMutationHook(updateItemMutation);
export const useDeleteItem = createMutationHook(deleteItemMutation);

// For nested factories, pass params at the call site:
// const mutation = useAddMessage({ channelId, userId });
export const useAddMessage = createMutationHook(addMessageMutation);

// For generic factories, pass type at the call site:
// const mutation = useCreateSpeech('classical');
export const useCreateSpeech = createMutationHook(createSpeechMutation);
```
