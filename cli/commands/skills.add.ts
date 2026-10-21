import { defineCommand } from "@pokit/core";
import { z } from "zod";
import { HARNESSES } from "../config/harnesses.ts";
import { discoverSkills, installSkills, parseSkillFlag, parseSkillLocation, selectSkills } from "../lib/skill-install.ts";
import { tree } from "../utils/fs.ts";
import { git } from "../utils/git.ts";

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
    const clone = await git.cloneToTemp(source.url, { ref: source.ref });
    try {
      const discovered = discoverSkills(clone, source.subpath);
      if (!discovered.length) throw new Error(`No skills found at ${context.location}`);
      for (const destination of installSkills(selectSkills(discovered, requested), targets)) {
        r.reporter.success(`Installed ${destination}`);
      }
    } finally {
      tree.remove(clone);
    }
  },
});
