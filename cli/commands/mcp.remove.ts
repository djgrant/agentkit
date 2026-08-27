import { defineCommand } from "@pokit/core";
import { z } from "zod";
import { servers } from "../config/mcp.ts";
import {
  localMcpFile,
  localServers,
  readLocalMcp,
  writeLocalMcp,
} from "../lib/local-mcp.ts";

export const command = defineCommand({
  label: "Remove a declared MCP server from this project",
  examples: ["ak mcp remove context7"],
  context: {
    server: {
      from: "arg",
      schema: z.string().refine((id) => id in servers(), "Unknown MCP server"),
      description: "Server declared in common/mcp/servers.json",
      resolve: () => Object.keys(servers()),
    },
  },
  run: (r, { context }) => {
    const file = localMcpFile();
    const config = readLocalMcp(file);
    const current = localServers(config);

    if (!(context.server in current)) {
      r.reporter.info(`${context.server} is not present in ${file}`);
      return;
    }

    const next = { ...current };
    delete next[context.server];
    writeLocalMcp(file, config, next);
    r.reporter.success(`Removed ${context.server} from ${file}`);
  },
});
