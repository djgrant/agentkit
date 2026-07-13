// Shared vocabulary for the commands: where harnesses live, and how to render
// the canonical MCP source into each one. Business logic lives in the commands.

import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";

export const REPO = path.resolve(import.meta.dir, "..");
export const untilde = (p: string) => p.replace(/^~/, homedir());
export const readJson = (p: string) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {});
export function writeJson(p: string, value: unknown) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n");
}

// Symlink targets: each harness's config root and which repo format dirs feed it.
export interface Harness {
  base: string;
  formats: Record<string, string>; // repo dir -> native subdir
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

// --- MCP ---
export const CANONICAL = path.join(REPO, "common/mcp/servers.json");
const SECRETS = path.join(REPO, "common/mcp/secrets.env");
const VAR = /\$\{(\w+)\}/g;

export type Harnesses = "claude" | "opencode";
export interface Server {
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  targets?: Harnesses[];
}

export const servers = (): Record<string, Server> => readJson(CANONICAL).servers ?? {};
export const targetsOf = (s: Server): Harnesses[] => s.targets ?? ["claude", "opencode"];

/** secrets.env (KEY=VALUE) under the process env (real env wins). */
export function secrets(): Record<string, string> {
  const env: Record<string, string> = {};
  if (fs.existsSync(SECRETS)) {
    for (const line of fs.readFileSync(SECRETS, "utf8").split("\n")) {
      if (line.trimStart().startsWith("#")) continue;
      const m = line.match(/^\s*(\w+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return { ...env, ...process.env } as Record<string, string>;
}

interface McpTarget {
  file: string;
  key: string;
  render: (s: Server) => Record<string, unknown>;
  /** how ${VAR} placeholders get resolved in the serialised block */
  resolve: (json: string, env: Record<string, string>) => string;
}
export const MCP: Record<Harnesses, McpTarget> = {
  claude: {
    file: untilde("~/.claude.json"),
    key: "mcpServers",
    render: (s) =>
      s.transport === "http"
        ? { type: "http", url: s.url, ...(s.headers && { headers: s.headers }) }
        : { type: "stdio", command: s.command, args: s.args ?? [], ...(s.env && { env: s.env }) },
    // expand ${VAR} to real values (Claude doesn't interpolate env itself)
    resolve: (json, env) => json.replace(VAR, (_m, k) => env[k] ?? `\${${k}}`),
  },
  opencode: {
    file: path.join(REPO, "opencode/opencode.json"),
    key: "mcp",
    render: (s) =>
      s.transport === "http"
        ? { type: "remote", url: s.url, enabled: true, ...(s.headers && { headers: s.headers }) }
        : { type: "local", command: [s.command, ...(s.args ?? [])], enabled: true, ...(s.env && { environment: s.env }) },
    // leave secrets to OpenCode: ${VAR} -> {env:VAR}
    resolve: (json) => json.replace(VAR, (_m, k) => `{env:${k}}`),
  },
};

/** The rendered MCP server map for one harness, secrets resolved. */
export function block(name: Harnesses, env = secrets()): Record<string, unknown> {
  const t = MCP[name];
  const map: Record<string, unknown> = {};
  for (const [id, s] of Object.entries(servers())) {
    if (targetsOf(s).includes(name)) map[id] = t.render(s);
  }
  return JSON.parse(t.resolve(JSON.stringify(map), env));
}
