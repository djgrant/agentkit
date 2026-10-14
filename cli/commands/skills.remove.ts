import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { HARNESSES } from "../config/harnesses.ts";
import { REPO } from "../config/paths.ts";
import { pruneDeadLinks, untilde } from "../lib/fs.ts";
import { installedSkills } from "../lib/skills.ts";

const vendored = () => installedSkills().filter((skill) => skill.origin === "vendor");

export const command = defineCommand({
  label: "Remove a vendored skill from agentkit",
  examples: ["ak skills remove web-design-guidelines"],
  context: {
    name: {
      from: "arg",
      schema: z.string().min(1),
      description: "Vendored skill directory name",
      resolve: () => [...new Set(vendored().map((skill) => skill.name))].sort(),
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
      fs.rmSync(dir, { recursive: true, force: true });
      r.reporter.success(`Removed ${path.relative(REPO, dir)}`);
    }

    // Harness links into the removed dirs are now dead.
    for (const harness of Object.values(HARNESSES)) {
      const subdir = harness.formats.skill;
      if (subdir) pruneDeadLinks(path.join(untilde(harness.base), subdir));
    }
  },
});
