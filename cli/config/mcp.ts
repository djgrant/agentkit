// How each harness spells the canonical MCP source in its own config.

import * as path from "node:path";
import { REPO, SERVERS_FILE } from "./paths.ts";
import { readJson } from "../lib/fs.ts";
import type { Server, Dialect } from "../lib/mcp.ts";

export const servers = (): Record<string, Server> => readJson(SERVERS_FILE).servers ?? {};

export const DIALECTS: Record<string, Dialect> = {
  claude: {
    file: "~/.claude.json",
    key: "mcpServers",
    labels: { stdio: "stdio", http: "http" },
    command: "args",
    envField: "env",
    secrets: "inline", // Claude doesn't interpolate env itself
  },
  opencode: {
    file: path.join(REPO, "opencode/opencode.json"),
    key: "mcp",
    labels: { stdio: "local", http: "remote" },
    command: "argv",
    envField: "environment",
    enabled: true,
    secrets: "{env:$NAME}", // OpenCode resolves its own secrets
  },
};
