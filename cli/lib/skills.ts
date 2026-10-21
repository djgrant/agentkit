// The skills agentkit already has: authored in the repo, or vendored by `skills add`.

import * as fs from "node:fs";
import * as path from "node:path";
import { HARNESSES } from "../config/harnesses.ts";
import { REPO, VENDOR } from "../config/paths.ts";
import type { InstalledSkill } from "../contracts/skills.ts";
import { files } from "../utils/fs.ts";

/** Every skill dir in the repo and vendor/, in precedence order: authored beats vendored, common beats harness-specific. */
export function installedSkills() {
  const scopes = ["common", ...Object.keys(HARNESSES)];
  const roots = [["authored", REPO], ["vendor", VENDOR]] as const;
  return roots.flatMap(([origin, root]) =>
    scopes.flatMap((scope) => {
      const parent = path.join(root, scope, "skill");
      if (!fs.existsSync(parent)) return [];
      return files
        .entries(parent)
        .map((entry) => ({ name: entry.name, scope, origin, dir: path.join(parent, entry.name) }) satisfies InstalledSkill)
        .filter(({ dir }) => fs.existsSync(path.join(dir, "SKILL.md")));
    }),
  );
}

/** The skill dir each name resolves to. */
export function skillDirs() {
  const dirs = new Map<string, string>();
  for (const { name, dir } of installedSkills()) if (!dirs.has(name)) dirs.set(name, dir);
  return dirs;
}
