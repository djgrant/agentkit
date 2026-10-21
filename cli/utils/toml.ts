// Line-level TOML helpers for editing a config without reformatting the parts
// we don't own; parse and stringify come from smol-toml.

import { parse, stringify } from "smol-toml";

export const toml = {
  parse,
  stringify,

  /** "[a.b]" / "[[a.b]]" -> "a.b"; anything else -> null. Tolerates a trailing comment. */
  sectionHeader(line: string) {
    const match = line.match(/^\s*\[\[?\s*(.+?)\s*\]\]?\s*(?:#.*)?$/);
    return match ? match[1] : null;
  },

  /** "key = value" -> "key" (quotes stripped); comments and blanks -> null. */
  rootKey(line: string) {
    const match = line.match(/^\s*([\w-]+|"[^"]+")\s*=/);
    return match ? match[1].replace(/^"|"$/g, "") : null;
  },

  /** Split a document into its root block and everything from the first section on. */
  splitRoot(text: string): [string, string] {
    const lines = text.split("\n");
    const first = lines.findIndex((line) => toml.sectionHeader(line) !== null);
    return first === -1 ? [text, ""] : [lines.slice(0, first).join("\n"), lines.slice(first).join("\n")];
  },

  /** Remove every [section] (header through the following lines) the predicate claims. */
  dropSections(text: string, claimed: (section: string) => boolean) {
    let dropping = false;
    return text
      .split("\n")
      .filter((line) => {
        const header = toml.sectionHeader(line);
        if (header !== null) dropping = claimed(header);
        return !dropping;
      })
      .join("\n");
  },
};
