---
name: creating-docs
description: Create a documentation site for a repo using @notation/docs, driven by pok. Use when the user asks to create docs, a docs site, or documentation pages for a project.
---

# Creating docs

A docs site is a TanStack Start app on Cloudflare Workers, built with the `@notation/docs` Vite preset (source: `~/Repos/docs/packages/docs`). The site lives in `./docs` of the owning repo and is operated through `pok docs dev|build|deploy`, which the `docs` plugin from `pok-plugins` mounts on the repo's CLI.

This skill ships a complete scaffold in `<skill-dir>/template/`. The workflow is: copy it, fill the placeholders, install, verify.

Reference implementations, if you need a live example: `~/Repos/notation/pok/docs` and `~/Repos/notation/yieldstar/docs`. Framework contract: `~/Repos/docs/AGENTS.md`.

## Step 1: Make sure pok is installed in the repo

The repo has pok when `pok.config.ts` exists at the root and `@pokit/core` is a dependency. If it does not, install it and copy the config from the template:

```sh
pnpm add -D @pokit/core @pokit/terminal "pok-plugins@github:djgrant/pok-plugins"
cp <skill-dir>/template/pok.config.ts .
```

If the repo already has a `pok.config.ts`, only add `pok-plugins` and the `plugins: [docs({ name: "<repo-name>-docs" })]` entry from the template. If the global `pok` launcher is missing, install it with `bun add -g pokit`.

## Step 2: Configure the pnpm workspace

In the repo's `pnpm-workspace.yaml`, add `docs` to `packages` and add these `allowBuilds` entries:

```yaml
allowBuilds:
  esbuild: true
  lightningcss: true
  workerd: true
  # Pulled in by Wrangler's image bindings, which the docs site does not use.
  sharp: false
  # The docs framework ships no dist/; its prepare script builds it after clone.
  # Matching by repo URL rather than resolved commit needs pnpm 11.11+.
  "@notation/docs@git+ssh://git@github.com/djgrant/docs.git": true
```

## Step 3: Scaffold ./docs

```sh
cp -R <skill-dir>/template/docs ./docs
```

Then:

1. Replace every `<placeholder>` (`grep -r "<" docs` finds them): `<scope>` in package.json; `<project>`, `<tagline>`, `<owner>/<repo>`, `<main-package>`, `<repo-name>` in vite.config.ts; `<project>` in views/logo.tsx.
2. Rename the `manual` category (directory, `nav.ts` export, slugs) if the site needs a different one. Category slugs and order must agree across `vite.config.ts` (`categories`), `index.ts`, and each category's `nav.ts` — the template files carry comments at each of these points.
3. Add `docs/.generated` and `docs/dist` to the repo's `.gitignore`.

The dependency versions in the template's package.json were current when written; check a reference site for drift before pinning.

## Step 4: Install and verify

```sh
pnpm install        # from the repo root; builds @notation/docs via its prepare script
pok docs dev        # dev server on port 3000 (Vite picks the next free port if busy)
pok docs build      # production build
pok docs deploy     # build + deploy to Cloudflare (config comes from vite.config.ts; no wrangler.toml)
```

If `pnpm install` fails on `@notation/docs` with a build-script error, the `allowBuilds` entry from Step 2 is missing or the pnpm version is older than 11.11.

## Writing docs content

- Add a Markdown file, then register it in the category's `nav.ts`; unregistered files are unreachable. No frontmatter; the first `# Heading` is the page title.
- New categories need a directory with a `nav.ts`, an entry in `docs/index.ts`, and their slug in the `categories` array in `vite.config.ts`.
- UI conventions for custom pages/views follow the framework repo: inline Tailwind for layout, components from `@notation/docs/ui`.
