import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";

export const untilde = (p: string) => p.replace(/^~/, homedir());

export const ls = (dir: string): string[] => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

export const readJson = (file: string) =>
  fs.existsSync(untilde(file)) ? JSON.parse(fs.readFileSync(untilde(file), "utf8")) : {};

export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(untilde(file)), { recursive: true });
  fs.writeFileSync(untilde(file), JSON.stringify(data, null, 2) + "\n");
}

const isSymlink = (p: string) => {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
};

/** Point dest at src. Replaces old symlinks; never clobbers real files. */
export function symlink(src: string, dest: string) {
  if (fs.existsSync(dest) && !isSymlink(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (isSymlink(dest)) fs.rmSync(dest);
  fs.symlinkSync(src, dest);
}

/** Remove symlinks in dir whose targets no longer exist. */
export function pruneDeadLinks(dir: string) {
  for (const entry of ls(dir)) {
    const p = path.join(dir, entry);
    if (isSymlink(p) && !fs.existsSync(p)) fs.rmSync(p);
  }
}
