import { defineCommand } from "@pokit/core";
import { MCP, readJson, block } from "../core.ts";

const sortKeys = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).sort());

export const command = defineCommand({
  label: "Show where live harness config differs from the source",
  run: async () => {
    let drifted = false;
    for (const name of ["claude", "opencode"] as const) {
      const live = readJson(MCP[name].file)[MCP[name].key] ?? {};
      const want = block(name);
      const same = JSON.stringify(sortKeys(live)) === JSON.stringify(sortKeys(want));
      console.log(`${name.padEnd(8)} ${same ? "✓ in sync" : "✗ drifted"}`);
      if (same) continue;
      drifted = true;
      for (const id of new Set([...Object.keys(live), ...Object.keys(want)])) {
        if (JSON.stringify(live[id]) === JSON.stringify(want[id])) continue;
        console.log(`  ${!(id in live) ? "+" : !(id in want) ? "-" : "~"} ${id}`);
      }
    }
    if (drifted) console.log("\nrun `pok sync` to reconcile");
  },
});
