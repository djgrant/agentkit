import { defineCommand } from "@pokit/core";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";
import { installedSkills } from "../lib/skills.ts";
import { md } from "../utils/text.ts";

export const command = defineCommand({
  label: "List authored and vendored skills",
  examples: ["ak skills list"],
  run: (r) => {
    const seen = new Set<string>();
    const rows = installedSkills()
      .map((skill) => {
        const shadowed = seen.has(skill.name);
        seen.add(skill.name);
        return { ...skill, shadowed };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, scope, origin, dir, shadowed }) => [
        md.code(name),
        scope,
        shadowed ? `${origin} (shadowed)` : origin,
        md.code(path.relative(REPO, dir)),
      ]);

    r.reporter.step(`Skills (${seen.size})`);
    r.reporter.markdown(md.table(["Skill", "Scope", "Source", "Path"], rows));
  },
});
