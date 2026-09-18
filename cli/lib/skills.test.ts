import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  discoverSkills,
  parseSkillFlag,
  parseSkillLocation,
  selectSkills,
} from "./skills.ts";

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("parseSkillLocation", () => {
  test("resolves GitHub shorthand", () => {
    expect(parseSkillLocation("vercel-labs/agent-skills")).toEqual({
      url: "https://github.com/vercel-labs/agent-skills.git",
    });
  });

  test("resolves full GitHub URLs", () => {
    expect(parseSkillLocation("https://github.com/vercel-labs/agent-skills")).toEqual({
      url: "https://github.com/vercel-labs/agent-skills.git",
    });
  });

  test("resolves direct GitHub skill paths", () => {
    expect(
      parseSkillLocation(
        "https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines",
      ),
    ).toEqual({
      url: "https://github.com/vercel-labs/agent-skills.git",
      ref: "main",
      subpath: "skills/web-design-guidelines",
    });
  });

  test("preserves other git URLs", () => {
    expect(parseSkillLocation("git@github.com:vercel-labs/agent-skills.git")).toEqual({
      url: "git@github.com:vercel-labs/agent-skills.git",
    });
  });
});

test("discovers and selects skills by frontmatter name", () => {
  const repo = makeTempDir();
  writeSkill(path.join(repo, "skills", "one"), "One Skill");
  writeSkill(path.join(repo, "nested", "two"), "typesafe-ai");

  const discovered = discoverSkills(repo);
  expect(discovered.map((skill) => skill.name)).toEqual(["typesafe-ai", "One Skill"]);
  expect(selectSkills(discovered, ["one-skill"]).map((skill) => skill.name)).toEqual(["One Skill"]);
  expect(() => selectSkills(discovered, ["missing"])).toThrow("Unknown skill: missing");
});

test("a direct skill path does not discover siblings", () => {
  const repo = makeTempDir();
  writeSkill(path.join(repo, "skills", "one"), "one");
  writeSkill(path.join(repo, "skills", "two"), "two");
  expect(discoverSkills(repo, "skills/one").map((skill) => skill.name)).toEqual(["one"]);
});

test("parses variadic short and long skill flags", () => {
  expect(parseSkillFlag(undefined, ["-s", "one", "two"])).toEqual(["one", "two"]);
  expect(parseSkillFlag(["one"], ["two"])).toEqual(["one", "two"]);
  expect(parseSkillFlag(undefined, [])).toEqual([]);
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentkit-skills-test-"));
  tempDirs.push(dir);
  return dir;
}

function writeSkill(dir: string, name: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: A test skill\n---\n`,
  );
}
