import * as path from "node:path";
import { REPO } from "./paths.ts";
import { jsonFileStore, tomlTablesStore } from "../lib/store.ts";
import { object } from "../utils/collections.ts";
import type { Dialect, Server } from "../contracts/mcp.ts";

/**
 * Every stdio server launches through run-mcp.ts, which looks the server up in
 * servers.json by id and resolves its ${NAME} placeholders from the ignored
 * secrets file at spawn time. Configs and the launching shell never carry
 * secret values, or even the placeholders; secrets.env is the one source.
 */
const launcher = (id: string) => ({ command: "bun", args: [path.join(REPO, "cli/scripts/run-mcp.ts"), id] });

const guardHttpSecrets = (s: Server) => {
  if (JSON.stringify(s).includes("${")) {
    throw new Error("HTTP MCP servers cannot safely reference secrets in tracked config");
  }
};

/** Render one declaration into the shared project-level .mcp.json shape. */
export const renderLocalServer = (s: Server, id: string) =>
  s.transport === "http" ? object.compact({ url: s.url, headers: s.headers }) : launcher(id);

export const DIALECTS: Record<string, Dialect> = {
  claude: {
    store: jsonFileStore("~/.claude.json", "mcpServers"),
    secrets: "passthrough",
    render: (s, id) => {
      if (s.transport === "http") return object.compact({ type: "http", url: s.url, headers: s.headers });
      return { type: "stdio", ...launcher(id) };
    },
  },
  cursor: {
    store: jsonFileStore("~/.cursor/mcp.json", "mcpServers"),
    secrets: "passthrough",
    render: renderLocalServer,
  },
  opencode: {
    store: jsonFileStore(path.join(REPO, "opencode/opencode.json"), "mcp"),
    secrets: "passthrough",
    render: (s, id) => {
      if (s.transport === "http")
        return object.compact({ type: "remote", url: s.url, headers: s.headers, enabled: true });
      const l = launcher(id);
      return { type: "local", command: [l.command, ...l.args], enabled: true };
    },
  },
  codex: {
    store: tomlTablesStore("~/.codex/config.toml", "mcp_servers"),
    secrets: "passthrough",
    render: (s, id) => {
      if (s.transport === "http") {
        guardHttpSecrets(s);
        return object.compact({ url: s.url, http_headers: s.headers });
      }
      return launcher(id);
    },
  },
  agy: {
    store: jsonFileStore("~/.gemini/config/mcp_config.json", "mcpServers"),
    secrets: "passthrough",
    render: (s, id) => {
      if (s.transport === "http") {
        guardHttpSecrets(s); // Antigravity doesn't interpolate env itself
        return object.compact({ serverUrl: s.url, headers: s.headers });
      }
      return launcher(id);
    },
  },
  amp: {
    store: jsonFileStore("~/.config/amp/settings.json", "amp.mcpServers"),
    secrets: "passthrough", // Amp expands ${NAME} itself in HTTP headers
    render: renderLocalServer,
  },
  droid: {
    store: jsonFileStore("~/.factory/mcp.json", "mcpServers"),
    secrets: "passthrough", // Droid expands ${NAME} itself in HTTP headers
    render: (s, id) => {
      if (s.transport === "http") return object.compact({ type: "http", url: s.url, headers: s.headers });
      return { type: "stdio", ...launcher(id) };
    },
  },
  pi: {
    store: jsonFileStore("~/.pi/agent/mcp.json", "mcpServers"),
    secrets: "passthrough", // pi-mcp-adapter expands ${NAME} itself
    render: renderLocalServer,
  },
};
