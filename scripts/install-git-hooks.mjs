import { chmodSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const gitDir = resolve(repoRoot, ".git");
const hooksDir = resolve(repoRoot, ".githooks");
if (!existsSync(gitDir)) {
  process.exit(0);
}

if (existsSync(hooksDir)) {
  for (const entry of readdirSync(hooksDir)) {
    const hookPath = resolve(hooksDir, entry);
    chmodSync(hookPath, 0o755);
  }
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: repoRoot,
  stdio: "inherit",
});
