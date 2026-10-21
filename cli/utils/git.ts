import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { tree } from "./fs.ts";

export const git = {
  /** Shallow-clone into a fresh temp dir, skipping LFS objects. The caller removes the dir. */
  async cloneToTemp(url: string, { ref, timeoutMs = 60_000 }: { ref?: string; timeoutMs?: number } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentkit-clone-"));
    const noLfs = ["filter.lfs.smudge=", "filter.lfs.clean=", "filter.lfs.process=", "filter.lfs.required=false"];
    const proc = Bun.spawn(
      ["git", ...noLfs.flatMap((c) => ["-c", c]), "clone", "--depth", "1", ...(ref ? ["--branch", ref] : []), "--", url, dir],
      { stdout: "ignore", stderr: "pipe", env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" } },
    );
    const timeout = setTimeout(() => proc.kill(), timeoutMs);
    const exitCode = await proc.exited;
    clearTimeout(timeout);

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      tree.remove(dir);
      throw new Error(`Failed to clone ${url}: ${stderr.trim() || `git exited ${exitCode}`}`);
    }
    return dir;
  },
};
