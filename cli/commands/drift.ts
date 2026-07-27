import { defineCommand } from "@pokit/core";
import * as path from "node:path";
import { homedir } from "node:os";
import { REPO } from "../config/paths.ts";
import { HARNESSES } from "../config/harnesses.ts";
import { mcpTargets, foreignIds } from "../config/mcp.ts";
import { scanLinks } from "../lib/links.ts";
import { untilde } from "../lib/fs.ts";
import { mergedInSync, readText } from "../lib/merge.ts";

export const command = defineCommand({
  label: "Show where live harness config differs from the source",
  run: async (r) => {
    let drifted = false;

    const mcpRows = mcpTargets().map((target) => {
      const { name, liveServers, desiredServers, ownedIds } = target;
      const live = pick(liveServers(), ownedIds);
      const changes = [
        ...changedServers(live, desiredServers),
        ...foreignIds(target).map((id) => `? ${id}`),
      ];
      drifted ||= changes.length > 0;
      const status = changes.length ? "drifted" : "in sync";
      return `| \`${name}\` | ${status} | ${changes.length ? changes.map((c) => `\`${c}\``).join(" ") : "—"} |`;
    });

    r.reporter.step("MCP");
    r.reporter.markdown(
      [`| Harness | Status | Changes |`, `| --- | --- | --- |`, ...mcpRows].join("\n"),
    );

    const merges = mergeFiles();
    if (merges.length) {
      const rows = merges.map(({ name, file, template, live }) => {
        const synced = mergedInSync(readText(template), readText(live));
        drifted ||= !synced;
        return `| \`${name}\` | \`${file}\` | ${synced ? "in sync" : "drifted"} |`;
      });
      r.reporter.step("Config");
      r.reporter.markdown([`| Harness | File | Status |`, `| --- | --- | --- |`, ...rows].join("\n"));
    }

    // Merged files exist so machine-local paths stay out of git. A home path in a
    // template means something re-linked or hand-copied live state back in.
    const leaked = merges.filter(({ template }) => readText(template).includes(homedir()));
    if (leaked.length) {
      r.reporter.warn(
        `Home paths in tracked config: ${leaked.map((m) => `${m.name}/${m.file}`).join(", ")} — these belong in the live file only.`,
      );
    }

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

/** Every merged config file, as a repo template paired with its live destination. */
const mergeFiles = () =>
  Object.entries(HARNESSES).flatMap(([name, harness]) =>
    (harness.merges ?? []).map((file) => ({
      name,
      file,
      template: path.join(REPO, name, file),
      live: path.join(untilde(harness.base), file),
    })),
  );

/** Only the entries we own; a harness's other servers are none of our business. */
const pick = (block: Record<string, unknown>, ids: string[]) =>
  Object.fromEntries(Object.entries(block).filter(([id]) => ids.includes(id)));

/** Servers that differ between live and desired, as "+/-/~ id" lines. */
function changedServers(live: Record<string, unknown>, desired: Record<string, unknown>): string[] {
  return [...new Set([...Object.keys(live), ...Object.keys(desired)])]
    .filter((id) => !Bun.deepEquals(live[id], desired[id]))
    .map((id) => `${!(id in live) ? "+" : !(id in desired) ? "-" : "~"} ${id}`);
}
