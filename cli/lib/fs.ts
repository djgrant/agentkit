import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";

export const untilde = (p: string) => p.replace(/^~/, homedir());

export const ls = (dir: string): string[] => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

/** Move a tree into place. Uses copy+delete so it survives crossing filesystems (rename EXDEVs between $HOME and a repo elsewhere). */
export function moveTree(from: string, to: string) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  fs.rmSync(from, { recursive: true, force: true });
}

/** Deep byte-equality of two files/dirs — decides whether adopted copies are one skill or divergent variants. */
export function treeEqual(a: string, b: string): boolean {
  const sa = fs.statSync(a);
  const sb = fs.statSync(b);
  if (sa.isDirectory() !== sb.isDirectory()) return false;
  if (!sa.isDirectory()) return fs.readFileSync(a).equals(fs.readFileSync(b));
  const ea = fs.readdirSync(a).sort();
  const eb = fs.readdirSync(b).sort();
  return ea.length === eb.length && ea.every((n, i) => n === eb[i] && treeEqual(path.join(a, n), path.join(b, n)));
}

export const readJson = (file: string) => {
  const text = fs.existsSync(untilde(file)) ? fs.readFileSync(untilde(file), "utf8").trim() : "";
  return text ? JSON.parse(text) : {};
};

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

/**
 * Point dest at src. Replaces old symlinks. By default never clobbers a real
 * file; pass overwriteReal when an owned name is blocked by a real dir and the
 * repo has been chosen as authoritative.
 */
export function ensureSymlink(src: string, dest: string, overwriteReal = false) {
  if (fs.existsSync(dest) && !isSymlink(dest)) {
    if (!overwriteReal) return;
    fs.rmSync(dest, { recursive: true, force: true });
  }
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
