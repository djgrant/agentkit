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
import { untilde } from "./fs.ts";

/** The keys and sections a template claims. Everything else in live is the machine's. */
interface Owned {
  roots: Set<string>; // top-level `key = …` names, owned individually
  sections: Set<string>; // exact section headers; `[tui]` does not claim `[tui.nested]`
}

/** Merge a repo template over a live config, preserving every unowned line. */
export function mergeToml(template: string, live: string): string {
  const owned = claims(template);
  const [templateRoot, templateBody] = splitRoot(template);
  const [liveRoot, liveBody] = splitRoot(live);

  // Root keys must precede the first section header, so the two root blocks are
  // emitted together, ahead of both bodies — appending live roots after the
  // template's sections would silently reparent them.
  return [
    templateRoot.trim(),
    unownedRootKeys(liveRoot, owned.roots).trim(),
    templateBody.trim(),
    dropSections(liveBody, (section) => owned.sections.has(section)).trim(),
  ]
    .filter(Boolean)
    .join("\n\n") + "\n";
}

/**
 * Merge a JSON template over a live JSON config. Ownership is the template's
 * shape: objects recurse, so a template of `{"hooks": {"Stop": []}}` claims
 * only `hooks.Stop` — sibling keys the live file holds (other hook events,
 * secrets, machine state) survive untouched. Non-object template values are
 * leaves and replace whatever the live file has there.
 */
export function mergeJson(template: string, live: string): string {
  const merged = deepMerge(parseJson(template), parseJson(live));
  return JSON.stringify(merged, null, 2) + "\n";
}

const parseJson = (text: string): unknown => (text.trim() ? JSON.parse(text) : {});

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function deepMerge(template: unknown, live: unknown): unknown {
  if (!isRecord(template) || !isRecord(live)) return template;
  const out: Record<string, unknown> = { ...live }; // live key order kept; new template keys append
  for (const [key, value] of Object.entries(template)) out[key] = deepMerge(value, live[key]);
  return out;
}

/** Merge a template over a live config in the file's own format. */
export const merge = (template: string, live: string, file: string) =>
  file.endsWith(".json") ? mergeJson(template, live) : mergeToml(template, live);

/** Whether a live file already matches what a merge would produce. */
export const mergedInSync = (template: string, live: string, file: string) =>
  merge(template, live, file).trim() === live.trim();

/** Read a file, or "" when it doesn't exist yet. */
export const readText = (file: string) =>
  fs.existsSync(untilde(file)) ? fs.readFileSync(untilde(file), "utf8") : "";

/** Split a TOML document into its root block and everything from the first section on. */
function splitRoot(text: string): [string, string] {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => sectionHeader(line) !== null);
  return first === -1 ? [text, ""] : [lines.slice(0, first).join("\n"), lines.slice(first).join("\n")];
}

/** The names a template claims by declaring them. */
function claims(template: string): Owned {
  const [root, body] = splitRoot(template);
  const roots = new Set(
    root.split("\n").map(rootKey).filter((key): key is string => key !== null),
  );
  const sections = new Set(
    body.split("\n").map(sectionHeader).filter((name): name is string => name !== null),
  );
  return { roots, sections };
}

/** "[a.b]" / "[[a.b]]" -> "a.b"; anything else -> null. Tolerates a trailing comment. */
function sectionHeader(line: string): string | null {
  const match = line.match(/^\s*\[\[?\s*(.+?)\s*\]\]?\s*(?:#.*)?$/);
  return match ? match[1] : null;
}

/** "key = value" -> "key" (quotes stripped); comments and blanks -> null. */
function rootKey(line: string): string | null {
  const match = line.match(/^\s*([\w-]+|"[^"]+")\s*=/);
  return match ? match[1].replace(/^"|"$/g, "") : null;
}

/**
 * The live root block reduced to the assignments the template doesn't own.
 * Comments are dropped rather than carried: the template's own header lands in
 * this block on the way out, so keeping them would re-append it every merge.
 * Root comments belong in the template, which is the file a human edits.
 */
function unownedRootKeys(root: string, owned: Set<string>): string {
  return root
    .split("\n")
    .filter((line) => {
      const key = rootKey(line);
      return key !== null && !owned.has(key);
    })
    .join("\n");
}

/** Remove every [section] (header through the following lines) the predicate claims. */
export function dropSections(text: string, claimed: (section: string) => boolean): string {
  let dropping = false;
  return text
    .split("\n")
    .filter((line) => {
      const header = sectionHeader(line);
      if (header !== null) dropping = claimed(header);
      return !dropping;
    })
    .join("\n");
}

/** Write the merged result into a harness's live config, replacing a legacy symlink. */
export function writeMerged(templateFile: string, liveFile: string): { changed: boolean } {
  const dest = untilde(liveFile);
  const template = readText(templateFile);
  const live = readText(dest);
  const next = merge(template, live, liveFile);
  if (next === live) return { changed: false };
  // A link here is the pre-merge layout: the live path pointed straight at the
  // repo file. Removing it first stops the write landing back in the repo.
  if (isSymlink(dest)) fs.rmSync(dest);
  fs.writeFileSync(dest, next);
  return { changed: true };
}

const isSymlink = (p: string) => {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};
