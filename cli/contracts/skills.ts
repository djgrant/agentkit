import { z } from "zod";

/** Where `skills add` clones from. */
export interface SkillSource {
  url: string;
  ref?: string;
  subpath?: string;
}

export const SkillFrontmatterSchema = z.object({
  name: z.string().trim(),
  description: z.string().trim(),
});

export type DiscoveredSkill = z.infer<typeof SkillFrontmatterSchema> & { dir: string };

export interface InstalledSkill {
  name: string;
  scope: string; // "common" or a harness name
  origin: "authored" | "vendor";
  dir: string;
}
