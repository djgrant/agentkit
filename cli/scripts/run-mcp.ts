import { SECRETS_FILE } from "../config/paths.ts";
import { manifest } from "../lib/mcp.ts";
import { env } from "../utils/env.ts";

const [id] = Bun.argv.slice(2);
if (!id) throw new Error("Usage: run-mcp.ts <server-id>");

// Disabled servers still run here: `ak mcp add` can enable one per project.
const server = manifest.servers()[id];
if (server?.transport !== "stdio") throw new Error(`Unknown stdio MCP server: ${id}`);

const secrets = env.load(SECRETS_FILE);
const resolve = (value: string) =>
  env.interpolate(value, (name) => {
    const secret = secrets[name];
    if (secret === undefined) throw new Error(`Missing MCP secret: ${name}`);
    return secret;
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
