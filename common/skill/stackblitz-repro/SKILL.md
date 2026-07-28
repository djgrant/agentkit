---
name: stackblitz-repro
description: Build a runnable repro and push it straight to StackBlitz as a live, editable project — no GitHub, no account. Use when the user asks for a repro, a minimal reproduction, or a shareable playground.
---

# StackBlitz repro

StackBlitz has **no server-side create API**. The only direct path is a form POST to
`https://stackblitz.com/run`, which a browser has to submit. `stackblitz.mjs` generates
that form from a directory and opens it.

```bash
node <skill-dir>/stackblitz.mjs [dir]   # defaults to cwd
```

Build the repro locally first and confirm it actually reproduces. Only then publish —
a sandbox you haven't run is a guess.

## WebContainers cannot execute native binaries

This is the failure mode, and it presents as `npm install` hanging on
**"Installing dependencies…"** forever rather than as an error.

Anything with a platform-specific binary is out: `esbuild`, `swc`, `sharp`,
`sqlite3`, `node-gyp`, Playwright, Prisma engines. Note that this rules out the
usual TypeScript runners — **`tsx` and `vite` both depend on `esbuild`.**

For a plain TypeScript app, use the pure-JS toolchain:

```json
{ "scripts": { "start": "tsc && node dist/main.js" } }
```

with `"module": "NodeNext"` and `.js` extensions on relative imports. Before publishing:

```bash
find node_modules -type f -perm -111 ! -name "*.js" ! -name "*.json" ! -name "*.ts"
```

`typescript/bin/tsc` and `tsserver` are JS shebang scripts and fine. A `Mach-O` or `ELF` hit is not.

## Other things that bite

- **The preview pane stays empty unless something binds a port.** A CLI repro's output
  goes to the terminal panel. Say so upfront — it reads as a broken sandbox otherwise.
- **Projects are anonymous and ephemeral.** They vanish on tab close unless the user is
  signed in and saves. Say this rather than implying a durable link.
- **Binary files are not supported** by the POST API at all.
- Templates: `node`, `typescript`, `javascript`, `angular-cli`, `create-react-app`.
  The script pins `node`; StackBlitz guesses a frontend template otherwise.

## Reading someone else's repro

When debugging an issue whose repro is a StackBlitz link, `npx stackblitz-mcp` exposes
the project's files read-only.

## When StackBlitz is the wrong tool

Native deps or a non-JS runtime mean WebContainers cannot run it. Use CodeSandbox
instead — `POST /api/v1/sandboxes/define?json=1` with `{files}` is fully headless and
returns a `sandbox_id`, backed by a real Firecracker VM.
