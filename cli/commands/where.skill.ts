import { defineCommand } from "@pokit/core";
import { z } from "zod";
import { skillDirs } from "../lib/skills.ts";

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
