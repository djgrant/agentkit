export interface Harness {
  base: string;
  formats: Record<string, string>; // repo format dir -> harness's native subdir
  files?: string[]; // config files linked straight into base
}

export const HARNESSES: Record<string, Harness> = {
  claude: { base: "~/.claude", formats: { skill: "skills", command: "commands" }, files: ["settings.json", "CLAUDE.md"] },
  codex: { base: "~/.codex", formats: { skill: "skills" }, files: ["config.toml", "AGENTS.md"] },
  kiro: { base: "~/.kiro", formats: { skill: "skills" } },
  agents: { base: "~/.agents", formats: { skill: "skills" } }, // cross-agent standard; amp and codex read it too
  gemini: { base: "~/.gemini", formats: { skill: "skills" } }, // shared with the Antigravity CLI (agy)
  opencode: { base: "~/.config/opencode", formats: { skill: "skill", command: "command" }, files: ["opencode.json", "tui.json"] },
  amp: { base: "~/.config/amp", formats: { skill: "skills" } },
  droid: { base: "~/.factory", formats: { skill: "skills" } },
  pi: { base: "~/.pi/agent", formats: { skill: "skills", command: "prompts" } },
};
