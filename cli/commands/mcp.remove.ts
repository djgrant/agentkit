import { defineCommand } from "@pokit/core";
import { z } from "zod";
import { manifest } from "../lib/mcp.ts";
import { ProjectMcp } from "../lib/project-mcp.ts";
import { object } from "../utils/collections.ts";

export const command = defineCommand({
  label: "Remove a declared MCP server from this project",
  examples: ["ak mcp remove context7"],
  context: {
    server: {
      from: "arg",
      schema: z.string().refine((id) => id in manifest.servers(), "Unknown MCP server"),
      description: "Server declared in common/mcp/servers.json",
      resolve: () => Object.keys(manifest.servers()),
    },
  },
  run: (r, { context: { server: id } }) => {
    const project = new ProjectMcp();

    if (!(id in project.servers)) {
      r.reporter.info(`${id} is not present in ${project.file}`);
      return;
    }

    project.write(object.omit(project.servers, [id]));
    r.reporter.success(`Removed ${id} from ${project.file}`);
  },
});
