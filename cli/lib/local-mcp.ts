import * as fs from "node:fs";
import * as path from "node:path";
import { readJson, writeJson } from "./fs.ts";

type JsonObject = Record<string, unknown>;

export const callerCwd = (): string =>
  path.resolve(process.env.AGENTKIT_CALLER_CWD ?? process.cwd());

export const localMcpFile = (): string => {
  const cwd = callerCwd();
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    throw new Error(`Not a directory: ${cwd}`);
  }
  return path.join(cwd, ".mcp.json");
};

export const readLocalMcp = (file: string): JsonObject => readJson(file);

export const localServers = (config: JsonObject): JsonObject => {
  const block = config.mcpServers;
  if (block === undefined) return {};
  if (block === null || Array.isArray(block) || typeof block !== "object") {
    throw new Error(`${path.basename(localMcpFile())}: mcpServers must be an object`);
  }
  return block as JsonObject;
};

export function writeLocalMcp(file: string, config: JsonObject, servers: JsonObject) {
  if (Object.keys(servers).length) {
    writeJson(file, { ...config, mcpServers: servers });
    return;
  }

  const { mcpServers: _removed, ...rest } = config;
  if (Object.keys(rest).length) writeJson(file, rest);
  else fs.rmSync(file, { force: true });
}
