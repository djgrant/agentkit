// The contract an MCP dialect abides by, and the engine that renders a
// canonical server map into it. Knows nothing about specific harnesses.

export interface Server {
  transport: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  targets?: string[]; // omitted = every target
}

export interface Dialect {
  file: string; // live config file the block is written into
  key: string; // top-level key in that file that the block owns
  labels: { stdio: string; http: string }; // what the dialect calls each transport
  command: "args" | "argv"; // {command, args} split, or one command array
  envField: string; // field name for a server's env vars
  enabled?: boolean; // dialect requires enabled: true on every server
  secrets: "inline" | string; // expand ${NAME} to its value, or to this template ($NAME)
}

function renderServer(s: Server, d: Dialect): Record<string, unknown> {
  const server =
    s.transport === "http"
      ? { type: d.labels.http, url: s.url, ...(s.headers && { headers: s.headers }) }
      : d.command === "argv"
        ? { type: d.labels.stdio, command: [s.command, ...(s.args ?? [])], ...(s.env && { [d.envField]: s.env }) }
        : { type: d.labels.stdio, command: s.command, args: s.args ?? [], ...(s.env && { [d.envField]: s.env }) };
  return d.enabled ? { ...server, enabled: true } : server;
}

/** The servers targeting `name`, rendered in the dialect with secrets resolved. */
export function renderBlock(
  servers: Record<string, Server>,
  name: string,
  dialect: Dialect,
  env: Record<string, string>,
): Record<string, unknown> {
  const block = Object.fromEntries(
    Object.entries(servers)
      .filter(([, s]) => !s.targets || s.targets.includes(name))
      .map(([id, s]) => [id, renderServer(s, dialect)]),
  );
  const json = JSON.stringify(block).replace(/\$\{(\w+)\}/g, (whole, v) =>
    dialect.secrets === "inline" ? (env[v] ?? whole) : dialect.secrets.replaceAll("$NAME", v),
  );
  return JSON.parse(json);
}
