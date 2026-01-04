# Project Setup

This guide covers setting up a TanStack Start project with Cloudflare Workers.

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      persistState: true,
    }),
    tanstackStart({
      router: { generatedRouteTree: 'routes.gen.ts' },
    }),
    react(),
    tailwindcss(),
  ],
});
```

**Key Configuration:**

- **`@cloudflare/vite-plugin`**: Integrates Cloudflare Workers runtime. `viteEnvironment: { name: 'ssr' }` uses the SSR environment. `persistState: true` keeps local dev state (D1, KV, R2) between restarts.

- **`@tanstack/react-start/plugin/vite`**: TanStack Start plugin. `router.generatedRouteTree` specifies where the auto-generated route tree outputs.

- **Plugin Order**: TypeScript paths → Cloudflare → TanStack Start → React → Tailwind. Order matters for proper resolution.

---

## SSR Entry Point

Only needed if creating unwrapped Cloudflare workers.

```typescript
// src/worker.ts

// Re-export TanStack Start's server entry for Vite/Cloudflare
export { default } from '@tanstack/react-start/server-entry';
export * from '@tanstack/react-start/server-entry';

// Export Cloudflare Workflows so Wrangler discovers them
export { ProcessStripeEventWorkflow } from '@/workflows/stripe-checkout-event';
export { ProcessStripeFailureWorkflow } from '@/workflows/stripe-payment-failed';
```

This file is the Cloudflare Worker entry point. It:
1. Re-exports TanStack Start's server entry (provides the `fetch` handler)
2. Exports Cloudflare Workflow classes for Wrangler discovery

---

## Wrangler Configuration

```toml
# wrangler.toml
name = "my-app"
main = "./src/worker.ts"
compatibility_date = "2025-09-02"
compatibility_flags = ["nodejs_compat"]
upload_source_maps = true

[assets]
binding = "ASSETS"
directory = ".output/public"

[observability]
enabled = true

[images]
binding = "IMAGES"

[[r2_buckets]]
binding = "R2_ASSETS"
bucket_name = "my-app-assets-dev"

[[workflows]]
binding = "STRIPE_WORKFLOW"
name = "process-stripe-event"
class_name = "ProcessStripeEventWorkflow"

# Environment overrides
[env.staging]
name = "my-app-staging"

[[env.staging.r2_buckets]]
binding = "R2_ASSETS"
bucket_name = "my-app-assets-staging"

[env.prod]
name = "my-app"

[[env.prod.r2_buckets]]
binding = "R2_ASSETS"
bucket_name = "my-app-assets-prod"
```

**Key Settings:**

- `main`: Points to SSR entry (`./src/worker.ts`)
- `compatibility_flags: ["nodejs_compat"]`: Enables Node.js compatibility
- `[assets]`: Serves static files from `.output/public`
- Workflows: `binding` (JS name), `name` (CF identifier), `class_name` (exported class)

---

## Router Setup

```typescript
// src/router.tsx
import { QueryClient, notifyManager } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routerWithQueryClient } from '@tanstack/react-router-with-query';
import { routeTree } from './routes.gen';

export function getRouter() {
  // Optimize updates on client
  if (typeof document !== 'undefined') {
    notifyManager.setScheduler(window.requestAnimationFrame);
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnReconnect: () => !queryClient.isMutating(),
      },
    },
  });

  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      defaultPreload: 'intent',
      context: {
        queryClient,
        auth: { user: null },
        permissions: [],
      },
      defaultPreloadStaleTime: 0,
      scrollRestoration: true,
    }),
    queryClient
  );

  return router;
}

// Global type registration
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

**Key Points:**

- **`routerWithQueryClient`**: Integrates Router + Query for automatic SSR dehydration/hydration

- **Router Context**: Initial context with `queryClient`, `auth`, `permissions`. Extended in route `beforeLoad` hooks.

- **Browser Optimization**: `notifyManager.setScheduler(window.requestAnimationFrame)` batches updates for smoother UI

---

## Cloudflare Bindings

Types are auto-generated via `wrangler types`:

```typescript
// types/cloudflare.d.ts (generated)
declare namespace Cloudflare {
  interface Env {
    R2_ASSETS: R2Bucket;
    IMAGES: ImagesBinding;
    ASSETS: Fetcher;
    STRIPE_WORKFLOW: Workflow<PayloadType>;
    // ... env vars
  }
}
```

**Accessing Bindings:**

```typescript
// In server functions and routes
import { env } from 'cloudflare:workers';

env.R2_ASSETS.put(key, data);
env.IMAGES.input(stream).transform({ width: 500 });
await env.STRIPE_WORKFLOW.create({ id, params });

// In workflows (via this.env)
class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event, step) {
    const bucket = this.env.R2_ASSETS;
  }
}
```

---

## Environment Variables

**Server-side (validated with t3-env or similar):**

```typescript
// src/lib/env.ts
import { env } from 'cloudflare:workers';

export { env };
// Or create a validated env object
```

**Client-side (VITE_ prefix only):**

```typescript
import.meta.env.VITE_SUPABASE_URL
import.meta.env.VITE_PUBLIC_KEY
```

---

## Build Output

```
.output/
├── server/
│   └── index.mjs    # Worker bundle
└── public/          # Static assets (served by Cloudflare)
```
