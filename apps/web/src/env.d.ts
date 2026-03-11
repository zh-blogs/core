interface WebBuildMetadata {
  packageName: string;
  version: string;
  branch: string;
  commitHash: string;
  shortCommitHash: string;
  commitTime: string;
  commitLink: string;
  buildTime: string;
}

declare const __ZHBLOGS_BUILD_METADATA__: WebBuildMetadata;
