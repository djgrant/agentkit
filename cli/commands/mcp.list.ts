import { defineCommand } from "@pokit/core";
import { SECRETS_FILE } from "../config/paths.ts";
import { renderLocalServer, servers } from "../config/mcp.ts";
import { loadEnv, placeholders } from "../lib/env.ts";
import { isEnabled, type Server } from "../lib/mcp.ts";
import { localMcpFile, localServers, readLocalMcp } from "../lib/local-mcp.ts";

const endpoint = (s: Server) => (s.transport === "http" ? s.url : [s.command, ...(s.args ?? [])].join(" "));

export const command = defineCommand({
  label: "List declared MCP servers and which are in this project",
  examples: ["ak mcp list"],
  run: (r) => {
    const declared = servers();
    const env = loadEnv(SECRETS_FILE);
    const file = localMcpFile();
    const present = localServers(readLocalMcp(file));

    const rows = [
      ...Object.entries(declared).map(([id, s]) => {
        const global = isEnabled(s) ? (s.targets ?? ["all"]).join(", ") : "disabled";
        const missing = placeholders(JSON.stringify(s)).filter((name) => !(name in env));
        const secrets = missing.length ? `**missing** ${missing.map((n) => `\`${n}\``).join(" ")}` : "—";
        const project = !(id in present)
          ? "—"
          : Bun.deepEquals(present[id], renderLocalServer(id, s))
            ? "**added**"
            : "**added (differs)**";
        return `| \`${id}\` | ${project} | ${global} | ${s.transport} | ${secrets} | \`${endpoint(s)}\` |`;
      }),
      ...Object.keys(present)
        .filter((id) => !(id in declared))
        .map((id) => `| \`${id}\` | **added (not declared)** | — | — | — | — |`),
    ];

    r.reporter.step(`MCP servers — project: ${file}`);
    r.reporter.markdown(
      [
        `| Server | Project | Global | Transport | Secrets | Endpoint |`,
        `| --- | --- | --- | --- | --- | --- |`,
        ...rows,
      ].join("\n"),
    );
  },
});
