import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const generatedDir = "frontend/src/api/generated";
const openApiTsBin = join("node_modules", "@hey-api", "openapi-ts", "bin", "run.js");

function snapshotDirectory(dir) {
  if (!existsSync(dir)) {
    return new Map();
  }

  const files = new Map();
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        files.set(
          relative(dir, absolutePath).replaceAll("\\", "/"),
          readFileSync(absolutePath, "utf8"),
        );
      }
    }
  }

  return files;
}

function snapshotsMatch(before, after) {
  if (before.size !== after.size) {
    return false;
  }

  for (const [file, content] of before) {
    if (after.get(file) !== content) {
      return false;
    }
  }

  return true;
}

const before = snapshotDirectory(generatedDir);

execFileSync(
  process.execPath,
  [
    openApiTsBin,
    "--input",
    "./backend/openapi.json",
    "--output",
    generatedDir,
    "--client",
    "@hey-api/client-fetch",
    "--plugins",
    "@hey-api/typescript",
    "@hey-api/sdk",
    "@tanstack/react-query",
  ],
  { stdio: "inherit" },
);

const after = snapshotDirectory(generatedDir);

if (!snapshotsMatch(before, after)) {
  const beforeFiles = new Set(before.keys());
  const afterFiles = new Set(after.keys());
  const changed = [...new Set([...beforeFiles, ...afterFiles])]
    .filter((file) => before.get(file) !== after.get(file))
    .sort();

  console.error("Generated API client drift detected:");
  for (const file of changed) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

if (!statSync(generatedDir).isDirectory()) {
  console.error(`Generated API directory is missing: ${generatedDir}`);
  process.exit(1);
}
