import { SECRETS_FILE } from "../config/paths.ts";
import { loadEnv } from "../lib/env.ts";

const [rawServerEnv, rawCommand, ...rawArgs] = Bun.argv.slice(2);
if (!rawServerEnv || !rawCommand) throw new Error("Usage: run-mcp.ts <env-json> <command> [args...]");

const available = loadEnv(SECRETS_FILE);
const resolve = (value: string): string =>
  value.replace(/\$\{(\w+)\}/g, (_, name: string) => {
    const resolved = available[name];
    if (resolved === undefined) throw new Error(`Missing MCP secret: ${name}`);
    return resolved;
  });

const serverEnv = Object.fromEntries(
  Object.entries(JSON.parse(rawServerEnv) as Record<string, string>).map(([name, value]) => [
    name,
    resolve(value),
  ]),
);
const child = Bun.spawn([resolve(rawCommand), ...rawArgs.map(resolve)], {
  env: { ...process.env, ...serverEnv },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => child.kill(signal));
}

process.exit(await child.exited);
