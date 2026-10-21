// `skills add`: find skills in a remote repo and vendor the chosen ones.

import * as fs from "node:fs";
import * as path from "node:path";
import { REPO, VENDOR } from "../config/paths.ts";
import { SkillFrontmatterSchema, type DiscoveredSkill, type SkillSource } from "../contracts/skills.ts";
import { files, paths, tree } from "../utils/fs.ts";
import { text } from "../utils/text.ts";

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "__pycache__"]);

/** "My_Skill" -> "my-skill": how names are compared. */
const normalize = (name: string) => name.toLowerCase().replace(/[\s_]+/g, "-");

export function parseSkillLocation(location: string): SkillSource {
  const shorthand = location.match(/^([^/:]+)\/([^/]+?)\/?$/);
  if (shorthand) {
    return { url: `https://github.com/${shorthand[1]}/${shorthand[2].replace(/\.git$/, "")}.git` };
  }

  if (/^https?:\/\//.test(location)) {
    const url = new URL(location);
    if (url.hostname === "github.com") {
      const [owner, rawRepo, marker, ref, ...subpath] = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      if (!owner || !rawRepo) throw new Error(`Invalid GitHub skill location: ${location}`);
      const repoUrl = `https://github.com/${owner}/${rawRepo.replace(/\.git$/, "")}.git`;
      if (marker !== "tree") return { url: repoUrl };
      if (!ref) throw new Error(`GitHub tree URL is missing a ref: ${location}`);
      return { url: repoUrl, ref, subpath: subpath.length ? subpath.join("/") : undefined };
    }
  }

  if (/^ext::/i.test(location)) throw new Error("Unsupported Git transport: ext");

  return { url: location };
}

export function discoverSkills(repoDir: string, subpath?: string) {
  const root = subpath ? paths.within(repoDir, subpath) : repoDir;
  if (!fs.existsSync(root)) throw new Error(`Skill path does not exist: ${subpath}`);

  const direct = readSkill(root);
  if (direct) return [direct];

  const skills: DiscoveredSkill[] = [];
  const seen = new Set<string>();
  const visit = (dir: string) => {
    for (const entry of files.entries(dir)) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      const child = path.join(dir, entry.name);
      const skill = readSkill(child);
      if (!skill) visit(child);
      else if (!seen.has(normalize(skill.name))) {
        seen.add(normalize(skill.name));
        skills.push(skill);
      }
    }
  };
  visit(root);
  return skills;
}

/** Narrow discovered skills to the requested names (by frontmatter name or dir name); none or "*" means all. */
export function selectSkills(skills: DiscoveredSkill[], requested: string[]) {
  if (!requested.length || requested.includes("*")) return skills;
  const namesOf = (skill: DiscoveredSkill) => [normalize(skill.name), normalize(path.basename(skill.dir))];
  const wanted = new Set(requested.map(normalize));
  const selected = skills.filter((skill) => namesOf(skill).some((name) => wanted.has(name)));
  const found = new Set(selected.flatMap(namesOf));
  const missing = requested.filter((name) => !found.has(normalize(name)));
  if (missing.length) throw new Error(`Unknown ${text.plural(missing.length, "skill")}: ${missing.join(", ")}`);
  return selected;
}

/** Copy each skill into vendor/<target>/skill/, refusing to shadow or overwrite anything already there. */
export function installSkills(skills: DiscoveredSkill[], targets: string[]) {
  const destinations = skills.flatMap((skill) =>
    targets.map((target) => ({
      skill,
      destination: path.join(VENDOR, target, "skill", dirName(skill.name)),
      authored: path.join(REPO, target, "skill", dirName(skill.name)),
    })),
  );
  if (new Set(destinations.map(({ destination }) => destination)).size !== destinations.length) {
    throw new Error("Selected skills resolve to the same destination name");
  }
  const existing = destinations.flatMap(({ destination, authored }) => [destination, authored].filter(fs.existsSync));
  if (existing.length) {
    throw new Error(
      `Refusing to overwrite existing ${text.plural(existing.length, "skill")}: ${existing.map((p) => path.relative(REPO, p)).join(", ")}`,
    );
  }

  for (const { skill, destination } of destinations) {
    tree.assertNoSymlinks(skill.dir, SKIP_DIRS);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(skill.dir, destination, { recursive: true, filter: (source) => !SKIP_DIRS.has(path.basename(source)) });
  }
  return destinations.map(({ destination }) => path.relative(REPO, destination));
}

/** `-s a b --skill c`: the flag is variadic, so trailing positionals after it are more skill names. */
export function parseSkillFlag(values: string[] | undefined, extraArgs: string[]) {
  const skills = [...(values ?? [])];
  let collecting = values !== undefined;
  for (const arg of extraArgs) {
    if (arg === "-s" || arg === "--skill") {
      collecting = true;
      continue;
    }
    if (!collecting || arg.startsWith("-")) throw new Error(`Unexpected argument: ${arg}`);
    skills.push(arg);
  }
  if (collecting && !skills.length) throw new Error("--skill requires at least one skill name");
  return skills;
}

/** The skill whose SKILL.md frontmatter sits in dir, or null. */
function readSkill(dir: string): DiscoveredSkill | null {
  const file = path.join(dir, "SKILL.md");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const frontmatter = fs.readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) return null;
  try {
    const parsed = SkillFrontmatterSchema.safeParse(Bun.YAML.parse(frontmatter[1]));
    return parsed.success ? { ...parsed.data, dir } : null;
  } catch {
    return null; // malformed YAML
  }
}

/** A skill name made safe to use as a directory name. */
function dirName(name: string) {
  const safe = normalize(name)
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!safe) throw new Error(`Invalid skill name: ${name}`);
  return safe;
}
