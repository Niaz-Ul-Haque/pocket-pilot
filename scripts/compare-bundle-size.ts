import fs from "node:fs";
import path from "node:path";

type BundleFile = { path: string; size: number };
type BundleReport = {
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

const basePath = argValue("--base");
const headPath = argValue("--head");
const outPath = argValue("--out");

if (!basePath || !headPath) {
  console.error("Usage: --base <file> --head <file> [--out <file>]");
  process.exit(1);
}

const readReport = (filePath: string): BundleReport => {
  const raw = fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
  return JSON.parse(raw) as BundleReport;
};

const base = readReport(basePath);
const head = readReport(headPath);

const formatBytes = (bytes: number) => {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const diffBytes = head.totalBytes - base.totalBytes;
const diffSign = diffBytes > 0 ? "+" : diffBytes < 0 ? "-" : "";
const diffAbs = Math.abs(diffBytes);
const diffPct =
  base.totalBytes === 0 ? "n/a" : `${((diffBytes / base.totalBytes) * 100).toFixed(2)}%`;

const lines: string[] = [
  "<!-- bundle-size-report -->",
  "## Bundle Size Report",
  "",
  `Base: ${formatBytes(base.totalBytes)} (${base.fileCount} files)`,
  `Head: ${formatBytes(head.totalBytes)} (${head.fileCount} files)`,
  `Diff: ${diffSign}${formatBytes(diffAbs)} (${diffPct})`,
  "",
  "Largest files (head):",
];

for (const file of head.largestFiles) {
  lines.push(`- ${file.path}: ${formatBytes(file.size)}`);
}

const output = `${lines.join("\n")}\n`;

if (outPath) {
  fs.writeFileSync(path.resolve(process.cwd(), outPath), output, "utf8");
} else {
  process.stdout.write(output);
}
