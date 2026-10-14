import { defineCommand } from "@pokit/core";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";
import { installedSkills } from "../lib/skills.ts";

export const command = defineCommand({
  label: "List authored and vendored skills",
  examples: ["ak skills list"],
  run: (r) => {
    const skills = installedSkills();
    const seen = new Set<string>();
    const rows = skills
      .map((skill) => {
        const shadowed = seen.has(skill.name);
        seen.add(skill.name);
        return { ...skill, shadowed };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, scope, origin, dir, shadowed }) => {
        const source = shadowed ? `${origin} (shadowed)` : origin;
        return `| \`${name}\` | ${scope} | ${source} | \`${path.relative(REPO, dir)}\` |`;
      });

    r.reporter.step(`Skills (${seen.size})`);
    r.reporter.markdown(
      [`| Skill | Scope | Source | Path |`, `| --- | --- | --- | --- |`, ...rows].join("\n"),
    );
  },
});
