import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const tsxPath = path.join(
  root,
  "node_modules",
  ".pnpm",
  "tsx@4.20.6",
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs"
);

const child = spawn(
  "node",
  [tsxPath, path.join(root, "server/_core/index.ts")],
  {
    cwd: root,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "inherit",
  }
);

child.on("error", err => console.error("Failed to start:", err));
child.on("exit", code => console.log("Server exited with code", code));
