import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";
import { HARNESSES } from "../config/harnesses.ts";
import { manifest } from "../lib/mcp.ts";
import { links } from "../lib/links.ts";
import { mergedConfig } from "../lib/merge.ts";
import { refreshSnapshots } from "../lib/snapshots.ts";
import { array } from "../utils/collections.ts";
import { paths, symlink, tree } from "../utils/fs.ts";
import { text } from "../utils/text.ts";

export const command = defineCommand({
  label: "Sync agentkit config into every harness",
  run: async (r) => {
    const interactive = Boolean(process.stdin.isTTY);
    const refreshedSnapshots = refreshSnapshots();
    if (refreshedSnapshots.length) {
      r.reporter.success(`Refreshed snapshots in ${refreshedSnapshots.join(", ")}`);
    }
    const targets = manifest.targets();

    // Live servers on ids the manifest neither owns nor lists as unmanaged:
    // delete them, or record them in the manifest's `unmanaged` map. One prompt
    // per id, even when the same server is live in several harnesses.
    const deletions = new Map<string, Set<string>>(); // harness -> ids to drop on write
    const foreign = targets.flatMap((t) => manifest.foreignIds(t).map((id) => ({ harness: t.name, id })));
    for (const group of array.groupBy(foreign, (f) => f.id).values()) {
      const { id } = group[0];
      const where = text.and(group.map((g) => g.harness));
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
        manifest.markUnmanaged(group.map((g) => ({ harness: g.harness, id })));
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
    const merges = mergedConfig.files();
    if (merges.length) {
      await r.group("Config", { layout: "sequence" }, async (g) => {
        for (const merged of merges) {
          await g.activity(`${merged.harness}/${merged.file}`, () => mergedConfig.write(merged));
        }
      });
    }

    const { managed, unmanaged } = links.scan();
    const overwrite = new Set<string>(); // dests where the repo was chosen over a real dir

    // Owned names blocked by a real dir (a tool clobbered our link). One prompt per
    // owned entry, even when several harnesses are blocked on the same repo source.
    for (const states of array.groupBy(managed.filter((m) => m.status === "blocked"), (m) => m.src).values()) {
      const { entry, src } = states[0];
      if (states.every((s) => tree.equal(s.dest, src))) {
        for (const s of states) overwrite.add(s.dest); // same content: just restore the link
        continue;
      }
      const where = text.and(states.map((s) => s.harness));
      if (!interactive) {
        r.reporter.warn(`skipped ${entry}: ${where} have a different version from agentkit; run \`sync\` in a terminal`);
        continue;
      }
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
        for (const s of states) tree.remove(s.dest);
        tree.remove(src); // links in other harnesses go dead and are pruned below
        r.reporter.success(`deleted ${entry} from ${where} and ${rel}`);
        continue;
      }
      if (action === "installed") tree.move(states[0].dest, src); // first live copy becomes the source
      for (const s of states) overwrite.add(s.dest); // remaining folders get replaced by the link
    }

    // Self-installed skills on unowned names: leave them, or adopt into the repo.
    for (const group of array.groupBy(unmanaged, (u) => `${u.format}\0${u.entry}`).values()) {
      const { format, entry } = group[0];
      const have = text.and(group.map((g) => g.harness));
      if (!interactive) {
        r.reporter.warn(`skipped ${entry} (${format}): ${have} have it, agentkit does not; run \`sync\` in a terminal`);
        continue;
      }
      // Identical copies across harnesses => one common skill; divergent copies stay per-harness.
      const common = group.length >= 2 && group.every((g) => tree.equal(g.dest, group[0].dest));
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
        for (const g of group) tree.remove(g.dest);
        r.reporter.success(`deleted ${entry} from ${group.map((g) => g.harness).join(", ")}`);
        continue;
      }
      if (action === "leave") {
        links.markUnmanaged(group);
        r.reporter.success(`left ${entry} unmanaged in ${group.map((g) => g.harness).join(", ")}`);
        continue;
      }
      if (common) {
        tree.move(group[0].dest, path.join(REPO, "common", format, entry)); // keep one; the link pass replaces the copies
        for (const g of group.slice(1)) tree.remove(g.dest);
      } else {
        for (const g of group) tree.move(g.dest, path.join(REPO, g.harness, format, entry)); // divergent: preserve each
      }
      r.reporter.success(`adopted ${where}${entry}`);
    }

    // Link every owned entry into every harness (adopted names are now owned; owned set is recomputed).
    await r.group("Links", { layout: "sequence" }, async (g) => {
      for (const [name, harness] of Object.entries(HARNESSES)) {
        await g.activity(name, () => {
          const base = paths.untilde(harness.base);
          for (const file of harness.files ?? []) {
            symlink.ensure(path.join(REPO, name, file), path.join(base, file), true);
          }
          for (const [format, native] of Object.entries(harness.formats)) {
            const dir = path.join(base, native);
            fs.mkdirSync(dir, { recursive: true });
            symlink.pruneDead(dir);
            for (const [entry, src] of links.owned(name, format)) {
              const dest = path.join(dir, entry);
              symlink.ensure(src, dest, overwrite.has(dest));
            }
          }
        });
      }
    });

    r.reporter.success("Sync complete.");
  },
});
