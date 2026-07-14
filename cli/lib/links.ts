// The filesystem plane of ownership: what the repo would link into each
// harness, and how the live dir diverges from it. Mirrors the MCP model —
// we only reason about entries the repo owns; anything else on disk is the
// user's or another tool's, and left alone (see `unmanaged` for adopt hints).

import * as fs from "node:fs";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";
import { HARNESSES, type Harness } from "../config/harnesses.ts";
import { ls, untilde } from "./fs.ts";

/** An owned entry and how its live destination compares to the repo source. */
export interface LinkState {
  harness: string;
  format: string;
  entry: string;
  src: string; // repo source the dest should point at
  dest: string; // live path in the harness
  status: "ok" | "missing" | "stale" | "blocked";
  liveTarget?: string; // present when status === "stale"
}

/** A live real dir on an unowned name — a self-installed skill we could adopt. */
export interface Unmanaged {
  harness: string;
  format: string;
  entry: string;
  dest: string;
}

/** Entries agentkit never treats as a linkable skill: dotfiles and the manifest's own SKILL.md. */
const skippable = (entry: string) => entry.startsWith(".") || entry === "SKILL.md";

/** The entries the repo would link for a harness/format: common first, harness wins. */
export function ownedEntries(name: string, format: string): Map<string, string> {
  const owned = new Map<string, string>();
  for (const dir of [path.join(REPO, "common", format), path.join(REPO, name, format)]) {
    for (const entry of ls(dir)) {
      if (skippable(entry)) continue;
      owned.set(entry, path.join(dir, entry));
    }
  }
  return owned;
}

const readlink = (p: string): string | null => {
  try {
    return fs.lstatSync(p).isSymbolicLink() ? fs.readlinkSync(p) : null;
  } catch {
    return null;
  }
};

/** Walk every harness/format, classifying owned entries and spotting unmanaged ones. */
export function scanLinks(): { managed: LinkState[]; unmanaged: Unmanaged[] } {
  const managed: LinkState[] = [];
  const unmanaged: Unmanaged[] = [];

  for (const [name, harness] of Object.entries(HARNESSES) as [string, Harness][]) {
    const base = untilde(harness.base);
    for (const format of Object.keys(harness.formats)) {
      const dir = path.join(base, harness.formats[format]);
      const owned = ownedEntries(name, format);

      for (const [entry, src] of owned) {
        const dest = path.join(dir, entry);
        const target = readlink(dest);
        const resolved = target === null ? null : path.resolve(dir, target); // links may be relative
        const status: LinkState["status"] = !fs.existsSync(dest) && target === null
          ? "missing"
          : target === null
            ? "blocked" // a real file/dir sits on an owned name
            : resolved === src
              ? "ok"
              : "stale";
        managed.push({ harness: name, format, entry, src, dest, status, liveTarget: target ?? undefined });
      }

      for (const entry of ls(dir)) {
        if (skippable(entry) || owned.has(entry)) continue;
        const dest = path.join(dir, entry);
        if (readlink(dest) !== null) continue; // symlink -> another tool's, none of our business
        unmanaged.push({ harness: name, format, entry, dest });
      }
    }
  }

  return { managed, unmanaged };
}
