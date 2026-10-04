import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";
import { HARNESSES } from "../config/harnesses.ts";
import { mcpTargets, foreignIds, markUnmanaged as markMcpUnmanaged } from "../config/mcp.ts";
import { ensureSymlink, pruneDeadLinks, untilde, moveTree, treeEqual } from "../lib/fs.ts";
import { scanLinks, ownedEntries, markUnmanaged as markLinkUnmanaged, type Unmanaged } from "../lib/links.ts";
import { writeMerged } from "../lib/merge.ts";
import { refreshSnapshots } from "../lib/snapshots.ts";

export const command = defineCommand({
  label: "Sync agentkit config into every harness",
  run: async (r) => {
    const interactive = Boolean(process.stdin.isTTY);
    const refreshedSnapshots = refreshSnapshots();
    if (refreshedSnapshots.length) {
      r.reporter.success(`Refreshed snapshots in ${refreshedSnapshots.join(", ")}`);
    }
    const targets = mcpTargets();

    // Live servers on ids the manifest neither owns nor lists as unmanaged:
    // delete them, or record them in the manifest's `unmanaged` map. One prompt
    // per id, even when the same server is live in several harnesses.
    const deletions = new Map<string, Set<string>>(); // harness -> ids to drop on write
    const foreign = targets.flatMap((t) => foreignIds(t).map((id) => ({ harness: t.name, id })));
    for (const group of groupBy(foreign, (f) => f.id).values()) {
      const { id } = group[0];
      const where = group.map((g) => g.harness).join(" and ");
      if (!interactive) {
        r.reporter.warn(`skipped ${id} (mcp): ${where} have it, agentkit does not; run \`sync\` in a terminal`);
        continue;
      }
      const action = await r.prompter.select<"delete" | "leave">({
        message: `${id} (mcp): ${where} have it, agentkit does not`,
        options: [
          { label: "delete it", value: "delete" },
          { label: "leave it (stop asking)", value: "leave" },
        ],
      });
      if (action === "delete") {
        for (const g of group) {
          const ids = deletions.get(g.harness) ?? new Set<string>();
          ids.add(id);
          deletions.set(g.harness, ids);
        }
      } else {
        markMcpUnmanaged(group.map((g) => ({ harness: g.harness, id })));
      }
    }

    await r.group("MCP", { layout: "sequence" }, async (g) => {
      for (const { name, dialect, desiredServers, ownedIds } of targets) {
        const drop = deletions.get(name);
        await g.activity(`${name} — ${Object.keys(desiredServers).length} servers`, () => {
          dialect.store.write(desiredServers, drop ? [...ownedIds, ...drop] : ownedIds);
        });
      }
    });

    // Merged config files: the repo's template wins on the keys it declares, and
    // the harness keeps everything else it has written for itself.
    const merged = Object.entries(HARNESSES).filter(([, h]) => h.merges?.length);
    if (merged.length) {
      await r.group("Config", { layout: "sequence" }, async (g) => {
        for (const [name, harness] of merged) {
          for (const file of harness.merges ?? []) {
            await g.activity(`${name}/${file}`, () =>
              writeMerged(path.join(REPO, name, file), path.join(untilde(harness.base), file)),
            );
          }
        }
      });
    }

    const { managed, unmanaged } = scanLinks();
    const overwrite = new Set<string>(); // dests where the repo was chosen over a real dir

    // Owned names blocked by a real dir (a tool clobbered our link). One prompt per
    // owned entry, even when several harnesses are blocked on the same repo source.
    for (const states of groupBy(managed.filter((m) => m.status === "blocked"), (m) => m.src).values()) {
      const { entry, format, src } = states[0];
      if (states.every((s) => treeEqual(s.dest, src))) {
        for (const s of states) overwrite.add(s.dest); // same content: just restore the link
        continue;
      }
      if (!interactive) {
        r.reporter.warn(`skipped ${entry}: ${states.map((s) => s.harness).join(" and ")} have a different version from agentkit; run \`sync\` in a terminal`);
        continue;
      }
      const where = states.map((s) => s.harness).join(" and ");
      const rel = path.relative(REPO, src);
      const action = await r.prompter.select<"agentkit" | "installed" | "delete">({
        message: `${entry}: ${where} have a different version from agentkit. Use:`,
        options: [
          { label: "agentkit's version", value: "agentkit" },
          { label: `the version in ${where}`, value: "installed" }, // moved into agentkit, then linked
          { label: "neither (delete everywhere)", value: "delete" },
        ],
      });
      if (action === "delete") {
        for (const s of states) fs.rmSync(s.dest, { recursive: true, force: true });
        fs.rmSync(src, { recursive: true, force: true }); // links in other harnesses go dead and are pruned below
        r.reporter.success(`deleted ${entry} from ${where} and ${rel}`);
        continue;
      }
      if (action === "installed") moveTree(states[0].dest, src); // first live copy becomes the source
      for (const s of states) overwrite.add(s.dest); // remaining folders get replaced by the link
    }

    // Self-installed skills on unowned names: leave them, or adopt into the repo.
    for (const group of groupByEntry(unmanaged).values()) {
      const { format, entry } = group[0];
      const have = group.map((g) => g.harness).join(" and ");
      if (!interactive) {
        r.reporter.warn(`skipped ${entry} (${format}): ${have} have it, agentkit does not; run \`sync\` in a terminal`);
        continue;
      }
      // Identical copies across harnesses => one common skill; divergent copies stay per-harness.
      const common = group.length >= 2 && group.every((g) => treeEqual(g.dest, group[0].dest));
      const where = common ? `common/${format}/` : `each harness's own ${format}/`;
      const action = await r.prompter.select<"leave" | "adopt" | "delete">({
        message: `${entry} (${format}): ${have} have it, agentkit does not`,
        options: [
          { label: "leave it (stop asking)", value: "leave" },
          { label: "add it to agentkit", value: "adopt" }, // to `where`, then linked
          { label: "delete it", value: "delete" },
        ],
      });
      if (action === "delete") {
        for (const g of group) fs.rmSync(g.dest, { recursive: true, force: true });
        r.reporter.success(`deleted ${entry} from ${group.map((g) => g.harness).join(", ")}`);
        continue;
      }
      if (action === "leave") {
        markLinkUnmanaged(group);
        r.reporter.success(`left ${entry} unmanaged in ${group.map((g) => g.harness).join(", ")}`);
        continue;
      }
      if (common) {
        moveTree(group[0].dest, path.join(REPO, "common", format, entry)); // keep one; the link pass replaces the copies
        for (const g of group.slice(1)) fs.rmSync(g.dest, { recursive: true, force: true });
      } else {
        for (const g of group) moveTree(g.dest, path.join(REPO, g.harness, format, entry)); // divergent: preserve each
      }
      r.reporter.success(`adopted ${where}${entry}`);
    }

    // Link every owned entry into every harness (adopted names are now owned; owned set is recomputed).
    await r.group("Links", { layout: "sequence" }, async (g) => {
      for (const [name, harness] of Object.entries(HARNESSES)) {
        await g.activity(name, () => {
          const base = untilde(harness.base);
          for (const file of harness.files ?? []) {
            ensureSymlink(path.join(REPO, name, file), path.join(base, file), true);
          }
          for (const [format, native] of Object.entries(harness.formats)) {
            const dir = path.join(base, native);
            fs.mkdirSync(dir, { recursive: true });
            pruneDeadLinks(dir);
            for (const [entry, src] of ownedEntries(name, format)) {
              const dest = path.join(dir, entry);
              ensureSymlink(src, dest, overwrite.has(dest));
            }
          }
        });
      }
    });

    r.reporter.success("Sync complete.");
  },
});

/** Group unmanaged entries by format+name so a skill seen in several harnesses is one decision. */
const groupByEntry = (unmanaged: Unmanaged[]) => groupBy(unmanaged, (u) => `${u.format}\0${u.entry}`);

/** Bucket items by a string key, preserving encounter order. */
function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = groups.get(k);
    if (bucket) bucket.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}
