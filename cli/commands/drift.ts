import { defineCommand } from "@pokit/core";
import { mcpTargets } from "../config/mcp.ts";
import { scanLinks } from "../lib/links.ts";

export const command = defineCommand({
  label: "Show where live harness config differs from the source",
  run: async (r) => {
    let drifted = false;

    r.reporter.info("mcp");
    for (const { name, liveServers, desiredServers, ownedIds } of mcpTargets()) {
      const live = pick(liveServers(), ownedIds);
      const changes = changedServers(live, desiredServers);
      r.reporter.info(`  ${name.padEnd(8)} ${changes.length ? "✗ drifted" : "✓ in sync"}`);
      for (const change of changes) r.reporter.info(`    ${change}`);
      drifted ||= changes.length > 0;
    }

    const { managed, unmanaged } = scanLinks();
    const off = managed.filter((m) => m.status !== "ok");
    r.reporter.info("\nlinks");
    if (!off.length && !unmanaged.length) r.reporter.info("  ✓ in sync");
    for (const m of off) {
      const sign = m.status === "missing" ? "+" : "~";
      const note = m.status === "blocked" ? "real dir blocking owned link" : m.status === "stale" ? `link -> ${m.liveTarget}` : "would link";
      r.reporter.info(`  ${sign} ${m.harness.padEnd(8)} ${m.format.padEnd(7)} ${m.entry.padEnd(16)} ${note}`);
    }
    for (const u of unmanaged) {
      r.reporter.info(`  ? ${u.harness.padEnd(8)} ${u.format.padEnd(7)} ${u.entry.padEnd(16)} unmanaged`);
    }
    drifted ||= off.length > 0 || unmanaged.length > 0;

    if (drifted) r.reporter.info("\nrun `pok sync` to reconcile");
  },
});

/** Only the entries we own; a harness's other servers are none of our business. */
const pick = (block: Record<string, unknown>, ids: string[]) =>
  Object.fromEntries(Object.entries(block).filter(([id]) => ids.includes(id)));

/** Servers that differ between live and desired, as "+/-/~ id" lines. */
function changedServers(live: Record<string, unknown>, desired: Record<string, unknown>): string[] {
  return [...new Set([...Object.keys(live), ...Object.keys(desired)])]
    .filter((id) => !Bun.deepEquals(live[id], desired[id]))
    .map((id) => `${!(id in live) ? "+" : !(id in desired) ? "-" : "~"} ${id}`);
}
