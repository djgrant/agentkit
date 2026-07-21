import { defineCommand } from "@pokit/core";
import { $ } from "bun";

interface Session {
  name: string;
  running: boolean;
  socket_path: string;
}

export const command = defineCommand({
  label: "Reload herdr config in every running session",
  run: async (r) => {
    const { sessions } = (await $`herdr session list --json`.json()) as { sessions: Session[] };
    const running = sessions.filter((s) => s.running);
    if (!running.length) {
      r.reporter.warn("No running herdr sessions.");
      return;
    }

    await r.group("Reload", { layout: "sequence" }, async (g) => {
      for (const s of running) {
        await g.activity(s.name, async () => {
          // HERDR_SESSION doesn't redirect the CLI; the socket path is what targets a session.
          const res = await $`herdr server reload-config`.env({
            ...process.env,
            HERDR_SOCKET_PATH: s.socket_path,
          }).json();
          const diagnostics: string[] = res?.result?.diagnostics ?? [];
          if (res?.result?.status !== "applied" || diagnostics.length) {
            throw new Error(`${s.name}: ${res?.result?.status ?? "no response"} ${diagnostics.join("; ")}`);
          }
        });
      }
    });

    const stopped = sessions.filter((s) => !s.running).map((s) => s.name);
    if (stopped.length) r.reporter.info(`Stopped sessions pick it up on start: ${stopped.join(", ")}`);
    r.reporter.success(`Reloaded config in ${running.length} running session(s).`);
  },
});
