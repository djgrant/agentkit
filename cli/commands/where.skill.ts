import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { HARNESSES } from "../config/harnesses.ts";
import { REPO, VENDOR } from "../config/paths.ts";

/** Authored skills win over vendored ones; common wins over harness-specific. */
function skillDirs(): Map<string, string> {
  const dirs = new Map<string, string>();
  const targets = ["common", ...Object.keys(HARNESSES)];
  for (const root of [REPO, VENDOR]) {
    for (const target of targets) {
      const parent = path.join(root, target, "skill");
      if (!fs.existsSync(parent)) continue;
      for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
        const dir = path.join(parent, entry.name);
        if (!dirs.has(entry.name) && fs.existsSync(path.join(dir, "SKILL.md"))) dirs.set(entry.name, dir);
      }
    }
  }
  return dirs;
}

export const command = defineCommand({
  label: "Print the directory of an agentkit skill",
  examples: ['sh "$(ak where skill explainer-video)/scripts/new.sh" ~/Videos/demo'],
  context: {
    name: {
      from: "arg",
      schema: z.string().refine((name) => skillDirs().has(name), "Unknown skill"),
      description: "Skill directory name",
      resolve: () => [...skillDirs().keys()].sort(),
    },
  },
  run: (_r, { context }) => {
    // Raw stdout, so the command can be interpolated with $(...).
    process.stdout.write(`${skillDirs().get(context.name)}\n`);
  },
});
