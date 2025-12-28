import { execSync } from "node:child_process";
import fs from "node:fs";

const [,, messageFile, commitSource] = process.argv;

if (!messageFile) {
  process.exit(0);
}

const skipSources = new Set(["merge", "squash", "commit", "rebase", "cherry-pick"]);
if (commitSource && skipSources.has(commitSource)) {
  process.exit(0);
}

let branch = "";
try {
  branch = execSync("git symbolic-ref --short HEAD", {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim();
} catch {
  process.exit(0);
}

if (!branch) {
  process.exit(0);
}

const match = branch.match(/(?:^|\/|-)#?(\d{1,6})(?:-|$)/);
if (!match) {
  process.exit(0);
}

const issueNumber = match[1];
const message = fs.readFileSync(messageFile, "utf8");

if (message.includes(`#${issueNumber}`)) {
  process.exit(0);
}

const lines = message.split(/\r?\n/);
if (!lines[0].trim()) {
  process.exit(0);
}

lines[0] = `${lines[0]} (#${issueNumber})`;
fs.writeFileSync(messageFile, lines.join("\n"), "utf8");
