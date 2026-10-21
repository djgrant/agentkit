// The filesystem plane of ownership: what the repo would link into each
// harness, and how the live dir diverges from it. Mirrors the MCP model —
// we only reason about entries the repo owns; anything else on disk is the
// user's or another tool's, and left alone (see `unmanaged` for adopt hints).

import * as fs from "node:fs";
import * as path from "node:path";
import { REPO, UNMANAGED_FILE, VENDOR } from "../config/paths.ts";
import { HARNESSES } from "../config/harnesses.ts";
import type { LinkState, Unmanaged, UnmanagedLinks } from "../contracts/links.ts";
import { files, paths, symlink } from "../utils/fs.ts";

/** Entries agentkit never treats as a linkable skill: dotfiles, the manifest's own SKILL.md, and internal sync dirs. */
const skippable = (entry: string) => entry.startsWith(".") || entry === "SKILL.md" || entry === "synced";

export const links = {
  /** The entries the repo would link for a harness/format: common first, harness wins; authored beats vendored. */
  owned(harness: string, format: string) {
    const owned = new Map<string, string>();
    const dirs = ["common", harness].flatMap((scope) => [path.join(VENDOR, scope, format), path.join(REPO, scope, format)]);
    for (const dir of dirs) {
      for (const entry of files.ls(dir)) if (!skippable(entry)) owned.set(entry, path.join(dir, entry));
    }
    return owned;
  },

  /** Walk every harness/format, classifying owned entries and spotting unmanaged ones. */
  scan() {
    const managed: LinkState[] = [];
    const unmanaged: Unmanaged[] = [];
    const ignored: UnmanagedLinks = files.readJson(UNMANAGED_FILE).links ?? {};

    for (const [harness, { base, formats }] of Object.entries(HARNESSES)) {
      for (const [format, native] of Object.entries(formats)) {
        const dir = path.join(paths.untilde(base), native);
        const owned = links.owned(harness, format);

        for (const [entry, src] of owned) {
          const dest = path.join(dir, entry);
          const target = symlink.target(dest);
          const status: LinkState["status"] =
            target === null
              ? fs.existsSync(dest)
                ? "blocked" // a real file/dir sits on an owned name
                : "missing"
              : path.resolve(dir, target) === src // links may be relative
                ? "ok"
                : "stale";
          managed.push({ harness, format, entry, src, dest, status, liveTarget: target ?? undefined });
        }

        for (const entry of files.ls(dir)) {
          if (skippable(entry) || owned.has(entry) || ignored[harness]?.[format]?.includes(entry)) continue;
          const dest = path.join(dir, entry);
          if (symlink.is(dest)) continue; // another tool's link, none of our business
          unmanaged.push({ harness, format, entry, dest });
        }
      }
    }

    return { managed, unmanaged };
  },

  /** Persist entries the user chose to leave alone so sync and drift stop surfacing them. */
  markUnmanaged(entries: Unmanaged[]) {
    const manifest = files.readJson(UNMANAGED_FILE);
    const ignored: UnmanagedLinks = (manifest.links ??= {});
    for (const { harness, format, entry } of entries) {
      const names = ((ignored[harness] ??= {})[format] ??= []);
      if (!names.includes(entry)) names.push(entry);
      names.sort();
    }
    files.writeJson(UNMANAGED_FILE, manifest);
  },
};
