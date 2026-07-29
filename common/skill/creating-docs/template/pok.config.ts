import { defineConfig } from "@pokit/core";
import { createTerminalUI } from "@pokit/terminal";
import { docs } from "pok-plugins";

export default defineConfig({
  appName: "<repo-name>",
  commandsDir: "./commands",
  ...createTerminalUI(),
  // Mounts `pok docs dev|build|deploy`; runs `pnpm exec docs <cmd>` in ./docs
  plugins: [docs({ name: "<repo-name>-docs" })],
});
