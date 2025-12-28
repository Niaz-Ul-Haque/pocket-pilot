import fs from "node:fs";
import path from "node:path";

type BundleFile = { path: string; size: number };
type BundleReport = {
  root: string;
  totalBytes: number;
  fileCount: number;
  largestFiles: BundleFile[];
};

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

const rootArg = argValue("--root") ?? ".";
const outFile = argValue("--out");
const root = path.resolve(process.cwd(), rootArg);
const staticDir = path.join(root, ".next", "static");

if (!fs.existsSync(staticDir)) {
  console.error(`Missing build output at ${staticDir}`);
  process.exit(1);
}

const files: BundleFile[] = [];
const extensions = new Set([".js", ".mjs", ".css"]);

const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!extensions.has(ext)) continue;
    const stat = fs.statSync(fullPath);
    files.push({
      path: path.relative(root, fullPath).replace(/\\/g, "/"),
      size: stat.size,
    });
  }
};

walk(staticDir);

const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 5);

const report: BundleReport = {
  root,
  totalBytes,
  fileCount: files.length,
  largestFiles,
};

const payload = `${JSON.stringify(report, null, 2)}\n`;

if (outFile) {
  fs.writeFileSync(path.resolve(process.cwd(), outFile), payload, "utf8");
} else {
  process.stdout.write(payload);
}
