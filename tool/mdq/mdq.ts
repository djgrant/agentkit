#!/usr/bin/env bun
/**
 * mdq - Markdown Query Tool
 * 
 * Query and manage markdown files using filename-based metadata.
 * Convention: {priority}-{status}-{slug}.md
 * 
 * Examples:
 *   mdq list                    # List all items
 *   mdq list -p1                # Filter by priority
 *   mdq list -s pending         # Filter by status
 *   mdq list -c tooling         # Filter by category (directory)
 *   mdq list --format=json      # JSON output
 *   mdq status my-item done     # Change status (renames file)
 *   mdq priority my-item 1      # Change priority (renames file)
 */

import { Glob } from "bun";
import { basename, dirname, relative, join } from "path";

interface Item {
  path: string;
  priority: number;
  status: string;
  slug: string;
  category: string;
}

function parseFilename(filepath: string, baseDir: string): Item | null {
  const filename = basename(filepath, ".md");
  const match = filename.match(/^p(\d)-(\w+)-(.+)$/);
  if (!match) return null;
  
  const dir = dirname(filepath);
  const category = relative(baseDir, dir) || "root";
  
  return {
    path: filepath,
    priority: parseInt(match[1]),
    status: match[2],
    slug: match[3],
    category,
  };
}

async function findItems(baseDir: string): Promise<Item[]> {
  const glob = new Glob("**/*.md");
  const items: Item[] = [];
  
  for await (const file of glob.scan({ cwd: baseDir, absolute: true })) {
    const item = parseFilename(file, baseDir);
    if (item) items.push(item);
  }
  
  return items;
}

function formatTable(items: Item[]): string {
  if (items.length === 0) return "No items found.";
  
  const lines = ["Priority | Status      | Category    | Slug", "---------|-------------|-------------|-----"];
  for (const item of items) {
    lines.push(
      `P${item.priority}      | ${item.status.padEnd(11)} | ${item.category.padEnd(11)} | ${item.slug}`
    );
  }
  return lines.join("\n");
}

function formatJson(items: Item[]): string {
  return JSON.stringify(items, null, 2);
}

function formatPaths(items: Item[]): string {
  return items.map((i) => i.path).join("\n");
}

// CLI
const args = Bun.argv.slice(2);
const command = args[0] || "list";

// Find base directory (look for roadmap/ or use current dir)
let baseDir = process.cwd();
const roadmapDir = join(baseDir, "roadmap");
const roadmapFile = Bun.file(roadmapDir);
if (await roadmapFile.exists()) {
  baseDir = roadmapDir;
}

// Parse flags
const flags: Record<string, string> = {};
const positional: string[] = [];

for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith("--")) {
    const [key, value] = arg.slice(2).split("=");
    flags[key] = value || "true";
  } else if (arg.startsWith("-")) {
    const key = arg.slice(1);
    if (key.match(/^p\d$/)) {
      flags.priority = key.slice(1);
    } else if (key.startsWith("s")) {
      flags.status = args[++i] || "";
    } else if (key.startsWith("c")) {
      flags.category = args[++i] || "";
    }
  } else {
    positional.push(arg);
  }
}

if (command === "list") {
  let items = await findItems(baseDir);
  
  // Filter
  if (flags.priority) {
    items = items.filter((i) => i.priority === parseInt(flags.priority));
  }
  if (flags.status) {
    items = items.filter((i) => i.status === flags.status);
  }
  if (flags.category) {
    items = items.filter((i) => i.category === flags.category);
  }
  
  // Sort
  const sortBy = flags.sort || "priority";
  items.sort((a, b) => {
    if (sortBy === "priority") return a.priority - b.priority;
    if (sortBy === "status") return a.status.localeCompare(b.status);
    if (sortBy === "name") return a.slug.localeCompare(b.slug);
    return 0;
  });
  
  // Format
  const format = flags.format || "table";
  if (format === "json") {
    console.log(formatJson(items));
  } else if (format === "paths") {
    console.log(formatPaths(items));
  } else {
    console.log(formatTable(items));
  }
} else if (command === "status" && positional.length >= 2) {
  const [slug, newStatus] = positional;
  const items = await findItems(baseDir);
  const item = items.find((i) => i.slug === slug);
  
  if (!item) {
    console.error(`Item not found: ${slug}`);
    process.exit(1);
  }
  
  const newFilename = `p${item.priority}-${newStatus}-${item.slug}.md`;
  const newPath = join(dirname(item.path), newFilename);
  await Bun.write(newPath, await Bun.file(item.path).text());
  await Bun.$`rm ${item.path}`;
  console.log(`Renamed: ${basename(item.path)} → ${newFilename}`);
} else if (command === "priority" && positional.length >= 2) {
  const [slug, newPriority] = positional;
  const items = await findItems(baseDir);
  const item = items.find((i) => i.slug === slug);
  
  if (!item) {
    console.error(`Item not found: ${slug}`);
    process.exit(1);
  }
  
  const newFilename = `p${newPriority}-${item.status}-${item.slug}.md`;
  const newPath = join(dirname(item.path), newFilename);
  await Bun.write(newPath, await Bun.file(item.path).text());
  await Bun.$`rm ${item.path}`;
  console.log(`Renamed: ${basename(item.path)} → ${newFilename}`);
} else if (command === "help" || flags.help) {
  console.log(`
mdq - Markdown Query Tool

Usage:
  mdq list [options]          List items
  mdq status <slug> <status>  Change item status
  mdq priority <slug> <pri>   Change item priority
  mdq help                    Show this help

Options:
  -p<n>              Filter by priority (e.g., -p1)
  -s <status>        Filter by status
  -c <category>      Filter by category (directory)
  --sort=<field>     Sort by: priority, status, name
  --format=<fmt>     Output: table, json, paths
`);
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Run 'mdq help' for usage.");
  process.exit(1);
}
