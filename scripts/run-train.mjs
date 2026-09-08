import { spawn, spawnSync } from "node:child_process";
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

/** Windows Application Control often blocks freshly installed sklearn *.pyd files. */
function unblockSklearnOnWindows() {
  if (process.platform !== "win32") return;
  const sklearnDir = path.join(root, "venv", "Lib", "site-packages", "sklearn");
  if (!fs.existsSync(sklearnDir)) return;

  spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Get-ChildItem -LiteralPath '${sklearnDir.replace(/'/g, "''")}' -Recurse -Include *.pyd,*.dll -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue`,
    ],
    { stdio: "ignore" }
  );
}

unblockSklearnOnWindows();

const child = spawn(python, ["training/train.py"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
