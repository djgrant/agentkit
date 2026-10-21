import { defineCommand } from "@pokit/core";
import { homedir } from "node:os";
import { manifest } from "../lib/mcp.ts";
import { links } from "../lib/links.ts";
import { mergedConfig } from "../lib/merge.ts";
import { files } from "../utils/fs.ts";
import { object } from "../utils/collections.ts";
import { md } from "../utils/text.ts";

export const command = defineCommand({
  label: "Show where live harness config differs from the source",
  run: async (r) => {
    let drifted = false;

    const mcpRows = manifest.targets().map((target) => {
      const { name, liveServers, desiredServers, ownedIds } = target;
      // Only the entries we own; a harness's other servers are none of our business.
      const changes = [
        ...object.diff(object.pick(liveServers(), ownedIds), desiredServers),
        ...manifest.foreignIds(target).map((id) => `? ${id}`),
      ];
      drifted ||= changes.length > 0;
      return [md.code(name), changes.length ? "drifted" : "in sync", changes.length ? changes.map(md.code).join(" ") : "—"];
    });

    r.reporter.step("MCP");
    r.reporter.markdown(md.table(["Harness", "Status", "Changes"], mcpRows));

    const merges = mergedConfig.files();
    if (merges.length) {
      const rows = merges.map((merged) => {
        const synced = mergedConfig.inSync(merged);
        drifted ||= !synced;
        return [md.code(merged.harness), md.code(merged.file), synced ? "in sync" : "drifted"];
      });
      r.reporter.step("Config");
      r.reporter.markdown(md.table(["Harness", "File", "Status"], rows));
    }

    // Merged files exist so machine-local paths stay out of git. A home path in a
    // template means something re-linked or hand-copied live state back in.
    const leaked = merges.filter(({ template }) => files.readText(template).includes(homedir()));
    if (leaked.length) {
      r.reporter.warn(
        `Home paths in tracked config: ${leaked.map((m) => `${m.harness}/${m.file}`).join(", ")} — these belong in the live file only.`,
      );
    }

    const { managed, unmanaged } = links.scan();
    const off = managed.filter((m) => m.status !== "ok");
    drifted ||= off.length > 0 || unmanaged.length > 0;

    r.reporter.step("Links");
    if (!off.length && !unmanaged.length) {
      r.reporter.success("All owned links in sync.");
    } else {
      const rows = [
        ...off.map((m) => [
          md.code(m.status === "missing" ? "+" : "~"),
          md.code(m.harness),
          m.format,
          md.code(m.entry),
          m.status === "blocked"
            ? "real dir blocking owned link"
            : m.status === "stale"
              ? `link → ${m.liveTarget}`
              : "would link",
        ]),
        ...unmanaged.map((u) => [md.code("?"), md.code(u.harness), u.format, md.code(u.entry), "unmanaged"]),
      ];
      r.reporter.markdown(md.table(["", "Harness", "Format", "Entry", "Note"], rows));
    }

    if (drifted) r.reporter.warn("Drift detected — run `pok sync` to reconcile.");
    else r.reporter.success("Everything is in sync.");
  },
});
