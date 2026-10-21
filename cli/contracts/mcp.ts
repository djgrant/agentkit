// The canonical server model, and the contract a dialect abides by: how to
// render a server into its native shape, how its secrets leave the repo, and
// where the result is stored. Knows nothing about specific harnesses.

import { z } from "zod";

const projection = {
  targets: z.array(z.string()).optional(), // omitted = every target
  enabled: z.boolean().optional(), // omitted = true; false keeps the definition but projects it nowhere
};

export const ServerSchema = z.discriminatedUnion("transport", [
  z.object({
    transport: z.literal("stdio"),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    ...projection,
  }),
  z.object({
    transport: z.literal("http"),
    url: z.string(),
    headers: z.record(z.string()).optional(),
    ...projection,
  }),
]);

export type Server = z.infer<typeof ServerSchema>;

/** common/mcp/servers.json */
export const ManifestSchema = z.object({
  servers: z.record(ServerSchema).default({}),
  unmanaged: z.record(z.array(z.string())).default({}), // harness -> live ids sync leaves alone
});

/**
 * How ${NAME} placeholders leave the repo: expanded to the secret value
 * ("inline"), left as-is for the harness to interpolate ("passthrough"),
 * or rewritten to the dialect's own template (e.g. "{env:$NAME}").
 */
export type SecretStyle = "inline" | "passthrough" | (string & {});

export type ServerBlock = Record<string, unknown>;

/**
 * Where a harness persists its MCP servers. A store only ever touches the
 * server ids it is told the repo owns — servers installed by the user or the
 * harness itself are left untouched.
 */
export interface McpStore {
  read(): ServerBlock; // every server currently in the live config
  write(desired: ServerBlock, ownedIds: string[]): void; // replace the owned ids with desired
}

export interface Dialect {
  store: McpStore; // where the rendered servers persist
  secrets: SecretStyle;
  render: (server: Server, id: string) => ServerBlock; // canonical -> native shape
}

/** One harness's view of the manifest: what it should hold, and what it does. */
export interface McpTarget {
  name: string;
  dialect: Dialect;
  ownedIds: string[];
  unmanagedIds: string[];
  liveServers: () => ServerBlock;
  desiredServers: ServerBlock;
}
