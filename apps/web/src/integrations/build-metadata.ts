import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration, AstroIntegrationLogger } from 'astro';

interface BuildMetadata {
  packageName: string;
  version: string;
  branch: string;
  commitHash: string;
  shortCommitHash: string;
  commitTime: string;
  commitLink: string;
  buildTime: string;
}

interface GitMetadata {
  branch: string;
  commitHash: string;
  shortCommitHash: string;
  commitTime: string;
  commitLink: string;
}

const integrationDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(integrationDir, '../..');

const runGit = (args: string[]): string =>
  execFileSync('git', args, {
    cwd: webRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const getCommitLink = (remoteUrl: string, commitHash: string): string => {
  if (remoteUrl.startsWith('git@github.com:')) {
    const repo = remoteUrl.replace('git@github.com:', '').replace(/\.git$/, '');
    return `https://github.com/${repo}/commit/${commitHash}`;
  }

  if (remoteUrl.startsWith('https://github.com/')) {
    return `${remoteUrl.replace(/\.git$/, '')}/commit/${commitHash}`;
  }

  return '';
};

const getGitMetadata = (logger: AstroIntegrationLogger): GitMetadata => {
  try {
    const commitHash = runGit(['rev-parse', 'HEAD']);
    const shortCommitHash = runGit(['rev-parse', '--short', 'HEAD']);
    const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    const commitTimeRaw = runGit(['log', '-1', '--pretty=format:%cI']);
    const remoteUrl = runGit(['config', '--get', 'remote.origin.url']);

    return {
      branch,
      commitHash,
      shortCommitHash,
      commitTime: new Date(commitTimeRaw).toISOString(),
      commitLink: getCommitLink(remoteUrl, commitHash),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Unable to collect git metadata: ${message}`);

    return {
      branch: 'unknown',
      commitHash: 'unknown',
      shortCommitHash: 'unknown',
      commitTime: '',
      commitLink: '',
    };
  }
};

const getPackageMetadata = (
  logger: AstroIntegrationLogger,
): {
  packageName: string;
  version: string;
} => {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(webRoot, 'package.json'), 'utf8'));

    return {
      packageName: packageJson.name ?? '@zhblogs/web',
      version: packageJson.version ?? '0.0.0',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Unable to read package.json: ${message}`);

    return {
      packageName: '@zhblogs/web',
      version: '0.0.0',
    };
  }
};

const getBuildMetadata = (logger: AstroIntegrationLogger): BuildMetadata => ({
  ...getPackageMetadata(logger),
  ...getGitMetadata(logger),
  buildTime: new Date().toISOString(),
});

export function buildMetadataIntegration(): AstroIntegration {
  return {
    name: 'build-metadata',
    hooks: {
      'astro:config:setup': ({ logger, updateConfig }) => {
        const buildMetadata = getBuildMetadata(logger);

        updateConfig({
          vite: {
            define: {
              __ZHBLOGS_BUILD_METADATA__: JSON.stringify(buildMetadata),
            },
          },
        });

        logger.info('Build metadata ready.');
      },
    },
  };
}
