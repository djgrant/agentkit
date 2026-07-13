import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { REPO, HARNESSES, MCP, untilde, readJson, writeJson, block } from "../core.ts";

const isLink = (p: string) => {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};

/** Point dest at src, unless a real (non-symlink) file is already there. */
function relink(src: string, dest: string) {
  if (fs.existsSync(dest) && !isLink(dest)) return; // never clobber real files
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (isLink(dest)) fs.rmSync(dest);
  fs.symlinkSync(src, dest);
}

export const command = defineCommand({
  label: "Sync agentkit config into every harness",
  run: async () => {
    // 1. Symlink skills, commands, and config files into each harness.
    for (const [name, h] of Object.entries(HARNESSES)) {
      const base = untilde(h.base);
      for (const f of h.files ?? []) relink(path.join(REPO, name, f), path.join(base, f));
      for (const [fmt, native] of Object.entries(h.formats)) {
        const dir = path.join(base, native);
        fs.mkdirSync(dir, { recursive: true });
        for (const n of fs.readdirSync(dir)) {
          const p = path.join(dir, n);
          if (isLink(p) && !fs.existsSync(p)) fs.rmSync(p); // prune dead links
        }
        // common/<fmt> first, then <harness>/<fmt> so the harness wins on collision
        for (const from of [path.join(REPO, "common", fmt), path.join(REPO, name, fmt)]) {
          if (!fs.existsSync(from)) continue;
          for (const item of fs.readdirSync(from)) {
            if (item.startsWith(".") || item === "SKILL.md") continue;
            relink(path.join(from, item), path.join(dir, item));
          }
        }
      }
      console.log(`links   ${name}`);
    }
    // 2. Render the canonical MCP source into each target (agentkit owns the block).
    for (const name of ["claude", "opencode"] as const) {
      const { file, key } = MCP[name];
      const data = readJson(file);
      data[key] = block(name);
      writeJson(file, data);
      console.log(`mcp     ${name} -> ${path.basename(file)} (${Object.keys(data[key]).length} servers)`);
    }
  },
});
