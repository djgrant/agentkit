import { defineConfig } from "@pokit/core";

// The global `pok` binary loads this when run inside the repo, surfacing the
// commands/ directory. `ak` (see ak.ts) just runs `pok` here from anywhere.
export default defineConfig({
  appName: "agentkit",
  commandsDir: "./cli/commands",
});
