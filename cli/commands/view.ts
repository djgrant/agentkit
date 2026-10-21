import { defineCommand } from "@pokit/core";
import * as path from "node:path";
import { REPO, SERVERS_FILE, SECRETS_FILE } from "../config/paths.ts";
import { endpoint, isEnabled, manifest } from "../lib/mcp.ts";
import { env } from "../utils/env.ts";
import { md } from "../utils/text.ts";

export const command = defineCommand({
  label: "View the canonical MCP source and secret status",
  run: async (r) => {
    const servers = manifest.servers();
    const secrets = env.load(SECRETS_FILE);
    const referenced = env.placeholders(JSON.stringify(servers)).sort();

    const serverRows = Object.entries(servers).map(([id, s]) => [
      md.code(id),
      isEnabled(s) ? (s.targets ?? ["all"]).join(", ") : "**disabled**",
      s.transport,
      md.code(endpoint(s)),
    ]);

    r.reporter.step(`MCP servers — ${path.relative(REPO, SERVERS_FILE)} (${serverRows.length})`);
    r.reporter.markdown(md.table(["Server", "Targets", "Transport", "Endpoint"], serverRows));

    if (referenced.length) {
      const secretRows = referenced.map((name) => [md.code(name), name in secrets ? "present" : "**missing**"]);
      r.reporter.step("Secrets");
      r.reporter.markdown(md.table(["Variable", "Status"], secretRows));
      if (referenced.some((name) => !(name in secrets))) {
        r.reporter.warn("Some secrets are missing — copy common/mcp/secrets.env.example and fill it in.");
      }
    }
  },
});
