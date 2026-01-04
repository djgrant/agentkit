# Server-Side Patterns

This guide covers three patterns for server-side code: Server Functions, Server Routes, and Cloudflare Workflows.

## When to Use Each Pattern

| Pattern | Use Case | Duration | Returns |
|---------|----------|----------|---------|
| **Server Functions** | Client-initiated actions, forms, uploads | < 30s | Data to client |
| **Server Routes** | External webhooks, raw HTTP | < 30s | HTTP Response |
| **Workflows** | Long-running, durable operations | Minutes+ | Workflow result |

---

## Server Functions (`createServerFn`)

**When to Use:**
- Client-initiated actions needing server processing
- Form submissions
- File uploads
- Actions that return data to the client
- Type-safe input validation

### Basic Example

```typescript
// src/server-fns/stripe/create-checkout-session.ts
import z from 'zod';
import { createServerFn } from '@tanstack/react-start';

const checkoutSchema = z.object({
  priceId: z.string(),
  cancelUrl: z.url(),
  successUrl: z.url(),
});

export const createCheckoutSessionFn = createServerFn({ method: 'POST' })
  .inputValidator(checkoutSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabase();
    const { data: userRes } = await supabase.auth.getUser();

    if (!userRes.user) {
      return {
        error: { type: 'USER_NOT_FOUND', reason: 'Try logging in again' },
      };
    }

    const session = await stripe.checkout.sessions.create({
      // ... config
    });

    return {
      data: { url: session.url, expiresAt: session.expires_at },
    };
  });
```

### With Cloudflare Bindings

```typescript
// src/server-fns/storage/upload-avatar.ts
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';

export const uploadAvatarFn = createServerFn({ method: 'POST' })
  .inputValidator((form: FormData) => {
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new Error('A "file" of type File must be provided');
    }
    return { file };
  })
  .handler(async ({ data }) => {
    // Access R2 bucket
    await env.R2_ASSETS.put(key, fileBuffer, {
      httpMetadata: { contentType: file.type },
    });

    // Access Cloudflare Images API
    const cropped = await env.IMAGES.input(file.stream())
      .transform({ width: 500, height: 500, fit: 'cover' })
      .output({ format: 'image/avif' });

    return { imageUrl };
  });
```

### Usage in Components

```typescript
function CheckoutButton({ priceId }: { priceId: string }) {
  const handleClick = async () => {
    const result = await createCheckoutSessionFn({
      data: {
        priceId,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      },
    });

    if (result.error) {
      toast.error(result.error.reason);
      return;
    }

    window.location.href = result.data.url;
  };

  return <Button onClick={handleClick}>Checkout</Button>;
}
```

---

## Server Routes (Webhooks)

**When to Use:**
- External service callbacks (Stripe, GitHub, etc.)
- Raw HTTP handling with custom status codes
- Webhook signature verification
- Direct Request/Response access

### Example: Stripe Webhook

```typescript
// src/routes/webhooks/stripe.ts
import { createFileRoute } from '@tanstack/react-router';
import Stripe from 'stripe';
import { env } from '@/lib/env';
import { env as cfenv } from 'cloudflare:workers';

export const Route = createFileRoute('/webhooks/stripe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get('stripe-signature');
        const raw = await request.text();

        let payload: Stripe.Event;
        try {
          payload = await stripe.webhooks.constructEventAsync(
            raw,
            sig || '',
            env.STRIPE_WEBHOOK_SECRET
          );
        } catch (err: any) {
          return new Response(`Webhook Error: ${err?.message}`, { status: 400 });
        }

        switch (payload.type) {
          case 'checkout.session.completed': {
            // Trigger a Cloudflare Workflow for durable processing
            await cfenv.STRIPE_WORKFLOW.create({
              id: payload.id,
              params: { userId, stripeEventId: payload.id },
            });
            return new Response('Event acknowledged', { status: 202 });
          }

          case 'payment_intent.payment_failed': {
            await cfenv.STRIPE_FAILURE_WORKFLOW.create({
              id: payload.id,
              params: { stripeEventId: payload.id },
            });
            return new Response('Event acknowledged', { status: 202 });
          }

          default:
            return new Response('Event not supported', { status: 404 });
        }
      },
    },
  },
});
```

