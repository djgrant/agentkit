import * as path from "node:path";

export const REPO = path.resolve(import.meta.dir, "../..");
export const SERVERS_FILE = path.join(REPO, "common/mcp/servers.json");
export const SECRETS_FILE = path.join(REPO, "common/mcp/secrets.env");
