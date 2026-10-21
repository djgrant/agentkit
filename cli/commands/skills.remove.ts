import { defineCommand } from "@pokit/core";
import * as path from "node:path";
import { z } from "zod";
import { HARNESSES } from "../config/harnesses.ts";
import { REPO } from "../config/paths.ts";
import { installedSkills } from "../lib/skills.ts";
import { array } from "../utils/collections.ts";
import { paths, symlink, tree } from "../utils/fs.ts";

const vendored = () => installedSkills().filter((skill) => skill.origin === "vendor");

export const command = defineCommand({
  label: "Remove a vendored skill from agentkit",
  examples: ["ak skills remove web-design-guidelines"],
  context: {
    name: {
      from: "arg",
      schema: z.string().min(1),
      description: "Vendored skill directory name",
      resolve: () => array.unique(vendored().map((skill) => skill.name)).sort(),
    },
  },
  run: (r, { context }) => {
    const matches = vendored().filter((skill) => skill.name === context.name);
    if (!matches.length) {
      const authored = installedSkills().find((skill) => skill.name === context.name);
      if (authored) {
        throw new Error(`${context.name} is authored in ${path.relative(REPO, authored.dir)}; delete it from the repo instead`);
      }
      throw new Error(`Unknown vendored skill: ${context.name}`);
    }

    for (const { dir } of matches) {
      tree.remove(dir);
      r.reporter.success(`Removed ${path.relative(REPO, dir)}`);
    }

    // Harness links into the removed dirs are now dead.
    for (const { base, formats } of Object.values(HARNESSES)) {
      if (formats.skill) symlink.pruneDead(path.join(paths.untilde(base), formats.skill));
    }
  },
});
