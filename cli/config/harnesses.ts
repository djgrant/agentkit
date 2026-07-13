// Where each harness keeps its config, and which repo format dirs feed it.

export interface Harness {
  base: string;
  formats: Record<string, string>; // repo format dir -> harness's native subdir
  files?: string[]; // config files linked straight into base
}

export const HARNESSES: Record<string, Harness> = {
  claude: { base: "~/.claude", formats: { skill: "skills", command: "commands" }, files: ["settings.json", "CLAUDE.md"] },
  codex: { base: "~/.codex", formats: { skill: "skills" } },
  kiro: { base: "~/.kiro", formats: { skill: "skills" } },
  agents: { base: "~/.agents", formats: { skill: "skills" } },
  gemini: { base: "~/.gemini", formats: { skill: "skills" } },
  opencode: { base: "~/.config/opencode", formats: { skill: "skill", command: "command" }, files: ["opencode.json", "tui.json"] },
};
