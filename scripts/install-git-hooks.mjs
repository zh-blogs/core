import { chmodSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const gitDir = resolve(repoRoot, '.git');
const hooksDir = resolve(repoRoot, '.githooks');
const commitMsgHook = resolve(hooksDir, 'commit-msg');

if (!existsSync(gitDir)) {
  process.exit(0);
}

if (existsSync(commitMsgHook)) {
  chmodSync(commitMsgHook, 0o755);
}

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