---

## Cloudflare Workflows

**When to Use:**
- Long-running operations (>30 seconds)
- Multi-step processes needing durability
- Operations that should survive worker restarts
- Idempotent processing with retry

### Workflow Definition

```typescript
// src/workflows/stripe-checkout-event.ts
import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from 'cloudflare:workers';

export type StripeEventParams = {
  stripeEventId: string;
  stripeSessionId: string;
  stripeCustomerId: string;
  userId: string;
};

export class ProcessStripeEventWorkflow extends WorkflowEntrypoint<
  Env,
  StripeEventParams
> {
  async run(event: WorkflowEvent<StripeEventParams>, step: WorkflowStep) {
    const { stripeEventId, stripeSessionId, stripeCustomerId, userId } =
      event.payload;

    // Access env via this.env in workflows
    const stripe = new Stripe(this.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Step 1: Each step is durable - completed steps are skipped on restart
    await step.do('update-customer-id', async () => {
      await stripe.customers.update(stripeCustomerId, {
        metadata: { user_id: userId },
      });
    });

    // Step 2: Fetch external data
    const { session, invoice } = await step.do('fetch-stripe-data', async () => {
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
      const invoice = session.invoice
        ? await stripe.invoices.retrieve(session.invoice)
        : null;
      return { session, invoice };
    });

    // Step 3: Database operations with idempotency
    const { purchaseId } = await step.do('create-purchase', async () => {
      const { data, error } = await supabaseSudo
        .from('purchases')
        .insert({ stripe_event_id: stripeEventId, /* ... */ })
        .select('id')
        .single();

      // Handle duplicate gracefully (idempotency)
      if (error?.code === '23505') {
        const { data: existing } = await supabaseSudo
          .from('purchases')
          .select('id')
          .eq('stripe_event_id', stripeEventId)
          .single();
        if (existing) return { purchaseId: existing.id };
      }

      return { purchaseId: data.id };
    });

    return { success: true, purchaseId };
  }
}
```

### Workflow Registration

1. **Export from worker entry:**

```typescript
// src/worker.ts
export { ProcessStripeEventWorkflow } from '@/workflows/stripe-checkout-event';
```

2. **Configure in wrangler.toml:**

```toml
[[workflows]]
binding = "STRIPE_WORKFLOW"
name = "process-stripe-event"
class_name = "ProcessStripeEventWorkflow"
```

3. **Trigger from webhook or server function:**

```typescript
import { env } from 'cloudflare:workers';

await env.STRIPE_WORKFLOW.create({
  id: uniqueEventId,  // For idempotency
  params: { userId, stripeEventId },
});
```

---

## Environment Access

### In Server Functions and Routes

```typescript
// Cloudflare bindings (R2, Images, Workflows)
import { env } from 'cloudflare:workers';
env.R2_ASSETS.put(...);

// Validated env vars (via t3-env)
import { env } from '@/lib/env';
env.STRIPE_SECRET_KEY;
```

### In Workflows

```typescript
// Access via this.env
class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event, step) {
    const stripe = new Stripe(this.env.STRIPE_SECRET_KEY);
    await this.env.R2_ASSETS.put(...);
  }
}
```

---

## Decision Tree

```
Need server-side code?
│
├─ Client initiates action? → Server Function
│   └─ Returns data to client
│
├─ External service callback? → Server Route
│   └─ Webhook signature verification
│   └─ Custom HTTP status codes
│
└─ Long-running or multi-step? → Workflow
    └─ Survives restarts
    └─ Durable step execution
    └─ Built-in retry
```
