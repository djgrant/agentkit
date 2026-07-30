import * as path from "node:path";
import { REPO, SERVERS_FILE, SECRETS_FILE } from "./paths.ts";
import { readJson, writeJson } from "../lib/fs.ts";
import { loadEnv } from "../lib/env.ts";
import { jsonFileStore, tomlTablesStore } from "../lib/store.ts";
import { renderServers, compact, type Server, type Dialect } from "../lib/mcp.ts";

export interface McpTarget {
  name: string;
  dialect: Dialect;
  ownedIds: string[];
  unmanagedIds: string[];
  liveServers: () => Record<string, unknown>;
  desiredServers: Record<string, unknown>;
}

export function mcpTargets(): McpTarget[] {
  const manifest = readJson(SERVERS_FILE);
  const source: Record<string, Server> = manifest.servers ?? {};
  const unmanaged: Record<string, string[]> = manifest.unmanaged ?? {};
  const env = loadEnv(SECRETS_FILE);
  return Object.entries(DIALECTS).map(([name, dialect]) => ({
    name,
    dialect,
    ownedIds: Object.keys(source),
    unmanagedIds: unmanaged[name] ?? [],
    liveServers: () => dialect.store.read(),
    desiredServers: renderServers(source, name, dialect, env),
  }));
}

export const servers = (): Record<string, Server> => readJson(SERVERS_FILE).servers ?? {};

/** Live server ids the manifest neither owns nor lists as unmanaged. */
export const foreignIds = (target: McpTarget): string[] =>
  Object.keys(target.liveServers()).filter(
    (id) => !target.ownedIds.includes(id) && !target.unmanagedIds.includes(id),
  );

/** Record ids in the manifest's `unmanaged` map so sync stops asking about them. */
export function markUnmanaged(entries: { harness: string; id: string }[]) {
  const manifest = readJson(SERVERS_FILE);
  const unmanaged: Record<string, string[]> = manifest.unmanaged ?? {};
  for (const { harness, id } of entries) {
    const ids = (unmanaged[harness] ??= []);
    if (!ids.includes(id)) ids.push(id);
  }
  manifest.unmanaged = unmanaged;
  writeJson(SERVERS_FILE, manifest);
}

/**
 * Every stdio server launches through run-mcp.ts, which resolves ${NAME}
 * placeholders from the ignored secrets file at spawn time. Configs and the
 * launching shell never carry secret values; secrets.env is the one source.
 */
const launcher = (s: Server): { command: string; args: string[] } => {
  if (!s.command) throw new Error("stdio MCP servers require a command");
  return {
    command: "bun",
    args: [
      path.join(REPO, "cli/scripts/run-mcp.ts"),
      JSON.stringify(s.env ?? {}),
      s.command,
      ...(s.args ?? []),
    ],
  };
};

const guardHttpSecrets = (s: Server) => {
  if (JSON.stringify(s).includes("${")) {
    throw new Error("HTTP MCP servers cannot safely reference secrets in tracked config");
  }
};

export const DIALECTS: Record<string, Dialect> = {
  claude: {
    store: jsonFileStore("~/.claude.json", "mcpServers"),
    secrets: "passthrough",
    render: (s) => {
      if (s.transport === "http") return compact({ type: "http", url: s.url, headers: s.headers });
      return { type: "stdio", ...launcher(s) };
    },
  },
  opencode: {
    store: jsonFileStore(path.join(REPO, "opencode/opencode.json"), "mcp"),
    secrets: "passthrough",
    render: (s) => {
      if (s.transport === "http")
        return compact({ type: "remote", url: s.url, headers: s.headers, enabled: true });
      const l = launcher(s);
      return { type: "local", command: [l.command, ...l.args], enabled: true };
    },
  },
  codex: {
    store: tomlTablesStore("~/.codex/config.toml", "mcp_servers"),
    secrets: "passthrough",
    render: (s) => {
      if (s.transport === "http") {
        guardHttpSecrets(s);
        return compact({ url: s.url, http_headers: s.headers });
      }
      return launcher(s);
    },
  },
  agy: {
    store: jsonFileStore("~/.gemini/config/mcp_config.json", "mcpServers"),
    secrets: "passthrough",
    render: (s) => {
      if (s.transport === "http") {
        guardHttpSecrets(s); // Antigravity doesn't interpolate env itself
        return compact({ serverUrl: s.url, headers: s.headers });
      }
      return launcher(s);
    },
  },
  amp: {
    store: jsonFileStore("~/.config/amp/settings.json", "amp.mcpServers"),
    secrets: "passthrough", // Amp expands ${NAME} itself in HTTP headers
    render: (s) => {
      if (s.transport === "http") return compact({ url: s.url, headers: s.headers });
      return launcher(s);
    },
  },
  droid: {
    store: jsonFileStore("~/.factory/mcp.json", "mcpServers"),
    secrets: "passthrough", // Droid expands ${NAME} itself in HTTP headers
    render: (s) => {
      if (s.transport === "http") return compact({ type: "http", url: s.url, headers: s.headers });
      return { type: "stdio", ...launcher(s) };
    },
  },
};
