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

export const DIALECTS: Record<string, Dialect> = {
  claude: {
    store: jsonFileStore("~/.claude.json", "mcpServers"),
    secrets: "passthrough", // Claude expands ${NAME} from the launching shell env
    render: (s) =>
      s.transport === "http"
        ? compact({ type: "http", url: s.url, headers: s.headers })
        : compact({ type: "stdio", command: s.command, args: s.args ?? [], env: s.env }),
  },
  opencode: {
    store: jsonFileStore(path.join(REPO, "opencode/opencode.json"), "mcp"),
    secrets: "{env:$NAME}", // OpenCode resolves its own secrets
    render: (s) =>
      s.transport === "http"
        ? compact({ type: "remote", url: s.url, headers: s.headers, enabled: true })
        : compact({ type: "local", command: [s.command, ...(s.args ?? [])], environment: s.env, enabled: true }),
  },
  codex: {
    store: tomlTablesStore("~/.codex/config.toml", "mcp_servers"),
    secrets: "inline", // config.toml has no env interpolation
    render: (s) =>
      s.transport === "http"
        ? compact({ url: s.url, http_headers: s.headers })
        : compact({ command: s.command, args: s.args ?? [], env: s.env }),
  },
  agy: {
    store: jsonFileStore("~/.gemini/config/mcp_config.json", "mcpServers"),
    secrets: "inline", // Antigravity doesn't interpolate env itself
    render: (s) =>
      s.transport === "http"
        ? compact({ serverUrl: s.url, headers: s.headers })
        : compact({ command: s.command, args: s.args ?? [], env: s.env }),
  },
  amp: {
    store: jsonFileStore("~/.config/amp/settings.json", "amp.mcpServers"),
    secrets: "passthrough", // Amp expands ${NAME} itself
    render: (s) =>
      s.transport === "http"
        ? compact({ url: s.url, headers: s.headers })
        : compact({ command: s.command, args: s.args ?? [], env: s.env }),
  },
  droid: {
    store: jsonFileStore("~/.factory/mcp.json", "mcpServers"),
    secrets: "passthrough", // Droid expands ${NAME} itself
    render: (s) =>
      s.transport === "http"
        ? compact({ type: "http", url: s.url, headers: s.headers })
        : compact({ type: "stdio", command: s.command, args: s.args ?? [], env: s.env }),
  },
};
