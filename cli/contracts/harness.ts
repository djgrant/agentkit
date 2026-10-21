export interface Harness {
  base: string;
  formats: Record<string, string>; // repo format dir -> harness's native subdir
  files?: string[]; // config files linked straight into base
  merges?: string[]; // config files the harness writes state into: merged, never linked (see lib/merge.ts)
}

/** A merged config file: the repo template paired with its live destination. */
export interface MergedFile {
  harness: string;
  file: string;
  template: string;
  live: string;
}
