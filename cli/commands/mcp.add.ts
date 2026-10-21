import { defineCommand } from "@pokit/core";
import { z } from "zod";
import { SECRETS_FILE } from "../config/paths.ts";
import { renderLocalServer } from "../config/mcp.ts";
import { manifest, missingSecrets } from "../lib/mcp.ts";
import { ProjectMcp } from "../lib/project-mcp.ts";
import { env } from "../utils/env.ts";
import { text } from "../utils/text.ts";

export const command = defineCommand({
  label: "Add a declared MCP server to this project",
  examples: ["ak mcp add context7"],
  context: {
    server: {
      from: "arg",
      schema: z.string().refine((id) => id in manifest.servers(), "Unknown MCP server"),
      description: "Server declared in common/mcp/servers.json",
      resolve: () => Object.keys(manifest.servers()),
    },
  },
  run: async (r, { context: { server: id } }) => {
    const declaration = manifest.servers()[id];
    const missing = missingSecrets(declaration, env.load(SECRETS_FILE));
    if (missing.length) {
      throw new Error(`Missing MCP ${text.plural(missing.length, "secret")}: ${missing.join(", ")}`);
    }

    const project = new ProjectMcp();
    const desired = renderLocalServer(declaration, id);
    const existing = project.servers[id];

    if (existing !== undefined && Bun.deepEquals(existing, desired)) {
      r.reporter.success(`${id} already present in ${project.file}`);
      return;
    }

    if (existing !== undefined) {
      if (!process.stdin.isTTY) {
        throw new Error(`${id} already exists in ${project.file}; run interactively to replace it`);
      }
      const replace = await r.prompter.confirm({
        message: `${id} already exists in ${project.file}. Replace it?`,
        initialValue: false,
      });
      if (!replace) {
        r.reporter.info("No changes made.");
        return;
      }
    }

    project.write({ ...project.servers, [id]: desired });
    r.reporter.success(`Added ${id} to ${project.file}`);
  },
});
