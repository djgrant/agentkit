import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { REPO } from "../config/paths.ts";

export interface SkillSource {
  url: string;
  ref?: string;
  subpath?: string;
}

export interface DiscoveredSkill {
  name: string;
  description: string;
  dir: string;
}

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "__pycache__"]);

export function parseSkillLocation(location: string): SkillSource {
  const shorthand = location.match(/^([^/:]+)\/([^/]+?)\/?$/);
  if (shorthand) {
    return {
      url: `https://github.com/${shorthand[1]}/${shorthand[2].replace(/\.git$/, "")}.git`,
    };
  }

  if (/^https?:\/\//.test(location)) {
    const url = new URL(location);
    if (url.hostname === "github.com") {
      const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
      const [owner, rawRepo, marker, ref, ...subpath] = segments;
      if (!owner || !rawRepo) throw new Error(`Invalid GitHub skill location: ${location}`);
      const repo = rawRepo.replace(/\.git$/, "");
      if (marker === "tree") {
        if (!ref) throw new Error(`GitHub tree URL is missing a ref: ${location}`);
        return {
          url: `https://github.com/${owner}/${repo}.git`,
          ref,
          subpath: subpath.length ? sanitizeSubpath(subpath.join("/")) : undefined,
        };
      }
      return { url: `https://github.com/${owner}/${repo}.git` };
    }
  }

  if (/^ext::/i.test(location)) {
    throw new Error("Unsupported Git transport: ext");
  }

  return { url: location };
}

export async function cloneSkillSource(source: SkillSource): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentkit-skill-"));
  const args = ["git", "clone", "--depth", "1"];
  if (source.ref) args.push("--branch", source.ref);
  args.push("--", source.url, dir);

  const proc = Bun.spawn(args, { stdout: "ignore", stderr: "pipe" });
  const timeout = setTimeout(() => proc.kill(), 60_000);
  const exitCode = await proc.exited;
  clearTimeout(timeout);

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error(`Failed to clone ${source.url}: ${stderr.trim() || `git exited ${exitCode}`}`);
  }

  return dir;
}

export function discoverSkills(repoDir: string, subpath?: string): DiscoveredSkill[] {
  const root = subpath ? safeJoin(repoDir, subpath) : repoDir;
  if (!fs.existsSync(root)) throw new Error(`Skill path does not exist: ${subpath}`);

  const direct = readSkill(root);
  if (direct) return [direct];

  const skills: DiscoveredSkill[] = [];
  const seen = new Set<string>();
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      const child = path.join(dir, entry.name);
      const skill = readSkill(child);
      if (skill) {
        const key = normalizeSkillName(skill.name);
        if (!seen.has(key)) {
          seen.add(key);
          skills.push(skill);
        }
      } else {
        visit(child);
      }
    }
  };
  visit(root);
  return skills;
}

export function selectSkills(skills: DiscoveredSkill[], requested: string[]): DiscoveredSkill[] {
  if (!requested.length || requested.includes("*")) return skills;
  const wanted = new Set(requested.map(normalizeSkillName));
  const selected = skills.filter(
    (skill) =>
      wanted.has(normalizeSkillName(skill.name)) ||
      wanted.has(normalizeSkillName(path.basename(skill.dir))),
  );
  const found = new Set(
    selected.flatMap((skill) => [
      normalizeSkillName(skill.name),
      normalizeSkillName(path.basename(skill.dir)),
    ]),
  );
  const missing = requested.filter((name) => !found.has(normalizeSkillName(name)));
  if (missing.length) throw new Error(`Unknown skill${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  return selected;
}

export function installSkills(skills: DiscoveredSkill[], targets: string[]): string[] {
  const destinations = skills.flatMap((skill) =>
    targets.map((target) => ({
      skill,
      destination: path.join(REPO, target, "skill", sanitizeName(skill.name)),
    })),
  );
  const unique = new Set(destinations.map(({ destination }) => destination));
  if (unique.size !== destinations.length) {
    throw new Error("Selected skills resolve to the same destination name");
  }
  const existing = destinations.filter(({ destination }) => fs.existsSync(destination));
  if (existing.length) {
    throw new Error(
      `Refusing to overwrite existing skill${existing.length === 1 ? "" : "s"}: ${existing
        .map(({ destination }) => path.relative(REPO, destination))
        .join(", ")}`,
    );
  }

  for (const { skill, destination } of destinations) {
    assertSafeTree(skill.dir);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(skill.dir, destination, {
      recursive: true,
      filter: (source) => !SKIP_DIRS.has(path.basename(source)),
    });
  }
  return destinations.map(({ destination }) => path.relative(REPO, destination));
}

export function parseSkillFlag(values: string[] | undefined, extraArgs: string[]): string[] {
  const skills = [...(values ?? [])];
  let collecting = values !== undefined;
  for (let i = 0; i < extraArgs.length; i++) {
    const arg = extraArgs[i]!;
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

function readSkill(dir: string): DiscoveredSkill | null {
  const file = path.join(dir, "SKILL.md");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const content = fs.readFileSync(file, "utf8");
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) return null;
  let data: unknown;
  try {
    data = Bun.YAML.parse(frontmatter[1]);
  } catch {
    return null;
  }
  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as Record<string, unknown>).name !== "string" ||
    typeof (data as Record<string, unknown>).description !== "string"
  ) {
    return null;
  }
  return {
    name: (data as Record<string, string>).name.trim(),
    description: (data as Record<string, string>).description.trim(),
    dir,
  };
}

function safeJoin(base: string, subpath: string): string {
  const target = path.resolve(base, sanitizeSubpath(subpath));
  const relative = path.relative(path.resolve(base), target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Unsafe skill path: ${subpath}`);
  return target;
}

function sanitizeSubpath(subpath: string): string {
  if (subpath.replaceAll("\\", "/").split("/").includes("..")) {
    throw new Error(`Unsafe skill path: ${subpath}`);
  }
  return subpath;
}

function normalizeSkillName(name: string): string {
  return name.toLowerCase().replace(/[\s_]+/g, "-");
}

function sanitizeName(name: string): string {
  const sanitized = normalizeSkillName(name)
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!sanitized) throw new Error(`Invalid skill name: ${name}`);
  return sanitized;
}

function assertSafeTree(root: string) {
  const visit = (entry: string) => {
    const stat = fs.lstatSync(entry);
    if (stat.isSymbolicLink()) throw new Error(`Skill contains unsupported symlink: ${path.relative(root, entry)}`);
    if (!stat.isDirectory()) return;
    for (const child of fs.readdirSync(entry)) {
      if (!SKIP_DIRS.has(child)) visit(path.join(entry, child));
    }
  };
  visit(root);
}
