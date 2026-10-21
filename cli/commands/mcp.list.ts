import { defineCommand } from "@pokit/core";
import { SECRETS_FILE } from "../config/paths.ts";
import { renderLocalServer } from "../config/mcp.ts";
import { endpoint, isEnabled, manifest, missingSecrets } from "../lib/mcp.ts";
import { ProjectMcp } from "../lib/project-mcp.ts";
import { env } from "../utils/env.ts";
import { md } from "../utils/text.ts";

export const command = defineCommand({
  label: "List declared MCP servers and which are in this project",
  examples: ["ak mcp list"],
  run: (r) => {
    const declared = manifest.servers();
    const secrets = env.load(SECRETS_FILE);
    const project = new ProjectMcp();
    const present = project.servers;

    const rows = [
      ...Object.entries(declared).map(([id, s]) => {
        const missing = missingSecrets(s, secrets);
        const inProject = !(id in present)
          ? "—"
          : Bun.deepEquals(present[id], renderLocalServer(s, id))
            ? "**added**"
            : "**added (differs)**";
        return [
          md.code(id),
          inProject,
          isEnabled(s) ? (s.targets ?? ["all"]).join(", ") : "disabled",
          s.transport,
          missing.length ? `**missing** ${missing.map(md.code).join(" ")}` : "—",
          md.code(endpoint(s)),
        ];
      }),
      ...Object.keys(present)
        .filter((id) => !(id in declared))
        .map((id) => [md.code(id), "**added (not declared)**", "—", "—", "—", "—"]),
    ];

    r.reporter.step(`MCP servers — project: ${project.file}`);
    r.reporter.markdown(md.table(["Server", "Project", "Global", "Transport", "Secrets", "Endpoint"], rows));
  },
});
