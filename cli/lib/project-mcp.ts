import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { files } from "../utils/fs.ts";

const ProjectMcpSchema = z.object({ mcpServers: z.record(z.unknown()).optional() });

/** The `.mcp.json` of the project `ak` was run from. */
export class ProjectMcp {
  readonly file: string;
  private readonly config: Record<string, unknown>; // kept raw so the user's key order survives a write

  constructor(dir = path.resolve(process.env.AGENTKIT_CALLER_CWD ?? process.cwd())) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`Not a directory: ${dir}`);
    this.file = path.join(dir, ".mcp.json");
    this.config = files.readJson(this.file);
    if (!ProjectMcpSchema.safeParse(this.config).success) {
      throw new Error(`${path.basename(this.file)}: mcpServers must be an object`);
    }
  }

  get servers() {
    return (this.config.mcpServers ?? {}) as Record<string, unknown>;
  }

  /** Replace the project's servers; with none left, drop the key, and the file if nothing else is in it. */
  write(servers: Record<string, unknown>) {
    const { mcpServers: _, ...rest } = this.config;
    if (Object.keys(servers).length) files.writeJson(this.file, { ...this.config, mcpServers: servers });
    else if (Object.keys(rest).length) files.writeJson(this.file, rest);
    else fs.rmSync(this.file, { force: true });
  }
}
