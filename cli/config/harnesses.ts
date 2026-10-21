import type { Harness } from "../contracts/harness.ts";

export const HARNESSES: Record<string, Harness> = {
  claude: { base: "~/.claude", formats: { skill: "skills", command: "commands" }, files: ["settings.json", "CLAUDE.md"] },
  codex: { base: "~/.codex", formats: { skill: "skills" }, files: ["AGENTS.md"], merges: ["config.toml", "hooks.json"] },
  kiro: { base: "~/.kiro", formats: { skill: "skills" } },
  agents: { base: "~/.agents", formats: { skill: "skills" } }, // cross-agent standard; amp and codex read it too
  gemini: { base: "~/.gemini", formats: { skill: "skills" }, merges: ["settings.json"] }, // shared with the Antigravity CLI (agy); settings.json holds raw secrets, so it is merged, never linked
  opencode: { base: "~/.config/opencode", formats: { skill: "skill", command: "command" }, files: ["opencode.json", "tui.json"] },
  amp: { base: "~/.config/amp", formats: { skill: "skills", plugin: "plugins" } }, // plugin dir scanned so self-installed plugins surface as unmanaged
  droid: { base: "~/.factory", formats: { skill: "skills" } },
  pi: { base: "~/.pi/agent", formats: { command: "prompts", extensions: "extensions" } }, // pi discovers shared skills directly from ~/.agents/skills
  rex: { base: "~/.config/rex", formats: {}, files: ["init.lua"] }, // not an agent harness, but same config-sync model
};
