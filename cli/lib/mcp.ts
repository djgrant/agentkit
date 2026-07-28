// The canonical server model, and the contract a dialect abides by: how to
// render a server into its native shape, how its secrets leave the repo, and
// where the result is stored. Knows nothing about specific harnesses.

import type { McpStore } from "./store.ts";

export interface Server {
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  targets?: string[]; // omitted = every target
  enabled?: boolean; // omitted = true; false keeps the definition but projects it nowhere
}

/**
 * How ${NAME} placeholders leave the repo: expanded to the secret value
 * ("inline"), left as-is for the harness to interpolate ("passthrough"),
 * or rewritten to the dialect's own template (e.g. "{env:$NAME}").
 */
export type SecretStyle = "inline" | "passthrough" | (string & {});

export interface Dialect {
  store: McpStore; // where the rendered servers persist
  secrets: SecretStyle;
  render: (server: Server) => Record<string, unknown>; // canonical -> native shape
}

/** Drop undefined fields so dialect renders stay terse. */
export const compact = (obj: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

/** A server the manifest defines but does not want live anywhere. */
export const isEnabled = (server: Server): boolean => server.enabled !== false;

/**
 * The servers targeting `name`, rendered in the dialect with secrets resolved.
 * Disabled servers are dropped here rather than in the manifest reader: they stay
 * owned ids, so sync prunes them from the live config instead of asking about them.
 */
export function renderServers(
  servers: Record<string, Server>,
  name: string,
  dialect: Dialect,
  env: Record<string, string>,
): Record<string, unknown> {
  const rendered = Object.fromEntries(
    Object.entries(servers)
      .filter(([, server]) => isEnabled(server) && (!server.targets || server.targets.includes(name)))
      .map(([id, server]) => [id, dialect.render(server)]),
  );
  return resolveSecrets(rendered, dialect.secrets, env);
}

function resolveSecrets(
  block: Record<string, unknown>,
  style: SecretStyle,
  env: Record<string, string>,
): Record<string, unknown> {
  if (style === "passthrough") return block;
  const json = JSON.stringify(block).replace(/\$\{(\w+)\}/g, (placeholder, name) =>
    style === "inline" ? (env[name] ?? placeholder) : style.replaceAll("$NAME", name),
  );
  return JSON.parse(json);
}
