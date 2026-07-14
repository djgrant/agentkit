import { defineCommand } from "@pokit/core";
import * as path from "node:path";
import { REPO, SERVERS_FILE, SECRETS_FILE } from "../config/paths.ts";
import { servers } from "../config/mcp.ts";
import { loadEnv, placeholders } from "../lib/env.ts";

export const command = defineCommand({
  label: "View the canonical MCP source and secret status",
  run: async (r) => {
    const list = servers();
    const env = loadEnv(SECRETS_FILE);
    const referenced = placeholders(JSON.stringify(list)).sort();

    const serverRows = Object.entries(list).map(([id, s]) => {
      const endpoint = s.transport === "http" ? s.url : [s.command, ...(s.args ?? [])].join(" ");
      const targets = (s.targets ?? ["all"]).join(", ");
      return `| \`${id}\` | ${targets} | ${s.transport} | \`${endpoint}\` |`;
    });

    r.reporter.step(`MCP servers — ${path.relative(REPO, SERVERS_FILE)} (${Object.keys(list).length})`);
    r.reporter.markdown(
      [
        `| Server | Targets | Transport | Endpoint |`,
        `| --- | --- | --- | --- |`,
        ...serverRows,
      ].join("\n"),
    );

    if (referenced.length) {
      const secretRows = referenced.map(
        (name) => `| \`${name}\` | ${name in env ? "present" : "**missing**"} |`,
      );
      r.reporter.step("Secrets");
      r.reporter.markdown(
        [`| Variable | Status |`, `| --- | --- |`, ...secretRows].join("\n"),
      );
      if (referenced.some((name) => !(name in env))) {
        r.reporter.warn("Some secrets are missing — copy common/mcp/secrets.env.example and fill it in.");
      }
    }
  },
});
