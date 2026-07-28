// Push a local directory straight to StackBlitz as a live project.
//
//   node stackblitz.mjs [dir]
//
// StackBlitz has no server-side create API, so this emits a self-submitting HTML
// form targeting https://stackblitz.com/run and opens it in the default browser.

import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { tmpdir } from "node:os"

const root = resolve(process.argv[2] ?? process.cwd())

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"])
const SKIP_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", ".DS_Store"])
// The POST API rejects binary files outright.
const BINARY = /\.(png|jpe?g|gif|ico|webp|avif|woff2?|ttf|eot|mp[34]|zip|gz|pdf|wasm|node)$/i

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(full)
    return SKIP_FILES.has(entry.name) || BINARY.test(entry.name) ? [] : [relative(root, full)]
  })

const skip = (p) =>
  SKIP_FILES.has(p.split("/").pop()) || BINARY.test(p) || p.split("/").some((seg) => SKIP_DIRS.has(seg))

// Prefer git's view when there is one: it already honours .gitignore. --others picks
// up untracked files — a fresh repro is usually untracked.
const list = () => {
  try {
    const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter((p) => p && !skip(p) && existsSync(join(root, p)))
    return tracked.length > 0 ? tracked : walk(root)
  } catch {
    return walk(root)
  }
}

const files = Object.fromEntries(list().map((path) => [path, readFileSync(join(root, path), "utf8")]))

if (Object.keys(files).length === 0) {
  console.error(`No publishable files found in ${root}`)
  process.exit(1)
}

const pkgPath = join(root, "package.json")
const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : {}
const title = pkg.name ?? "repro"

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const field = (name, value) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`

const html = `<!doctype html>
<meta charset="utf-8">
<title>Opening StackBlitz…</title>
<body style="font:14px system-ui;padding:2rem">
<p>Opening StackBlitz…</p>
<form id="f" method="post" action="https://stackblitz.com/run">
${field("project[title]", title)}
${field("project[description]", pkg.description ?? title)}
${field("project[template]", "node")}
${Object.entries(files).map(([path, content]) => field(`project[files][${path}]`, content)).join("\n")}
</form>
<script>document.getElementById("f").submit()</script>
`

const out = join(tmpdir(), `stackblitz-${title.replace(/[^a-z0-9-]/gi, "-")}.html`)
writeFileSync(out, html)

console.log(`${Object.keys(files).length} files · template=node · ${title}`)
console.log(`opening ${out}`)
execFileSync(process.platform === "darwin" ? "open" : "xdg-open", [out])
