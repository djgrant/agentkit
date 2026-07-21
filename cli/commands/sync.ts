import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";
import { HARNESSES } from "../config/harnesses.ts";
import { mcpTargets, foreignIds, markUnmanaged } from "../config/mcp.ts";
import { ensureSymlink, pruneDeadLinks, untilde, moveTree, treeEqual } from "../lib/fs.ts";
import { scanLinks, ownedEntries, type Unmanaged } from "../lib/links.ts";

export const command = defineCommand({
  label: "Sync agentkit config into every harness",
  run: async (r) => {
    const interactive = Boolean(process.stdin.isTTY);
    const targets = mcpTargets();

    // Live servers on ids the manifest neither owns nor lists as unmanaged:
    // delete them, or record them in the manifest's `unmanaged` map. One prompt
    // per id, even when the same server is live in several harnesses.
    const deletions = new Map<string, Set<string>>(); // harness -> ids to drop on write
    const foreign = targets.flatMap((t) => foreignIds(t).map((id) => ({ harness: t.name, id })));
    for (const group of groupBy(foreign, (f) => f.id).values()) {
      const { id } = group[0];
      const where = group.map((g) => g.harness).join(", ");
      if (!interactive) {
        r.reporter.warn(`skipped ${id} (mcp) — live in ${where} but not in the manifest; run \`sync\` in a terminal to resolve`);
        continue;
      }
      const action = await r.prompter.select<"delete" | "unmanaged">({
        message: `${id} (mcp) live in ${where} but not in the manifest`,
        options: [
          { label: "delete from the live config(s)", value: "delete" },
          { label: "mark unmanaged (leave it, stop asking)", value: "unmanaged" },
        ],
      });
      if (action === "delete") {
        for (const g of group) {
          const ids = deletions.get(g.harness) ?? new Set<string>();
          ids.add(id);
          deletions.set(g.harness, ids);
        }
      } else {
        markUnmanaged(group.map((g) => ({ harness: g.harness, id })));
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

    const { managed, unmanaged } = scanLinks();
    const overwrite = new Set<string>(); // dests where the repo was chosen over a real dir

    // Owned names blocked by a real dir (a tool clobbered our link). One prompt per
    // owned entry, even when several harnesses are blocked on the same repo source.
    for (const states of groupBy(managed.filter((m) => m.status === "blocked"), (m) => m.src).values()) {
      const { entry, format, src } = states[0];
      if (!interactive) {
        r.reporter.warn(`skipped ${format}/${entry} — blocked in ${states.map((s) => s.harness).join(", ")}; run \`sync\` in a terminal to resolve`);
        continue;
      }
      const side = await r.prompter.select<"left" | "right">({
        message: `${format}/${entry}: real dir where the repo owns a link (${states.map((s) => s.harness).join(", ")})`,
        options: [
          { label: "repo wins — overwrite the dir(s) with the link", value: "left" },
          { label: "live wins — pull one copy into the repo, then link", value: "right" },
        ],
      });
      if (side === "right") moveTree(states[0].dest, src); // first live copy becomes the source
      for (const s of states) overwrite.add(s.dest); // remaining reals get replaced by the link
    }

    // Self-installed skills on unowned names: leave them, or adopt into the repo.
    for (const group of groupByEntry(unmanaged).values()) {
      const { format, entry } = group[0];
      if (!interactive) {
        r.reporter.warn(`skipped ${format}/${entry} — unmanaged in ${group.map((g) => g.harness).join(", ")}; run \`sync\` in a terminal to adopt`);
        continue;
      }
      // Identical copies across harnesses => one common skill; divergent copies stay per-harness.
      const common = group.length >= 2 && group.every((g) => treeEqual(g.dest, group[0].dest));
      const where = common ? `common/${format}/` : `each harness's own ${format}/`;
      const action = await r.prompter.select<"leave" | "adopt" | "delete">({
        message: `${entry} (${format}) self-installed in ${group.map((g) => g.harness).join(", ")} — unmanaged`,
        options: [
          { label: "leave it (not agentkit's)", value: "leave" },
          { label: `adopt into ${where} then link`, value: "adopt" },
          { label: "delete from every harness", value: "delete" },
        ],
      });
      if (action === "delete") {
        for (const g of group) fs.rmSync(g.dest, { recursive: true, force: true });
        r.reporter.success(`deleted ${entry} from ${group.map((g) => g.harness).join(", ")}`);
        continue;
      }
      if (action !== "adopt") continue;
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
