import { defineCommand } from "@pokit/core";
import * as path from "node:path";
import { REPO, CANONICAL, servers, secrets, targetsOf } from "../core.ts";

export const command = defineCommand({
  label: "View the canonical MCP source and secret status",
  run: async () => {
    const list = servers();
    console.log(`${path.relative(REPO, CANONICAL)} — ${Object.keys(list).length} servers\n`);
    for (const [id, s] of Object.entries(list)) {
      const endpoint = s.transport === "http" ? s.url : [s.command, ...(s.args ?? [])].join(" ");
      console.log(`  ${id.padEnd(16)} ${targetsOf(s).join(",").padEnd(16)} ${endpoint}`);
    }

    const env = secrets();
    const vars = new Set([...JSON.stringify(list).matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]));
    if (vars.size) {
      console.log("\nsecrets:");
      for (const v of [...vars].sort()) console.log(`  ${v.padEnd(24)} ${v in env ? "present" : "MISSING"}`);
    }
  },
});
