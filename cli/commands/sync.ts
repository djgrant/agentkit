import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";
import { HARNESSES, type Harness } from "../config/harnesses.ts";
import { mcpTargets } from "../config/mcp.ts";
import { ensureSymlink, pruneDeadLinks, ls, untilde } from "../lib/fs.ts";

export const command = defineCommand({
  label: "Sync agentkit config into every harness",
  run: async (r) => {
    for (const [name, harness] of Object.entries(HARNESSES)) {
      linkHarness(name, harness);
      r.reporter.info(`links   ${name}`);
    }
    for (const { name, dialect, desiredServers, ownedIds } of mcpTargets()) {
      dialect.store.write(desiredServers, ownedIds);
      r.reporter.info(`mcp     ${name.padEnd(8)} ${Object.keys(desiredServers).length} servers`);
    }
  },
});

/** Symlink the harness's config files and format dirs from the repo into its home. */
function linkHarness(name: string, harness: Harness) {
  const base = untilde(harness.base);
  for (const file of harness.files ?? []) {
    ensureSymlink(path.join(REPO, name, file), path.join(base, file));
  }
  for (const [format, native] of Object.entries(harness.formats)) {
    const dest = path.join(base, native);
    fs.mkdirSync(dest, { recursive: true });
    pruneDeadLinks(dest);
    // common/<format> first, then <harness>/<format> so the harness wins on collision
    for (const src of [path.join(REPO, "common", format), path.join(REPO, name, format)]) {
      for (const entry of ls(src)) {
        if (entry.startsWith(".") || entry === "SKILL.md") continue;
        ensureSymlink(path.join(src, entry), path.join(dest, entry));
      }
    }
  }
}
