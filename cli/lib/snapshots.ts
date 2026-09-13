import * as fs from "node:fs";
import * as path from "node:path";
import { HARNESSES } from "../config/harnesses.ts";
import { REPO } from "../config/paths.ts";
import { untilde } from "./fs.ts";

const VENDORS = untilde("~/Repos/vendors");

/** Functions allowed in tracked snapshot expressions. Deliberately not eval-based. */
const functions: Record<string, () => string> = {
  vendored_repos: () =>
    (fs.existsSync(VENDORS)
      ? fs.readdirSync(VENDORS, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
          .map((entry) => entry.name)
          .sort()
      : []
    ).join(", "),
};

const SNAPSHOT = /\$snap:([a-zA-Z_]\w*)\([^)]*\)/g;
const SKIP_DIRS = new Set([".git", "node_modules"]);

/** Refresh the plain-text value stored inside each $snap:function(value) expression. */
export function refreshSnapshots(): string[] {
  const changed: string[] = [];
  const roots = ["common", ...Object.keys(HARNESSES)].map((name) => path.join(REPO, name));
  for (const file of roots.flatMap((root) => [...filesUnder(root)])) {
    const source = fs.readFileSync(file, "utf8");
    if (!source.includes("$snap:")) continue;

    const output = source.replace(SNAPSHOT, (_expression, name: string) => {
      const fn = functions[name];
      if (!fn) throw new Error(`Unknown snapshot function ${name}() in ${path.relative(REPO, file)}`);
      return `$snap:${name}(${fn()})`;
    });

    if (output !== source) {
      fs.writeFileSync(file, output);
      changed.push(path.relative(REPO, file));
    }
  }
  return changed;
}

function* filesUnder(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || (entry.isDirectory() && SKIP_DIRS.has(entry.name))) continue;
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(child);
    else if (entry.isFile()) yield child;
  }
}
