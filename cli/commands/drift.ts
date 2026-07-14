import { defineCommand } from "@pokit/core";
import { mcpTargets } from "../config/mcp.ts";
import { scanLinks } from "../lib/links.ts";

export const command = defineCommand({
  label: "Show where live harness config differs from the source",
  run: async (r) => {
    let drifted = false;

    const mcpRows = mcpTargets().map(({ name, liveServers, desiredServers, ownedIds }) => {
      const live = pick(liveServers(), ownedIds);
      const changes = changedServers(live, desiredServers);
      drifted ||= changes.length > 0;
      const status = changes.length ? "drifted" : "in sync";
      return `| \`${name}\` | ${status} | ${changes.length ? changes.map((c) => `\`${c}\``).join(" ") : "—"} |`;
    });

    r.reporter.step("MCP");
    r.reporter.markdown(
      [`| Harness | Status | Changes |`, `| --- | --- | --- |`, ...mcpRows].join("\n"),
    );

    const { managed, unmanaged } = scanLinks();
    const off = managed.filter((m) => m.status !== "ok");
    drifted ||= off.length > 0 || unmanaged.length > 0;

    r.reporter.step("Links");
    if (!off.length && !unmanaged.length) {
      r.reporter.success("All owned links in sync.");
    } else {
      const linkRows = [
        ...off.map((m) => {
          const sign = m.status === "missing" ? "+" : "~";
          const note =
            m.status === "blocked"
              ? "real dir blocking owned link"
              : m.status === "stale"
                ? `link → ${m.liveTarget}`
                : "would link";
          return `| \`${sign}\` | \`${m.harness}\` | ${m.format} | \`${m.entry}\` | ${note} |`;
        }),
        ...unmanaged.map(
          (u) => `| \`?\` | \`${u.harness}\` | ${u.format} | \`${u.entry}\` | unmanaged |`,
        ),
      ];
      r.reporter.markdown(
        [`|  | Harness | Format | Entry | Note |`, `| --- | --- | --- | --- | --- |`, ...linkRows].join("\n"),
      );
    }

    if (drifted) r.reporter.warn("Drift detected — run `pok sync` to reconcile.");
    else r.reporter.success("Everything is in sync.");
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
