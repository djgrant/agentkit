import { defineCommand } from "@pokit/core";
import * as fs from "node:fs";
import { z } from "zod";
import { HARNESSES } from "../config/harnesses.ts";
import {
  cloneSkillSource,
  discoverSkills,
  installSkills,
  parseSkillFlag,
  parseSkillLocation,
  selectSkills,
} from "../lib/skills.ts";

const TARGETS = [
  { value: "common", label: "common", hint: "shared by every compatible harness" },
  ...Object.entries(HARNESSES)
    .filter(([, harness]) => "skill" in harness.formats)
    .map(([name]) => ({ value: name, label: name })),
];

export const command = defineCommand({
  label: "Install a skill to agentkit",
  examples: [
    "pok skills add vercel-labs/agent-skills",
    "pok skills add https://github.com/vercel-labs/agent-skills",
    "pok skills add https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines",
    "pok skills add git@github.com:vercel-labs/agent-skills.git",
    "pok skills add typesafe-ai/skills --skill typesafe-ai",
  ],
  context: {
    location: {
      from: "arg",
      schema: z.string().min(1),
      description: "GitHub repository, GitHub tree URL, or git URL",
    },
    skill: {
      from: "flag",
      aliases: ["s"],
      schema: z.preprocess(
        (value) => (typeof value === "string" ? [value] : value),
        z.array(z.string().min(1)),
      ).optional(),
      description: "Install specific skills by name; accepts -s or --skill (use '*' for all skills)",
    },
  },
  run: async (r, { context, extraArgs }) => {
    if (!process.stdin.isTTY) throw new Error("Run interactively to select install targets");

    const requested = parseSkillFlag(context.skill, extraArgs);
    const targets = await r.prompter.multiselect({
      message: "Install skill to:",
      options: TARGETS,
      initialValues: ["common"],
      required: true,
    });

    const source = parseSkillLocation(context.location);
    const tempDir = await cloneSkillSource(source);
    try {
      const discovered = discoverSkills(tempDir, source.subpath);
      if (!discovered.length) throw new Error(`No skills found at ${context.location}`);
      const selected = selectSkills(discovered, requested);
      const installed = installSkills(selected, targets);
      for (const destination of installed) r.reporter.success(`Installed ${destination}`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  },
});
