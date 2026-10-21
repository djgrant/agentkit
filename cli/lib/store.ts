// MCP stores: the ways a harness persists its servers (see McpStore).

import type { McpStore, ServerBlock } from "../contracts/mcp.ts";
import { files } from "../utils/fs.ts";
import { toml } from "../utils/toml.ts";

/** A JSON config file with the servers under one top-level key. */
export const jsonFileStore = (file: string, key: string): McpStore => ({
  read: () => files.readJson(file)[key] ?? {},
  write(desired, ownedIds) {
    const config = files.readJson(file);
    const block: ServerBlock = { ...(config[key] ?? {}) };
    for (const id of ownedIds) delete block[id];
    config[key] = { ...block, ...desired };
    files.writeJson(file, config);
  },
});

/**
 * A TOML config file with one [prefix.<id>] table per server (codex-style).
 * Owned tables are rewritten in place of the file's tail; every other line —
 * comments, formatting, unrelated tables — is preserved byte-for-byte.
 */
export const tomlTablesStore = (file: string, prefix: string): McpStore => ({
  read: () => (toml.parse(files.readText(file))[prefix] as ServerBlock | undefined) ?? {},
  write(desired, ownedIds) {
    const owned = new Set(ownedIds);
    const kept = toml.dropSections(files.readText(file), (section) => {
      const [root, id] = splitKey(section);
      return root === prefix && owned.has(id);
    });
    const tables = Object.keys(desired).length ? toml.stringify({ [prefix]: desired }).trim() : "";
    files.writeText(file, [kept.trimEnd(), tables].filter(Boolean).join("\n\n") + "\n");
  },
});

/** "prefix.id.sub" -> ["prefix", "id"]. Assumes ids without dots; quotes stripped. */
const splitKey = (section: string): [string, string] => {
  const [root = "", id = ""] = section.split(".");
  return [root, id.replace(/^["']|["']$/g, "")];
};
