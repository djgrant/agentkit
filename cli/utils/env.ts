import * as fs from "node:fs";
import { parseEnv } from "node:util";

const PLACEHOLDER = /\$\{(\w+)\}/g;

export const env = {
  /** KEY=VALUE pairs from an env file, with the real environment taking precedence. */
  load(file: string) {
    const fromFile = fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {};
    return { ...fromFile, ...process.env } as Record<string, string>;
  },

  /** Every ${NAME} referenced in text. */
  placeholders: (text: string) => [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))],

  /** Replace each ${NAME} in text with whatever `resolve` returns for it. */
  interpolate: (text: string, resolve: (name: string, placeholder: string) => string) =>
    text.replace(PLACEHOLDER, (placeholder, name: string) => resolve(name, placeholder)),
};
