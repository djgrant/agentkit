// The MCP manifest (common/mcp/servers.json) and its projection onto each
// harness dialect.

import { SERVERS_FILE, SECRETS_FILE } from "../config/paths.ts";
import { DIALECTS } from "../config/mcp.ts";
import { ManifestSchema, type Dialect, type McpTarget, type Server } from "../contracts/mcp.ts";
import { files } from "../utils/fs.ts";
import { env } from "../utils/env.ts";

const read = () => ManifestSchema.parse(files.readJson(SERVERS_FILE));

export const manifest = {
  servers: () => read().servers,

  targets(): McpTarget[] {
    const { servers, unmanaged } = read();
    const secrets = env.load(SECRETS_FILE);
    return Object.entries(DIALECTS).map(([name, dialect]) => ({
      name,
      dialect,
      ownedIds: Object.keys(servers),
      unmanagedIds: unmanaged[name] ?? [],
      liveServers: () => dialect.store.read(),
      desiredServers: renderServers(servers, name, dialect, secrets),
    }));
  },

  /** Live server ids the manifest neither owns nor lists as unmanaged. */
  foreignIds: (target: McpTarget) =>
    Object.keys(target.liveServers()).filter(
      (id) => !target.ownedIds.includes(id) && !target.unmanagedIds.includes(id),
    ),

  /** Record ids in the manifest's `unmanaged` map so sync stops asking about them. */
  markUnmanaged(entries: { harness: string; id: string }[]) {
    const raw = files.readJson(SERVERS_FILE); // written back raw, so $comment and key order survive
    const unmanaged: Record<string, string[]> = (raw.unmanaged ??= {});
    for (const { harness, id } of entries) {
      const ids = (unmanaged[harness] ??= []);
      if (!ids.includes(id)) ids.push(id);
    }
    files.writeJson(SERVERS_FILE, raw);
  },
};

/** A server the manifest defines but does not want live anywhere. */
export const isEnabled = (server: Server) => server.enabled !== false;

/** Where a server lives: its URL, or the command line that launches it. */
export const endpoint = (s: Server) => (s.transport === "http" ? s.url : [s.command, ...(s.args ?? [])].join(" "));

/** Placeholders referenced anywhere in value that have no secret to fill them. */
export const missingSecrets = (value: unknown, secrets: Record<string, string>) =>
  env.placeholders(JSON.stringify(value)).filter((name) => !(name in secrets));

/**
 * The servers targeting `name`, rendered in the dialect with secrets resolved.
 * Disabled servers are dropped here rather than in the manifest reader: they stay
 * owned ids, so sync prunes them from the live config instead of asking about them.
 */
function renderServers(servers: Record<string, Server>, name: string, dialect: Dialect, secrets: Record<string, string>) {
  const rendered = Object.fromEntries(
    Object.entries(servers)
      .filter(([, server]) => isEnabled(server) && (!server.targets || server.targets.includes(name)))
      .map(([id, server]) => [id, dialect.render(server, id)]),
  );
  if (dialect.secrets === "passthrough") return rendered;
  const style = dialect.secrets;
  const json = env.interpolate(JSON.stringify(rendered), (name, placeholder) =>
    style === "inline" ? (secrets[name] ?? placeholder) : style.replaceAll("$NAME", name),
  );
  return JSON.parse(json);
}
