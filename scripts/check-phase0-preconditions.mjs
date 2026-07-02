import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { join, relative } from "node:path";

const root = process.cwd();
const port = 3000;
const host = "127.0.0.1";
const requiredSpecFiles = ["AGENTS.md", "STACK_SPEC.md", "UX_DOCTRINE.md", "MOTION_SPEC.md"];
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const sourceExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = join(current, entry.name);
      const relativePath = normalizePath(relative(root, absolutePath));

      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name) || ignoredDirectories.has(relativePath)) {
          continue;
        }
        stack.push(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push({ absolutePath, relativePath });
      }
    }
  }

  return files;
}

function getExtension(path) {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex === -1 ? "" : path.slice(dotIndex);
}

function findLine(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function findPortOwnersWindows() {
  try {
    const output = execFileSync("netstat.exe", ["-ano", "-p", "tcp"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const owners = new Set();

    for (const line of output.split(/\r?\n/)) {
      const columns = line.trim().split(/\s+/);
      if (columns.length < 5) {
        continue;
      }
      const localAddress = columns[1];
      const state = columns[3];
      const pid = columns[4];
      if (localAddress?.endsWith(`:${port}`) && state === "LISTENING" && pid) {
        owners.add(pid);
      }
    }

    return [...owners];
  } catch {
    return [];
  }
}

function findPortOwnersUnix() {
  try {
    const output = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return [...new Set(output.split(/\s+/).filter(Boolean))];
  } catch {
    return [];
  }
}

function findPortOwners() {
  return process.platform === "win32" ? findPortOwnersWindows() : findPortOwnersUnix();
}

function canOpenPort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) => {
      resolve(error.code !== "EADDRINUSE");
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function checkHttpResponsiveness() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host,
        port,
        path: "/",
        timeout: 2_500,
      },
      (response) => {
        response.resume();
        response.once("end", () => resolve(true));
      },
    );

    request.once("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.once("error", () => resolve(false));
  });
}

function formatPidMessage(pids) {
  if (pids.length === 0) {
    return "PID could not be discovered.";
  }
  const ids = pids.join(", ");
  if (process.platform === "win32") {
    return `PID(s): ${ids}. Stop manually, for example: taskkill /PID ${pids[0]} /F`;
  }
  return `PID(s): ${ids}. Stop manually, for example: kill ${pids[0]}`;
}

async function checkStalePort() {
  const portIsAvailable = await canOpenPort();
  if (portIsAvailable) {
    return [];
  }

  const responsive = await checkHttpResponsiveness();
  if (responsive) {
    return [];
  }

  return [
    `Port ${port} is occupied by an unresponsive server at http://${host}:${port}/. ${formatPidMessage(
      findPortOwners(),
    )}`,
  ];
}

function checkRequiredSpecs() {
  return requiredSpecFiles
    .filter((file) => !existsSync(file))
    .map((file) => `${file} is missing. This active Phase 1 governing spec must be restored.`);
}

function checkRequiredPhase0Files() {
  const requiredFiles = ["frontend/src/ui/tokens.css"];

  return requiredFiles
    .filter((file) => !existsSync(file))
    .map((file) => `${file} is missing. Phase 0 must provide this file.`);
}

function checkTailwindConfig(files) {
  return files
    .filter(({ relativePath }) => /^tailwind\.config\./.test(relativePath.split("/").at(-1) ?? ""))
    .map(({ relativePath }) => `${relativePath} exists. Tailwind v4 must stay CSS-first.`);
}

function checkBoundaryFixtures(files) {
  return files
    .filter(({ relativePath }) => /boundary-(fixture|violation)/.test(relativePath))
    .map(
      ({ relativePath }) =>
        `${relativePath} is a temporary boundary-test fixture and must be removed.`,
    );
}

function checkHexOutsideTokens(files) {
  const errors = [];

  for (const { absolutePath, relativePath } of files) {
    if (!relativePath.startsWith("frontend/src/")) {
      continue;
    }
    if (
      relativePath === "frontend/src/ui/tokens.css" ||
      relativePath.startsWith("frontend/src/api/generated/")
    ) {
      continue;
    }
    if (!sourceExtensions.has(getExtension(relativePath))) {
      continue;
    }

    const content = readFileSync(absolutePath, "utf8");
    for (const match of content.matchAll(hexPattern)) {
      errors.push(`${relativePath}:${findLine(content, match.index ?? 0)} contains ${match[0]}.`);
    }
  }

  return errors;
}

const files = listFiles(root);
const errors = [
  ...checkRequiredSpecs(),
  ...checkRequiredPhase0Files(),
  ...checkTailwindConfig(files),
  ...checkBoundaryFixtures(files),
  ...checkHexOutsideTokens(files),
  ...(await checkStalePort()),
];

if (errors.length > 0) {
  console.error("Phase 0 preflight failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Phase 0 preflight passed.");
