import { SECRETS_FILE } from "../config/paths.ts";
import { servers } from "../config/mcp.ts";
import { loadEnv } from "../lib/env.ts";

const [id] = Bun.argv.slice(2);
if (!id) throw new Error("Usage: run-mcp.ts <server-id>");

// Disabled servers still run here: `ak mcp add` can enable one per project.
const server = servers()[id];
if (!server?.command) throw new Error(`Unknown stdio MCP server: ${id}`);

const available = loadEnv(SECRETS_FILE);
const resolve = (value: string): string =>
  value.replace(/\$\{(\w+)\}/g, (_, name: string) => {
    const resolved = available[name];
    if (resolved === undefined) throw new Error(`Missing MCP secret: ${name}`);
    return resolved;
  });

const serverEnv = Object.fromEntries(
  Object.entries(server.env ?? {}).map(([name, value]) => [name, resolve(value)]),
);
const child = Bun.spawn([resolve(server.command), ...(server.args ?? []).map(resolve)], {
  env: { ...process.env, ...serverEnv },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => child.kill(signal));
}

process.exit(await child.exited);
