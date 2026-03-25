import { execFileSync, spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

const moduleConfigs = [
  {
    dir: "apps/api",
    prettierConfig: "./prettier.config.ts",
    eslintConfig: "./eslint.config.ts",
  },
  {
    dir: "apps/web",
    prettierConfig: "./prettier.config.ts",
    eslintConfig: "./eslint.config.ts",
    stylelintConfig: "./stylelint.config.ts",
  },
  {
    dir: "apps/status",
    prettierConfig: "./prettier.config.ts",
    eslintConfig: "./eslint.config.ts",
  },
  {
    dir: "apps/cloudflare",
    prettierConfig: "./prettier.config.ts",
    eslintConfig: "./eslint.config.ts",
  },
  {
    dir: "packages/db",
    prettierConfig: "./prettier.config.ts",
    eslintConfig: "./eslint.config.ts",
  },
  {
    dir: "packages/utils",
    prettierConfig: "./prettier.config.ts",
    eslintConfig: "./eslint.config.ts",
  },
  {
    dir: "packages/configs",
    prettierConfig: "./prettier.config.ts",
    eslintConfig: "./eslint.config.ts",
  },
];

const prettierExtensions = new Set([
  ".astro",
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".mjs",
  ".svelte",
  ".ts",
]);

const eslintExtensions = new Set([
  ".astro",
  ".cjs",
  ".js",
  ".mjs",
  ".svelte",
  ".ts",
]);
const stylelintExtensions = new Set([".astro", ".css", ".svelte"]);

function getExtension(filePath) {
  const lastDotIndex = filePath.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : filePath.slice(lastDotIndex);
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readGitFileList(args) {
  const output = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCliArgs() {
  const normalizedArgs = process.argv.slice(2).filter((arg) => arg !== "--");
  const noStage = normalizedArgs.includes("--no-stage");
  const files = normalizedArgs.filter((arg) => arg !== "--no-stage");

  return {
    noStage,
    files,
  };
}

function ensureNoPartiallyStagedFiles(files) {
  const unstagedFiles = new Set(readGitFileList(["diff", "--name-only"]));
  const partiallyStagedFiles = files.filter((file) => unstagedFiles.has(file));

  if (partiallyStagedFiles.length === 0) {
    return;
  }

  console.error(
    "Pre-commit aborted: partially staged files are not supported.",
  );
  console.error("Please fully stage or stash the following files first:");

  for (const file of partiallyStagedFiles) {
    console.error(`- ${file}`);
  }

  process.exit(1);
}

function getModuleFiles(files, moduleDir) {
  const modulePrefix = `${moduleDir}/`;

  return files.filter((file) => file.startsWith(modulePrefix));
}

function formatModuleFiles(files, moduleConfig) {
  const prettierFiles = files.filter((file) => {
    return (
      prettierExtensions.has(getExtension(file)) ||
      file.endsWith("/package.json") ||
      file === "package.json"
    );
  });

  const eslintFiles = files.filter((file) =>
    eslintExtensions.has(getExtension(file)),
  );
  const stylelintFiles = moduleConfig.stylelintConfig
    ? files.filter((file) => stylelintExtensions.has(getExtension(file)))
    : [];

  if (eslintFiles.length > 0) {
    runCommand(
      "pnpm",
      [
        "exec",
        "eslint",
        "--config",
        moduleConfig.eslintConfig,
        "--fix",
        ...eslintFiles.map((file) => relative(moduleConfig.dir, file)),
      ],
      resolve(repoRoot, moduleConfig.dir),
    );
  }

  if (stylelintFiles.length > 0 && moduleConfig.stylelintConfig) {
    runCommand(
      "pnpm",
      [
        "exec",
        "stylelint",
        "--config",
        moduleConfig.stylelintConfig,
        "--fix",
        ...stylelintFiles.map((file) => relative(moduleConfig.dir, file)),
      ],
      resolve(repoRoot, moduleConfig.dir),
    );
  }

  if (prettierFiles.length > 0) {
    runCommand(
      "pnpm",
      [
        "exec",
        "prettier",
        "--config",
        moduleConfig.prettierConfig,
        "--write",
        ...prettierFiles.map((file) => relative(moduleConfig.dir, file)),
      ],
      resolve(repoRoot, moduleConfig.dir),
    );
  }
}

function stageFiles(files) {
  if (files.length === 0) {
    return;
  }

  runCommand("git", ["add", "--", ...files], repoRoot);
}

function main() {
  const { files: cliFiles, noStage } = parseCliArgs();
  const files =
    cliFiles.length > 0
      ? cliFiles
      : readGitFileList([
          "diff",
          "--cached",
          "--name-only",
          "--diff-filter=ACMR",
        ]);

  if (files.length === 0) {
    process.exit(0);
  }

  const trackedModuleFiles = files.filter((file) =>
    moduleConfigs.some((config) => file.startsWith(`${config.dir}/`)),
  );

  if (trackedModuleFiles.length === 0) {
    process.exit(0);
  }

  if (!noStage) {
    ensureNoPartiallyStagedFiles(trackedModuleFiles);
  }

  for (const moduleConfig of moduleConfigs) {
    const moduleFiles = getModuleFiles(trackedModuleFiles, moduleConfig.dir);

    if (moduleFiles.length === 0) {
      continue;
    }

    formatModuleFiles(moduleFiles, moduleConfig);

    if (!noStage) {
      stageFiles(moduleFiles);
    }
  }
}

main();
