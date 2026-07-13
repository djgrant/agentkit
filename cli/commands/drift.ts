import { defineCommand } from "@pokit/core";
import { SECRETS_FILE } from "../config/paths.ts";
import { DIALECTS, servers } from "../config/mcp.ts";
import { readJson } from "../lib/fs.ts";
import { loadEnv } from "../lib/env.ts";
import { renderBlock } from "../lib/mcp.ts";

export const command = defineCommand({
  label: "Show where live harness config differs from the source",
  run: async (r) => {
    const env = loadEnv(SECRETS_FILE);
    let drifted = false;
    for (const [name, dialect] of Object.entries(DIALECTS)) {
      const live: Record<string, unknown> = readJson(dialect.file)[dialect.key] ?? {};
      const want = renderBlock(servers(), name, dialect, env);
      const inSync = Bun.deepEquals(live, want);
      r.reporter.info(`${name.padEnd(8)} ${inSync ? "✓ in sync" : "✗ drifted"}`);
      if (inSync) continue;
      drifted = true;
      for (const id of new Set([...Object.keys(live), ...Object.keys(want)])) {
        if (Bun.deepEquals(live[id], want[id])) continue;
        r.reporter.info(`  ${!(id in live) ? "+" : !(id in want) ? "-" : "~"} ${id}`);
      }
    }
    if (drifted) r.reporter.info("\nrun `pok sync` to reconcile");
  },
});
