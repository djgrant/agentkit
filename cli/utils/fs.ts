import * as fs from "node:fs";
import * as path from "node:path";
import { homedir } from "node:os";

export const paths = {
  untilde: (p: string) => p.replace(/^~/, homedir()),

  /** Resolve a relative subpath under base, refusing anything that climbs out of it. */
  within(base: string, subpath: string) {
    const target = path.resolve(base, subpath);
    const relative = path.relative(path.resolve(base), target);
    if (subpath.replaceAll("\\", "/").split("/").includes("..") || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Unsafe path: ${subpath}`);
    }
    return target;
  },
};

export const files = {
  ls: (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []),

  /** A directory's entries, sorted by name. */
  entries: (dir: string) =>
    fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)),

  /** A file's text, or "" when it doesn't exist yet. */
  readText: (file: string) =>
    fs.existsSync(paths.untilde(file)) ? fs.readFileSync(paths.untilde(file), "utf8") : "",

  writeText(file: string, text: string) {
    fs.mkdirSync(path.dirname(paths.untilde(file)), { recursive: true });
    fs.writeFileSync(paths.untilde(file), text);
  },

  readJson(file: string) {
    const text = files.readText(file).trim();
    return text ? JSON.parse(text) : {};
  },

  writeJson: (file: string, data: unknown) => files.writeText(file, JSON.stringify(data, null, 2) + "\n"),
};

export const tree = {
  remove: (p: string) => fs.rmSync(p, { recursive: true, force: true }),

  /** Move a tree into place. Uses copy+delete so it survives crossing filesystems (rename EXDEVs between $HOME and a repo elsewhere). */
  move(from: string, to: string) {
    tree.remove(to);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
    tree.remove(from);
  },

  /** Deep byte-equality of two files/dirs. */
  equal(a: string, b: string): boolean {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    if (sa.isDirectory() !== sb.isDirectory()) return false;
    if (!sa.isDirectory()) return fs.readFileSync(a).equals(fs.readFileSync(b));
    const ea = fs.readdirSync(a).sort();
    const eb = fs.readdirSync(b).sort();
    return ea.length === eb.length && ea.every((n, i) => n === eb[i] && tree.equal(path.join(a, n), path.join(b, n)));
  },

  /** Throw if anything under root (outside the skipped dir names) is a symlink. */
  assertNoSymlinks(root: string, skip: Set<string>) {
    const visit = (entry: string) => {
      const stat = fs.lstatSync(entry);
      if (stat.isSymbolicLink()) throw new Error(`Unsupported symlink: ${path.relative(root, entry)}`);
      if (!stat.isDirectory()) return;
      for (const child of fs.readdirSync(entry)) if (!skip.has(child)) visit(path.join(entry, child));
    };
    visit(root);
  },
};

export const symlink = {
  /** Where p points, or null when p is not a symlink. */
  target(p: string) {
    try {
      return fs.lstatSync(p).isSymbolicLink() ? fs.readlinkSync(p) : null;
    } catch {
      return null;
    }
  },

  is: (p: string) => symlink.target(p) !== null,

  /**
   * Point dest at src. Replaces old symlinks. By default never clobbers a real
   * file; pass overwriteReal when an owned name is blocked by a real dir and the
   * repo has been chosen as authoritative.
   */
  ensure(src: string, dest: string, overwriteReal = false) {
    if (fs.existsSync(dest) && !symlink.is(dest)) {
      if (!overwriteReal) return;
      tree.remove(dest);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (symlink.is(dest)) fs.rmSync(dest);
    fs.symlinkSync(src, dest);
  },

  /** Remove symlinks in dir whose targets no longer exist. */
  pruneDead(dir: string) {
    for (const entry of files.ls(dir)) {
      const p = path.join(dir, entry);
      if (symlink.is(p) && !fs.existsSync(p)) fs.rmSync(p);
    }
  },
};
