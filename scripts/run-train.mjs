import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "burnout-ai"
);

const winVenv = path.join(root, "venv", "Scripts", "python.exe");
const unixVenv = path.join(root, "venv", "bin", "python");
const python = fs.existsSync(winVenv)
  ? winVenv
  : fs.existsSync(unixVenv)
    ? unixVenv
    : process.platform === "win32"
      ? "py"
      : "python3";

const child = spawn(python, ["training/train.py"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
