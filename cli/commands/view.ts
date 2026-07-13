import { defineCommand } from "@pokit/core";
import * as path from "node:path";
import { REPO, SERVERS_FILE, SECRETS_FILE } from "../config/paths.ts";
import { servers } from "../config/mcp.ts";
import { loadEnv, placeholders } from "../lib/env.ts";

export const command = defineCommand({
  label: "View the canonical MCP source and secret status",
  run: async (r) => {
    const list = servers();
    r.reporter.info(`${path.relative(REPO, SERVERS_FILE)} — ${Object.keys(list).length} servers\n`);
    for (const [id, s] of Object.entries(list)) {
      const endpoint = s.transport === "http" ? s.url : [s.command, ...(s.args ?? [])].join(" ");
      r.reporter.info(`  ${id.padEnd(16)} ${(s.targets ?? ["all"]).join(",").padEnd(16)} ${endpoint}`);
    }

    const env = loadEnv(SECRETS_FILE);
    const referenced = placeholders(JSON.stringify(list)).sort();
    if (referenced.length) {
      r.reporter.info("\nsecrets:");
      for (const name of referenced) r.reporter.info(`  ${name.padEnd(24)} ${name in env ? "present" : "MISSING"}`);
    }
  },
});
