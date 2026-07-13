// Where a harness persists its MCP servers. A store only ever touches the
// server ids it is told the repo owns — servers installed by the user or the
// harness itself are left untouched.

import * as fs from "node:fs";
import { readJson, writeJson, untilde } from "./fs.ts";

type Block = Record<string, unknown>;

export interface McpStore {
  read(): Block; // every server currently in the live config
  write(desired: Block, ownedIds: string[]): void; // replace the owned ids with desired
}

/** A JSON config file with the servers under one top-level key. */
export const jsonFileStore = (file: string, key: string): McpStore => ({
  read: () => readJson(file)[key] ?? {},
  write(desired, ownedIds) {
    const config = readJson(file);
    const block: Block = { ...(config[key] ?? {}) };
    for (const id of ownedIds) delete block[id];
    config[key] = { ...block, ...desired };
    writeJson(file, config);
  },
});

/**
 * A TOML config file with one [prefix.<id>] table per server (codex-style).
 * Owned tables are rewritten in place of the file's tail; every other line —
 * comments, formatting, unrelated tables — is preserved byte-for-byte.
 */
export const tomlTablesStore = (file: string, prefix: string): McpStore => ({
  read: () => (Bun.TOML.parse(readText(file)) as Record<string, Block>)[prefix] ?? {},
  write(desired, ownedIds) {
    const owned = new Set(ownedIds);
    const kept = dropSections(readText(file), (section) => {
      const [root, id] = splitKey(section);
      return root === prefix && owned.has(id);
    });
    const next = [kept.trimEnd(), renderTables(prefix, desired)].filter(Boolean).join("\n\n") + "\n";
    fs.writeFileSync(untilde(file), next);
  },
});

const readText = (file: string) =>
  fs.existsSync(untilde(file)) ? fs.readFileSync(untilde(file), "utf8") : "";

/** Remove every [section] (header through following lines) the predicate claims. */
function dropSections(text: string, claimed: (section: string) => boolean): string {
  let dropping = false;
  return text
    .split("\n")
    .filter((line) => {
      const header = line.match(/^\s*\[\[?\s*(.+?)\s*\]\]?/);
      if (header) dropping = claimed(header[1]);
      return !dropping;
    })
    .join("\n");
}

/** "prefix.id.sub" -> ["prefix", "id"]. Assumes ids without dots; quotes stripped. */
const splitKey = (section: string): [string, string] => {
  const [root = "", id = ""] = section.split(".");
  return [root, id.replace(/^["']|["']$/g, "")];
};

function renderTables(prefix: string, block: Block): string {
  return Object.entries(block)
    .map(([id, fields]) =>
      [
        `[${prefix}.${tomlKey(id)}]`,
        ...Object.entries(fields as Block).map(([key, value]) => `${tomlKey(key)} = ${tomlValue(value)}`),
      ].join("\n"),
    )
    .join("\n\n");
}

const tomlKey = (key: string) => (/^[\w-]+$/.test(key) ? key : JSON.stringify(key));

const tomlValue = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(tomlValue).join(", ")}]`
    : value !== null && typeof value === "object"
      ? `{ ${Object.entries(value)
          .map(([key, inner]) => `${tomlKey(key)} = ${tomlValue(inner)}`)
          .join(", ")} }`
      : typeof value === "string"
        ? JSON.stringify(value)
        : String(value);
