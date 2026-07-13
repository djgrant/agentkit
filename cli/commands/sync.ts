import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { REPO, SECRETS_FILE } from "../config/paths.ts";
import { HARNESSES } from "../config/harnesses.ts";
import { DIALECTS, servers } from "../config/mcp.ts";
import { symlink, pruneDeadLinks, ls, untilde, readJson, writeJson } from "../lib/fs.ts";
import { loadEnv } from "../lib/env.ts";
import { renderBlock } from "../lib/mcp.ts";

export const command = defineCommand({
  label: "Sync agentkit config into every harness",
  run: async (r) => {
    for (const [name, harness] of Object.entries(HARNESSES)) {
      const base = untilde(harness.base);
      for (const file of harness.files ?? []) {
        symlink(path.join(REPO, name, file), path.join(base, file));
      }
      for (const [format, native] of Object.entries(harness.formats)) {
        const dest = path.join(base, native);
        fs.mkdirSync(dest, { recursive: true });
        pruneDeadLinks(dest);
        // common/<format> first, then <harness>/<format> so the harness wins on collision
        for (const src of [path.join(REPO, "common", format), path.join(REPO, name, format)]) {
          for (const entry of ls(src)) {
            if (entry.startsWith(".") || entry === "SKILL.md") continue;
            symlink(path.join(src, entry), path.join(dest, entry));
          }
        }
      }
      r.reporter.info(`links   ${name}`);
    }

    const env = loadEnv(SECRETS_FILE);
    for (const [name, dialect] of Object.entries(DIALECTS)) {
      const config = readJson(dialect.file);
      config[dialect.key] = renderBlock(servers(), name, dialect, env);
      writeJson(dialect.file, config);
      r.reporter.info(`mcp     ${name} -> ${path.basename(dialect.file)} (${Object.keys(config[dialect.key]).length} servers)`);
    }
  },
});
