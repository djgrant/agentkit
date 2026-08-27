import { defineCommand } from "@pokit/core";
import { z } from "zod";
import { SECRETS_FILE } from "../config/paths.ts";
import { renderLocalServer, servers } from "../config/mcp.ts";
import { loadEnv, placeholders } from "../lib/env.ts";
import {
  localMcpFile,
  localServers,
  readLocalMcp,
  writeLocalMcp,
} from "../lib/local-mcp.ts";

export const command = defineCommand({
  label: "Add a declared MCP server to this project",
  examples: ["ak mcp add context7"],
  context: {
    server: {
      from: "arg",
      schema: z.string().refine((id) => id in servers(), "Unknown MCP server"),
      description: "Server declared in common/mcp/servers.json",
      resolve: () => Object.keys(servers()),
    },
  },
  run: async (r, { context }) => {
    const declaration = servers()[context.server];
    const missing = placeholders(JSON.stringify(declaration)).filter(
      (name) => !(name in loadEnv(SECRETS_FILE)),
    );
    if (missing.length) {
      throw new Error(`Missing MCP secret${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
    }

    const file = localMcpFile();
    const config = readLocalMcp(file);
    const current = localServers(config);
    const desired = renderLocalServer(declaration);
    const existing = current[context.server];

    if (existing !== undefined && Bun.deepEquals(existing, desired)) {
      r.reporter.success(`${context.server} already present in ${file}`);
      return;
    }

    if (existing !== undefined) {
      if (!process.stdin.isTTY) {
        throw new Error(`${context.server} already exists in ${file}; run interactively to replace it`);
      }
      const replace = await r.prompter.confirm({
        message: `${context.server} already exists in ${file}. Replace it?`,
        initialValue: false,
      });
      if (!replace) {
        r.reporter.info("No changes made.");
        return;
      }
    }

    writeLocalMcp(file, config, { ...current, [context.server]: desired });
    r.reporter.success(`Added ${context.server} to ${file}`);
  },
});
