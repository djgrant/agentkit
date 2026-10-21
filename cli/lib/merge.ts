// Config files a harness writes back to. Some tools (codex) persist runtime
// state — trusted project paths, hook hashes, dismissed notices — into the same
// file that holds the user's config. Symlinking that file into the repo drags
// the state, and the machine's whole project inventory, into version control.
//
// So these files are merged rather than linked: the repo holds a template of
// the settings it owns, and every key the template doesn't name is left in the
// live file untouched. Same ownership model as MCP, widened from one table
// prefix to "whatever the template declares".

import * as fs from "node:fs";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";
import { HARNESSES } from "../config/harnesses.ts";
import type { MergedFile } from "../contracts/harness.ts";
import { files, paths, symlink } from "../utils/fs.ts";
import { toml } from "../utils/toml.ts";

export const mergedConfig = {
  /** Every merged config file across the harnesses. */
  files: (): MergedFile[] =>
    Object.entries(HARNESSES).flatMap(([harness, { base, merges = [] }]) =>
      merges.map((file) => ({
        harness,
        file,
        template: path.join(REPO, harness, file),
        live: path.join(paths.untilde(base), file),
      })),
    ),

  /** Whether the live file already matches what a merge would produce. */
  inSync: ({ template, live, file }: MergedFile) =>
    merge(files.readText(template), files.readText(live), file).trim() === files.readText(live).trim(),

  /** Write the merged result into the live file, replacing a legacy symlink. */
  write({ template, live, file }: MergedFile) {
    const current = files.readText(live);
    const next = merge(files.readText(template), current, file);
    if (next === current) return;
    // A link here is the pre-merge layout: the live path pointed straight at the
    // repo file. Removing it first stops the write landing back in the repo.
    if (symlink.is(live)) fs.rmSync(live);
    fs.writeFileSync(live, next);
  },
};

/** Merge a template over a live config in the file's own format. */
const merge = (template: string, live: string, file: string) =>
  file.endsWith(".json") ? mergeJson(template, live) : mergeToml(template, live);

/**
 * Merge a JSON template over a live JSON config. Ownership is the template's
 * shape: objects recurse, so a template of `{"hooks": {"Stop": []}}` claims
 * only `hooks.Stop` — sibling keys the live file holds (other hook events,
 * secrets, machine state) survive untouched. Non-object template values are
 * leaves and replace whatever the live file has there.
 */
function mergeJson(template: string, live: string) {
  const parse = (text: string): unknown => (text.trim() ? JSON.parse(text) : {});
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
  const deepMerge = (template: unknown, live: unknown): unknown => {
    if (!isRecord(template) || !isRecord(live)) return template;
    const out = { ...live }; // live key order kept; new template keys append
    for (const [key, value] of Object.entries(template)) out[key] = deepMerge(value, live[key]);
    return out;
  };
  return JSON.stringify(deepMerge(parse(template), parse(live)), null, 2) + "\n";
}

/** Merge a TOML template over a live config, preserving every unowned line. */
function mergeToml(template: string, live: string) {
  const [templateRoot, templateBody] = toml.splitRoot(template);
  const [liveRoot, liveBody] = toml.splitRoot(live);
  const keys = (block: string) => block.split("\n").map(toml.rootKey);
  const ownedRoots = new Set(keys(templateRoot));
  // Exact section headers; `[tui]` does not claim `[tui.nested]`.
  const ownedSections = new Set(templateBody.split("\n").map(toml.sectionHeader));

  // The live root block is reduced to the assignments the template doesn't own.
  // Comments are dropped rather than carried: the template's own header lands in
  // this block on the way out, so keeping them would re-append it every merge.
  // Root comments belong in the template, which is the file a human edits.
  const unownedRoots = liveRoot
    .split("\n")
    .filter((line) => {
      const key = toml.rootKey(line);
      return key !== null && !ownedRoots.has(key);
    })
    .join("\n");

  // Root keys must precede the first section header, so the two root blocks are
  // emitted together, ahead of both bodies — appending live roots after the
  // template's sections would silently reparent them.
  return [
    templateRoot.trim(),
    unownedRoots.trim(),
    templateBody.trim(),
    toml.dropSections(liveBody, (section) => ownedSections.has(section)).trim(),
  ]
    .filter(Boolean)
    .join("\n\n") + "\n";
}
